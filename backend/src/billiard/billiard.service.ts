import { Injectable, Inject, OnModuleInit, Logger, NotFoundException, forwardRef, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Table, TableStatus } from './entities/table.entity';
import { Session } from './entities/session.entity';
import { BilliardPackage, PackageType } from './entities/billiard-package.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { TransactionService } from '../transaction/transaction.service';
import { SettingsService } from '../settings/settings.service';
import type { CafeService } from '../cafe/cafe.service';
import { PromoService } from '../promo/promo.service';
import { PromoType } from '../promo/entities/promo.entity';
import { ReportService } from '../report/report.service';
import { WaitingListService } from '../waiting-list/waiting-list.service';
import { MemberService } from '../member/member.service';

@Injectable()
export class BilliardService implements OnModuleInit {
    constructor(
        @InjectRepository(Table)
        private readonly tableRepository: Repository<Table>,
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
        @InjectRepository(BilliardPackage)
        private readonly packageRepository: Repository<BilliardPackage>,
        @Inject('MQTT_SERVICE')
        private readonly mqttClient: ClientProxy,
        private readonly billiardGateway: BilliardGateway,
        private readonly transactionService: TransactionService,
        private readonly settingsService: SettingsService,
        @Inject(forwardRef(() => { const { CafeService } = require('../cafe/cafe.service'); return CafeService; }))
        private readonly cafeService: CafeService,
        private readonly promoService: PromoService,
        private readonly reportService: ReportService,
        @Inject(forwardRef(() => WaitingListService))
        private readonly waitingListService: WaitingListService,
        private readonly memberService: MemberService,
    ) { }

    private readonly logger = new Logger(BilliardService.name);

    async onModuleInit() {
        try {
            this.logger.log('Connecting to MQTT Broker...');
            // await this.mqttClient.connect();
            this.logger.log('Connected to MQTT Broker successfully (MOCKED)');
        } catch (err) {
            this.logger.warn('Could not connect to MQTT Broker. Hardware control will be disabled, but application will continue.');
        }
    }

    async getAllTables(): Promise<Table[]> {
        const tables = await this.tableRepository.find({ order: { createdAt: 'DESC' } });
        const tableIds = tables.filter(t => t.status !== TableStatus.AVAILABLE).map(t => t.id);

        if (tableIds.length === 0) {
            return tables.map(t => {
                (t as any).type = 'billiard';
                return t;
            });
        }

        const activeTransactions = await this.transactionService.getActiveTransactionsByTableIds(tableIds);
        // transactions are sorted DESC, so the newest one comes first.
        // Array.reverse() ensures that if there are multiple, the newest will overwrite older ones in the Map constructor,
        // OR we can just build it manually. Let's build it manually to be explicit.
        const transactionMap = new Map();
        [...activeTransactions].reverse().forEach(tr => transactionMap.set(tr.tableId, tr));

        return tables.map(table => {
            (table as any).type = 'billiard';
            const transaction = transactionMap.get(table.id);
            if (transaction) {
                table.activeTransaction = transaction;
                table.grandTotal = Number(transaction.grandTotal || 0);
            }
            return table;
        });
    }

    /**
     * Helper to consistently attach virtual transaction data to a table object
     * before broadcasting or returning to frontend.
     */
    async attachTransactionData(table: Table): Promise<Table> {
        (table as any).type = 'billiard';
        if (table.status !== TableStatus.AVAILABLE) {
            const transaction = await this.transactionService.getActiveTransactionByTable(table.id);
            if (transaction) {
                table.activeTransaction = transaction;
                table.grandTotal = Number(transaction.grandTotal || 0);
            }
        }
        return table;
    }

    async getTableById(id: number): Promise<Table | null> {
        return this.tableRepository.findOne({ where: { id } });
    }

    async createTable(tableData: Partial<Table>): Promise<Table> {
        const tableName = tableData.tableName?.trim();
        if (!tableName) throw new BadRequestException('Nama meja harus diisi.');

        const existing = await this.tableRepository
            .createQueryBuilder('table')
            .where('LOWER(table.tableName) = LOWER(:tableName)', { tableName })
            .getOne();
        if (existing) throw new BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);

