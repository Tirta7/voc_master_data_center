import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Locker, LockerStatus } from './entities/locker.entity';
import { LockerSession } from './entities/locker-session.entity';

@Injectable()
export class LockerService {
    constructor(
        @InjectRepository(Locker)
        private lockerRepo: Repository<Locker>,
        @InjectRepository(LockerSession)
        private sessionRepo: Repository<LockerSession>,
    ) { }

    // ─── LOCKER MANAGEMENT ──────────────────────────────────────────

    async getAllLockers() {
        const lockers = await this.lockerRepo.find({
            order: { number: 'ASC' },
        });

        // Attach active session to each locker
        const activeSessions = await this.sessionRepo.find({
            where: { status: 'ACTIVE' },
        });

        const sessionMap = new Map<number, LockerSession>();
        activeSessions.forEach(s => sessionMap.set(s.lockerId, s));

        return lockers.map(locker => ({
            ...locker,
            activeSession: sessionMap.get(locker.id)
                ? {
                    id: sessionMap.get(locker.id)!.id,
                    customerName: sessionMap.get(locker.id)!.customerName,
                    phone: sessionMap.get(locker.id)!.phone,
                    memberId: sessionMap.get(locker.id)!.memberId,
                    memberName: sessionMap.get(locker.id)!.memberName,
                    isMemberFree: sessionMap.get(locker.id)!.isMemberFree,
                    startTime: sessionMap.get(locker.id)!.startTime,
                    handledByName: sessionMap.get(locker.id)!.handledByName,
                    failedPinAttempts: sessionMap.get(locker.id)!.failedPinAttempts,
                    isLocked: sessionMap.get(locker.id)!.isLocked,
                }
                : null,
        }));
    }

    async createLocker(dto: {
        number: string;
        label?: string;
        category?: 'REGULAR' | 'VIP';
        pricePerHour?: number;
        notes?: string;
    }) {
        const existing = await this.lockerRepo.findOne({ where: { number: dto.number } });
        if (existing) {
            throw new BadRequestException(`Locker nomor "${dto.number}" sudah ada`);
        }
        const locker = this.lockerRepo.create({
            number: dto.number,
            label: dto.label,
            category: dto.category || 'REGULAR',
            pricePerHour: dto.pricePerHour || 0,
            notes: dto.notes,
            status: 'AVAILABLE',
        });
        return this.lockerRepo.save(locker);
    }

    // Bulk create lockers (e.g. add 10 lockers at once A01–A10)
    async bulkCreateLockers(dto: {
        prefix: string;
        startNumber: number;
        count: number;
        category?: 'REGULAR' | 'VIP';
        pricePerHour?: number;
    }) {
        const results = [];
        for (let i = dto.startNumber; i < dto.startNumber + dto.count; i++) {
            const number = `${dto.prefix}${String(i).padStart(2, '0')}`;
            try {
                const locker = await this.createLocker({
                    number,
                    category: dto.category,
                    pricePerHour: dto.pricePerHour,
                });
                results.push(locker);
            } catch {
                // Skip duplicates in bulk
            }
        }
        return results;
    }

    async updateLocker(id: number, dto: Partial<{
        label: string;
        category: 'REGULAR' | 'VIP';
        status: LockerStatus;
        pricePerHour: number;
        notes: string;
        isActive: boolean;
    }>) {
        const locker = await this.lockerRepo.findOne({ where: { id } });
        if (!locker) throw new NotFoundException('Locker tidak ditemukan');

        // Can't manually set to OCCUPIED — only via check-in
        if (dto.status === 'OCCUPIED') {
            throw new BadRequestException('Status OCCUPIED hanya bisa melalui check-in customer');
        }

        // Can't change status if currently occupied (must checkout first)
        if (locker.status === 'OCCUPIED' && dto.status) {
            const activeSession = await this.sessionRepo.findOne({
                where: { lockerId: id, status: 'ACTIVE' },
            });
            if (activeSession) {
                throw new BadRequestException('Locker sedang terpakai. Selesaikan check-out dulu');
            }
        }

        Object.assign(locker, dto);
        return this.lockerRepo.save(locker);
    }

    async deleteLocker(id: number) {
        const locker = await this.lockerRepo.findOne({ where: { id } });
        if (!locker) throw new NotFoundException('Locker tidak ditemukan');
        if (locker.status === 'OCCUPIED') {
            throw new BadRequestException('Locker sedang terpakai, tidak bisa dihapus');
        }
        await this.lockerRepo.remove(locker);
        return { message: 'Locker berhasil dihapus' };
    }

    // ─── LOCKER STATS ────────────────────────────────────────────────

