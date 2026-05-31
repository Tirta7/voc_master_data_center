"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LockerService", {
    enumerable: true,
    get: function() {
        return LockerService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
const _lockerentity = require("./entities/locker.entity");
const _lockersessionentity = require("./entities/locker-session.entity");
const _mqttservice = require("../mqtt/mqtt.service");
const _memberservice = require("../member/member.service");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let LockerService = class LockerService {
    // ─── LOCKER MANAGEMENT ──────────────────────────────────────────
    async getAllLockers() {
        const lockers = await this.lockerRepo.find({
            where: {
                deletedAt: (0, _typeorm1.IsNull)()
            },
            order: {
                number: 'ASC'
            }
        });
        // Attach active session to each locker
        const activeSessions = await this.sessionRepo.find({
            where: {
                status: 'ACTIVE'
            }
        });
        const sessionMap = new Map();
        activeSessions.forEach((s)=>sessionMap.set(s.lockerId, s));
        return lockers.map((locker)=>({
                ...locker,
                activeSession: sessionMap.get(locker.id) ? {
                    id: sessionMap.get(locker.id).id,
                    customerName: sessionMap.get(locker.id).customerName,
                    phone: sessionMap.get(locker.id).phone,
                    memberId: sessionMap.get(locker.id).memberId,
                    memberName: sessionMap.get(locker.id).memberName,
                    isMemberFree: sessionMap.get(locker.id).isMemberFree,
                    startTime: sessionMap.get(locker.id).startTime,
                    handledByName: sessionMap.get(locker.id).handledByName,
                    failedPinAttempts: sessionMap.get(locker.id).failedPinAttempts,
                    isLocked: sessionMap.get(locker.id).isLocked
                } : null
            }));
    }
    async createLocker(dto) {
        const existing = await this.lockerRepo.findOne({
            where: {
                number: dto.number
            }
        });
        if (existing) {
            throw new _common.BadRequestException(`Locker nomor "${dto.number}" sudah ada`);
        }
        const locker = this.lockerRepo.create({
            number: dto.number,
            label: dto.label,
            categoryId: dto.categoryId || undefined,
            pricePerHour: dto.pricePerHour || 0,
            notes: dto.notes,
            status: _lockerentity.LockerStatus.AVAILABLE
        });
        return this.lockerRepo.save(locker);
    }
    // Bulk create lockers (e.g. add 10 lockers at once A01–A10)
    async bulkCreateLockers(dto) {
        const results = [];
        for(let i = dto.startNumber; i < dto.startNumber + dto.count; i++){
            const number = `${dto.prefix}${String(i).padStart(2, '0')}`;
            try {
                const locker = await this.createLocker({
                    number,
                    categoryId: dto.categoryId,
                    pricePerHour: dto.pricePerHour
                });
                results.push(locker);
            } catch  {
            // Skip duplicates in bulk
            }
        }
        return results;
    }
    async updateLocker(id, dto) {
        const locker = await this.lockerRepo.findOne({
            where: {
                id,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        if (!locker) throw new _common.NotFoundException('Locker tidak ditemukan');
        // Can't manually set to OCCUPIED — only via check-in
        if (dto.status === 'OCCUPIED') {
            throw new _common.BadRequestException('Status OCCUPIED hanya bisa melalui check-in customer');
        }
        // Can't change status if currently occupied (must checkout first)
        if (locker.status === 'OCCUPIED' && dto.status) {
            const activeSession = await this.sessionRepo.findOne({
                where: {
                    lockerId: id,
                    status: 'ACTIVE'
                }
            });
            if (activeSession) {
                throw new _common.BadRequestException('Locker sedang terpakai. Selesaikan check-out dulu');
            }
        }
        Object.assign(locker, dto);
        return this.lockerRepo.save(locker);
    }
    async deleteLocker(id) {
        const locker = await this.lockerRepo.findOne({
            where: {
                id
            }
        });
        if (!locker) throw new _common.NotFoundException('Locker tidak ditemukan');
        if (locker.status === 'OCCUPIED') {
            throw new _common.BadRequestException('Locker sedang terpakai, tidak bisa dihapus');
        }
        const timestamp = new Date().getTime();
        locker.deletedAt = new Date();
        locker.number = `${locker.number} (DELETED-${timestamp})`;
        await this.lockerRepo.save(locker);
        this.mqttService.broadcastLockerUpdate({
            id,
            _action: 'DELETE'
        });
        return {
            message: 'Locker berhasil dihapus'
        };
    }
    // ─── LOCKER STATS ────────────────────────────────────────────────
    async getStats() {
        const total = await this.lockerRepo.count({
            where: {
                isActive: true
            }
        });
        const available = await this.lockerRepo.count({
            where: {
                status: _lockerentity.LockerStatus.AVAILABLE,
                isActive: true
            }
        });
        const occupied = await this.lockerRepo.count({
            where: {
                status: _lockerentity.LockerStatus.OCCUPIED,
                isActive: true
            }
        });
        const maintenance = await this.lockerRepo.count({
            where: {
                status: _lockerentity.LockerStatus.MAINTENANCE,
                isActive: true
            }
        });
        const todaySessions = await this.sessionRepo.createQueryBuilder('s').where('DATE(s.createdAt) = CURRENT_DATE').getCount();
        return {
            total,
            available,
            occupied,
            maintenance,
            todaySessions
        };
    }
    // ─── CHECK-IN / CHECK-OUT ────────────────────────────────────────
    async checkIn(lockerId, dto) {
        // Validate locker
        const locker = await this.lockerRepo.findOne({
            where: {
                id: lockerId
            }
        });
        if (!locker) throw new _common.NotFoundException('Locker tidak ditemukan');
        if (!locker.isActive) throw new _common.BadRequestException('Locker tidak aktif');
        if (locker.status !== _lockerentity.LockerStatus.AVAILABLE) {
            throw new _common.BadRequestException(`Locker tidak tersedia (status: ${locker.status})`);
        }
        // Validate PIN format
        if (!/^\d{4}$/.test(dto.pin)) {
            throw new _common.BadRequestException('PIN harus 4 digit angka');
        }
        // Check if member already has an active locker (1 locker per member)
        if (dto.memberId) {
            const existingMemberSession = await this.sessionRepo.findOne({
                where: {
                    memberId: dto.memberId,
                    status: 'ACTIVE'
                }
            });
            if (existingMemberSession) {
                const existingLocker = await this.lockerRepo.findOne({
                    where: {
                        id: existingMemberSession.lockerId
                    }
                });
                throw new _common.BadRequestException(`Member ini sudah menggunakan Locker ${existingLocker?.number || '#' + existingMemberSession.lockerId}`);
            }
        }
        // Hash PIN with bcrypt
        const pinHash = await _bcrypt.hash(dto.pin, 10);
        // Determine price based on Member Tier
        let isMemberFree = !!dto.isMemberFree;
        if (dto.memberId) {
            try {
                const member = await this.memberService.getMemberById(dto.memberId);
                if (member?.tier?.discountConfig?.isFreeLocker) {
                    isMemberFree = true;
                }
            } catch (err) {
            // Fallback to manual flag if member fetch fails
            }
        }
        const price = isMemberFree ? 0 : locker.pricePerHour;
        // Create session
        const session = this.sessionRepo.create({
            lockerId,
            customerName: dto.customerName,
            phone: dto.phone,
            identityNumber: dto.identityNumber,
            pinHash,
            memberId: dto.memberId || null,
            memberName: dto.memberName || null,
            isMemberFree: isMemberFree,
            price: price,
            startTime: new Date(),
            status: 'ACTIVE',
            handledByName: dto.handledByName,
            handledById: dto.handledById || null,
            failedPinAttempts: 0,
            isLocked: false
        });
        await this.sessionRepo.save(session);
        // Update locker status
        locker.status = _lockerentity.LockerStatus.OCCUPIED;
        await this.lockerRepo.save(locker);
        // Physical unlock via MQTT
        if (locker.macAddress && locker.relayPin) {
            this.mqttService.publishLockerCommand(locker.macAddress, locker.id, true, locker.relayPin);
        }
        this.mqttService.broadcastLockerUpdate({
            ...locker,
            activeSession: session,
            _action: 'UPDATE'
        });
        return {
            message: 'Check-in berhasil',
            locker: {
                id: locker.id,
                number: locker.number,
                label: locker.label
            },
            session: {
                id: session.id,
                customerName: session.customerName,
                startTime: session.startTime,
                isMemberFree: session.isMemberFree
            }
        };
    }
    async verifyPin(lockerId, pin) {
        const session = await this.sessionRepo.findOne({
            where: {
                lockerId,
                status: 'ACTIVE'
            }
        });
        if (!session) {
            throw new _common.NotFoundException('Tidak ada sesi aktif pada locker ini');
        }
        // Check if locked due to too many wrong attempts
        if (session.isLocked) {
            return {
                valid: false,
                isLocked: true,
                message: 'Locker dikunci karena terlalu banyak percobaan PIN salah. Hubungi staff.',
                failedAttempts: session.failedPinAttempts
            };
        }
        const isValid = await _bcrypt.compare(pin, session.pinHash);
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
                    failedAttempts: session.failedPinAttempts
                };
            }
            await this.sessionRepo.save(session);
            return {
                valid: false,
                message: `PIN salah. Sisa percobaan: ${MAX_ATTEMPTS - session.failedPinAttempts}`,
                failedAttempts: session.failedPinAttempts
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
                handledByName: session.handledByName
            }
        };
    }
    async unlockByStaff(lockerId) {
        const session = await this.sessionRepo.findOne({
            where: {
                lockerId,
                status: 'ACTIVE'
            }
        });
        if (!session) throw new _common.NotFoundException('Tidak ada sesi aktif');
        session.isLocked = false;
        session.failedPinAttempts = 0;
        await this.sessionRepo.save(session);
        // Physical unlock via staff override
        const locker = await this.lockerRepo.findOne({
            where: {
                id: lockerId
            }
        });
        if (locker?.macAddress && locker?.relayPin) {
            this.mqttService.publishLockerCommand(locker.macAddress, locker.id, true, locker.relayPin);
        }
        return {
            message: 'Locker berhasil dibuka oleh staff'
        };
    }
    async checkOut(lockerId, pin, staffName) {
        // Verify PIN first
        const verification = await this.verifyPin(lockerId, pin);
        if (!verification.valid) {
            return verification; // Return the error/lock status
        }
        const session = await this.sessionRepo.findOne({
            where: {
                lockerId,
                status: 'ACTIVE'
            }
        });
        if (!session) throw new _common.NotFoundException('Sesi tidak ditemukan');
        const endTime = new Date();
        const durationHours = (endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
        // Calculate final price
        const locker = await this.lockerRepo.findOne({
            where: {
                id: lockerId
            }
        });
        const finalPrice = session.isMemberFree ? 0 : locker ? Math.ceil(durationHours) * Number(locker.pricePerHour) : 0;
        // Complete session
        session.status = 'COMPLETED';
        session.endTime = endTime;
        session.price = finalPrice;
        if (staffName) session.handledByName = staffName;
        await this.sessionRepo.save(session);
        // Free the locker
        if (locker) {
            locker.status = _lockerentity.LockerStatus.AVAILABLE;
            await this.lockerRepo.save(locker);
            // Physical lock via MQTT
            if (locker.macAddress && locker.relayPin) {
                this.mqttService.publishLockerCommand(locker.macAddress, locker.id, false, locker.relayPin);
            }
        }
        this.mqttService.broadcastLockerUpdate({
            id: lockerId,
            type: 'locker',
            _action: 'UPDATE'
        });
        return {
            message: 'Check-out berhasil',
            summary: {
                customerName: session.customerName,
                lockerNumber: locker?.number,
                startTime: session.startTime,
                endTime,
                durationMinutes: Math.round(durationHours * 60),
                finalPrice,
                isMemberFree: session.isMemberFree
            }
        };
    }
    // Force checkout by staff (no PIN required)
    async forceCheckOut(lockerId, staffName) {
        const session = await this.sessionRepo.findOne({
            where: {
                lockerId,
                status: 'ACTIVE'
            }
        });
        if (!session) throw new _common.NotFoundException('Tidak ada sesi aktif pada locker ini');
        const endTime = new Date();
        const locker = await this.lockerRepo.findOne({
            where: {
                id: lockerId
            }
        });
        session.status = 'COMPLETED';
        session.endTime = endTime;
        if (staffName) session.handledByName = `[FORCE] ${staffName}`;
        await this.sessionRepo.save(session);
        if (locker) {
            locker.status = _lockerentity.LockerStatus.AVAILABLE;
            await this.lockerRepo.save(locker);
        }
        return {
            message: 'Force checkout berhasil oleh staff',
            session
        };
    }
    // ─── SESSIONS & HISTORY ──────────────────────────────────────────
    async getActiveSessions() {
        return this.sessionRepo.find({
            where: {
                status: 'ACTIVE'
            },
            relations: [
                'locker'
            ],
            order: {
                startTime: 'ASC'
            }
        });
    }
    async getHistory(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const qb = this.sessionRepo.createQueryBuilder('s').leftJoinAndSelect('s.locker', 'locker').where('s.status != :active', {
            active: 'ACTIVE'
        }).orderBy('s.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
        if (filters.start) {
            qb.andWhere('s.startTime >= :start', {
                start: new Date(filters.start)
            });
        }
        if (filters.end) {
            const endDate = new Date(filters.end);
            endDate.setHours(23, 59, 59, 999);
            qb.andWhere('s.startTime <= :end', {
                end: endDate
            });
        }
        if (filters.search) {
            qb.andWhere('(LOWER(s.customerName) LIKE :s OR s.phone LIKE :s)', {
                s: `%${filters.search.toLowerCase()}%`
            });
        }
        const [items, total] = await qb.getManyAndCount();
        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }
    // Check if member has free locker benefit
    async getMemberLockerBenefit(memberId) {
        // Check if member currently has an active session
        const activeSession = await this.sessionRepo.findOne({
            where: {
                memberId,
                status: 'ACTIVE'
            }
        });
        if (activeSession) {
            const locker = await this.lockerRepo.findOne({
                where: {
                    id: activeSession.lockerId
                }
            });
            return {
                hasFreeLocker: true,
                currentLocker: locker ? {
                    number: locker.number,
                    id: locker.id
                } : null,
                isCurrentlyUsing: true
            };
        }
        return {
            hasFreeLocker: true,
            currentLocker: null,
            isCurrentlyUsing: false
        };
    }
    constructor(lockerRepo, sessionRepo, mqttService, memberService){
        this.lockerRepo = lockerRepo;
        this.sessionRepo = sessionRepo;
        this.mqttService = mqttService;
        this.memberService = memberService;
    }
};
LockerService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_lockerentity.Locker)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_lockersessionentity.LockerSession)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _mqttservice.MqttService === "undefined" ? Object : _mqttservice.MqttService,
        typeof _memberservice.MemberService === "undefined" ? Object : _memberservice.MemberService
    ])
], LockerService);

//# sourceMappingURL=locker.service.js.map