        const table = this.tableRepository.create({ ...tableData, tableName });
        const savedTable = await this.tableRepository.save(table);
        this.billiardGateway.broadcastTableUpdate({ ...savedTable, type: 'billiard', _action: 'ADD' });
        return savedTable;
    }

    async updateTableStatus(id: number, status: TableStatus): Promise<Table | null> {
        const table = await this.getTableById(id);
        if (table) {
            table.status = status;
            const savedTable = await this.tableRepository.save(table);
            await this.attachTransactionData(savedTable);
            this.billiardGateway.broadcastTableUpdate(savedTable);
            return savedTable;
        }
        return null;
    }

    async updateTable(id: number, data: Partial<Table>): Promise<Table> {
        const table = await this.getTableById(id);
        if (!table) throw new NotFoundException('Table not found');

        if (data.tableName) {
            const tableName = data.tableName.trim();
            const existing = await this.tableRepository
                .createQueryBuilder('table')
                .where('LOWER(table.tableName) = LOWER(:tableName) AND table.id != :id', { tableName, id })
                .getOne();
            if (existing) throw new BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);
            table.tableName = tableName;
        }

        Object.assign(table, { ...data, tableName: data.tableName?.trim() || table.tableName });
        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);
        this.billiardGateway.broadcastTableUpdate({ ...savedTable, _action: 'UPDATE' });
        return savedTable;
    }

    async deleteTable(id: number): Promise<void> {
        const table = await this.getTableById(id);
        if (!table) throw new NotFoundException('Table not found');

        if (table.status === TableStatus.IN_USE || table.status === TableStatus.MAINTENANCE) {
            throw new Error(`Cannot delete table while status is ${table.status}`);
        }

        await this.tableRepository.delete(id);

        // Notify frontend to remove table from lists securely
        this.billiardGateway.broadcastTableUpdate({ id, type: 'billiard', _action: 'DELETE' } as any);
    }

    // --- Package Management ---
    async getPackages(): Promise<BilliardPackage[]> {
        return this.packageRepository.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
    }

    async createPackage(data: Partial<BilliardPackage>): Promise<BilliardPackage> {
        const pkg = this.packageRepository.create(data);
        return this.packageRepository.save(pkg);
    }

    async updatePackage(id: number, data: Partial<BilliardPackage>): Promise<BilliardPackage> {
        const pkg = await this.packageRepository.findOne({ where: { id } });
        if (!pkg) throw new NotFoundException('Package not found');

        Object.assign(pkg, data);
        return this.packageRepository.save(pkg);
    }

    async deletePackage(id: number): Promise<void> {
        const pkg = await this.packageRepository.findOne({ where: { id } });
        if (!pkg) throw new NotFoundException('Package not found');

        // Soft delete or hard delete? Let's do hard delete for now as per user request context usually implies removal
        // But better to check if it's being used? For now, standard delete
        await this.packageRepository.delete(id);
    }

    async toggleLight(id: number, isOn: boolean): Promise<Table | null> {
        const table = await this.getTableById(id);
        if (!table) return null;

        table.isLightOn = isOn;

        // MQTT Topic pattern: billiard/table/{macAddress}/light/set
        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, { status: isOn ? 'ON' : 'OFF' });

        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);

        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }

    async startSession(tableId: number, type: 'prepaid' | 'open', durationMinutes?: number, customerName?: string, packageId?: number, customPriceSettings?: { basePrice: number, timeSlots: any[] }, promoId?: number, userId?: number, userName?: string, memberId?: number) {
        this.logger.log(`BilliardService.startSession called for tableId: ${tableId}, customer: ${customerName}, memberId: ${memberId}, packageId: ${packageId}`);
        const table = await this.getTableById(tableId);

        if (!table) {
            this.logger.warn(`Table ${tableId} NOT FOUND`);
            return null;
        }

        if (table.status !== TableStatus.AVAILABLE) {
            this.logger.warn(`Table ${tableId} is NOT AVAILABLE (Status: ${table.status}). Aborting startSession.`);
            return null;
        }

        // 1 Member 1 Table Locking System
        if (memberId) {
            const activeSession = await this.tableRepository.findOne({
                where: { memberId, status: Not(TableStatus.AVAILABLE) }
            });
            if (activeSession && activeSession.id !== tableId) {
                throw new ConflictException(`Member ini sedang digunakan di Meja ${activeSession.tableName}. Harap selesaikan sesi sebelumnya.`);
            }
        }

        let selectedPackage: BilliardPackage | null = null;
        let selectedPromo: any = null;

        if (promoId) {
            // Find promo. We use updatePromo with empty data as a findOne workaround or just use repo if available.
            // But PromoService exports PromoService, so we can add a findOne if needed.
            // For now, let's just use the service to get active promos and filter.
            const activePromos = await this.promoService.getActivePromos();
            selectedPromo = activePromos.find(p => p.id === promoId);

            if (selectedPromo && (selectedPromo.type === PromoType.PACKAGE || selectedPromo.type === PromoType.BUNDLE)) {
                durationMinutes = selectedPromo.ruleJson.requireBilliardMinutes;
                type = 'prepaid'; // Promo packages are usually prepaid
            }
        } else if (packageId) {
            selectedPackage = await this.packageRepository.findOne({ where: { id: packageId } });
            if (selectedPackage) {
                if (selectedPackage.type === PackageType.FIXED || selectedPackage.type === PackageType.DURATION) {
                    durationMinutes = Number(selectedPackage.durationMinutes);
                } else if (!durationMinutes) {
                    // Default to 60 for HOURLY if duration not passed
                    durationMinutes = 60;
                }
                this.logger.log(`Package ${packageId} (${selectedPackage.name}) type: ${selectedPackage.type}, Assigned durationMinutes: ${durationMinutes}`);
            }
        }

        // Final sanity check for durationMinutes
        if (durationMinutes) {
            durationMinutes = Number(durationMinutes);
            if (isNaN(durationMinutes)) durationMinutes = 0;
        }

        this.logger.log(`Table ${tableId} session start. Type: ${type}, Final durationMinutes: ${durationMinutes}`);

        table.status = TableStatus.IN_USE;
        table.isLightOn = true;
        table.sessionType = type;
        table.startTime = new Date();
        table.memberId = memberId || null;
        table.packageId = packageId || null;

        // Wipe stale active package price unless it's explicitly being passed down in custom overrides
        if (!customPriceSettings && !packageId) {
            table.activePackagePrice = null;
        }

        // Wipe stale remaining minutes when opening a new session
        table.remainingMinutes = null;

        // Check if starting with a duration that is already below the "Ending Soon" threshold
        if (type === 'prepaid' && durationMinutes) {
            const globalSettings = await this.settingsService.getSettings();
            const threshold = globalSettings.endingSoonThreshold || 5;
            if (durationMinutes <= threshold) {
                table.status = TableStatus.WARNING;
            }
        }

        let transaction = await this.transactionService.getActiveTransactionByTable(tableId);
        if (!transaction) {
            transaction = await this.transactionService.createTransaction(tableId, userId);
        }

        if (memberId) {
            await this.transactionService.updateTransaction(transaction.id, { memberId });
        } else {
            // Defense in depth: Ensure new transaction also has null memberId if guest
            await this.transactionService.updateTransaction(transaction.id, { memberId: null });
        }

        let finalCustomerName = customerName || (table.isBooked && table.bookedByName ? table.bookedByName : 'Tamu');
        this.logger.log(`Session start for Table ${tableId}. Provided: "${customerName}", Booked: "${table.bookedByName}", Final: "${finalCustomerName}"`);

        if (table.isBooked) {
            // Mark waiting list as checked-in
            if (table.bookedByWaitingId) {
                await this.waitingListService.checkIn(table.bookedByWaitingId);
            }
            // Clear booking fields on local object
            table.isBooked = false;
            table.bookedByWaitingId = null as any;
            table.bookedByName = null as any;
        }

        let fareName = 'Open Table';
        if (transaction) {
            if (selectedPromo) {
                fareName = selectedPromo.name;
            } else if (selectedPackage) {
                fareName = selectedPackage.name;
            } else if (type === 'prepaid') {
                fareName = 'Custom Session';
            }

            transaction.customerName = finalCustomerName;
            transaction.fareName = fareName;
            await this.transactionService.updateTransaction(transaction.id, { customerName: finalCustomerName, fareName });
        }

        if (packageId) {
            table.packageId = packageId;
        }

        if (memberId) {
            table.memberId = memberId;
        }

        // Handle Session Timing & Pricing
        if (type === 'prepaid' && durationMinutes) {
            table.endTime = new Date(table.startTime!.getTime() + durationMinutes * 60000);
            table.remainingMinutes = durationMinutes;

            if (transaction) {
                let sessionPrice = 0;

                if (selectedPromo) {
                    sessionPrice = Number(selectedPromo.ruleJson.fixedPrice) || 0;
                } else if (selectedPackage) {
                    const activeRate = this.transactionService.calculateCurrentPackagePrice(selectedPackage);
                    sessionPrice = selectedPackage.type === PackageType.FIXED ? activeRate : (durationMinutes / 60) * activeRate;
                } else {
                    const globalSettings = await this.settingsService.getSettings();
                    const customConfig = table.category === 'VIP' ? globalSettings.customDurationPricingVip : globalSettings.customDurationPricingRegular;
                    if (customConfig) {
                        const activeRate = this.transactionService.calculateCurrentPackagePrice({ price: customConfig.basePrice, timeSlots: customConfig.timeSlots });
                        sessionPrice = (durationMinutes / 60) * activeRate;
                    }
                }

                table.activePackagePrice = sessionPrice;
                transaction = await this.transactionService.setBilliardTotal(transaction.id, sessionPrice, {
                    title: selectedPromo ? selectedPromo.name : (selectedPackage ? selectedPackage.name : 'Layanan Utama'),
                    duration: durationMinutes,
                    subtotal: sessionPrice
                }, userName);

                // --- AUTO-DEBIT: Potong Saldo Otomatis untuk Member (Prepaid) ---
                if (memberId && sessionPrice > 0) {
                    try {
                        this.logger.log(`AUTO-DEBIT: Deducting ${sessionPrice} from member ${memberId} for prepaid session`);
                        await this.transactionService.processMultiPayerPayment(
                            transaction.id,
                            {
                                orderItemIds: [],
                                payerName: finalCustomerName,
                                paymentMethod: 'MEMBER',
                                billiardPortion: sessionPrice
                            },
                            userId
                        );
                        // Refresh transaction after payment
                        transaction = await this.transactionService.getTransactionById(transaction.id);
                    } catch (err) {
                        this.logger.error(`AUTO-DEBIT FAILED for table ${tableId}: ${err.message}`);

                        // BROADCAST WARNING before throwing
                        this.billiardGateway.broadcastWarning(
                            'Gagal Potong Saldo',
                            `Session gagal dimulai: ${err.message}`,
                            tableId
                        );

                        // FATAL ERROR: Abort session start if payment fails
                        throw err;
                    }
                }
            }
        } else {
            table.endTime = null;
            table.remainingMinutes = null;
            table.activePackagePrice = null;
        }

        // AUTO-ORDER Items if Promo
        if (selectedPromo && selectedPromo.ruleJson.requireMenuItems?.length > 0 && transaction) {
            const itemsToOrder = selectedPromo.ruleJson.requireMenuItems.map((item: any, idx: number) => ({
                id: item.id,
                quantity: item.quantity,
                note: `Promo Bundle: ${selectedPromo.name}`,
                customName: idx === 0 ? `[PAKET] ${selectedPromo.name}` : undefined,
                priceOverride: 0
            }));

            try {
                await this.cafeService.processOrder(itemsToOrder, tableId);
                // If memberId is set, make sure transaction is linked
                if (memberId) {
                    const trans = await this.transactionService.getActiveTransactionByTable(tableId);
                    if (trans && !trans.memberId) {
                        await this.transactionService.updateTransaction(trans.id, { memberId });
                    }
                }
                this.logger.log(`Promo items ordered automatically for table ${tableId}`);
            } catch (err) {
                this.logger.error(`FAILED to auto-order promo items:`, err);
            }
        }

        const savedTable = await this.tableRepository.save(table);

        if (userName) {
            let details = `Mulai meja ${table.tableName}`;
            if (type === 'prepaid') {
                details += ` (Paket: ${fareName}, Durasi: ${durationMinutes} menit)`;
            } else {
                details += ` (Open Table)`;
            }
            details += ` - Tamu: ${customerName || 'Tamu'}`;

            await this.reportService.logAction(
                'START_SESSION',
                userName,
                details,
                tableId
            );
        }

        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, {
            status: 'ON',
            type,
            duration: durationMinutes || 0,
            startTime: table.startTime?.toISOString() || new Date().toISOString(),
            endTime: table.endTime ? table.endTime.toISOString() : null,
        });

        await this.attachTransactionData(savedTable);

        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }

    async stopSession(tableId: number, userId?: number, userName?: string) {
        const table = await this.getTableById(tableId);
        if (!table) return null;

        // Create session record if session was active
        this.logger.log(`Stopping session for table ${tableId}. Type: ${table.sessionType}, ActivePrice: ${table.activePackagePrice}`);
        if (table.startTime && table.sessionType) {
            const session = this.sessionRepository.create({
                table: table,
                sessionType: table.sessionType as 'prepaid' | 'open',
                startTime: table.startTime,
                endTime: new Date(),
                durationMinutes: Math.round((new Date().getTime() - table.startTime.getTime()) / 60000),
                memberId: table.memberId ?? undefined,
            } as any) as unknown as Session;
            const savedSession = await this.sessionRepository.save(session);

            // Update transaction total (Billiard)
            let billiardCost = 0;
            let billingDetails = null;

            if (table.sessionType === 'open') {
                let pkg: any = {};
                if (table.packageId) {
                    pkg = await this.packageRepository.findOne({ where: { id: table.packageId } }) || {};
                } else {
                    const packages = await this.getPackages();
                    pkg = packages.find(p => (p.type === PackageType.HOURLY || p.type === PackageType.PLAYTIME) && p.tableCategory === table.category);
                    if (!pkg) pkg = packages.find(p => (p.type === PackageType.HOURLY || p.type === PackageType.PLAYTIME));
                    if (!pkg) pkg = { minutePrice: 50000 / 60 };
                }

                const pricing = this.transactionService.calculateTimeBasedPrice(table.startTime, new Date(), pkg);
                billiardCost = pricing.total;
                billingDetails = pricing.details;
            } else {
                if (table.activePackagePrice !== null && table.activePackagePrice !== undefined) {
                    billiardCost = Number(table.activePackagePrice);
                } else {
                    let targetDuration = session.durationMinutes;
                    if (table.endTime && table.startTime) {
                        const plannedMs = table.endTime.getTime() - table.startTime.getTime();
                        targetDuration = Math.round(plannedMs / 60000);
                    }
                    const packages = await this.getPackages();
                    const hourlyPackage = packages.find(p => p.type === PackageType.HOURLY);
                    const hourlyRate = hourlyPackage ? Number(hourlyPackage.price) : 50000;
                    billiardCost = (targetDuration / 60) * hourlyRate;
                }
            }

            if ((billiardCost === 0 || billiardCost === null) && table.startTime) {
                const elapsedMs = new Date().getTime() - table.startTime.getTime();
                // Ensure at least 60 minutes are billed if a session was started
                const elapsedMin = Math.max(60, Math.ceil(elapsedMs / 60000));

                // Fetch default rate if possible
                const packages = await this.getPackages();
                const hourlyRate = packages.find(p => p.type === PackageType.HOURLY)?.price || 50000;
                billiardCost = (elapsedMin / 60) * Number(hourlyRate);
            }

            billiardCost = Math.round(billiardCost);

            const transaction = await this.transactionService.getActiveTransactionByTable(tableId);
            if (transaction) {
                let durationSecs = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000);
                if (table.sessionType === 'prepaid' && table.startTime && table.endTime) {
                    const diffMs = table.endTime.getTime() - table.startTime.getTime();
                    durationSecs = Math.floor(diffMs / 1000);
                }

                const hours = Math.floor(durationSecs / 3600);
                const minutes = Math.floor((durationSecs % 3600) / 60);
                const seconds = durationSecs % 60;

                const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                const fareName = table.packageId
                    ? (await this.packageRepository.findOne({ where: { id: table.packageId } }))?.name
                    : (transaction.fareName || 'Open Table');

                // Force a full totals recalculation (Grand Total = Billiard + SC + VAT - Discounts)
                // Using setBilliardTotal ensures the transaction.grandTotal is accurate before we attempt AUTO-DEBIT.
                await this.transactionService.setBilliardTotal(transaction.id, billiardCost, {
                    title: fareName || 'Open Table',
                    duration: session.durationMinutes,
                    subtotal: billiardCost
                }, userName);

                // --- AUTO-DEBIT: Potong Saldo Otomatis untuk Member (Open Table/Hourly) ---
                if ((table as any).memberId) {
                    try {
                        const updatedTrans = await this.transactionService.getTransactionById(transaction.id);

                        // Calculate unpaid items
                        const unpaidItemIds = (updatedTrans.orderItems || [])
                            .filter(i => !i.isPaid && i.status !== 'CANCELLED')
                            .map(i => i.id);

                        // Calculate total unpaid amount
                        const unpaidAmount = Number(updatedTrans.grandTotal || 0) - Number(updatedTrans.paidAmount || 0);

                        if (unpaidAmount > 0) {
                            await this.transactionService.processMultiPayerPayment(
                                transaction.id,
                                {
                                    orderItemIds: unpaidItemIds,
                                    payerName: updatedTrans.customerName || 'Member',
                                    paymentMethod: 'MEMBER',
                                    billiardPortion: Number(updatedTrans.billiardTotal || 0)
                                },
                                userId
                            );

                            this.logger.log(`AUTO-DEBIT STOP: Member ${table.memberId} settled Rp ${unpaidAmount} for table ${tableId}`);
                        }

                        // DO NOT set to AVAILABLE here. Let it transition to WAITING_PAYMENT
                        // table.status = TableStatus.AVAILABLE;
                        // table.memberId = null;

                        // Final Notification after settlement
                        const finalSnap = await this.transactionService.getTransactionById(transaction.id);
                        await this.memberService.sendSessionCompletionNotification(finalSnap.memberId!, {
                            tableName: table.tableName,
                            duration: finalSnap.sessionDuration,
                            billiardTotal: Number(finalSnap.billiardTotal || 0),
                            cafeTotal: Number(finalSnap.cafeTotal || 0),
                            grandTotal: Number(finalSnap.grandTotal || 0)
                        });
                    } catch (err) {
                        this.logger.error(`AUTO-DEBIT STOP FAILED for table ${tableId}: ${err.message}`);
                        if (err.status === 402 || err.message?.includes('Saldo tidak cukup')) {
                            this.billiardGateway.broadcastWarning(
                                'Saldo Kurang',
                                `Gagal pelunasan otomatis untuk meja ${table.tableName}. Saldo member tidak cukup.`,
                                tableId
                            );
                        }
                    }
                }
            }

            if (userName) {
                await this.reportService.logAction(
                    'STOP_SESSION',
                    userName,
                    `Stop sesi meja ${table.tableName}. Durasi: ${session.durationMinutes} menit. Total Billiard: Rp ${billiardCost.toLocaleString()}`,
                    tableId
                );
            }
        }

        if (table.status !== TableStatus.AVAILABLE) {
            table.status = TableStatus.WAITING_PAYMENT;
        }
        table.isLightOn = false;
        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);
        (savedTable as any).type = 'billiard';

        // If it was an auto-cutoff, log it to the audit trail
        if (userName && userName.includes('Auto-Cutoff Saldo')) {
            await this.reportService.logAction(
                'AUTO_STOP_LOW_BALANCE',
                'System',
                `Sesi dihentikan otomatis karena saldo member ${table.member?.name || 'Unknown'} menipis.`,
                table.id,
                savedTable.activeTransaction?.invoiceNumber
            );
        }

        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, { status: 'OFF' });

        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }

    private scheduledCutoffs = new Set<number>();

    @Cron(CronExpression.EVERY_30_SECONDS)
    async handleCron() {
        const now = new Date();
        const globalSettings = await this.settingsService.getSettings();
        const threshold = globalSettings.endingSoonThreshold || 5;

        // 1. Handle Prepaid Sessions (Warning & Auto Stop)
        const prepaidTables = await this.tableRepository.find({
            where: [
                { status: TableStatus.IN_USE, sessionType: 'prepaid' },
                { status: TableStatus.WARNING, sessionType: 'prepaid' }
            ]
        });

        for (const table of prepaidTables) {
            if (table.endTime && now >= table.endTime) {
                // Time expired
                await this.stopSession(table.id);
            } else if (table.endTime) {
                // Update remaining minutes and check for warning
                const diff = table.endTime.getTime() - now.getTime();
                const remaining = Math.ceil(diff / 60000);

                let statusChanged = false;
                if (remaining !== table.remainingMinutes) {
                    table.remainingMinutes = remaining;
                    statusChanged = true;
                }

                if (remaining <= threshold && table.status !== TableStatus.WARNING) {
                    table.status = TableStatus.WARNING;
                    statusChanged = true;
                } else if (remaining > threshold && table.status === TableStatus.WARNING) {
                    table.status = TableStatus.IN_USE;
                    statusChanged = true;
                }

                if (statusChanged) {
                    const saved = await this.tableRepository.save(table);
                    await this.attachTransactionData(saved);
                    this.billiardGateway.broadcastTableUpdate(saved);
                }
            }
        }

        // 2. Handle Member Open Table Auto-Cutoff (Precision Billing)
        const openTablesWithMember = await this.tableRepository.find({
            where: {
                status: TableStatus.IN_USE,
                sessionType: 'open',
                memberId: Not(IsNull())
            }
        });

        for (const table of openTablesWithMember) {
            if (this.scheduledCutoffs.has(table.id)) {
                continue; // Already scheduled a precise cutoff for this table
            }

            if (!table.startTime || !table.memberId) continue;

            // Retrieve Member details separately since it's a virtual property on Table
            const member = await this.memberService.getMemberById(table.memberId);
            if (!member) continue;

            // Retrieve current active transaction
            const transaction = await this.transactionService.getActiveTransactionByTable(table.id);
            if (!transaction) continue;

            const memberBalance = Number(member.balance || 0);

            // Re-calculate the current running billiard cost accurately per-second using the pricing logic
            let pkg: any = {};
            if (table.packageId) {
                pkg = await this.packageRepository.findOne({ where: { id: table.packageId } }) || {};
            } else {
                const packages = await this.getPackages();
                pkg = packages.find(p => (p.type === PackageType.HOURLY || p.type === PackageType.PLAYTIME) && p.tableCategory === table.category);
                if (!pkg) pkg = packages.find(p => (p.type === PackageType.HOURLY || p.type === PackageType.PLAYTIME));
                if (!pkg) pkg = { minutePrice: 50000 / 60 };
            }

            const pricing = this.transactionService.calculateTimeBasedPrice(table.startTime, now, pkg);
            const runningBilliardCost = Math.round(pricing.total);

            // Incorporate total Cafe/F&B expenses that have not been paid
            // Using transaction cafeTotal + what's already paid might be tricky, easier to use grandTotal - paidAmount + new running billiard
            // The grandTotal in DB already contains the *last saved* billiardTotal. We should substitute it with the precise real-time one.
            const savedBilliard = Number(transaction.billiardTotal || 0);
            const savedGrandTotal = Number(transaction.grandTotal || 0);
            const paidTotal = Number(transaction.paidAmount || 0);

            const realtimeGrandTotal = savedGrandTotal - savedBilliard + runningBilliardCost;
            const remainingToPay = realtimeGrandTotal - paidTotal;

            // Define a safety buffer (e.g., 2,000 IDR or ~2 mins of play at 60k/hr)
            const globalSettings = await this.settingsService.getSettings();
            const balanceBuffer = globalSettings.balanceBuffer || 2000;

            if ((memberBalance - remainingToPay) <= balanceBuffer) {
                // Instantly out of balance or within buffer, cut it off now
                this.logger.warn(`Member ${member.name} reached balance buffer. Cutting off table ${table.id}`);

                // Broadcast one last warning before stopping
                this.billiardGateway.broadcastWarning(
                    'Saldo Habis',
                    `Sesi meja ${table.tableName} dihentikan karena saldo member ${member.name} sudah mencapai batas minimum.`,
                    table.id
                );

                await this.stopSession(table.id, undefined, 'Sistem (Auto-Cutoff Saldo)');
            } else {
                // Check if they will run out of balance within the next 30 seconds (before next cron tick)
                const ratePerHour = Number(pkg.minutePrice || 0) * 60;
                const costPerSecond = ratePerHour / 3600;

                if (costPerSecond > 0) {
                    const usableAmount = memberBalance - remainingToPay - balanceBuffer;
                    const remainingSeconds = usableAmount / costPerSecond;

                    if (remainingSeconds <= 32) {
                        this.logger.log(`Table ${table.id} Open Table approaching cutoff in ~${remainingSeconds.toFixed(1)}s (Balance: Rp${memberBalance}, Running Bill: Rp${remainingToPay})`);

                        this.scheduledCutoffs.add(table.id);
                        const msDelay = Math.max(0, Math.floor(remainingSeconds * 1000));

                        setTimeout(async () => {
                            try {
                                this.logger.warn(`Executing Precise Timer Cutoff for table ${table.id}`);
                                await this.stopSession(table.id, undefined, 'Sistem (Auto-Cutoff Saldo)');
                            } catch (e) {
                                this.logger.error(`Error during delayed cutoff: ${e.message}`);
                            } finally {
                                this.scheduledCutoffs.delete(table.id);
                            }
                        }, msDelay);
                    }
                }
            }
        }
    }

    async handleHeartbeat(tableId: number) {
        this.billiardGateway.handleHeartbeat(tableId);
    }

    async switchSession(tableId: number, type: 'prepaid' | 'open', durationMinutes?: number) {
        const table = await this.getTableById(tableId);
        if (!table || table.status !== TableStatus.IN_USE) return null;

        this.logger.log(`Switching session for table ${tableId} from ${table.sessionType} to ${type}`);

        table.sessionType = type;

        if (type === 'prepaid' && durationMinutes) {
            const startTime = table.startTime || new Date();
            if (!table.startTime) table.startTime = startTime;

            table.endTime = new Date(startTime.getTime() + durationMinutes * 60000);
            const now = new Date();
            const diff = table.endTime.getTime() - now.getTime();
            table.remainingMinutes = Math.max(0, Math.ceil(diff / 60000));

            // Check threshold for the new prepaid session
            const globalSettings = await this.settingsService.getSettings();
            const threshold = globalSettings.endingSoonThreshold || 5;
            if (table.remainingMinutes <= threshold) {
                table.status = TableStatus.WARNING;
            } else {
                table.status = TableStatus.IN_USE;
            }
        } else {
            table.endTime = null;
            table.remainingMinutes = null;
            table.status = TableStatus.IN_USE; // Always IN_USE for open sessions
        }

        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);

        // Update IoT
        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, {
            status: 'ON',
            type,
            duration: durationMinutes || 0,
            startTime: table.startTime ? table.startTime.toISOString() : new Date().toISOString(),
            endTime: table.endTime ? table.endTime.toISOString() : null,
        });

        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }

    async extendSession(tableId: number, durationMinutes?: number, packageId?: number, userName?: string, ignoreConflict: boolean = false) {
        const table = await this.getTableById(tableId);
        if (!table || ![TableStatus.IN_USE, TableStatus.WARNING, TableStatus.WAITING_PAYMENT].includes(table.status)) return null;

        if (table.sessionType !== 'prepaid') {
            throw new Error('Can only extend prepaid sessions');
        }

        if (table.isBooked && !ignoreConflict) {
            const recommendations = await this.waitingListService.findAlternativeTable(tableId);
            return {
                conflict: true,
                message: `Meja ${table.tableName} sudah dipesan oleh ${table.bookedByName}.`,
                bookedByName: table.bookedByName,
                waitingId: table.bookedByWaitingId,
                recommendations: recommendations.map(r => ({
                    id: r.id,
                    tableName: r.tableName,
                    remainingMinutes: r.remainingMinutes,
                    status: r.status
                }))
            };
        }

        if (table.isBooked && ignoreConflict) {
            await this.reportService.logAction(
                'WAIT_LIST_CONFLICT_BYPASSED',
                userName || 'Sistem',
                `Kasir mengabaikan antrean ${table.bookedByName} untuk perpanjang sesi Meja ${table.tableName}`,
                tableId
            );
        }

        let extensionMinutes = durationMinutes || 0;
        let extensionPrice = 0;

        if (packageId) {
            const pkg = await this.packageRepository.findOne({ where: { id: packageId } });
            if (pkg) {
                extensionMinutes = pkg.durationMinutes;
                extensionPrice = this.transactionService.calculateCurrentPackagePrice(pkg);
                table.packageId = packageId;
            }
        } else if (durationMinutes) {
            // Custom duration WITHOUT package: use customDurationPricing from global settings
            const globalSettings = await this.settingsService.getSettings();
            const customConfig = table.category === 'VIP'
                ? globalSettings.customDurationPricingVip
                : globalSettings.customDurationPricingRegular;

            if (customConfig) {
                const activeRate = this.transactionService.calculateCurrentPackagePrice({
                    price: customConfig.basePrice,
                    timeSlots: customConfig.timeSlots
                });
                extensionPrice = Math.round((durationMinutes / 60) * activeRate);
            } else {
                // Final fallback if no customDurationPricing is configured
                extensionPrice = Math.round((durationMinutes / 60) * 50000);
            }
        }

        // If reviving from billing state, turn light back on
        if (table.status === TableStatus.WAITING_PAYMENT) {
            table.isLightOn = true;
            table.status = TableStatus.IN_USE;
        }

        const currentEnd = table.endTime ? new Date(table.endTime) : new Date();
        table.endTime = new Date(currentEnd.getTime() + extensionMinutes * 60000);

        const now = new Date();
        const diff = table.endTime.getTime() - now.getTime();
        table.remainingMinutes = Math.max(0, Math.ceil(diff / 60000));

        // Reset status if time now above threshold
        const globalSettings = await this.settingsService.getSettings();
        const threshold = globalSettings.endingSoonThreshold || 5;

        if (table.remainingMinutes > threshold && table.status === TableStatus.WARNING) {
            table.status = TableStatus.IN_USE;
        }

        // CUMULATIVE PRICE: Add to existing activePackagePrice (always integer)
        extensionPrice = Math.round(extensionPrice);
        table.activePackagePrice = Math.round(Number(table.activePackagePrice || 0) + extensionPrice);

        // SYNC TRANSACTION: Update the billiard total in the transaction
        const transaction = await this.transactionService.getActiveTransactionByTable(table.id);
        if (transaction) {
            // Use package name if available for clearer breakdown
            let extensionTitle = 'Tambahan Waktu';
            if (packageId) {
                const pkg = await this.packageRepository.findOne({ where: { id: packageId } });
                if (pkg) extensionTitle = `Extend ${pkg.name}`;
            }

            await this.transactionService.setBilliardTotal(transaction.id, table.activePackagePrice, {
                title: extensionTitle,
                duration: extensionMinutes,
                subtotal: extensionPrice
            }, userName);
        }

        const savedTable = await this.tableRepository.save(table);

        if (userName) {
            await this.reportService.logAction(
                'EXTEND_SESSION',
                userName,
                `Tambah waktu meja ${table.tableName} selama ${extensionMinutes} menit. Tambahan biaya: Rp ${extensionPrice.toLocaleString()}`,
                tableId
            );
        }

        await this.attachTransactionData(savedTable);

        // Update IoT
        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, {
            status: 'ON',
            type: table.sessionType,
            duration: table.remainingMinutes, // Current total remaining
            startTime: table.startTime?.toISOString(),
            endTime: table.endTime.toISOString(),
            extend: true,
            extensionMinutes,
            extensionPrice
        });

        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async moveTable(fromTableId: number, toTableId: number, userName?: string) {
        const fromTable = await this.getTableById(fromTableId);
        const toTable = await this.getTableById(toTableId);

        if (!fromTable || !toTable) throw new NotFoundException('Source or target table not found');
        if (fromTable.status === TableStatus.AVAILABLE) throw new Error('Source table has no active session');
        if (toTable.status !== TableStatus.AVAILABLE) throw new Error('Target table is not available');

        // 1. Move Transaction
        const transaction = await this.transactionService.getActiveTransactionByTable(fromTableId);
        if (transaction) {
            transaction.tableId = toTableId;
            await this.transactionService.updateTransaction(transaction.id, { tableId: toTableId });
        }

        // 2. Transfer Session Data
        toTable.status = fromTable.status;
        toTable.sessionType = fromTable.sessionType;
        toTable.startTime = fromTable.startTime;
        toTable.endTime = fromTable.endTime;
        toTable.remainingMinutes = fromTable.remainingMinutes;
        toTable.isLightOn = true;
        toTable.memberId = fromTable.memberId;
        toTable.packageId = fromTable.packageId;
        toTable.activePackagePrice = fromTable.activePackagePrice;

        // 3. Reset Source Table
        fromTable.status = TableStatus.AVAILABLE;
        fromTable.sessionType = null;
        fromTable.startTime = null;
        fromTable.endTime = null;
        fromTable.remainingMinutes = null;
        fromTable.isLightOn = false;
        fromTable.memberId = null;
        fromTable.packageId = null;
        fromTable.activePackagePrice = null;

        const savedFrom = await this.tableRepository.save(fromTable);
        const savedTo = await this.tableRepository.save(toTable);

        // 4. IoT Coordination
        // Turn OFF old light
        const offTopic = `billiard/table/${fromTable.macAddress || fromTable.id}/light/set`;
        this.mqttClient.emit(offTopic, { status: 'OFF' });

        // Turn ON new light with migrated duration/type
        const onTopic = `billiard/table/${toTable.macAddress || toTable.id}/light/set`;
        this.mqttClient.emit(onTopic, {
            status: 'ON',
            type: toTable.sessionType,
            duration: toTable.remainingMinutes || 0,
            startTime: toTable.startTime ? toTable.startTime.toISOString() : new Date().toISOString(),
            endTime: toTable.endTime ? toTable.endTime.toISOString() : null,
        });

        // 5. Broadcast Updates
        await this.attachTransactionData(savedFrom);
        this.billiardGateway.broadcastTableUpdate(savedFrom);

        // Attach transaction to target for proper UI rendering
        await this.attachTransactionData(savedTo);

        if (userName) {
            const amount = transaction ? Number(transaction.grandTotal || 0) : 0;
            await this.reportService.logAction(
                'MOVE_TABLE',
                userName,
                `Move Table Billiard Meja ${fromTable.tableName} ke Meja ${toTable.tableName}. Total Rp ${amount.toLocaleString()}`,
                toTableId
            );
        }

        this.billiardGateway.broadcastTableUpdate(savedTo);

        return savedTo;
    }

    async resetTable(id: number) {
        const table = await this.getTableById(id);
        if (!table) throw new NotFoundException('Table not found');

        table.status = TableStatus.AVAILABLE;
        table.sessionType = null;
        table.startTime = null;
        table.endTime = null;
        table.remainingMinutes = null;
        table.isLightOn = false;
        table.grandTotal = 0;
        table.activeTransaction = null;

        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);

        // Turn OFF light just in case
        const offTopic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(offTopic, { status: 'OFF' });

        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
}