    async getStats() {
        const total = await this.lockerRepo.count({ where: { isActive: true } });
        const available = await this.lockerRepo.count({ where: { status: 'AVAILABLE', isActive: true } });
        const occupied = await this.lockerRepo.count({ where: { status: 'OCCUPIED', isActive: true } });
        const maintenance = await this.lockerRepo.count({ where: { status: 'MAINTENANCE', isActive: true } });
        const todaySessions = await this.sessionRepo
            .createQueryBuilder('s')
            .where('DATE(s.createdAt) = CURRENT_DATE')
            .getCount();

        return { total, available, occupied, maintenance, todaySessions };
    }

    // ─── CHECK-IN / CHECK-OUT ────────────────────────────────────────

    async checkIn(lockerId: number, dto: {
        customerName: string;
        phone?: string;
        identityNumber?: string;
        pin: string; // plain PIN (will be hashed)
        memberId?: number;
        memberName?: string;
        isMemberFree?: boolean;
        handledByName?: string;
        handledById?: number;
    }) {
        // Validate locker
        const locker = await this.lockerRepo.findOne({ where: { id: lockerId } });
        if (!locker) throw new NotFoundException('Locker tidak ditemukan');
        if (!locker.isActive) throw new BadRequestException('Locker tidak aktif');
        if (locker.status !== 'AVAILABLE') {
            throw new BadRequestException(`Locker tidak tersedia (status: ${locker.status})`);
        }

        // Validate PIN format
        if (!/^\d{4}$/.test(dto.pin)) {
            throw new BadRequestException('PIN harus 4 digit angka');
        }

        // Check if member already has an active locker (1 locker per member)
        if (dto.memberId) {
            const existingMemberSession = await this.sessionRepo.findOne({
                where: { memberId: dto.memberId, status: 'ACTIVE' },
            });
            if (existingMemberSession) {
                const existingLocker = await this.lockerRepo.findOne({
                    where: { id: existingMemberSession.lockerId },
                });
                throw new BadRequestException(
                    `Member ini sudah menggunakan Locker ${existingLocker?.number || '#' + existingMemberSession.lockerId}`
                );
            }
        }

        // Hash PIN with bcrypt
        const pinHash = await bcrypt.hash(dto.pin, 10);

        // Determine price
        const price = dto.isMemberFree ? 0 : locker.pricePerHour;

        // Create session
        const session = this.sessionRepo.create({
            lockerId,
            customerName: dto.customerName,
            phone: dto.phone,
            identityNumber: dto.identityNumber,
            pinHash,
            memberId: dto.memberId || null,
            memberName: dto.memberName || null,
            isMemberFree: dto.isMemberFree || false,
            price,
            startTime: new Date(),
            status: 'ACTIVE',
            handledByName: dto.handledByName,
            handledById: dto.handledById || null,
            failedPinAttempts: 0,
            isLocked: false,
        });

        await this.sessionRepo.save(session);

        // Update locker status
        locker.status = 'OCCUPIED';
        await this.lockerRepo.save(locker);

        return {
            message: 'Check-in berhasil',
            locker: { id: locker.id, number: locker.number, label: locker.label },
            session: {
                id: session.id,
                customerName: session.customerName,
                startTime: session.startTime,
                isMemberFree: session.isMemberFree,
            },
        };
    }

    async verifyPin(lockerId: number, pin: string): Promise<{
        valid: boolean;
        session?: Partial<LockerSession>;
        message?: string;
        isLocked?: boolean;
        failedAttempts?: number;
    }> {
        const session = await this.sessionRepo.findOne({
            where: { lockerId, status: 'ACTIVE' },
        });

        if (!session) {
            throw new NotFoundException('Tidak ada sesi aktif pada locker ini');
        }

        // Check if locked due to too many wrong attempts
        if (session.isLocked) {
            return {
                valid: false,
                isLocked: true,
                message: 'Locker dikunci karena terlalu banyak percobaan PIN salah. Hubungi staff.',
                failedAttempts: session.failedPinAttempts,
            };
        }

        const isValid = await bcrypt.compare(pin, session.pinHash);

        if (!isValid) {
            // Increment failed attempts
            session.failedPinAttempts += 1;
            const MAX_ATTEMPTS = 5;

            if (session.failedPinAttempts >= MAX_ATTEMPTS) {
                session.isLocked = true;
                await this.sessionRepo.save(session);
                return {
                    valid: false,
                    isLocked: true,
                    message: `Locker dikunci setelah ${MAX_ATTEMPTS}x percobaan salah. Hubungi staff.`,
                    failedAttempts: session.failedPinAttempts,
                };
            }

            await this.sessionRepo.save(session);
            return {
                valid: false,
                message: `PIN salah. Sisa percobaan: ${MAX_ATTEMPTS - session.failedPinAttempts}`,
                failedAttempts: session.failedPinAttempts,
            };
        }

        // PIN valid — reset failed attempts
        session.failedPinAttempts = 0;
        await this.sessionRepo.save(session);

        return {
            valid: true,
            session: {
                id: session.id,
                customerName: session.customerName,
                phone: session.phone,
                memberId: session.memberId,
                memberName: session.memberName,
                isMemberFree: session.isMemberFree,
                price: session.price,
                startTime: session.startTime,
                handledByName: session.handledByName,
            },
        };
    }

