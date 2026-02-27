"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BilliardService", {
    enumerable: true,
    get: function() {
        return BilliardService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _microservices = require("@nestjs/microservices");
const _schedule = require("@nestjs/schedule");
const _tableentity = require("./entities/table.entity");
const _sessionentity = require("./entities/session.entity");
const _billiardpackageentity = require("./entities/billiard-package.entity");
const _billiardgateway = require("../socket/billiard.gateway");
const _transactionservice = require("../transaction/transaction.service");
const _settingsservice = require("../settings/settings.service");
const _promoservice = require("../promo/promo.service");
const _promoentity = require("../promo/entities/promo.entity");
const _reportservice = require("../report/report.service");
const _waitinglistservice = require("../waiting-list/waiting-list.service");
const _memberservice = require("../member/member.service");
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
let BilliardService = class BilliardService {
    async onModuleInit() {
        try {
            this.logger.log('Connecting to MQTT Broker...');
            // await this.mqttClient.connect();
            this.logger.log('Connected to MQTT Broker successfully (MOCKED)');
        } catch (err) {
            this.logger.warn('Could not connect to MQTT Broker. Hardware control will be disabled, but application will continue.');
        }
    }
    async getAllTables() {
        const tables = await this.tableRepository.find({
            order: {
                createdAt: 'DESC'
            }
        });
        return Promise.all(tables.map((table)=>this.attachTransactionData(table)));
    }
    /**
     * Helper to consistently attach virtual transaction data to a table object
     * before broadcasting or returning to frontend.
     */ async attachTransactionData(table) {
        table.type = 'billiard';
        if (table.status !== _tableentity.TableStatus.AVAILABLE) {
            const transaction = await this.transactionService.getActiveTransactionByTable(table.id);
            if (transaction) {
                table.activeTransaction = transaction;
                table.grandTotal = Number(transaction.grandTotal || 0);
            }
        }
        return table;
    }
    async getTableById(id) {
        return this.tableRepository.findOne({
            where: {
                id
            }
        });
    }
    async createTable(tableData) {
        const tableName = tableData.tableName?.trim();
        if (!tableName) throw new _common.BadRequestException('Nama meja harus diisi.');
        const existing = await this.tableRepository.createQueryBuilder('table').where('LOWER(table.tableName) = LOWER(:tableName)', {
            tableName
        }).getOne();
        if (existing) throw new _common.BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);
        const table = this.tableRepository.create({
            ...tableData,
            tableName
        });
        return this.tableRepository.save(table);
    }
    async updateTableStatus(id, status) {
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
    async updateTable(id, data) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException('Table not found');
        if (data.tableName) {
            const tableName = data.tableName.trim();
            const existing = await this.tableRepository.createQueryBuilder('table').where('LOWER(table.tableName) = LOWER(:tableName) AND table.id != :id', {
                tableName,
                id
            }).getOne();
            if (existing) throw new _common.BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);
            table.tableName = tableName;
        }
        Object.assign(table, {
            ...data,
            tableName: data.tableName?.trim() || table.tableName
        });
        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async deleteTable(id) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException('Table not found');
        if (table.status === _tableentity.TableStatus.IN_USE || table.status === _tableentity.TableStatus.MAINTENANCE) {
            throw new Error(`Cannot delete table while status is ${table.status}`);
        }
        await this.tableRepository.delete(id);
    // Ideally should broadcast deletion event too, 
    // but frontend will likely refresh list or handle socket disconnect 
    // For now, we rely on HTTP response.
    }
    // --- Package Management ---
    async getPackages() {
        return this.packageRepository.find({
            where: {
                isActive: true
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async createPackage(data) {
        const pkg = this.packageRepository.create(data);
        return this.packageRepository.save(pkg);
    }
    async updatePackage(id, data) {
        const pkg = await this.packageRepository.findOne({
            where: {
                id
            }
        });
        if (!pkg) throw new _common.NotFoundException('Package not found');
        Object.assign(pkg, data);
        return this.packageRepository.save(pkg);
    }
    async deletePackage(id) {
        const pkg = await this.packageRepository.findOne({
            where: {
                id
            }
        });
        if (!pkg) throw new _common.NotFoundException('Package not found');
        // Soft delete or hard delete? Let's do hard delete for now as per user request context usually implies removal
        // But better to check if it's being used? For now, standard delete
        await this.packageRepository.delete(id);
    }
    async toggleLight(id, isOn) {
        const table = await this.getTableById(id);
        if (!table) return null;
        table.isLightOn = isOn;
        // MQTT Topic pattern: billiard/table/{macAddress}/light/set
        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, {
            status: isOn ? 'ON' : 'OFF'
        });
        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async startSession(tableId, type, durationMinutes, customerName, packageId, customPriceSettings, promoId, userId, userName, memberId) {
        this.logger.log(`BilliardService.startSession called for tableId: ${tableId}, customer: ${customerName}, memberId: ${memberId}, packageId: ${packageId}`);
        const table = await this.getTableById(tableId);
        if (!table) {
            this.logger.warn(`Table ${tableId} NOT FOUND`);
            return null;
        }
        if (table.status !== _tableentity.TableStatus.AVAILABLE) {
            this.logger.warn(`Table ${tableId} is NOT AVAILABLE (Status: ${table.status}). Aborting startSession.`);
            return null;
        }
        // 1 Member 1 Table Locking System
        if (memberId) {
            const activeSession = await this.tableRepository.findOne({
                where: {
                    memberId,
                    status: (0, _typeorm1.Not)(_tableentity.TableStatus.AVAILABLE)
                }
            });
            if (activeSession && activeSession.id !== tableId) {
                throw new _common.ConflictException(`Member ini sedang digunakan di Meja ${activeSession.tableName}. Harap selesaikan sesi sebelumnya.`);
            }
        }
        let selectedPackage = null;
        let selectedPromo = null;
        if (promoId) {
            // Find promo. We use updatePromo with empty data as a findOne workaround or just use repo if available.
            // But PromoService exports PromoService, so we can add a findOne if needed.
            // For now, let's just use the service to get active promos and filter.
            const activePromos = await this.promoService.getActivePromos();
            selectedPromo = activePromos.find((p)=>p.id === promoId);
            if (selectedPromo && (selectedPromo.type === _promoentity.PromoType.PACKAGE || selectedPromo.type === _promoentity.PromoType.BUNDLE)) {
                durationMinutes = selectedPromo.ruleJson.requireBilliardMinutes;
                type = 'prepaid'; // Promo packages are usually prepaid
            }
        } else if (packageId) {
            selectedPackage = await this.packageRepository.findOne({
                where: {
                    id: packageId
                }
            });
            if (selectedPackage) {
                if (selectedPackage.type === _billiardpackageentity.PackageType.FIXED || selectedPackage.type === _billiardpackageentity.PackageType.DURATION) {
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
        table.status = _tableentity.TableStatus.IN_USE;
        table.isLightOn = true;
        table.sessionType = type;
        table.startTime = new Date();
        // Check if starting with a duration that is already below the "Ending Soon" threshold
        if (type === 'prepaid' && durationMinutes) {
            const globalSettings = await this.settingsService.getSettings();
            const threshold = globalSettings.endingSoonThreshold || 5;
            if (durationMinutes <= threshold) {
                table.status = _tableentity.TableStatus.WARNING;
            }
        }
        let transaction = await this.transactionService.getActiveTransactionByTable(tableId);
        if (!transaction) {
            transaction = await this.transactionService.createTransaction(tableId, userId);
        }
        if (memberId) {
            await this.transactionService.updateTransaction(transaction.id, {
                memberId
            });
            table.memberId = memberId;
        }
        let finalCustomerName = customerName || 'Tamu';
        if (table.isBooked && table.bookedByName) {
            finalCustomerName = table.bookedByName;
            // Mark waiting list as checked-in
            if (table.bookedByWaitingId) {
                await this.waitingListService.checkIn(table.bookedByWaitingId);
                // Clear booking fields on local object to avoid overwriting when saving later
                table.isBooked = false;
                table.bookedByWaitingId = null;
                table.bookedByName = null;
            }
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
            await this.transactionService.updateTransaction(transaction.id, {
                customerName: finalCustomerName,
                fareName
            });
        }
        if (packageId) {
            table.packageId = packageId;
        }
        if (memberId) {
            table.memberId = memberId;
        }
        // Handle Session Timing & Pricing
        if (type === 'prepaid' && durationMinutes) {
            table.endTime = new Date(table.startTime.getTime() + durationMinutes * 60000);
            table.remainingMinutes = durationMinutes;
            if (transaction) {
                let sessionPrice = 0;
                if (selectedPromo) {
                    sessionPrice = Number(selectedPromo.ruleJson.fixedPrice) || 0;
                } else if (selectedPackage) {
                    const activeRate = this.transactionService.calculateCurrentPackagePrice(selectedPackage);
                    sessionPrice = selectedPackage.type === _billiardpackageentity.PackageType.FIXED ? activeRate : durationMinutes / 60 * activeRate;
                } else {
                    const globalSettings = await this.settingsService.getSettings();
                    const customConfig = table.category === 'VIP' ? globalSettings.customDurationPricingVip : globalSettings.customDurationPricingRegular;
                    if (customConfig) {
                        const activeRate = this.transactionService.calculateCurrentPackagePrice({
                            price: customConfig.basePrice,
                            timeSlots: customConfig.timeSlots
                        });
                        sessionPrice = durationMinutes / 60 * activeRate;
                    }
                }
                table.activePackagePrice = sessionPrice;
                transaction = await this.transactionService.setBilliardTotal(transaction.id, sessionPrice, {
                    title: selectedPromo ? selectedPromo.name : selectedPackage ? selectedPackage.name : 'Layanan Utama',
                    duration: durationMinutes,
                    subtotal: sessionPrice
                }, userName);
                // --- AUTO-DEBIT: Potong Saldo Otomatis untuk Member (Prepaid) ---
                if (memberId && sessionPrice > 0) {
                    try {
                        this.logger.log(`AUTO-DEBIT: Deducting ${sessionPrice} from member ${memberId} for prepaid session`);
                        await this.transactionService.processMultiPayerPayment(transaction.id, {
                            orderItemIds: [],
                            payerName: finalCustomerName,
                            paymentMethod: 'MEMBER',
                            billiardPortion: sessionPrice
                        }, userId);
                        // Refresh transaction after payment
                        transaction = await this.transactionService.getTransactionById(transaction.id);
                    } catch (err) {
                        this.logger.error(`AUTO-DEBIT FAILED for table ${tableId}: ${err.message}`);
                        if (err.status === 402 || err.message?.includes('Saldo tidak cukup')) {
                            this.billiardGateway.broadcastWarning('Saldo Kurang', `Gagal potong saldo otomatis untuk ${finalCustomerName || 'Member'}. Saldo tidak cukup.`, tableId);
                        }
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
            const itemsToOrder = selectedPromo.ruleJson.requireMenuItems.map((item, idx)=>({
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
                        await this.transactionService.updateTransaction(trans.id, {
                            memberId
                        });
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
            await this.reportService.logAction('START_SESSION', userName, details, tableId);
        }
        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, {
            status: 'ON',
            type,
            duration: durationMinutes || 0,
            startTime: table.startTime?.toISOString() || new Date().toISOString(),
            endTime: table.endTime ? table.endTime.toISOString() : null
        });
        await this.attachTransactionData(savedTable);
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async stopSession(tableId, userId, userName) {
        const table = await this.getTableById(tableId);
        if (!table) return null;
        // Create session record if session was active
        this.logger.log(`Stopping session for table ${tableId}. Type: ${table.sessionType}, ActivePrice: ${table.activePackagePrice}`);
        if (table.startTime && table.sessionType) {
            const session = this.sessionRepository.create({
                table: table,
                sessionType: table.sessionType,
                startTime: table.startTime,
                endTime: new Date(),
                durationMinutes: Math.round((new Date().getTime() - table.startTime.getTime()) / 60000),
                memberId: table.memberId ?? undefined
            });
            const savedSession = await this.sessionRepository.save(session);
            // Update transaction total (Billiard)
            let billiardCost = 0;
            let billingDetails = null;
            if (table.sessionType === 'open') {
                let pkg = {};
                if (table.packageId) {
                    pkg = await this.packageRepository.findOne({
                        where: {
                            id: table.packageId
                        }
                    }) || {};
                } else {
                    const packages = await this.getPackages();
                    pkg = packages.find((p)=>(p.type === _billiardpackageentity.PackageType.HOURLY || p.type === _billiardpackageentity.PackageType.PLAYTIME) && p.tableCategory === table.category);
                    if (!pkg) pkg = packages.find((p)=>p.type === _billiardpackageentity.PackageType.HOURLY || p.type === _billiardpackageentity.PackageType.PLAYTIME);
                    if (!pkg) pkg = {
                        minutePrice: 50000 / 60
                    };
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
                    const hourlyPackage = packages.find((p)=>p.type === _billiardpackageentity.PackageType.HOURLY);
                    const hourlyRate = hourlyPackage ? Number(hourlyPackage.price) : 50000;
                    billiardCost = targetDuration / 60 * hourlyRate;
                }
            }
            if ((billiardCost === 0 || billiardCost === null) && table.startTime) {
                const elapsedMs = new Date().getTime() - table.startTime.getTime();
                const elapsedMin = Math.max(60, Math.ceil(elapsedMs / 60000));
                billiardCost = elapsedMin / 60 * 50000;
            }
            billiardCost = Math.round(billiardCost);
            const transaction = await this.transactionService.getActiveTransactionByTable(tableId);
            if (transaction) {
                let durationMins = session.durationMinutes;
                if (table.sessionType === 'prepaid' && table.startTime && table.endTime) {
                    const diffMs = table.endTime.getTime() - table.startTime.getTime();
                    durationMins = Math.round(diffMs / 60000);
                }
                const hours = Math.floor(durationMins / 60);
                const minutes = durationMins % 60;
                const durationStr = `${hours} Hour : ${minutes} Minute : 00 Second`;
                const fareName = table.packageId ? (await this.packageRepository.findOne({
                    where: {
                        id: table.packageId
                    }
                }))?.name : transaction.fareName || 'Open Table';
                await this.transactionService.updateTransaction(transaction.id, {
                    billiardTotal: billiardCost,
                    ...billingDetails ? {
                        billingDetails
                    } : {},
                    startTime: session.startTime,
                    endTime: session.endTime,
                    sessionDuration: durationStr,
                    sessionType: table.sessionType,
                    fareName: fareName || 'Open Table',
                    memberId: table.memberId || null
                });
                // --- AUTO-DEBIT: Potong Saldo Otomatis untuk Member (Open Table/Hourly) ---
                if (table.memberId) {
                    try {
                        const updatedTrans = await this.transactionService.getTransactionById(transaction.id);
                        // Calculate unpaid items
                        const unpaidItemIds = (updatedTrans.orderItems || []).filter((i)=>!i.isPaid && i.status !== 'CANCELLED').map((i)=>i.id);
                        // Calculate total unpaid amount
                        const unpaidAmount = Number(updatedTrans.grandTotal || 0) - Number(updatedTrans.paidAmount || 0);
                        if (unpaidAmount > 0) {
                            await this.transactionService.processMultiPayerPayment(transaction.id, {
                                orderItemIds: unpaidItemIds,
                                payerName: updatedTrans.customerName || 'Member',
                                paymentMethod: 'MEMBER',
                                billiardPortion: Number(updatedTrans.billiardTotal || 0)
                            }, userId);
                            this.logger.log(`AUTO-DEBIT STOP: Member ${table.memberId} settled Rp ${unpaidAmount} for table ${tableId}`);
                        }
                        // Table cleanup
                        table.status = _tableentity.TableStatus.AVAILABLE;
                        table.memberId = null;
                        // Final Notification after settlement
                        const finalSnap = await this.transactionService.getTransactionById(transaction.id);
                        await this.memberService.sendSessionCompletionNotification(finalSnap.memberId, {
                            tableName: table.tableName,
                            duration: finalSnap.sessionDuration,
                            billiardTotal: Number(finalSnap.billiardTotal || 0),
                            cafeTotal: Number(finalSnap.cafeTotal || 0),
                            grandTotal: Number(finalSnap.grandTotal || 0)
                        });
                    } catch (err) {
                        this.logger.error(`AUTO-DEBIT STOP FAILED for table ${tableId}: ${err.message}`);
                        if (err.status === 402 || err.message?.includes('Saldo tidak cukup')) {
                            this.billiardGateway.broadcastWarning('Saldo Kurang', `Gagal pelunasan otomatis untuk meja ${table.tableName}. Saldo member tidak cukup.`, tableId);
                        }
                    }
                }
            }
            if (userName) {
                await this.reportService.logAction('STOP_SESSION', userName, `Stop sesi meja ${table.tableName}. Durasi: ${session.durationMinutes} menit. Total Billiard: Rp ${billiardCost.toLocaleString()}`, tableId);
            }
        }
        if (table.status !== _tableentity.TableStatus.AVAILABLE) {
            table.status = _tableentity.TableStatus.WAITING_PAYMENT;
        }
        table.isLightOn = false;
        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);
        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, {
            status: 'OFF'
        });
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async handleCron() {
        const now = new Date();
        const globalSettings = await this.settingsService.getSettings();
        const threshold = globalSettings.endingSoonThreshold || 5;
        const activeTables = await this.tableRepository.find({
            where: [
                {
                    status: _tableentity.TableStatus.IN_USE,
                    sessionType: 'prepaid'
                },
                {
                    status: _tableentity.TableStatus.WARNING,
                    sessionType: 'prepaid'
                }
            ]
        });
        for (const table of activeTables){
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
                if (remaining <= threshold && table.status !== _tableentity.TableStatus.WARNING) {
                    table.status = _tableentity.TableStatus.WARNING;
                    statusChanged = true;
                } else if (remaining > threshold && table.status === _tableentity.TableStatus.WARNING) {
                    table.status = _tableentity.TableStatus.IN_USE;
                    statusChanged = true;
                }
                if (statusChanged) {
                    const saved = await this.tableRepository.save(table);
                    await this.attachTransactionData(saved);
                    this.billiardGateway.broadcastTableUpdate(saved);
                }
            }
        }
    }
    async handleHeartbeat(tableId) {
        this.billiardGateway.handleHeartbeat(tableId);
    }
    async switchSession(tableId, type, durationMinutes) {
        const table = await this.getTableById(tableId);
        if (!table || table.status !== _tableentity.TableStatus.IN_USE) return null;
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
                table.status = _tableentity.TableStatus.WARNING;
            } else {
                table.status = _tableentity.TableStatus.IN_USE;
            }
        } else {
            table.endTime = null;
            table.remainingMinutes = null;
            table.status = _tableentity.TableStatus.IN_USE; // Always IN_USE for open sessions
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
            endTime: table.endTime ? table.endTime.toISOString() : null
        });
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async extendSession(tableId, durationMinutes, packageId, userName, ignoreConflict = false) {
        const table = await this.getTableById(tableId);
        if (!table || ![
            _tableentity.TableStatus.IN_USE,
            _tableentity.TableStatus.WARNING,
            _tableentity.TableStatus.WAITING_PAYMENT
        ].includes(table.status)) return null;
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
                recommendations: recommendations.map((r)=>({
                        id: r.id,
                        tableName: r.tableName,
                        remainingMinutes: r.remainingMinutes,
                        status: r.status
                    }))
            };
        }
        if (table.isBooked && ignoreConflict) {
            await this.reportService.logAction('WAIT_LIST_CONFLICT_BYPASSED', userName || 'Sistem', `Kasir mengabaikan antrean ${table.bookedByName} untuk perpanjang sesi Meja ${table.tableName}`, tableId);
        }
        let extensionMinutes = durationMinutes || 0;
        let extensionPrice = 0;
        if (packageId) {
            const pkg = await this.packageRepository.findOne({
                where: {
                    id: packageId
                }
            });
            if (pkg) {
                extensionMinutes = pkg.durationMinutes;
                extensionPrice = this.transactionService.calculateCurrentPackagePrice(pkg);
                table.packageId = packageId;
            }
        } else if (durationMinutes) {
            // Custom duration WITHOUT package: use customDurationPricing from global settings
            const globalSettings = await this.settingsService.getSettings();
            const customConfig = table.category === 'VIP' ? globalSettings.customDurationPricingVip : globalSettings.customDurationPricingRegular;
            if (customConfig) {
                const activeRate = this.transactionService.calculateCurrentPackagePrice({
                    price: customConfig.basePrice,
                    timeSlots: customConfig.timeSlots
                });
                extensionPrice = Math.round(durationMinutes / 60 * activeRate);
            } else {
                // Final fallback if no customDurationPricing is configured
                extensionPrice = Math.round(durationMinutes / 60 * 50000);
            }
        }
        // If reviving from billing state, turn light back on
        if (table.status === _tableentity.TableStatus.WAITING_PAYMENT) {
            table.isLightOn = true;
            table.status = _tableentity.TableStatus.IN_USE;
        }
        const currentEnd = table.endTime ? new Date(table.endTime) : new Date();
        table.endTime = new Date(currentEnd.getTime() + extensionMinutes * 60000);
        const now = new Date();
        const diff = table.endTime.getTime() - now.getTime();
        table.remainingMinutes = Math.max(0, Math.ceil(diff / 60000));
        // Reset status if time now above threshold
        const globalSettings = await this.settingsService.getSettings();
        const threshold = globalSettings.endingSoonThreshold || 5;
        if (table.remainingMinutes > threshold && table.status === _tableentity.TableStatus.WARNING) {
            table.status = _tableentity.TableStatus.IN_USE;
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
                const pkg = await this.packageRepository.findOne({
                    where: {
                        id: packageId
                    }
                });
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
            await this.reportService.logAction('EXTEND_SESSION', userName, `Tambah waktu meja ${table.tableName} selama ${extensionMinutes} menit. Tambahan biaya: Rp ${extensionPrice.toLocaleString()}`, tableId);
        }
        await this.attachTransactionData(savedTable);
        // Update IoT
        const topic = `billiard/table/${table.macAddress || table.id}/light/set`;
        this.mqttClient.emit(topic, {
            status: 'ON',
            type: table.sessionType,
            duration: table.remainingMinutes,
            startTime: table.startTime?.toISOString(),
            endTime: table.endTime.toISOString(),
            extend: true,
            extensionMinutes,
            extensionPrice
        });
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async moveTable(fromTableId, toTableId, userName) {
        const fromTable = await this.getTableById(fromTableId);
        const toTable = await this.getTableById(toTableId);
        if (!fromTable || !toTable) throw new _common.NotFoundException('Source or target table not found');
        if (fromTable.status === _tableentity.TableStatus.AVAILABLE) throw new Error('Source table has no active session');
        if (toTable.status !== _tableentity.TableStatus.AVAILABLE) throw new Error('Target table is not available');
        // 1. Move Transaction
        const transaction = await this.transactionService.getActiveTransactionByTable(fromTableId);
        if (transaction) {
            transaction.tableId = toTableId;
            await this.transactionService.updateTransaction(transaction.id, {
                tableId: toTableId
            });
        }
        // 2. Transfer Session Data
        toTable.status = fromTable.status;
        toTable.sessionType = fromTable.sessionType;
        toTable.startTime = fromTable.startTime;
        toTable.endTime = fromTable.endTime;
        toTable.remainingMinutes = fromTable.remainingMinutes;
        toTable.isLightOn = true;
        // 3. Reset Source Table
        fromTable.status = _tableentity.TableStatus.AVAILABLE;
        fromTable.sessionType = null;
        fromTable.startTime = null;
        fromTable.endTime = null;
        fromTable.remainingMinutes = null;
        fromTable.isLightOn = false;
        const savedFrom = await this.tableRepository.save(fromTable);
        const savedTo = await this.tableRepository.save(toTable);
        // 4. IoT Coordination
        // Turn OFF old light
        const offTopic = `billiard/table/${fromTable.macAddress || fromTable.id}/light/set`;
        this.mqttClient.emit(offTopic, {
            status: 'OFF'
        });
        // Turn ON new light with migrated duration/type
        const onTopic = `billiard/table/${toTable.macAddress || toTable.id}/light/set`;
        this.mqttClient.emit(onTopic, {
            status: 'ON',
            type: toTable.sessionType,
            duration: toTable.remainingMinutes || 0,
            startTime: toTable.startTime ? toTable.startTime.toISOString() : new Date().toISOString(),
            endTime: toTable.endTime ? toTable.endTime.toISOString() : null
        });
        // 5. Broadcast Updates
        await this.attachTransactionData(savedFrom);
        this.billiardGateway.broadcastTableUpdate(savedFrom);
        // Attach transaction to target for proper UI rendering
        await this.attachTransactionData(savedTo);
        if (userName) {
            const amount = transaction ? Number(transaction.grandTotal || 0) : 0;
            await this.reportService.logAction('MOVE_TABLE', userName, `Move Table Billiard Meja ${fromTable.tableName} ke Meja ${toTable.tableName}. Total Rp ${amount.toLocaleString()}`, toTableId);
        }
        this.billiardGateway.broadcastTableUpdate(savedTo);
        return savedTo;
    }
    async resetTable(id) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException('Table not found');
        table.status = _tableentity.TableStatus.AVAILABLE;
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
        this.mqttClient.emit(offTopic, {
            status: 'OFF'
        });
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    constructor(tableRepository, sessionRepository, packageRepository, mqttClient, billiardGateway, transactionService, settingsService, cafeService, promoService, reportService, waitingListService, memberService){
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
        this.packageRepository = packageRepository;
        this.mqttClient = mqttClient;
        this.billiardGateway = billiardGateway;
        this.transactionService = transactionService;
        this.settingsService = settingsService;
        this.cafeService = cafeService;
        this.promoService = promoService;
        this.reportService = reportService;
        this.waitingListService = waitingListService;
        this.memberService = memberService;
        this.logger = new _common.Logger(BilliardService.name);
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_30_SECONDS),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardService.prototype, "handleCron", null);
BilliardService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_tableentity.Table)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_sessionentity.Session)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_billiardpackageentity.BilliardPackage)),
    _ts_param(3, (0, _common.Inject)('MQTT_SERVICE')),
    _ts_param(7, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { CafeService: CafeService1 } = require('../cafe/cafe.service');
        return CafeService1;
    }))),
    _ts_param(10, (0, _common.Inject)((0, _common.forwardRef)(()=>_waitinglistservice.WaitingListService))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _microservices.ClientProxy === "undefined" ? Object : _microservices.ClientProxy,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof _transactionservice.TransactionService === "undefined" ? Object : _transactionservice.TransactionService,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof CafeService === "undefined" ? Object : CafeService,
        typeof _promoservice.PromoService === "undefined" ? Object : _promoservice.PromoService,
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService,
        typeof _waitinglistservice.WaitingListService === "undefined" ? Object : _waitinglistservice.WaitingListService,
        typeof _memberservice.MemberService === "undefined" ? Object : _memberservice.MemberService
    ])
], BilliardService);

//# sourceMappingURL=billiard.service.js.map