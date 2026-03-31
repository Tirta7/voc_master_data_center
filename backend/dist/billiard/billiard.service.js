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
const _redisservice = require("../redis/redis.service");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _schedule = require("@nestjs/schedule");
const _tableentity = require("./entities/table.entity");
const _sessionentity = require("./entities/session.entity");
const _billiardpackageentity = require("./entities/billiard-package.entity");
const _billiardgateway = require("../socket/billiard.gateway");
const _mqttservice = require("../mqtt/mqtt.service");
const _transactionservice = require("../transaction/transaction.service");
const _settingsservice = require("../settings/settings.service");
const _cafeservice = require("../cafe/cafe.service");
const _promoservice = require("../promo/promo.service");
const _promoentity = require("../promo/entities/promo.entity");
const _reportservice = require("../report/report.service");
const _waitinglistservice = require("../waiting-list/waiting-list.service");
const _memberservice = require("../member/member.service");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _whatsappservice = require("../whatsapp/whatsapp.service");
const _aiservice = require("../ai/ai.service");
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
    clearMacCache() {
        this.macTableCache.clear();
        this.logger.debug('MAC-to-Table cache cleared.');
    }
    /**
   * Normalizes MAC address by removing colons, dashes and converting to uppercase.
   */ normalizeMac(mac) {
        if (!mac) return undefined;
        return mac.trim().replace(/[:\-]/g, '').toUpperCase();
    }
    /**
   * Helper to find all tables associated with a MAC (handles both normalized and colon-format)
   */ async getTablesByMac(mac) {
        const normalized = this.normalizeMac(mac);
        if (!normalized) return [];
        // Check cache first
        const cached = this.macTableCache.get(normalized);
        if (cached) return cached;
        // 1. Try direct find (Normalized)
        let tables = await this.tableRepository.find({
            where: {
                macAddress: normalized,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        // 2. Fallback to colon-format (Legacy)
        if (tables.length === 0 && normalized.length === 12) {
            const withColons = normalized.match(/.{1,2}/g)?.join(':');
            if (withColons) {
                tables = await this.tableRepository.find({
                    where: {
                        macAddress: withColons,
                        deletedAt: (0, _typeorm1.IsNull)()
                    }
                });
            }
        }
        // Update cache
        if (tables.length > 0) {
            this.macTableCache.set(normalized, tables);
        }
        return tables;
    }
    async onModuleInit() {
        try {
            this.logger.log('MQTT Sync listener initialization...');
            this.clearMacCache();
            // Listen for sync requests from controllers (e.g. on boot/reconnect)
            this.mqttService.onMessage(async (topic, payload)=>{
                if (topic === 'billiard/table/sync') {
                    const rawMac = payload.toString().trim();
                    const macAddress = this.normalizeMac(rawMac);
                    this.logger.log(`Received Sync Request for MAC: ${rawMac} (Normalized: ${macAddress})`);
                    if (!macAddress) return;
                    const tables = await this.getTablesByMac(macAddress);
                    if (tables.length > 0) {
                        this.logger.log(`Found ${tables.length} tables for sync. Sending batched response...`);
                        // Create a batched state array to prevent ESP32 from staggering relay toggles
                        const syncData = tables.map((t)=>({
                                tableId: t.id,
                                status: t.isLightOn ? 'ON' : 'OFF',
                                relayPin: t.relayPin
                            }));
                        this.mqttService.publish(`billiard/table/${macAddress}/sync_response`, {
                            tables: syncData,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                // 1.5. Handle Sync Response (Batched Payload)
                if (topic.includes('/sync_response')) {
                    // This usually comes FROM the server, but if we hear it here, we might log it
                    return;
                }
                // 2. Handle Telemetry / Status Updates
                if (topic.includes('/status')) {
                    try {
                        const parts = topic.split('/');
                        const rawMac = parts[2];
                        if (typeof rawMac !== 'string') return;
                        const macAddress = this.normalizeMac(rawMac);
                        if (!macAddress) return;
                        const data = JSON.parse(payload.toString());
                        this.logger.warn(`MQTT Telemetry: processing MAC ${macAddress}`);
                        const tables = await this.getTablesByMac(macAddress);
                        if (tables.length > 0) {
                            this.logger.log(`Telemetry from controller ${macAddress} (${tables.length} tables): RSSI ${data.rssi}, Up ${data.uptime}s`);
                            for (const table of tables){
                                this.handleHeartbeat(table.id, data);
                            }
                        } else {
                            this.logger.warn(`Telemetry received for unknown MAC: ${macAddress}`);
                        }
                    } catch (e) {
                        this.logger.warn(`Failed to parse telemetry: ${e.message}`);
                    }
                }
            });
            this.logger.log('MQTT Service initialized and synchronized with hardware.');
        } catch (err) {
            this.logger.warn('Could not connect to MQTT Broker. Hardware control will be disabled, but application will continue.');
        }
    }
    async getAllTables() {
        const cacheKey = 'billiard_all_tables';
        const cached = await this.redisService.get(cacheKey);
        if (cached) return cached;
        const tables = await this.tableRepository.find({
            where: {
                deletedAt: (0, _typeorm1.IsNull)()
            },
            order: {
                createdAt: 'DESC'
            }
        });
        const tableIds = tables.filter((t)=>t.status !== _tableentity.TableStatus.AVAILABLE).map((t)=>t.id);
        if (tableIds.length === 0) {
            const results = tables.map((t)=>{
                t.type = 'billiard';
                return t;
            });
            await this.redisService.set(cacheKey, results, 2);
            return results;
        }
        const activeTransactions = await this.transactionService.getActiveTransactionsByTableIds(tableIds);
        const transactionMap = new Map();
        [
            ...activeTransactions
        ].reverse().forEach((tr)=>transactionMap.set(tr.tableId, tr));
        const finalResults = tables.map((table)=>{
            table.type = 'billiard';
            const transaction = transactionMap.get(table.id);
            if (transaction) {
                // Strip relations to avoid circularity during serialization
                const { table: _t, cafeTable: _ct, ...cleanTx } = transaction;
                table.activeTransaction = cleanTx;
                table.grandTotal = Number(transaction.grandTotal || 0);
            }
            return table;
        });
        await this.redisService.set(cacheKey, finalResults, 2);
        return finalResults;
    }
    async clearAllTablesCache() {
        await this.redisService.del('billiard_all_tables');
    }
    /**
   * Helper to consistently attach virtual transaction data to a table object
   * before broadcasting or returning to frontend.
   */ async attachTransactionData(table) {
        table.type = 'billiard';
        if (table.status !== _tableentity.TableStatus.AVAILABLE) {
            const transaction = await this.transactionService.getActiveTransactionByTable(table.id);
            if (transaction) {
                // Strip back-references to avoid circularity crashes during WebSocket/MQTT serialization
                const { table: _t, cafeTable: _ct, ...cleanTx } = transaction;
                table.activeTransaction = cleanTx;
                table.grandTotal = Number(transaction.grandTotal || 0);
            }
        }
        return table;
    }
    async getTableById(id) {
        return this.tableRepository.findOne({
            where: {
                id,
                deletedAt: (0, _typeorm1.IsNull)()
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
        const macAddress = this.normalizeMac(tableData.macAddress);
        const table = this.tableRepository.create({
            ...tableData,
            tableName,
            macAddress
        });
        const savedTable = await this.tableRepository.save(table);
        await this.clearAllTablesCache();
        this.clearMacCache();
        this.billiardGateway.broadcastTableUpdate({
            ...savedTable,
            type: 'billiard',
            _action: 'ADD'
        });
        return savedTable;
    }
    async updateTableStatus(id, status) {
        const table = await this.getTableById(id);
        if (table) {
            table.status = status;
            const savedTable = await this.tableRepository.save(table);
            await this.attachTransactionData(savedTable);
            await this.clearAllTablesCache();
            this.clearMacCache();
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
            tableName: data.tableName?.trim() || table.tableName,
            macAddress: data.macAddress !== undefined ? this.normalizeMac(data.macAddress) : table.macAddress
        });
        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);
        await this.clearAllTablesCache();
        this.clearMacCache();
        this.billiardGateway.broadcastTableUpdate({
            ...savedTable,
            _action: 'UPDATE'
        });
        return savedTable;
    }
    async deleteTable(id) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException('Table not found');
        if (table.status !== _tableentity.TableStatus.AVAILABLE) {
            throw new _common.BadRequestException(`Meja tidak bisa dihapus karena statusnya masih ${table.status}. Harap selesaikan sesi/pembayaran terlebih dahulu.`);
        }
        // Soft delete: set deletedAt and rename to avoid unique constraint conflicts
        const timestamp = new Date().getTime();
        table.deletedAt = new Date();
        table.tableName = `${table.tableName} (DELETED-${timestamp})`;
        await this.tableRepository.save(table);
        this.clearMacCache();
        // Notify frontend to remove table from lists securely
        await this.clearAllTablesCache();
        this.clearMacCache();
        this.billiardGateway.broadcastTableUpdate({
            id,
            type: 'billiard',
            _action: 'DELETE'
        });
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
        this.mqttService.publishLightCommand(table.macAddress || String(table.id), table.id, isOn, table.relayPin, false, true);
        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);
        await this.clearAllTablesCache();
        this.clearMacCache();
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async pingTable(id) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException(`Table ${id} not found`);
        const macOrId = table.macAddress || String(table.id);
        const result = this.mqttService.pingTable(macOrId, table.id);
        this.logger.log(`Ping sent to table ${table.tableName} (mac: ${macOrId}), topic: ${result.topic}`);
        // Also broadcast a real-time notification via WebSocket so operators can see it
        await this.clearAllTablesCache();
        this.clearMacCache();
        this.billiardGateway.broadcastTableUpdate({
            ...table,
            type: 'billiard',
            _action: 'PING_SENT',
            _pingTopic: result.topic,
            _pingAt: result.sentAt
        });
        return {
            success: true,
            topic: result.topic,
            sentAt: result.sentAt,
            table: {
                id: table.id,
                tableName: table.tableName,
                macAddress: table.macAddress,
                relayPin: table.relayPin,
                isLightOn: table.isLightOn,
                status: table.status
            }
        };
    }
    async testGpioPin(id, pin, isOn) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException(`Table ${id} not found`);
        const macOrId = table.macAddress || String(table.id);
        const result = this.mqttService.publishGpioCommand(macOrId, pin, isOn);
        this.logger.log(`GPIO Test sent to table ${table.tableName} (mac: ${macOrId}), Pin: ${pin}, Status: ${isOn ? 'ON' : 'OFF'}`);
        return {
            success: true,
            pin,
            status: isOn ? 'ON' : 'OFF',
            sentAt: result.sentAt,
            topic: result.topic
        };
    }
    async rebootEsp32(id) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException(`Table ${id} not found`);
        const macOrId = table.macAddress || String(table.id);
        const result = this.mqttService.publishSystemCommand(macOrId, 'REBOOT');
        this.logger.log(`REBOOT command sent to table ${table.tableName} (mac: ${macOrId})`);
        return {
            success: true,
            message: 'Reboot command sent',
            sentAt: result.sentAt
        };
    }
    async startSession(tableId, type, durationMinutes, customerName, packageId, customPriceSettings, promoId, userId, userName, memberId, idempotencyKey) {
        // ── IDEMPOTENCY: check cache ───────────────────────────────────
        if (idempotencyKey) {
            const cached = await this.redisService.getIdempotency(idempotencyKey);
            if (cached) return cached;
        }
        // ── MUTEX: cegah double-start untuk meja yang sama ─────────────
        const lockKey = `table_start_${tableId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 5000);
        if (!acquired) {
            this.logger.warn(`startSession: Table ${tableId} sudah dalam proses start (Redis Lock), diabaikan.`);
            return null;
        }
        // ─────────────────────────────────────────────────────────────
        try {
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
                const activePromos = await this.promoService.getActivePromos();
                selectedPromo = activePromos.find((p)=>p.id === promoId);
                if (selectedPromo && (selectedPromo.type === _promoentity.PromoType.PACKAGE || selectedPromo.type === _promoentity.PromoType.BUNDLE)) {
                    durationMinutes = selectedPromo.ruleJson.requireBilliardMinutes;
                    type = 'prepaid';
                }
            } else if (packageId) {
                selectedPackage = await this.packageRepository.findOne({
                    where: {
                        id: packageId
                    }
                });
                if (selectedPackage) {
                    if (selectedPackage.type === _billiardpackageentity.PackageType.FIXED || selectedPackage.type === _billiardpackageentity.PackageType.DURATION || selectedPackage.type === _billiardpackageentity.PackageType.PLAYTIME) {
                        durationMinutes = Number(selectedPackage.durationMinutes);
                    } else if (!durationMinutes) {
                        durationMinutes = 60;
                    }
                }
            }
            if (durationMinutes) {
                durationMinutes = Number(durationMinutes);
                if (isNaN(durationMinutes)) durationMinutes = 0;
            }
            // --- 1. SET TABLE DATA ---
            table.status = _tableentity.TableStatus.IN_USE;
            table.isLightOn = true;
            table.sessionType = type;
            table.startTime = new Date();
            table.memberId = memberId || null;
            table.packageId = packageId || null;
            table.remainingMinutes = null;
            if (type === 'prepaid' && durationMinutes) {
                table.endTime = new Date(table.startTime.getTime() + durationMinutes * 60000);
                table.remainingMinutes = durationMinutes;
                const globalSettings = await this.settingsService.getSettings();
                const threshold = globalSettings.endingSoonThreshold || 5;
                if (durationMinutes <= threshold) table.status = _tableentity.TableStatus.WARNING;
            }
            // --- 2. CALCULATE PRICING ---
            let fareName = type === 'prepaid' ? 'Custom Session' : 'Open Table';
            let sessionPrice = 0;
            if (selectedPromo) {
                fareName = selectedPromo.name;
                sessionPrice = Number(selectedPromo.ruleJson.fixedPrice) || 0;
            } else if (selectedPackage) {
                fareName = selectedPackage.name;
                const activeRate = this.transactionService.calculateCurrentPackagePrice(selectedPackage);
                sessionPrice = selectedPackage.type === _billiardpackageentity.PackageType.FIXED ? activeRate : durationMinutes / 60 * activeRate;
            } else if (type === 'prepaid' && durationMinutes) {
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
            table.activePackagePrice = sessionPrice > 0 ? sessionPrice : null;
            // --- 3. CREATE/UPDATE TRANSACTION ---
            let transaction = await this.transactionService.getActiveTransactionByTable(tableId, true);
            if (!transaction) {
                transaction = await this.transactionService.createTransaction(tableId, userId, undefined, packageId, fareName);
            }
            let finalCustomerName = customerName;
            if (memberId && (!finalCustomerName || finalCustomerName === 'Tamu' || finalCustomerName === 'Customer')) {
                const member = await this.memberService.getMemberById(memberId);
                if (member) finalCustomerName = member.name;
            }
            if (!finalCustomerName) {
                finalCustomerName = table.isBooked && table.bookedByName ? table.bookedByName : 'Tamu';
            }
            // Sync all info to transaction in one go + Recalculate Totals
            transaction = await this.transactionService.updateTransaction(transaction.id, {
                customerName: finalCustomerName,
                fareName,
                startTime: table.startTime,
                sessionType: type,
                memberId: memberId || null,
                packageId: packageId || null,
                billiardTotal: sessionPrice
            });
            // Handle Booking check-in
            if (table.isBooked) {
                if (table.bookedByWaitingId) await this.waitingListService.checkIn(table.bookedByWaitingId);
                table.isBooked = false;
                table.bookedByWaitingId = null;
                table.bookedByName = null;
            }
            // --- 4. AUTO-DEBIT (Prepaid Member) ---
            if (type === 'prepaid' && memberId && sessionPrice > 0) {
                try {
                    await this.transactionService.processMultiPayerPayment(transaction.id, {
                        orderItemIds: [],
                        payerName: finalCustomerName,
                        paymentMethod: 'MEMBER',
                        billiardPortion: sessionPrice
                    }, userId);
                } catch (err) {
                    this.logger.error(`AUTO-DEBIT FAILED: ${err.message}`);
                    this.billiardGateway.broadcastWarning('Gagal Potong Saldo', `Session gagal: ${err.message}`, tableId);
                    throw err;
                }
            }
            // --- 5. AUTO-ORDER (Promo Bundle) ---
            if (selectedPromo && selectedPromo.ruleJson.requireMenuItems?.length > 0) {
                const itemsToOrder = selectedPromo.ruleJson.requireMenuItems.map((item, idx)=>({
                        id: item.id,
                        quantity: item.quantity,
                        note: `Promo Bundle: ${selectedPromo.name}`,
                        customName: idx === 0 ? `[PAKET] ${selectedPromo.name}` : undefined,
                        priceOverride: 0
                    }));
                try {
                    await this.cafeService.processOrder(itemsToOrder, tableId);
                } catch (err) {
                    this.logger.error(`FAILED to auto-order promo items:`, err);
                }
            }
            // --- 6. FINAL SAVE & BROADCAST ---
            const savedTable = await this.tableRepository.save(table);
            // --- AI SALES ORCHESTRATOR: Billiard Package Tracking ---
            if (transaction.businessDayId && (packageId || table.packageId)) {
                this.aiService.updateSoldQuantities(0, transaction.businessDayId, 1, transaction.id, tableId, packageId || table.packageId, userId, promoId).catch((err)=>this.logger.error(`AI Tracking Error (Billiard): ${err.message}`));
            }
            if (userName) {
                const details = `Mulai meja ${table.tableName} (${fareName}) - Tamu: ${finalCustomerName}`;
                await this.reportService.logAction('START_SESSION', userName, details, tableId);
            }
            if (table.macAddress) {
                this.mqttService.publishLightCommand(table.macAddress, table.id, true, table.relayPin, false, true);
            }
            await this.attachTransactionData(savedTable);
            await this.clearAllTablesCache();
            this.clearMacCache();
            this.billiardGateway.broadcastTableUpdate(savedTable);
            // Trigger AI Upselling Prompt
            this.aiService.broadcastUpsellPrompt(tableId, savedTable.tableName);
            if (idempotencyKey) {
                await this.redisService.setIdempotency(idempotencyKey, savedTable);
            }
            return savedTable;
        } finally{
            await this.redisService.releaseLock(lockKey);
        }
    }
    async stopSession(tableId, userId, userName, idempotencyKey) {
        // ── IDEMPOTENCY: check cache ───────────────────────────────────
        if (idempotencyKey) {
            const cached = await this.redisService.getIdempotency(idempotencyKey);
            if (cached) return cached;
        }
        // ── MUTEX: distributed lock ────────────────────────────────────
        const lockKey = `table_stop_${tableId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 5000);
        if (!acquired) {
            this.logger.warn(`stopSession: Table ${tableId} is already stopping (Redis Lock), skipping.`);
            return null;
        }
        // ─────────────────────────────────────────────────────────────
        // ─────────────────────────────────────────────────────────────
        try {
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
                const transaction = await this.transactionService.getActiveTransactionByTable(tableId, true);
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
                } else if (table.sessionType === 'prepaid') {
                    // FOR PREPAID: Use the activePackagePrice (which includes extensions) as the absolute cost.
                    billiardCost = Number(table.activePackagePrice || 0);
                    let pkgDuration = session.durationMinutes;
                    let pkgName = '';
                    if (table.packageId) {
                        const pkg = await this.packageRepository.findOneBy({
                            id: table.packageId
                        });
                        if (pkg) {
                            pkgDuration = pkg.durationMinutes || pkgDuration;
                            pkgName = pkg.name;
                        }
                    }
                    billingDetails = {
                        title: pkgName || transaction?.fareName || 'Prepaid Session',
                        duration: pkgDuration,
                        subtotal: billiardCost
                    };
                } else {
                    billiardCost = Number(table.activePackagePrice || 0);
                }
                // Only enforce 1 hour minimum for OPEN tables here as a safety fallback
                if ((billiardCost === 0 || billiardCost === null) && table.startTime && table.sessionType === 'open') {
                    const elapsedMs = new Date().getTime() - table.startTime.getTime();
                    const elapsedMin = Math.max(60, Math.ceil(elapsedMs / 60000));
                    const packages = await this.getPackages();
                    const hourlyRate = packages.find((p)=>p.type === _billiardpackageentity.PackageType.HOURLY)?.price || 50000;
                    billiardCost = elapsedMin / 60 * Number(hourlyRate);
                }
                billiardCost = Math.round(billiardCost);
                if (transaction) {
                    let durationSecs = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000);
                    if (table.sessionType === 'prepaid' && table.startTime && table.endTime) {
                        const diffMs = table.endTime.getTime() - table.startTime.getTime();
                        durationSecs = Math.floor(diffMs / 1000);
                    }
                    const hours = Math.floor(durationSecs / 3600);
                    const minutes = Math.floor(durationSecs % 3600 / 60);
                    const seconds = durationSecs % 60;
                    const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    const fareNameLabel = table.packageId ? (await this.packageRepository.findOne({
                        where: {
                            id: table.packageId
                        }
                    }))?.name : transaction.fareName || 'Open Table';
                    // Force a full totals recalculation (Grand Total = Billiard + SC + VAT - Discounts)
                    // Using setBilliardTotal ensures the transaction.grandTotal is accurate before we attempt AUTO-DEBIT.
                    // For PREPAID: We do NOT append a summary item because the breakdown was already
                    // created by startSession and extendSession. We only sync the final total and end time.
                    // For OPEN: We append the calculated details breakdown.
                    const finalSyncDetails = table.sessionType === 'prepaid' ? undefined : {
                        title: fareNameLabel || 'Open Table',
                        duration: session.durationMinutes,
                        subtotal: billiardCost,
                        startTimeFormatted: (table.startTime || transaction.startTime)?.toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit'
                        }).replace(/:/g, '.'),
                        endTimeFormatted: session.endTime.toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit'
                        }).replace(/:/g, '.')
                    };
                    await this.transactionService.setBilliardTotal(transaction.id, billiardCost, finalSyncDetails, userName, session.endTime, true);
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
                            // DO NOT set to AVAILABLE here. Let it transition to WAITING_PAYMENT
                            // table.status = TableStatus.AVAILABLE;
                            // table.memberId = null;
                            // Final Notification after settlement
                            const finalSnap = await this.transactionService.getTransactionById(transaction.id);
                            await this.memberService.sendSessionCompletionNotification(finalSnap.memberId, {
                                tableName: table.tableName,
                                duration: finalSnap.sessionDuration,
                                billiardTotal: Number(finalSnap.billiardTotal || 0),
                                cafeTotal: Number(finalSnap.cafeTotal || 0),
                                grandTotal: Number(finalSnap.grandTotal || 0),
                                orderItems: finalSnap.orderItems || [],
                                awardedPoints: Number(finalSnap.awardedPoints || 0)
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
            // Re-fetch the table to ensure we do not overwrite a status transition
            // that happened during auto-debit (like WAITING_PAYMENT -> AVAILABLE)
            const freshTable = await this.tableRepository.findOne({
                where: {
                    id: tableId
                }
            });
            if (freshTable) {
                table.status = freshTable.status;
                table.isLightOn = freshTable.isLightOn;
                table.sessionType = freshTable.sessionType;
                table.startTime = freshTable.startTime;
                table.endTime = freshTable.endTime;
                table.memberId = freshTable.memberId;
                table.packageId = freshTable.packageId;
                table.activePackagePrice = freshTable.activePackagePrice;
                table.remainingMinutes = freshTable.remainingMinutes;
            }
            let isFullyPaid = false;
            let finalTrans = null;
            if (table.status !== _tableentity.TableStatus.AVAILABLE) {
                finalTrans = await this.transactionService.getActiveTransactionByTable(tableId, true);
                if (finalTrans) {
                    // Use a 1-IDR tolerance for floating point / rounding issues
                    const unpaidAmount = Number(finalTrans.grandTotal || 0) - Number(finalTrans.paidAmount || 0);
                    if (unpaidAmount <= 1 || finalTrans.status === _transactionentity.TransactionStatus.PAID) {
                        isFullyPaid = true;
                    }
                }
                if (isFullyPaid) {
                    table.status = _tableentity.TableStatus.AVAILABLE;
                    table.sessionType = null;
                    table.startTime = null;
                    table.endTime = null;
                    table.memberId = null;
                    table.packageId = null;
                    table.activePackagePrice = null;
                    table.remainingMinutes = null;
                    if (finalTrans && finalTrans.status !== _transactionentity.TransactionStatus.PAID) {
                        await this.transactionService.updateTransaction(finalTrans.id, {
                            status: _transactionentity.TransactionStatus.PAID,
                            endTime: new Date()
                        });
                    }
                } else if (finalTrans && finalTrans.status === _transactionentity.TransactionStatus.PAID) {
                    // Safety: if transaction is PAID but calculation has tiny discrepancy
                    table.status = _tableentity.TableStatus.AVAILABLE;
                    table.sessionType = null;
                    table.startTime = null;
                    table.endTime = null;
                    table.memberId = null;
                    table.packageId = null;
                    table.activePackagePrice = null;
                    table.remainingMinutes = null;
                } else {
                    table.status = _tableentity.TableStatus.WAITING_PAYMENT;
                }
            }
            table.isLightOn = false;
            const savedTable = await this.tableRepository.save(table);
            await this.attachTransactionData(savedTable);
            savedTable.type = 'billiard';
            // If it was an auto-cutoff, log it to the audit trail
            if (userName && userName.includes('Auto-Cutoff Saldo')) {
                await this.reportService.logAction('AUTO_STOP_LOW_BALANCE', 'System', `Sesi dihentikan otomatis karena saldo member ${table.member?.name || 'Unknown'} menipis.`, table.id, savedTable.activeTransaction?.invoiceNumber);
            }
            if (table.macAddress) {
                this.mqttService.publishLightCommand(table.macAddress, table.id, false, table.relayPin, false, true);
            }
            await this.clearAllTablesCache();
            this.clearMacCache();
            const res = savedTable;
            if (idempotencyKey) {
                await this.redisService.setIdempotency(idempotencyKey, res);
            }
            this.billiardGateway.broadcastTableUpdate(savedTable);
            return res;
        } finally{
            await this.redisService.releaseLock(lockKey);
        }
    }
    async handleCron() {
        // ── CRON OVERLAP GUARD: cegah eksekusi bersamaan ──────────────
        if (this.cronRunning) {
            this.logger.warn('handleCron: Previous cron still running, skipping this tick.');
            return;
        }
        this.cronRunning = true;
        try {
            // ─────────────────────────────────────────────────────────────
            const now = new Date();
            const globalSettings = await this.settingsService.getSettings();
            const threshold = globalSettings.endingSoonThreshold || 5;
            // 1. Handle Prepaid Sessions (Warning & Auto Stop)
            const prepaidTables = await this.tableRepository.find({
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
            for (const table of prepaidTables){
                this.logger.debug(`handleCron: Processing prepaid table ${table.tableName}...`);
                if (table.endTime && now >= table.endTime) {
                    // Time expired: hanya panggil stopSession jika tidak ada
                    // scheduled nor active stop untuk meja ini
                    if (!await this.redisService.get(`lock:cutoff_${table.id}`) && !await this.redisService.get(`lock:table_stop_${table.id}`)) {
                        await this.stopSession(table.id);
                    }
                } else if (table.endTime) {
                    // Check if approaching expiration within the next 15 seconds for precise scheduling
                    const diffMs = table.endTime.getTime() - now.getTime();
                    if (diffMs <= 15000 && !await this.redisService.get(`lock:cutoff_${table.id}`)) {
                        this.logger.log(`Table ${table.id} PREPAID approaching cutoff in ~${(diffMs / 1000).toFixed(1)}s. Scheduling precise stop.`);
                        await this.redisService.acquireLock(`lock:cutoff_${table.id}`, 20000);
                        setTimeout(async ()=>{
                            try {
                                const checkTable = await this.tableRepository.findOne({
                                    where: {
                                        id: table.id
                                    }
                                });
                                // Only stop if still in use/warning and hasn't been extended/stopped in the meantime
                                if (checkTable && [
                                    _tableentity.TableStatus.IN_USE,
                                    _tableentity.TableStatus.WARNING
                                ].includes(checkTable.status) && checkTable.endTime && new Date() >= checkTable.endTime) {
                                    await this.stopSession(table.id, undefined, 'Sistem (Auto-Cutoff Prepaid)');
                                }
                            } catch (e) {
                                this.logger.error(`Error during precise prepaid cutoff: ${e.message}`);
                            } finally{
                                await this.redisService.releaseLock(`lock:cutoff_${table.id}`);
                            }
                        }, diffMs);
                    }
                    // Update remaining minutes and check for warning (standard logic)
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
                        await this.clearAllTablesCache();
                        this.clearMacCache();
                        this.billiardGateway.broadcastTableUpdate(saved);
                    }
                }
            }
            // 2. Handle Member Open Table Auto-Cutoff (Precision Billing)
            const openTablesWithMember = await this.tableRepository.find({
                where: {
                    status: _tableentity.TableStatus.IN_USE,
                    sessionType: 'open',
                    memberId: (0, _typeorm1.Not)((0, _typeorm1.IsNull)())
                }
            });
            for (const table of openTablesWithMember){
                this.logger.debug(`handleCron: Processing member table ${table.tableName}...`);
                if (await this.redisService.get(`lock:cutoff_${table.id}`)) {
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
                // Use the accurately calculated grandTotal from calculateTransientTotals
                // getActiveTransactionByTable already performs this calculation.
                // transaction.grandTotal in this context represents the UNPAID amount.
                const remainingToPay = Number(transaction.grandTotal || 0);
                // Define a safety buffer (e.g., 2,000 IDR or ~2 mins of play at 60k/hr)
                const globalSettings = await this.settingsService.getSettings();
                const balanceBuffer = globalSettings.balanceBuffer || 2000;
                if (remainingToPay >= memberBalance - balanceBuffer) {
                    // Instantly out of balance or within buffer, cut it off now
                    this.logger.warn(`Member ${member.name} reached balance buffer. Cutting off table ${table.id}`);
                    // Broadcast one last warning before stopping
                    this.billiardGateway.broadcastWarning('Saldo Habis', `Sesi meja ${table.tableName} dihentikan karena saldo member ${member.name} sudah mencapai batas minimum.`, table.id);
                    await this.stopSession(table.id, undefined, 'Sistem (Auto-Cutoff Saldo)');
                } else {
                    // Check if they will run out of balance within the next 30 seconds (before next cron tick)
                    // We can estimate the burn rate.
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
                    }
                    const ratePerHour = Number(pkg?.minutePrice || 50000 / 60) * 60;
                    const costPerSecond = ratePerHour / 3600;
                    if (costPerSecond > 0) {
                        const usableAmount = memberBalance - remainingToPay - balanceBuffer;
                        const remainingSeconds = usableAmount / costPerSecond;
                        if (remainingSeconds <= 32) {
                            this.logger.log(`Table ${table.id} Open Table approaching cutoff in ~${remainingSeconds.toFixed(1)}s (Balance: Rp${memberBalance}, Remaining Unpaid: Rp${remainingToPay})`);
                            await this.redisService.acquireLock(`lock:cutoff_${table.id}`, 20000);
                            const msDelay = Math.max(0, Math.floor(remainingSeconds * 1000));
                            setTimeout(async ()=>{
                                try {
                                    this.logger.warn(`Executing Precise Timer Cutoff for table ${table.id}`);
                                    await this.stopSession(table.id, undefined, 'Sistem (Auto-Cutoff Saldo)');
                                } catch (e) {
                                    this.logger.error(`Error during delayed cutoff: ${e.message}`);
                                } finally{
                                    await this.redisService.releaseLock(`lock:cutoff_${table.id}`);
                                }
                            }, msDelay);
                        }
                        // 3. LOW BALANCE WARNING (Before Cutoff)
                        // If balance is enough for > buffer but < e.g. 15 minutes, send one-shot WA warning
                        const warningMinutes = globalSettings.balanceWarningMinutes || 15;
                        const warningBuffer = warningMinutes * 60 * costPerSecond;
                        if (usableAmount > 0 && usableAmount <= warningBuffer) {
                            const warningSentKey = `wa_warning_sent:${table.id}:${table.startTime.getTime()}`;
                            const alreadySent = await this.redisService.get(warningSentKey);
                            if (!alreadySent) {
                                this.logger.log(`Sending Low Balance Warning to Member ${member.name} (Table ${table.tableName})`);
                                const remainingMin = Math.ceil(usableAmount / (ratePerHour / 60));
                                const message = `⚠️ *Peringatan Saldo Menipis*\n\n` + `Halo ${member.name},\nsaldo member Anda saat ini tersisa sekitar *Rp ${memberBalance.toLocaleString('id-ID')}*.\n\n` + `Estimasi sisa waktu bermain di Meja *${table.tableName}* adalah sekitar *${remainingMin} menit* lagi sebelum sistem menghentikan sesi secara otomatis.\n\n` + `Silakan lakukan top-up di kasir jika ingin memperpanjang waktu bermain Anda. Terima kasih!`;
                                await this.whatsappService.sendMessage(member.phone, message);
                                await this.redisService.set(warningSentKey, 'true', 3600 * 4); // Expire in 4h
                            }
                        }
                    }
                }
            }
        } finally{
            this.cronRunning = false;
            this.logger.debug('handleCron: Completed sucessfully.');
        }
    }
    async handleHeartbeat(tableId, telemetry) {
        const now = Date.now();
        const lastUpdate = this.lastHeartbeatDbUpdate.get(tableId) || 0;
        const throttleMs = 5 * 60 * 1000; // 5 minutes
        const updateData = {};
        if (telemetry?.ip) updateData.ipAddress = telemetry.ip;
        if (telemetry?.rssi !== undefined) updateData.rssi = telemetry.rssi;
        if (telemetry?.uptime !== undefined) updateData.uptime = telemetry.uptime;
        updateData.lastHeartbeat = new Date();
        // Only update DB if throttled or no previous update
        if (now - lastUpdate > throttleMs) {
            if (Object.keys(updateData).length > 0) {
                await this.tableRepository.update(tableId, updateData);
                this.lastHeartbeatDbUpdate.set(tableId, now);
            }
        }
        this.billiardGateway.handleHeartbeat(tableId, telemetry);
    }
    async rebootTable(tableId) {
        const table = await this.getTableById(tableId);
        if (!table || !table.macAddress) return {
            success: false,
            message: 'Table or MAC not found'
        };
        this.mqttService.publishSystemCommand(table.macAddress, 'REBOOT');
        return {
            success: true,
            message: `Reboot command sent to ${table.tableName}`
        };
    }
    async emergencyStop(username) {
        const activeTables = await this.tableRepository.find({
            where: {
                isLightOn: true,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        this.logger.warn(`EMERGENCY STOP TRIGGERED BY ${username}. Shutting down ${activeTables.length} tables.`);
        for (const table of activeTables){
            if (table.macAddress) {
                this.mqttService.publishLightCommand(table.macAddress, table.id, false, table.relayPin, false, true);
            }
        }
        // Log the event
        if (this.reportService) {
            await this.reportService.logAction('EMERGENCY_STOP', `Admin ${username} memicu EMERGENCY STOP untuk ${activeTables.length} meja.`, null, username);
        }
        return {
            success: true,
            count: activeTables.length,
            message: `Emergency stop berhasil dikirim ke ${activeTables.length} meja.`
        };
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
        this.mqttService.publish(topic, {
            status: 'ON',
            type,
            duration: durationMinutes || 0,
            startTime: table.startTime ? table.startTime.toISOString() : new Date().toISOString(),
            endTime: table.endTime ? table.endTime.toISOString() : null,
            relayPin: table.relayPin
        });
        await this.clearAllTablesCache();
        this.clearMacCache();
        this.billiardGateway.broadcastTableUpdate(savedTable);
        return savedTable;
    }
    async extendSession(tableId, durationMinutes, packageId, userName, ignoreConflict = false, idempotencyKey) {
        // ── IDEMPOTENCY: check cache ───────────────────────────────────
        if (idempotencyKey) {
            const cached = await this.redisService.getIdempotency(idempotencyKey);
            if (cached) return cached;
        }
        // ── MUTEX: cegah double-extend untuk meja yang sama ────────────
        // ── MUTEX: distributed lock ────────────────────────────────────
        const lockKey = `table_extend_${tableId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 5000);
        if (!acquired) {
            this.logger.warn(`extendSession: Table ${tableId} is being extended (Redis Lock), skipping.`);
            return null;
        }
        // ─────────────────────────────────────────────────────────────
        // ─────────────────────────────────────────────────────────────
        try {
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
            const now = new Date();
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
            // Pastikan scheduledCutoffs di-clear saat extend agar tidak ada
            // stopSession yang terlambat berjalan setelah lampu dinyalakan kembali
            await this.redisService.releaseLock(lockKey); // release extending lock
            await this.redisService.releaseLock(`lock:cutoff_${tableId}`); // clear potential cutoff lock if extended successfully
            // Selalu nyalakan lampu saat extend (baik dari WAITING_PAYMENT maupun IN_USE/WARNING)
            table.isLightOn = true;
            if (table.status === _tableentity.TableStatus.WAITING_PAYMENT) {
                table.status = _tableentity.TableStatus.IN_USE;
            }
            const currentEnd = table.endTime && new Date(table.endTime) > now ? new Date(table.endTime) : now;
            table.endTime = new Date(currentEnd.getTime() + extensionMinutes * 60000);
            const diff = table.endTime.getTime() - now.getTime();
            table.remainingMinutes = Math.max(0, Math.ceil(diff / 60000));
            // Reset status jika waktu sudah di atas threshold
            // Dibungkus try/catch agar error EntityMetadata dari settingsService
            // tidak membunuh proses sebelum MQTT sempat dikirim
            let threshold = 5;
            try {
                const globalSettings = await this.settingsService.getSettings();
                threshold = globalSettings.endingSoonThreshold || 5;
            } catch (err) {
                this.logger.warn(`extendSession: gagal ambil settings (${err.message}), pakai threshold default ${threshold}`);
            }
            if (table.remainingMinutes > threshold && table.status === _tableentity.TableStatus.WARNING) {
                table.status = _tableentity.TableStatus.IN_USE;
            }
            // CUMULATIVE PRICE: Add to existing activePackagePrice (always integer)
            extensionPrice = Math.round(extensionPrice);
            table.activePackagePrice = Math.round(Number(table.activePackagePrice || 0) + extensionPrice);
            const savedTable = await this.tableRepository.save(table);
            // SYNC TRANSACTION: di-wrap try/catch agar error billing tidak memblokir MQTT
            try {
                const transaction = await this.transactionService.getActiveTransactionByTable(table.id, true);
                if (transaction) {
                    let extensionTitle = 'Tambahan Waktu';
                    if (packageId) {
                        const pkg = await this.packageRepository.findOne({
                            where: {
                                id: packageId
                            }
                        });
                        if (pkg) extensionTitle = `Extend ${pkg.name}`;
                    }
                    // Force synchronization of transaction.endTime to match new table.endTime
                    // This ensures the invoice header shows the CORRECT final end time.
                    transaction.endTime = table.endTime;
                    await this.transactionService.setBilliardTotal(transaction.id, table.activePackagePrice, {
                        title: extensionTitle,
                        duration: extensionMinutes,
                        subtotal: extensionPrice,
                        startTimeFormatted: (currentEnd || now).toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit'
                        }).replace(/:/g, '.'),
                        endTimeFormatted: table.endTime.toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit'
                        }).replace(/:/g, '.')
                    }, userName, table.endTime);
                }
            } catch (err) {
                this.logger.warn(`extendSession: sync transaction gagal (${err.message}) — diabaikan, MQTT tetap dikirim`);
            }
            // ═══════════════════════════════════════════════════════════════
            // MQTT: Kirim ON SEGERA setelah save — tidak boleh diblokir oleh
            // operasi lain di bawah (logAction, attachTransactionData, dll).
            // Dikirim DUA KALI (immediate + 1.5s delay) untuk reliability:
            // mencegah kasus di mana pesan ON pertama terlewat atau ada race
            // dengan delayed OFF dari sesi sebelumnya.
            // ═══════════════════════════════════════════════════════════════
            // Pembersihan status internal agar tidak dianggap sedang "stopping"
            await this.redisService.releaseLock(`lock:cutoff_${tableId}`);
            await this.redisService.releaseLock(`table_stop_${tableId}`);
            if (table.macAddress) {
                this.mqttService.publishLightCommand(table.macAddress, table.id, true, table.relayPin, true, true);
            }
            // Operasi non-kritis setelah MQTT terkirim
            if (userName) {
                try {
                    await this.reportService.logAction('EXTEND_SESSION', userName, `Tambah waktu meja ${table.tableName} selama ${extensionMinutes} menit. Tambahan biaya: Rp ${extensionPrice.toLocaleString()}`, tableId);
                } catch (err) {
                    this.logger.warn(`extendSession: logAction gagal (${err.message}) — diabaikan`);
                }
            }
            await this.attachTransactionData(savedTable);
            await this.clearAllTablesCache();
            this.clearMacCache();
            const res = savedTable;
            if (idempotencyKey) {
                await this.redisService.setIdempotency(idempotencyKey, res);
            }
            this.billiardGateway.broadcastTableUpdate(savedTable);
            return res;
        } finally{
            // Selalu hapus dari mutex, berhasil atau error
            await this.redisService.releaseLock(lockKey);
        }
    }
    async moveTable(fromTableId, toTableId, userName, idempotencyKey) {
        // ── IDEMPOTENCY: check cache ───────────────────────────────────
        if (idempotencyKey) {
            const cached = await this.redisService.getIdempotency(idempotencyKey);
            if (cached) return cached;
        }
        // ── MUTEX: distributed lock ────────────────────────────────────
        const lockKey = `table_move_${fromTableId}_${toTableId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 5000);
        if (!acquired) {
            this.logger.warn(`moveTable: Move from ${fromTableId} to ${toTableId} is already in progress.`);
            throw new Error('Proses pemindahan Meja sedang berjalan.');
        }
        try {
            const fromTable = await this.getTableById(fromTableId);
            const toTable = await this.getTableById(toTableId);
            if (!fromTable || !toTable) throw new _common.NotFoundException('Source or target table not found');
            if (fromTable.status === _tableentity.TableStatus.AVAILABLE) throw new Error('Source table has no active session');
            if (toTable.status !== _tableentity.TableStatus.AVAILABLE) throw new Error('Target table is not available');
            // 1. Move Transaction
            const transaction = await this.transactionService.getActiveTransactionByTable(fromTableId, true);
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
            toTable.memberId = fromTable.memberId;
            toTable.packageId = fromTable.packageId;
            toTable.activePackagePrice = fromTable.activePackagePrice;
            // 3. Reset Source Table
            fromTable.status = _tableentity.TableStatus.AVAILABLE;
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
            // Invalidate caches for both tables
            await this.redisService.del(`bill_preview_${fromTableId}`).catch(()=>{});
            await this.redisService.del(`bill_preview_${toTableId}`).catch(()=>{});
            // 4. IoT Coordination
            // Turn OFF source table - force:true bypasses ESP32 30s race condition protection
            if (fromTable.macAddress) {
                this.mqttService.publishLightCommand(fromTable.macAddress, fromTable.id, false, fromTable.relayPin, false, true);
            }
            // Turn ON new table with migrated duration/type
            if (toTable.macAddress) {
                this.mqttService.publishLightCommand(toTable.macAddress, toTable.id, true, toTable.relayPin, false, true, {
                    type: toTable.sessionType,
                    duration: toTable.remainingMinutes || 0,
                    startTime: toTable.startTime ? toTable.startTime.toISOString() : new Date().toISOString(),
                    endTime: toTable.endTime ? toTable.endTime.toISOString() : null
                });
            }
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
            const res = savedTo;
            if (idempotencyKey) {
                await this.redisService.setIdempotency(idempotencyKey, res);
            }
            return res;
        } finally{
            await this.redisService.releaseLock(lockKey);
        }
    }
    async resetTable(id, userName) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException('Table not found');
        // Bersihkan SEMUA field sesi agar tidak ada data bocor ke sesi berikutnya
        table.status = _tableentity.TableStatus.AVAILABLE;
        table.sessionType = null;
        table.startTime = null;
        table.endTime = null;
        table.remainingMinutes = null;
        table.isLightOn = false;
        table.memberId = null;
        table.packageId = null;
        table.activePackagePrice = null;
        table.grandTotal = 0;
        table.activeTransaction = null;
        // Bersihkan juga booking fields
        table.isBooked = false;
        table.bookedByWaitingId = null;
        table.bookedByName = null;
        // Bersihkan mutex internal jika ada sesi yang stuck
        await this.redisService.releaseLock(`lock:cutoff_${id}`);
        await this.redisService.releaseLock(`table_stop_${id}`);
        await this.redisService.releaseLock(`table_start_${id}`);
        await this.redisService.releaseLock(`table_extend_${id}`);
        const savedTable = await this.tableRepository.save(table);
        await this.attachTransactionData(savedTable);
        // force:true ensures relay turns off even within 30s race condition protection window
        if (table.macAddress) {
            this.mqttService.publishLightCommand(table.macAddress, table.id, false, table.relayPin, false, true);
        }
        this.billiardGateway.broadcastTableUpdate(savedTable);
        if (userName) {
            await this.reportService.logAction('FORCE_RESET_TABLE', userName, `Reset paksa Meja ${table.tableName}. Status kembali AVAILABLE.`, id);
        }
        return savedTable;
    }
    constructor(tableRepository, sessionRepository, packageRepository, mqttService, billiardGateway, transactionService, settingsService, cafeService, promoService, reportService, waitingListService, memberService, dataSource, // itemUpdating replaced by Redis locks
    redisService, whatsappService, aiService){
        this.tableRepository = tableRepository;
        this.sessionRepository = sessionRepository;
        this.packageRepository = packageRepository;
        this.mqttService = mqttService;
        this.billiardGateway = billiardGateway;
        this.transactionService = transactionService;
        this.settingsService = settingsService;
        this.cafeService = cafeService;
        this.promoService = promoService;
        this.reportService = reportService;
        this.waitingListService = waitingListService;
        this.memberService = memberService;
        this.dataSource = dataSource;
        this.redisService = redisService;
        this.whatsappService = whatsappService;
        this.aiService = aiService;
        this.logger = new _common.Logger(BilliardService.name);
        this.macTableCache = new Map();
        this.lastHeartbeatDbUpdate = new Map(); // tableId -> timestamp
        this.cronRunning = false;
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_10_SECONDS),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardService.prototype, "handleCron", null);
BilliardService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_tableentity.Table)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_sessionentity.Session)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_billiardpackageentity.BilliardPackage)),
    _ts_param(7, (0, _common.Inject)((0, _common.forwardRef)(()=>_cafeservice.CafeService))),
    _ts_param(10, (0, _common.Inject)((0, _common.forwardRef)(()=>_waitinglistservice.WaitingListService))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _mqttservice.MqttService === "undefined" ? Object : _mqttservice.MqttService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof _transactionservice.TransactionService === "undefined" ? Object : _transactionservice.TransactionService,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof _cafeservice.CafeService === "undefined" ? Object : _cafeservice.CafeService,
        typeof _promoservice.PromoService === "undefined" ? Object : _promoservice.PromoService,
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService,
        typeof _waitinglistservice.WaitingListService === "undefined" ? Object : _waitinglistservice.WaitingListService,
        typeof _memberservice.MemberService === "undefined" ? Object : _memberservice.MemberService,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource,
        typeof _redisservice.RedisService === "undefined" ? Object : _redisservice.RedisService,
        typeof _whatsappservice.WhatsAppService === "undefined" ? Object : _whatsappservice.WhatsAppService,
        typeof _aiservice.AIService === "undefined" ? Object : _aiservice.AIService
    ])
], BilliardService);

//# sourceMappingURL=billiard.service.js.map