    async unlockByStaff(lockerId: number) {
        const session = await this.sessionRepo.findOne({
            where: { lockerId, status: 'ACTIVE' },
        });
        if (!session) throw new NotFoundException('Tidak ada sesi aktif');
        session.isLocked = false;
        session.failedPinAttempts = 0;
        await this.sessionRepo.save(session);
        return { message: 'Locker berhasil dibuka oleh staff' };
    }

    async checkOut(lockerId: number, pin: string, staffName?: string) {
        // Verify PIN first
        const verification = await this.verifyPin(lockerId, pin);
        if (!verification.valid) {
            return verification; // Return the error/lock status
        }

        const session = await this.sessionRepo.findOne({
            where: { lockerId, status: 'ACTIVE' },
        });
        if (!session) throw new NotFoundException('Sesi tidak ditemukan');

        const endTime = new Date();
        const durationHours = (endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);

        // Calculate final price
        const locker = await this.lockerRepo.findOne({ where: { id: lockerId } });
        const finalPrice = session.isMemberFree ? 0 :
            locker ? Math.ceil(durationHours) * Number(locker.pricePerHour) : 0;

        // Complete session
        session.status = 'COMPLETED';
        session.endTime = endTime;
        session.price = finalPrice;
        if (staffName) session.handledByName = staffName;
        await this.sessionRepo.save(session);

        // Free the locker
        if (locker) {
            locker.status = 'AVAILABLE';
            await this.lockerRepo.save(locker);
        }

        return {
            message: 'Check-out berhasil',
            summary: {
                customerName: session.customerName,
                lockerNumber: locker?.number,
                startTime: session.startTime,
                endTime,
                durationMinutes: Math.round(durationHours * 60),
                finalPrice,
                isMemberFree: session.isMemberFree,
            },
        };
    }

    // Force checkout by staff (no PIN required)
    async forceCheckOut(lockerId: number, staffName?: string) {
        const session = await this.sessionRepo.findOne({
            where: { lockerId, status: 'ACTIVE' },
        });
        if (!session) throw new NotFoundException('Tidak ada sesi aktif pada locker ini');

        const endTime = new Date();
        const locker = await this.lockerRepo.findOne({ where: { id: lockerId } });

        session.status = 'COMPLETED';
        session.endTime = endTime;
        if (staffName) session.handledByName = `[FORCE] ${staffName}`;
        await this.sessionRepo.save(session);

        if (locker) {
            locker.status = 'AVAILABLE';
            await this.lockerRepo.save(locker);
        }

        return { message: 'Force checkout berhasil oleh staff', session };
    }

    // ─── SESSIONS & HISTORY ──────────────────────────────────────────

    async getActiveSessions() {
        return this.sessionRepo.find({
            where: { status: 'ACTIVE' },
            relations: ['locker'],
            order: { startTime: 'ASC' },
        });
    }

    async getHistory(filters: {
        start?: string;
        end?: string;
        page?: number;
        limit?: number;
        search?: string;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;

        const qb = this.sessionRepo.createQueryBuilder('s')
            .leftJoinAndSelect('s.locker', 'locker')
            .where('s.status != :active', { active: 'ACTIVE' })
            .orderBy('s.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (filters.start) {
            qb.andWhere('s.startTime >= :start', { start: new Date(filters.start) });
        }
        if (filters.end) {
            const endDate = new Date(filters.end);
            endDate.setHours(23, 59, 59, 999);
            qb.andWhere('s.startTime <= :end', { end: endDate });
        }
        if (filters.search) {
            qb.andWhere('(LOWER(s.customerName) LIKE :s OR s.phone LIKE :s)', {
                s: `%${filters.search.toLowerCase()}%`,
            });
        }

        const [items, total] = await qb.getManyAndCount();
        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    // Check if member has free locker benefit
    async getMemberLockerBenefit(memberId: number): Promise<{
        hasFreeLocker: boolean;
        currentLocker?: { number: string; id: number } | null;
        isCurrentlyUsing: boolean;
    }> {
        // Check if member currently has an active session
        const activeSession = await this.sessionRepo.findOne({
            where: { memberId, status: 'ACTIVE' },
        });

        if (activeSession) {
            const locker = await this.lockerRepo.findOne({ where: { id: activeSession.lockerId } });
            return {
                hasFreeLocker: true,
                currentLocker: locker ? { number: locker.number, id: locker.id } : null,
                isCurrentlyUsing: true,
            };
        }

        return {
            hasFreeLocker: true, // All members get free locker (can be customized by tier)
            currentLocker: null,
            isCurrentlyUsing: false,
        };
    }
}
