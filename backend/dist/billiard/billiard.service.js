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
const _eventemitter = require("@nestjs/event-emitter");
const _tableentity = require("./entities/table.entity");
const _axios = /*#__PURE__*/ _interop_require_default(require("axios"));
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
const _voucherservice = require("../voucher/voucher.service");
const _memberentity = require("../member/entities/member.entity");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
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
let BilliardService = class BilliardService {
    clearMacCache() {
        this.macTableCache.clear();
        this.espnowMacIdCache.clear(); // ✅ Reset fast cache juga
        this.logger.debug('MAC-to-Table cache cleared.');
    }
    getBusinessDayCode(offsetSetting) {
        const now = new Date();
        let offsetHours = 0;
        let offsetMinutes = 0;
        if (offsetSetting) {
            const parts = offsetSetting.split(':');
            if (parts.length === 2) {
                offsetHours = parseInt(parts[0], 10);
                offsetMinutes = parseInt(parts[1], 10);
            }
        }
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        let isBeforeOffset = false;
        if (currentHours < offsetHours) {
            isBeforeOffset = true;
        } else if (currentHours === offsetHours && currentMinutes < offsetMinutes) {
            isBeforeOffset = true;
        }
        let day = now.getDay();
        if (isBeforeOffset) {
            day = day === 0 ? 6 : day - 1;
        }
        const days = [
            'SUN',
            'MON',
            'TUE',
            'WED',
            'THU',
            'FRI',
            'SAT'
        ];
        return days[day];
    }
    /**
   * Normalizes MAC address by removing colons, dashes and converting to uppercase.
   */ normalizeMac(mac) {
        if (!mac) return '';
        return mac.trim().replace(/[:\-]/g, '').toUpperCase();
    }
    /**
   * Hybrid Routing Helper:
   * Returns the MQTT topic MAC address.
   * For ESPNOW_NODE: Returns espnowGatewayMac (commands must go through the Gateway).
   * For direct WiFi: Returns macAddress.
   */ getEffectiveMqttMac(table) {
        if (table.hardwareType === 'ESPNOW_NODE' && table.espnowGatewayMac) {
            return this.normalizeMac(table.espnowGatewayMac);
        }
        return this.normalizeMac(table.macAddress);
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
            // ✅ v7.2: Pre-populate ESP-NOW MAC cache in background to avoid blocking initialization
            this.tableRepository.find({
                where: {
                    hardwareType: _tableentity.HardwareType.ESPNOW_NODE,
                    deletedAt: (0, _typeorm1.IsNull)()
                },
                select: [
                    'id',
                    'macAddress'
                ]
            }).then((espnowTables)=>{
                for (const t of espnowTables){
                    if (t.macAddress) {
                        const norm = this.normalizeMac(t.macAddress);
                        this.espnowMacIdCache.set(norm, t.id);
                    }
                }
                this.logger.log(`[CACHE-v7.2] Loaded ${this.espnowMacIdCache.size} ESP-NOW MACs into fast cache.`);
            }).catch((err)=>{
                this.logger.error(`[CACHE-v7.2] Failed to pre-populate cache: ${err.message}`);
            });
            this.mqttService.onMessage(async (topic, payload, packet)=>{
                if (topic.includes('floor') || topic.includes('gateway')) {
                    this.logger.log(`[MQTT-RECEIVE] Topic: ${topic}`); // 🔴 Log khusus data kritis
                }
                const isRetained = packet?.retain === true;
                const parts = topic.split('/');
                const type = parts[1]; // 'table', 'gateway', or 'heartbeat'
                const rawMac = parts[2];
                // 🛡️ HEARTBEAT BRIDGE (v7.9): Satpam Filter - Abaikan MAC palsu/sampah
                if (type === 'heartbeat' && rawMac) {
                    const macAddress = this.normalizeMac(rawMac);
                    // 🛡️ FILTER: MAC asli minimal 10-12 karakter. Jika cuma "2" atau pendek, itu sampah.
                    if (macAddress.length < 10) {
                        this.logger.debug(`[HEARTBEAT-IGNORE] 🗑️ Mengabaikan MAC sampah: ${macAddress}`);
                        return;
                    }
                    const data = JSON.parse(payload.toString());
                    const incomingMesaId = Number(data.tableId || data.mesaId || 0);
                    let tables = await this.getTablesByMac(macAddress);
                    // 🪄 SELF-LEARNING (v7.7): Jika MAC tidak dikenal, cari via MesaID
                    if (tables.length === 0 && incomingMesaId > 0) {
                        const tableByMesa = await this.tableRepository.findOne({
                            where: {
                                relayPin: incomingMesaId,
                                hardwareType: _tableentity.HardwareType.ESPNOW_NODE,
                                deletedAt: (0, _typeorm1.IsNull)()
                            }
                        });
                        if (tableByMesa) {
                            this.logger.log(`[AUTO-LEARN] 🪄 Meja ${tableByMesa.tableName} (Pin:${incomingMesaId}) dikenali via MAC baru: ${macAddress}`);
                            tableByMesa.macAddress = macAddress;
                            await this.tableRepository.save(tableByMesa);
                            this.espnowMacIdCache.set(macAddress, tableByMesa.id);
                            tables = [
                                tableByMesa
                            ];
                        }
                    }
                    for (const table of tables){
                        // 🛡️ COMMAND LOCK (v7.12): Abaikan heartbeat jika baru saja kirim perintah (cegah flicker)
                        const lockTime = this.commandLocks.get(table.id) || 0;
                        if (Date.now() < lockTime) {
                            continue;
                        }
                        // ✅ Respect online status dari Komandan (BATCH report kirim field "online")
                        const isOnline = data.online !== false; // Default true jika tidak ada field online
                        // 🛡️ ANTI-SPAM: Hanya proses jika status berubah
                        const prevStatus = this.lastBroadcastOnlineStatus.get(table.id);
                        const statusChanged = prevStatus !== isOnline;
                        this.billiardGateway.handleHeartbeat(table.id, {
                            ...data,
                            online: isOnline,
                            status: isOnline ? 'online' : 'offline',
                            hwType: 'ESPNOW_NODE',
                            mesaId: table.relayPin,
                            tableIdentity: table.tableName
                        });
                        if (statusChanged) {
                            this.lastBroadcastOnlineStatus.set(table.id, isOnline);
                            this.handleHeartbeat(table.id, {
                                ...data,
                                online: isOnline,
                                status: isOnline ? 'online' : 'offline',
                                hwType: 'ESPNOW_NODE'
                            });
                            // 🚨 Broadcast ke UI hanya saat status berubah
                            const freshTable = await this.getTableById(table.id);
                            if (freshTable) {
                                this.billiardGateway.broadcastTableUpdate({
                                    ...freshTable,
                                    online: isOnline,
                                    isOffline: !isOnline,
                                    hwState: isOnline ? data.lightState ? 'ON' : 'OFF' : 'OFF',
                                    hwType: 'ESPNOW_NODE',
                                    mode: 'OTOMATIS',
                                    type: 'billiard'
                                });
                                if (!isOnline) {
                                    this.logger.warn(`[HEARTBEAT-OFFLINE] 🔴 Meja ${table.tableName} OFFLINE. UI diupdate.`);
                                } else {
                                    this.logger.log(`[HEARTBEAT-ONLINE] 🟢 Meja ${table.tableName} kembali ONLINE. UI diupdate.`);
                                }
                            }
                        }
                    }
                    return;
                }
                if (topic === 'billiard/table/sync') {
                    const macAddress = this.normalizeMac(payload.toString().trim());
                    if (!macAddress) return;
                    const tables = await this.getTablesByMac(macAddress);
                    if (tables.length > 0) {
                        const now = new Date();
                        const alertMinute = this.settingsService.getEndingSoonThresholdSync();
                        const syncData = tables.map((t)=>{
                            let remainingMinutes = 0;
                            if (t.isLightOn && t.endTime) {
                                const diffMs = t.endTime.getTime() - now.getTime();
                                remainingMinutes = Math.max(0, Math.ceil(diffMs / 60000));
                            }
                            return {
                                tableId: t.id,
                                status: t.isLightOn ? 'ON' : 'OFF',
                                relayPin: t.relayPin,
                                remainingMinutes,
                                alertMinute
                            };
                        });
                        this.mqttService.publish(`billiard/table/${macAddress}/sync_response`, {
                            tables: syncData,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                // Tracking gateway status untuk log agregat
                if (type === 'gateway' && parts[3] === 'status') {
                    const data = JSON.parse(payload.toString());
                    const normalizedGw = this.normalizeMac(rawMac);
                    this.gatewayStatuses.set(normalizedGw, {
                        online: data.peersOnline ?? 0,
                        total: data.peerCount ?? 0,
                        lastSeen: new Date()
                    });
                    // Bersihkan gateway yang sudah tidak aktif (> 1 menit)
                    const now = new Date();
                    for (const [mac, status] of this.gatewayStatuses.entries()){
                        if (now.getTime() - status.lastSeen.getTime() > 60000) {
                            this.gatewayStatuses.delete(mac);
                        }
                    }
                    // Hitung Agregat
                    let totalGateways = this.gatewayStatuses.size;
                    let totalOnlinePrajurit = 0;
                    let totalRegisteredPrajurit = 0;
                    this.gatewayStatuses.forEach((s)=>{
                        totalOnlinePrajurit += s.online;
                        totalRegisteredPrajurit += s.total;
                    });
                    this.logger.log(`[GATEWAY-HEARTBEAT] STATS: ${totalGateways} Komandan Terdaftar | ${totalOnlinePrajurit}/${totalRegisteredPrajurit} Prajurit Online`);
                    this.billiardGateway.server.emit('gateway_status', {
                        ...data,
                        mac: rawMac,
                        lastSeen: new Date()
                    });
                }
                // ✅ v7.0: Handle floor-based gateway status (billiard/floor/+/gateway/+/status)
                // Format topic: billiard/floor/{floor_id}/gateway/{mac}/status
                if (parts[0] === 'billiard' && parts[1] === 'floor') {
                    this.logger.log(`[MQTT-FLOOR] Topic: ${topic} | Parts: ${parts.length} | Part3: ${parts[3]} | Part5: ${parts[5]}`);
                    if (parts[3] === 'gateway' && parts[5] === 'status') {
                        try {
                            const data = JSON.parse(payload.toString());
                            const gwMac = this.normalizeMac(parts[4]);
                            const floorId = Number(parts[2]);
                            const blockId = data.block_id || 'A';
                            const prajurit = data.prajurit || [];
                            // Update per-Prajurit node registry
                            for (const p of prajurit){
                                const key = `${gwMac}_mesa${p.mesaId}`;
                                this.prajuritNodeMap.set(key, {
                                    mesaId: p.mesaId,
                                    mac: this.normalizeMac(p.mac),
                                    online: p.online,
                                    lastCmd: p.lastCmd,
                                    lastSeenS: p.lastSeenS,
                                    ackPending: p.ackPending,
                                    gatewayMac: gwMac,
                                    floor_id: floorId,
                                    block_id: blockId,
                                    updatedAt: new Date()
                                });
                                // ✅ v7.2: BRIDGE — feed gateway report ke handleHeartbeat agar
                                // dashboard Online/Offline terupdate TANPA perlu individual heartbeat.
                                // Komandan kirim GW-REPORT setiap 30 detik → cukup untuk status meja.
                                // dashboard Online/Offline terupdate TANPA perlu query DB lambat.
                                const pMac = this.normalizeMac(p.mac);
                                this.logger.log(`[BRIDGE-TRACE] Meja ${p.mesaId} | MAC: ${pMac} | Online: ${p.online}`);
                                // 🚀 JALUR EKSPRES (v7.5): Cari berdasarkan MesaID (relayPin) + ESPNOW_NODE
                                // Ini solusi paling jitu karena MesaID tidak mungkin salah.
                                let tableId = pMac ? this.espnowMacIdCache.get(pMac) : undefined;
                                if (!tableId) {
                                    const tableByMesa = await this.tableRepository.findOne({
                                        where: {
                                            relayPin: p.mesaId,
                                            hardwareType: _tableentity.HardwareType.ESPNOW_NODE,
                                            deletedAt: (0, _typeorm1.IsNull)()
                                        }
                                    });
                                    if (tableByMesa) {
                                        tableId = tableByMesa.id;
                                        // Auto-fix MAC & Gateway jika belum sinkron
                                        if (pMac && tableByMesa.macAddress !== pMac) {
                                            this.logger.log(`[AUTO-SYNC] 🪄 Meja ${tableByMesa.tableName} (ID:${tableId}) disinkronkan ke MAC: ${pMac}`);
                                            tableByMesa.macAddress = pMac;
                                            tableByMesa.espnowGatewayMac = gwMac;
                                            await this.tableRepository.save(tableByMesa);
                                            this.espnowMacIdCache.set(pMac, tableId);
                                        }
                                    }
                                }
                                if (tableId) {
                                    const isOnline = p.online === true || p.online === 1;
                                    // 1. Update status di memori Gateway (agar isTableOnline() return true)
                                    this.billiardGateway.handleHeartbeat(tableId, {
                                        online: isOnline,
                                        lightState: p.lastCmd === 1,
                                        status: isOnline ? 'online' : 'offline',
                                        hwType: 'ESPNOW_NODE',
                                        mode: 'OTOMATIS',
                                        tableIdentity: `Meja ${p.mesaId}`,
                                        rssi: p.rssi || -60
                                    });
                                    // 2. Broadcast ke UI hanya saat status berubah (anti-spam)
                                    const prevOnline = this.lastBroadcastOnlineStatus.get(tableId);
                                    if (prevOnline !== isOnline) {
                                        this.lastBroadcastOnlineStatus.set(tableId, isOnline);
                                        const freshTable = await this.getTableById(tableId);
                                        if (freshTable) {
                                            this.billiardGateway.broadcastTableUpdate({
                                                ...freshTable,
                                                online: isOnline,
                                                isOffline: !isOnline,
                                                hwState: p.lastCmd === 1 ? 'ON' : 'OFF',
                                                hwType: 'ESPNOW_NODE',
                                                mode: 'OTOMATIS',
                                                type: 'billiard'
                                            });
                                        }
                                    }
                                }
                            }
                            // Broadcast ke frontend (Hardware Health page)
                            this.billiardGateway.server.emit('floor_gateway_status', {
                                ...data,
                                gatewayMac: gwMac,
                                floor_id: floorId,
                                block_id: blockId,
                                lastSeen: new Date()
                            });
                            this.logger.log(`[GW-v7] Lantai ${floorId}${blockId} | ${data.online_count || 0}/${prajurit.length} Prajurit Online`);
                        } catch (err) {
                            this.logger.error(`Error parsing floor gateway status: ${err.message}`);
                        }
                    }
                }
                // 🚀 BATCH HEARTBEAT (Optimasi v8)
                if (type === 'gateway' && parts[3] === 'heartbeat') {
                    try {
                        const data = JSON.parse(payload.toString());
                        const peers = data.tables || data.peers || []; // Compatible with old and new keys
                        this.logger.debug(`[BATCH-IN] Dari Gateway ${rawMac} | ${peers.length} Prajurit Online`);
                        for (const p of peers){
                            const mac = this.normalizeMac(p.mac || '');
                            // Jika MAC tidak ada di item (v16), kita gunakan mesaId sebagai filter
                            this.logger.debug(`[BATCH-PEER] Process MesaId: ${p.id} | State: ${p.l === 1 || p.s === 1 ? 'ON' : 'OFF'}`);
                            // Cari table berdasarkan mesaId dan gatewayMac (jika MAC per-node tidak tersedia di payload batch)
                            let tables = [];
                            if (mac) {
                                tables = await this.getTablesByMac(mac);
                            } else {
                                // Fallback: cari table yang terdaftar di gateway ini dengan relayPin == mesaId
                                tables = await this.tableRepository.find({
                                    where: {
                                        macAddress: this.normalizeMac(rawMac),
                                        relayPin: p.id,
                                        deletedAt: (0, _typeorm1.IsNull)()
                                    }
                                });
                            }
                            for (const table of tables){
                                // Update status real-time via gateway
                                this.handleHeartbeat(table.id, {
                                    online: p.on !== false,
                                    status: p.l === 1 || p.s === 1 ? 'ON' : 'OFF',
                                    lightState: p.l === 1 || p.s === 1,
                                    mesaId: p.id,
                                    rssi: p.r || -50,
                                    uptime: p.u || 0,
                                    remainingMin: p.rem || 0,
                                    token: p.t || 0,
                                    hwType: 'ESPNOW_NODE',
                                    mode: 'AUTO',
                                    tableIdentity: table.tableName,
                                    isRetained
                                });
                            }
                        }
                        // 🚀 GLOBAL SYNC (v12/13): Paksa UI sinkron dengan status real-time memori
                        const dbTables = await this.tableRepository.find({
                            where: {
                                deletedAt: (0, _typeorm1.IsNull)()
                            },
                            order: {
                                id: 'ASC'
                            }
                        });
                        // 💧 HYDRATION (v13): Bungkus data DB dengan data Radio di memori
                        const hydratedTables = dbTables.map((table)=>{
                            const online = this.billiardGateway.isTableOnline(table.id);
                            const telemetry = this.billiardGateway.liveTelemetry.get(table.id) || {};
                            return {
                                ...table,
                                online,
                                // Pastikan status hardware (v13) menang di UI
                                hwState: telemetry.lightState !== undefined ? telemetry.lightState ? 'ON' : 'OFF' : table.status,
                                rssi: telemetry.rssi || -100,
                                uptime: telemetry.uptime || 0,
                                remainingMin: telemetry.remainingMin || 0
                            };
                        });
                        this.billiardGateway.broadcastAllTables(hydratedTables);
                    } catch (err) {
                        this.logger.error(`Error processing batch heartbeat: ${err.message}`);
                    }
                }
                // 🛰️ INDIVIDUAL TABLE STATUS (WiFi or Hybrid 5-part topics, or Legacy 3-part)
                if (type === 'table' && (parts[3] === 'status' || parts[4] === 'status') || type === 'status' && parts[0] === 'billiard') {
                    try {
                        const isHybrid = parts[4] === 'status';
                        const macAddress = this.normalizeMac(rawMac);
                        const data = JSON.parse(payload.toString());
                        const mesaIdFromTopic = isHybrid ? Number(parts[3]) : null;
                        // 🔍 1. Cari berdasarkan MAC (Cara Standar)
                        let tables = await this.getTablesByMac(macAddress);
                        // 🔍 2. FALLBACK: Jika MAC tidak ketemu, cari berdasarkan Mesa ID + Gateway (v7.2)
                        // Ini menangani kasus modul baru yang MAC-nya belum di-input tapi Mesa ID-nya sudah benar
                        if (tables.length === 0) {
                            const mesaId = mesaIdFromTopic || data.mesaId;
                            if (mesaId) {
                                tables = await this.tableRepository.find({
                                    where: {
                                        relayPin: mesaId,
                                        hardwareType: _tableentity.HardwareType.ESPNOW_NODE,
                                        deletedAt: (0, _typeorm1.IsNull)()
                                    }
                                });
                                if (tables.length > 0) {
                                    this.logger.log(`[AUTO-PROVISION] 🪄 Meja ${tables[0].tableName} terdeteksi via MesaId ${mesaId}. Mengupdate MAC ke ${macAddress}...`);
                                    tables[0].macAddress = macAddress;
                                    await this.tableRepository.save(tables[0]);
                                    this.clearMacCache();
                                }
                            }
                        }
                        if (tables.length === 0) {
                            this.logger.warn(`[HEARTBEAT-UNKNOWN] ⚠️ MAC ${macAddress} (ID: ${mesaIdFromTopic || data.mesaId}) TIDAK TERDAFTAR!`);
                        }
                        for (const table of tables){
                            const tableRelayVal = table.relayPin !== null ? parseInt(String(table.relayPin).replace(/\D/g, '')) : 0;
                            // 🧠 HYBRID LOGIC: Jika data mengandung array 'relays' (Mode PCF8575), 
                            // ambil status spesifik berdasarkan index Relay Pin meja ini.
                            let specificData = {
                                ...data
                            };
                            if (Array.isArray(data.relays) && data.relays.length > tableRelayVal) {
                                // Support both Boolean and Numeric (0/1) relay states (v18.4)
                                const relayRaw = data.relays[tableRelayVal];
                                const isRelayOn = relayRaw === true || relayRaw === 1 || String(relayRaw) === 'true';
                                specificData.lightState = isRelayOn;
                                specificData.status = isRelayOn ? 'online' : 'OFF';
                                // Ambil sisa waktu spesifik dari array timers jika tersedia
                                if (Array.isArray(data.timers) && data.timers.length > tableRelayVal) {
                                    specificData.remainingMinutes = data.timers[tableRelayVal];
                                }
                            }
                            const incomingMesaId = Number(data.mesaId || data.tableId || 0);
                            // Prioritas logika pencocokan:
                            // 1. Jika MAC unik untuk table ini, kita anggap MATCH (Failsafe)
                            // 2. Jika ada mesaId/tableId di paket, pastikan cocok dengan relayPin di DB
                            const isIdMatch = !incomingMesaId || tableRelayVal === incomingMesaId;
                            const isOnlyOneForMac = tables.length === 1;
                            if (isOnlyOneForMac || isIdMatch || isHybrid && tableRelayVal === mesaIdFromTopic) {
                                if (!isIdMatch && !isHybrid && !Array.isArray(data.relays)) {
                                    this.logger.warn(`[HEARTBEAT-MISMATCH] Meja ${table.tableName} (Relay: ${tableRelayVal}) vs MesaId: ${incomingMesaId}. Fallback ke MAC match.`);
                                }
                                const tableIdentity = table.tableName || `Table ${table.id}`;
                                const reportedHw = data.hwType || table.hardwareType || 'UNKNOWN';
                                // ✅ v7.2: Auto-update espnowGatewayMac jika belum ada
                                // Ini memastikan pingAllTables bisa routing via Komandan yang benar
                                if (data.gatewayMac && !table.espnowGatewayMac) {
                                    const gwMac = this.normalizeMac(data.gatewayMac);
                                    this.logger.log(`[AUTO-GW] 🔗 Meja ${table.tableName}: espnowGatewayMac diupdate ke ${gwMac}`);
                                    table.espnowGatewayMac = gwMac;
                                    table.hardwareType = _tableentity.HardwareType.ESPNOW_NODE;
                                    await this.tableRepository.save(table);
                                    this.clearMacCache();
                                }
                                const isOtomatis = data.masterEnabled === true || data.mode === 'AUTO' || data.mode === 'OTOMATIS';
                                const reportedMode = isOtomatis ? 'OTOMATIS' : 'MANUAL (LOCK)';
                                const isOffline = specificData.status === 'offline';
                                const logTag = isOffline ? '[HEARTBEAT-OFFLINE]' : '[HEARTBEAT-OK]';
                                this.logger.log(`${logTag} ${tableIdentity} (${table.macAddress}) | Mode: ${reportedHw} [${reportedMode}] | Status: ${specificData.status}${isRetained ? ' (RETAINED-GHOST)' : ''}`);
                                this.handleHeartbeat(table.id, {
                                    ...specificData,
                                    hwType: reportedHw,
                                    mode: reportedMode,
                                    tableIdentity,
                                    isRetained,
                                    online: true
                                });
                            }
                        }
                    } catch (err) {
                        this.logger.error(`Error parsing table status: ${err.message}`, err.stack);
                    }
                }
            });
            this.logger.log('MQTT Service initialized and synchronized with hardware.');
            // 🛡️ STARTUP SYNC (v18.7): Ping all tables after 10s to force fresh heartbeats
            setTimeout(()=>{
                this.pingAllTables('STARTUP_SYNC');
            }, 10000);
            // 🛡️ SMART VERIFICATION LOOP (v16.0): Cek tiap 10 detik apakah hardware sudah sinkron
            setInterval(()=>{
                const now = Date.now();
                this.pendingVerifications.forEach((cmd, tableId)=>{
                    const telemetry = this.billiardGateway.liveTelemetry.get(tableId);
                    const online = this.billiardGateway.isTableOnline(tableId);
                    if (!online) return; // Tunggu online baru verifikasi
                    const isManualLock = telemetry?.mode?.startsWith('MANUAL') || (this.technicalOverrides.get(tableId) ?? 0) > now;
                    // 🛡️ FIX: OFF commands dari user HARUS tetap diverifikasi meskipun ada override
                    // Reason: Jika user sengaja matikan meja (misal: teknisi panel), override tidak boleh block
                    // Hanya check manual lock untuk ON commands (jika teknisi menyalakan manual)
                    const isManualLockBlocking = isManualLock && cmd.targetState;
                    if (isManualLockBlocking) {
                        this.logger.log(`[MANUAL-OVERRIDE] 🖐️ Meja ${tableId} dalam mode Override (ON). Sinkronisasi ON dibatalkan.`);
                        this.pendingVerifications.delete(tableId);
                        return;
                    }
                    // 🛡️ OFF COMMANDS: Hargai keputusan user untuk matikan meja
                    // previous logic blocked OFF when remainingMin > 0 - THIS WAS WRONG
                    // User should be able to force-stop anytime
                    // if (!cmd.targetState && (telemetry?.remainingMin ?? 0) > 0) {
                    //   this.pendingVerifications.delete(tableId);
                    //   return;
                    // }
                    // 🛡️ MATCH LOGIC v16.0: Perbaikan untuk ESPNOW_NODE
                    // Token di ESP-NOW bisa berbeda karena timing mesh — lightState saja cukup.
                    // Untuk non-ESPNOW (WiFi langsung), tetap enforce token agar presisi.
                    const isEspNow = telemetry?.hwType === 'ESPNOW_NODE' || cmd.table.hardwareType === 'ESPNOW_NODE';
                    const isMatch = telemetry && telemetry.lightState === cmd.targetState && (cmd.targetToken === 0 || String(telemetry.token) === String(cmd.targetToken) || isEspNow || // ESPNOW_NODE: lightState match = cukup konfirmasi
                    cmd.attempts >= 1 // Non-ESPNOW: setelah 1 retry, lightState cukup
                    );
                    if (isMatch) {
                        this.logger.log(`[VERIFY-OK] ✅ Meja ${tableId} Terverifikasi Sinkron (Token: ${cmd.targetToken})`);
                        this.pendingVerifications.delete(tableId);
                    } else if (now - cmd.lastSent > 8000) {
                        // Jika sudah 8 detik (naik dari 5s) belum sinkron → RETRY
                        // Toleransi lebih panjang untuk mesh ESP-NOW yang membutuhkan waktu propagasi
                        if (cmd.attempts < 5) {
                            const logLevel = cmd.attempts >= 3 ? 'warn' : 'log';
                            this.logger[logLevel](`[RETRY-SYNC] 🔄 Meja ${tableId} tidak sinkron! ` + `Mengirim ulang perintah ${cmd.targetState ? 'ON' : 'OFF'} ` + `(Token: ${cmd.targetToken}) [Percobaan ${cmd.attempts + 1}/5]`);
                            const topicMac = this.getEffectiveMqttMac(cmd.table);
                            this.mqttService.publishLightCommand(topicMac, cmd.table.id, cmd.targetState, cmd.table.relayPin, 0, false, true, {
                                token: cmd.targetToken,
                                targetMac: cmd.table.macAddress
                            }, cmd.table.hardwareType, 'SmartVerificationLoop');
                            cmd.attempts++;
                            cmd.lastSent = now;
                        } else {
                            // Setelah 5x gagal: tampilkan WARNING di UI saja, TIDAK kirim perintah lagi
                            const stateLabel = cmd.targetState ? 'MENYALA' : 'MATI';
                            this.logger.error(`[VERIFY-FAIL] ❌ Meja ${tableId} GAGAL SINKRON setelah 5x percobaan! Hubungi teknisi.`);
                            this.billiardGateway.broadcastWarning(`⚠️ Koneksi Meja ${cmd.table.tableName} Terputus!`, `Unit ${cmd.table.tableName} tidak merespons perintah ${stateLabel} setelah 5x percobaan otomatis (~40 detik). Matikan sakelar fisik meja secara manual dan hubungi teknisi segera!`, tableId);
                            this.pendingVerifications.delete(tableId);
                        }
                    }
                });
            }, 10000); // 10 Detik interval agar tidak spamming jika hardware telat lapor
        } catch (err) {
            this.logger.warn('Could not connect to MQTT Broker.');
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
            relations: [
                'categoryRelation'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        const tableIds = tables.filter((t)=>t.status !== _tableentity.TableStatus.AVAILABLE).map((t)=>t.id);
        if (tableIds.length === 0) {
            const results = tables.map((t)=>this.hydrateTable(t));
            // SCALABILITY FIX: Increased TTL from 2s to 30s to reduce DB load at 100+ tables
            await this.redisService.set(cacheKey, results, 30);
            return results;
        }
        const activeTransactions = await this.transactionService.getActiveTransactionsByTableIds(tableIds);
        const transactionMap = new Map();
        [
            ...activeTransactions
        ].reverse().forEach((tr)=>transactionMap.set(tr.tableId, tr));
        const finalResults = tables.map((table)=>{
            const transaction = transactionMap.get(table.id);
            if (transaction) {
                // Strip relations to avoid circularity during serialization
                const { table: _t, cafeTable: _ct, ...cleanTx } = transaction;
                table.activeTransaction = cleanTx;
                table.grandTotal = Number(transaction.grandTotal || 0);
            }
            return this.hydrateTable(table);
        });
        // SCALABILITY FIX: Increased TTL from 2s to 30s to reduce DB load at 100+ tables
        await this.redisService.set(cacheKey, finalResults, 30);
        return finalResults;
    }
    /**
   * 💧 HYDRATION (v17.2): Injeksi status real-time memori ke objek table
   * Berguna untuk memastikan data akurat saat refresh halaman (GET /tables)
   */ hydrateTable(table) {
        const tableId = table.id;
        const online = this.billiardGateway.isTableOnline(tableId);
        const telemetry = this.billiardGateway.liveTelemetry.get(tableId) || {};
        // 🛡️ ALIGNMENT FIX (v17.6)
        // 1. Send 'isOffline' as expected by TableCard.tsx
        // 2. lastSeen fallback must be honest (DB timestamp, not 'now')
        return {
            ...table,
            online,
            isOffline: !online,
            // Status Lampu Hardware (Virtual State)
            hwState: telemetry.lightState !== undefined ? telemetry.lightState ? 'ON' : 'OFF' : table.isLightOn ? 'ON' : 'OFF',
            // Data Radio & HW Mode
            rssi: telemetry.rssi || -100,
            uptime: telemetry.uptime || 0,
            remainingMin: telemetry.remainingMin || 0,
            mode: telemetry.mode || 'AUTO',
            hwType: telemetry.hwType || table.hardwareType,
            lastSeen: telemetry.timestamp || table.lastHeartbeat || new Date(0).toISOString()
        };
    }
    async clearAllTablesCache() {
        await this.redisService.del('billiard_all_tables');
    }
    /**
   * Helper to consistently attach virtual transaction data to a table object
   * before broadcasting or returning to frontend.
   */ async attachTransactionData(table, options = {
        loadDeepRelations: true
    }) {
        table.type = 'billiard';
        if (table.status !== _tableentity.TableStatus.AVAILABLE) {
            const transaction = await this.transactionService.getActiveTransactionByTable(table.id, false, options);
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
        const table = await this.tableRepository.findOne({
            where: {
                id,
                deletedAt: (0, _typeorm1.IsNull)()
            },
            relations: [
                'categoryRelation'
            ]
        });
        if (!table) return null;
        await this.attachTransactionData(table);
        return this.hydrateTable(table);
    }
    async getSuggestedMesaId() {
        const result = await this.tableRepository.createQueryBuilder('table').select('MAX(table.relayPin)', 'max').getRawOne();
        const max = result?.max ? Number(result.max) : 0;
        return max + 1;
    }
    async createTable(tableData) {
        const tableName = tableData.tableName?.trim();
        if (!tableName) throw new _common.BadRequestException('Nama meja harus diisi.');
        const existing = await this.tableRepository.createQueryBuilder('table').where('LOWER(table.tableName) = LOWER(:tableName)', {
            tableName
        }).getOne();
        if (existing) throw new _common.BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);
        const isPlaystation = tableData.stationType === _tableentity.StationType.PLAYSTATION;
        const macAddress = isPlaystation ? '' : this.normalizeMac(tableData.macAddress);
        if (!isPlaystation && macAddress) {
            const isPcf = tableData.hardwareType === _tableentity.HardwareType.PCF8575;
            if (isPcf) {
                // Mode PCF: Izinkan MAC sama, tapi kombinasi MAC + RelayPin (Channel) harus unik
                const macRelayExists = await this.tableRepository.findOne({
                    where: {
                        macAddress,
                        relayPin: tableData.relayPin,
                        deletedAt: (0, _typeorm1.IsNull)()
                    }
                });
                if (macRelayExists) {
                    throw new _common.BadRequestException(`Channel ${tableData.relayPin} pada MAC ${macAddress} sudah digunakan oleh ${macRelayExists.tableName}.`);
                }
            } else {
                // Mode MOC/Lainnya: 1 MAC = 1 Meja (Strict Uniqueness)
                const macExists = await this.tableRepository.findOne({
                    where: {
                        macAddress,
                        deletedAt: (0, _typeorm1.IsNull)()
                    }
                });
                if (macExists) {
                    throw new _common.BadRequestException(`MAC Address ${macAddress} sudah digunakan oleh ${macExists.tableName}. Untuk panel PCF8575, ubah Tipe Hardware terlebih dahulu.`);
                }
            }
        }
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
        const isPlaystation = (data.stationType || table.stationType) === _tableentity.StationType.PLAYSTATION;
        const macAddress = isPlaystation ? '' : data.macAddress !== undefined ? this.normalizeMac(data.macAddress) : table.macAddress;
        const hardwareType = data.hardwareType || table.hardwareType;
        const relayPin = data.relayPin !== undefined ? data.relayPin : table.relayPin;
        if (!isPlaystation && macAddress && (macAddress !== table.macAddress || data.relayPin !== undefined || data.hardwareType !== undefined)) {
            const isPcf = hardwareType === _tableentity.HardwareType.PCF8575;
            if (isPcf) {
                // Mode PCF: Cek kombinasi MAC + Pin unik (kecuali dirinya sendiri)
                const macRelayExists = await this.tableRepository.findOne({
                    where: {
                        macAddress,
                        relayPin,
                        id: (0, _typeorm1.Not)(id),
                        deletedAt: (0, _typeorm1.IsNull)()
                    }
                });
                if (macRelayExists) {
                    throw new _common.BadRequestException(`Kombinasi MAC ${macAddress} dan Channel ${relayPin} sudah digunakan oleh ${macRelayExists.tableName}.`);
                }
            } else {
                // Mode MOC/Lainnya: MAC harus unik (kecuali dirinya sendiri)
                const macExists = await this.tableRepository.findOne({
                    where: {
                        macAddress,
                        id: (0, _typeorm1.Not)(id),
                        deletedAt: (0, _typeorm1.IsNull)()
                    }
                });
                if (macExists) {
                    throw new _common.BadRequestException(`MAC Address ${macAddress} sudah digunakan oleh ${macExists.tableName}.`);
                }
            }
        }
        Object.assign(table, {
            ...data,
            tableName: data.tableName?.trim() || table.tableName,
            macAddress
        });
        // Fix TypeORM bug: when a relation is already loaded (via getTableById),
        // changing the foreign key column (categoryId) directly is ignored by save()
        // if the relation object is still attached. We must delete the relation so TypeORM
        // uses the raw categoryId column.
        if (data.categoryId !== undefined) {
            table.categoryId = data.categoryId;
            delete table.categoryRelation;
        }
        // Simpan perubahan ke database
        const savedTable = await this.tableRepository.save(table);
        // 🧹 Bersihkan MAC cache agar lookup heartbeat berikutnya fresh dari DB
        this.clearMacCache();
        this.logger.log(`[MAC-CACHE] Cache dibersihkan setelah update Meja ${savedTable.tableName}`);
        // Jika relayPin berubah & ada MAC Address → kirim /config/set ke ESP32
        // agar SPIFFS pada firmware langsung terupdate tanpa restart
        if (data.relayPin !== undefined && data.relayPin !== null && savedTable.macAddress && savedTable.relayPin != null) {
            const oldRelayPin = table.relayPin; // nilai sebelum save
            if (data.relayPin !== oldRelayPin) {
                this.logger.log(`[PIN UPDATE] Table ${savedTable.id} relayPin changed → sending config to ESP32 MAC:${savedTable.macAddress}`);
                this.mqttService.publishPinConfig(this.getEffectiveMqttMac(savedTable), savedTable.relayPin);
            }
        }
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
        const now = Date.now();
        if (this.packagesCache && this.packagesCache.expiry > now) {
            return this.packagesCache.data;
        }
        const packages = await this.packageRepository.find({
            where: {
                isActive: true
            },
            order: {
                createdAt: 'DESC'
            }
        });
        this.packagesCache = {
            data: packages,
            expiry: now + 10000
        };
        return packages;
    }
    async createPackage(data) {
        const pkg = this.packageRepository.create(data);
        const saved = await this.packageRepository.save(pkg);
        this.packagesCache = null; // Clear cache for immediate update
        return saved;
    }
    async updatePackage(id, data) {
        const pkg = await this.packageRepository.findOne({
            where: {
                id
            }
        });
        if (!pkg) throw new _common.NotFoundException('Package not found');
        Object.assign(pkg, data);
        const updated = await this.packageRepository.save(pkg);
        this.packagesCache = null; // Clear cache for immediate update
        return updated;
    }
    async deletePackage(id) {
        const pkg = await this.packageRepository.findOne({
            where: {
                id
            }
        });
        if (!pkg) throw new _common.NotFoundException('Package not found');
        await this.packageRepository.delete(id);
        this.packagesCache = null; // Clear cache for immediate update
    }
    async toggleLight(id, isOn) {
        // ── MUTEX: distributed lock ────────────────────────────────────
        const lockKey = `table_toggle_${id}`;
        const acquired = await this.redisService.acquireLock(lockKey, 3000);
        if (!acquired) {
            this.logger.warn(`toggleLight: Meja ${id} sedang diproses oleh user lain, abaikan.`);
            return this.getTableById(id);
        }
        try {
            // 🛡️ STOP ANY BACKGROUND RETRY IMMEDIATELY (v17.3)
            // Kill any "Zombie" retry loops before sending a new manual command.
            this.pendingVerifications.delete(id);
            const table = await this.getTableById(id);
            if (!table) return null;
            // 🛡️ ANTI-SPAM DEBOUNCE (v18.6)
            const now = Date.now();
            const last = this.lastCommandAt.get(id);
            if (last && now - last.time < 800 && last.state === isOn) {
                this.logger.debug(`[ANTI-SPAM] 🛑 Skip toggleLight (${isOn ? 'ON' : 'OFF'}) untuk meja ${id} (Cooldown 800ms)`);
                return table;
            }
            this.lastCommandAt.set(id, {
                time: now,
                state: isOn
            });
            table.isLightOn = isOn;
            const savedTable = await this.tableRepository.save(table);
            await this.attachTransactionData(savedTable);
            // 🛡️ TECHNICAL OVERRIDE: Hanya aktif saat MANUAL ON, bukan saat OFF
            // Ini memungkinkan teknisi menyalakan meja secara manual tanpa dibatalkan billing logic
            // Tapi saat MATIKAN meja, override langsung dihapus agar perintah OFF bisa执行
            if (isOn) {
                this.technicalOverrides.set(id, now + 60000);
            } else {
                // 🛡️ CRITICAL FIX: Hapus override saat OFF agar meja bisa dimatikan
                // Previous: override terus aktif 60 detik, blocking semua perintah termasuk OFF
                this.technicalOverrides.delete(id);
                this.pendingVerifications.delete(id); // Cancel verifikasi yang masih berjalan
                this.logger.log(`[OFF-OVERRIDE] ✅ Override dihapus untuk meja ${id}. Perintah OFF siap执行.`);
            }
            const topicMac = this.getEffectiveMqttMac(table);
            const isTvClientMode = table.stationType === _tableentity.StationType.PLAYSTATION && !!table.ipAddress;
            if (!isTvClientMode) {
                const result = this.mqttService.publishLightCommand(topicMac, table.id, isOn, table.relayPin, isOn ? 1440 : 0, false, true, {
                    targetMac: table.macAddress
                }, table.hardwareType, 'toggleLight');
                // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
                this.commandLocks.set(id, Date.now() + 5000);
                // 🛡️ DAFTARKAN UNTUK VERIFIKASI (v15.2)
                const token = result.token || 0;
                this.pendingVerifications.set(table.id, {
                    targetState: isOn,
                    targetToken: token,
                    attempts: 1,
                    lastSent: Date.now(),
                    table: savedTable
                });
            } else {
                // --- TV Client HTTP Trigger (PS mode) ---
                try {
                    const endpoint = isOn ? 'wakeup' : 'sleep';
                    const query = isOn ? '?title=Manual&duration=Manual%20Override' : '';
                    const url = `http://${table.ipAddress}:1717/${endpoint}${query}`;
                    _axios.default.get(url, {
                        timeout: 3000
                    }).catch((e)=>this.logger.error(`[PS-TV] Failed to send /${endpoint} to ${table.ipAddress}: ${e.message}`));
                    this.logger.log(`[PS-TV] Sent /${endpoint} command to TV at ${table.ipAddress} via manual toggle`);
                } catch (e) {
                    this.logger.error(`[PS-TV] Failed to send HTTP toggle to ${table.ipAddress}: ${e.message}`);
                }
                // Jeda visual UI
                this.commandLocks.set(id, Date.now() + 2000);
            }
            await this.clearAllTablesCache();
            this.clearMacCache();
            this.billiardGateway.broadcastTableUpdate(savedTable);
            return savedTable;
        } finally{
            await this.redisService.releaseLock(lockKey);
        }
    }
    async pingTable(id) {
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException(`Table ${id} not found`);
        const isTvClientMode = table.stationType === _tableentity.StationType.PLAYSTATION && !!table.ipAddress;
        if (isTvClientMode) {
            try {
                await _axios.default.get(`http://${table.ipAddress}:1717/ping`, {
                    timeout: 3000
                });
                await this.handleHeartbeat(table.id, {
                    online: true,
                    status: 'online',
                    hwType: 'TV_CLIENT',
                    mode: 'HTTP',
                    tableIdentity: table.tableName,
                    isRetained: false
                });
                const hydratedTable = this.hydrateTable(table);
                this.billiardGateway.broadcastTableUpdate({
                    ...hydratedTable,
                    type: 'billiard',
                    _action: 'PING_SENT',
                    _pingTopic: `http://${table.ipAddress}:1717/ping`,
                    _pingAt: new Date().toISOString()
                });
                return {
                    success: true,
                    topic: `http://${table.ipAddress}:1717/ping`,
                    sentAt: new Date().toISOString(),
                    table: {
                        id: table.id,
                        tableName: table.tableName
                    }
                };
            } catch (e) {
                this.logger.warn(`[PS-TV] Ping to ${table.ipAddress} failed: ${e.message}`);
                return {
                    success: false,
                    topic: `http://${table.ipAddress}:1717/ping`,
                    sentAt: new Date().toISOString(),
                    table: {
                        id: table.id,
                        tableName: table.tableName
                    }
                };
            }
        }
        const topicMac = this.getEffectiveMqttMac(table);
        const mesaId = table.relayPin ? parseInt(String(table.relayPin).replace(/\D/g, '')) : table.id;
        const result = this.mqttService.pingTable(topicMac, mesaId);
        this.logger.log(`Ping sent to table ${table.tableName} (mac: ${topicMac}), topic: ${result.topic}`);
        // Also broadcast a real-time notification via WebSocket so operators can see it
        await this.clearAllTablesCache();
        this.clearMacCache();
        const hydratedTable = this.hydrateTable(table);
        this.billiardGateway.broadcastTableUpdate({
            ...hydratedTable,
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
        const topicMac = this.getEffectiveMqttMac(table);
        const result = this.mqttService.publishGpioCommand(topicMac, pin, isOn);
        this.logger.log(`GPIO Test sent to table ${table.tableName} (mac: ${topicMac}), Pin: ${pin}, Status: ${isOn ? 'ON' : 'OFF'}`);
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
    async startSession(tableId, type, durationMinutes, customerName, packageId, customPriceSettings, promoId, userId, userName, memberId, idempotencyKey, voucherCode) {
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
            // 🛡️ STOP ANY BACKGROUND RETRY IMMEDIATELY (v17.3)
            this.pendingVerifications.delete(tableId);
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
            // --- 0. PRE-VALIDATE VOUCHER (To override mode if FREE_BILLIARD_MINUTES) ---
            let activeVoucherForStart = null;
            let isPureVoucherStart = false;
            if (voucherCode) {
                activeVoucherForStart = await this.voucherService.validateVoucher(voucherCode, userId, 0, new Date(), memberId, 'SESSION_START');
                if (activeVoucherForStart && activeVoucherForStart.type === 'FREE_BILLIARD_MINUTES') {
                    const unit = activeVoucherForStart.ruleJson?.unit || 'minutes';
                    const freeMinutes = unit === 'hours' ? Number(activeVoucherForStart.discountValue) * 60 : Number(activeVoucherForStart.discountValue);
                    // Jika ini adalah start murni dari voucher (open table), paksa jadi prepaid
                    if (type === 'open') {
                        type = 'prepaid';
                        durationMinutes = freeMinutes;
                        isPureVoucherStart = true;
                    }
                }
            }
            // --- 1. SET TABLE DATA ---
            table.status = _tableentity.TableStatus.IN_USE;
            table.isLightOn = true;
            table.sessionType = type;
            table.startTime = new Date();
            table.memberId = memberId || null;
            table.packageId = packageId || null;
            table.remainingMinutes = null;
            table.lastSessionData = null;
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
            if (isPureVoucherStart) {
                fareName = activeVoucherForStart.name || 'Voucher Gratis';
                sessionPrice = 0;
            } else if (selectedPromo) {
                fareName = selectedPromo.name;
                sessionPrice = Number(selectedPromo.ruleJson.fixedPrice) || 0;
            } else if (selectedPackage) {
                fareName = selectedPackage.name;
                const activeRate = this.transactionService.calculateCurrentPackagePrice(selectedPackage);
                sessionPrice = selectedPackage.type === _billiardpackageentity.PackageType.FIXED ? activeRate : durationMinutes / 60 * activeRate;
            } else if (type === 'prepaid' && durationMinutes) {
                const globalSettings = await this.settingsService.getSettings();
                let customConfig = null;
                if (globalSettings.customPricingDynamic && Array.isArray(globalSettings.customPricingDynamic)) {
                    customConfig = globalSettings.customPricingDynamic.find((c)=>c.categoryId === table.categoryId);
                }
                if (customConfig) {
                    const currentDayCode = this.getBusinessDayCode(globalSettings?.businessDayOffset);
                    const activeRate = this.transactionService.calculateCurrentPackagePrice({
                        price: customConfig.basePrice,
                        timeSlots: customConfig.timeSlots
                    }, currentDayCode);
                    sessionPrice = durationMinutes / 60 * activeRate;
                }
            }
            table.activePackagePrice = sessionPrice > 0 ? sessionPrice : null;
            // --- 3. CREATE/UPDATE TRANSACTION ---
            let transaction = await this.transactionService.getActiveTransactionByTable(tableId, true);
            // 🛡️ CRITICAL FIX: Do NOT reuse an old transaction if its billiard session has already ended.
            // If `endTime` is populated, it means the previous session was stopped but hasn't been paid yet.
            // Reusing it would merge the new customer's session into the old customer's unpaid bill.
            if (transaction && transaction.endTime) {
                this.logger.log(`[CRITICAL FIX] Table ${tableId} has an old UNPAID transaction (id: ${transaction.id}) with endTime ${transaction.endTime}. Force creating a NEW transaction to prevent merging with old session data.`);
                transaction = null;
            }
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
            // 🗓️ BUSINESS DAY FIX: Always resolve the current active business day and shift
            // so that even if a transaction is reused across a day boundary (edge case),
            // it gets re-attributed to the correct business day and shift.
            // transactionService already has shiftService injected — use it safely.
            let activeDayIdForSession;
            let activeShiftIdForSession;
            try {
                const svc = this.transactionService.shiftService;
                if (svc) {
                    const activeDay = await svc.getOrCreateActiveBusinessDay();
                    activeDayIdForSession = activeDay?.id;
                    const activeShift = await svc.findActiveCashierShift() ?? (userId ? await svc.getActiveShift(userId) : null);
                    activeShiftIdForSession = activeShift?.id;
                }
            } catch (e) {
                this.logger.warn(`[BDAY FIX] Could not resolve active business day/shift: ${e.message}`);
            }
            // Sync all info to transaction in one go + Recalculate Totals
            transaction = await this.transactionService.updateTransaction(transaction.id, {
                customerName: finalCustomerName,
                fareName,
                startTime: table.startTime,
                sessionType: type,
                memberId: memberId || null,
                packageId: packageId || null,
                billiardTotal: sessionPrice,
                // 🗓️ Re-link to the correct business day & shift (critical for Business Day report)
                ...activeDayIdForSession ? {
                    businessDayId: activeDayIdForSession
                } : {},
                ...activeShiftIdForSession ? {
                    shiftId: activeShiftIdForSession
                } : {}
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
            // --- 5b. VOUCHER PROCESSING ---
            let activeVoucherData = null;
            if (activeVoucherForStart) {
                try {
                    const voucher = activeVoucherForStart;
                    if (voucher) {
                        activeVoucherData = {
                            voucherId: voucher.id,
                            voucherCode: voucher.code,
                            voucherName: voucher.name,
                            voucherType: voucher.type,
                            discountValue: Number(voucher.discountValue),
                            ruleJson: voucher.ruleJson || {},
                            appliedAt: new Date().toISOString()
                        };
                        // FREE_BILLIARD_MINUTES: tambah menit gratis ke durasi sesi
                        if (voucher.type === 'FREE_BILLIARD_MINUTES') {
                            const unit = voucher.ruleJson?.unit || 'minutes';
                            const freeMinutes = unit === 'hours' ? Number(voucher.discountValue) * 60 : Number(voucher.discountValue);
                            activeVoucherData.freeMinutesGranted = freeMinutes;
                            // Tandai kapan promo habis agar WebSocket notif bisa dikirim
                            activeVoucherData.promoEndsAt = new Date(table.startTime.getTime() + freeMinutes * 60000).toISOString();
                            if (type === 'prepaid' && durationMinutes) {
                                // Jangan tambahkan lagi jika durasinya berasal murni dari voucher (sudah diset di awal)
                                if (!isPureVoucherStart) {
                                    durationMinutes = durationMinutes + freeMinutes;
                                    table.endTime = new Date(table.startTime.getTime() + durationMinutes * 60000);
                                    table.remainingMinutes = durationMinutes;
                                }
                            } else {
                                // Open billing: set endTime hanya untuk keperluan notif timer
                                // Lampu tidak dimatikan otomatis — hanya notif WebSocket dikirim
                                activeVoucherData.promoOnlyDuration = freeMinutes;
                            }
                            this.logger.log(`[VOUCHER] FREE_BILLIARD_MINUTES: +${freeMinutes} menit gratis untuk meja ${tableId}`);
                        }
                        // FREE_ITEM: auto-add ke cafe order dengan harga Rp 0
                        if (voucher.type === 'FREE_ITEM' && voucher.freeMenuItemId) {
                            const qty = Number(voucher.ruleJson?.quantity) || 1;
                            const autoOrderNote = `[VOUCHER GRATIS] ${voucher.name}`;
                            // IDEMPOTENT CHECK: Pastikan tidak auto-add berulang kali jika transaksi digunakan ulang (contoh: Force Restart)
                            let alreadyAdded = false;
                            if (transaction.orderItems) {
                                alreadyAdded = transaction.orderItems.some((i)=>i.note === autoOrderNote && i.status !== 'CANCELLED');
                            } else {
                                const existing = await this.transactionService.getTransactionById(transaction.id);
                                alreadyAdded = existing?.orderItems?.some((i)=>i.note === autoOrderNote && i.status !== 'CANCELLED') || false;
                            }
                            if (!alreadyAdded) {
                                try {
                                    await this.cafeService.processOrder([
                                        {
                                            id: voucher.freeMenuItemId,
                                            quantity: qty,
                                            note: autoOrderNote
                                        }
                                    ], tableId);
                                    activeVoucherData.freeItemId = voucher.freeMenuItemId;
                                    this.logger.log(`[VOUCHER] FREE_ITEM: auto-order item #${voucher.freeMenuItemId} (qty:${qty}) ke meja ${tableId}`);
                                } catch (err) {
                                    this.logger.error(`[VOUCHER] FAILED auto-order FREE_ITEM: ${err.message}`);
                                }
                            } else {
                                this.logger.log(`[VOUCHER] FREE_ITEM: Item sudah ada di transaksi ${transaction.id}, skip auto-order.`);
                            }
                        }
                        // SPECIAL_PRICE: simpan harga flat ke lastSessionData
                        if (voucher.type === 'SPECIAL_PRICE') {
                            activeVoucherData.specialPrice = Number(voucher.discountValue);
                            this.logger.log(`[VOUCHER] SPECIAL_PRICE: harga flat Rp ${voucher.discountValue} untuk meja ${tableId}`);
                        }
                        // Simpan ke transaksi aktif
                        await this.transactionService.updateTransaction(transaction.id, {
                            voucherCode: voucher.code,
                            voucherId: voucher.id
                        });
                        // ✅ INCREMENT USAGE AT SESSION START (not payment)
                        // This ensures vouchers used with Force Restart, RECORDED sessions, 
                        // or any non-payment endings are still counted correctly.
                        const quotaOk = await this.voucherService.atomicIncrementUsage(voucher.id);
                        if (!quotaOk) {
                            // Quota was already full (race condition) — rollback and block session
                            throw new _common.BadRequestException('Kuota penggunaan voucher sudah habis (concurrent check).');
                        }
                        this.logger.log(`[VOUCHER] usageCount incremented atomically for voucher '${voucher.code}' (id: ${voucher.id})`);
                        // Simpan ke lastSessionData table untuk badge dashboard
                        table.lastSessionData = {
                            ...table.lastSessionData || {},
                            activeVoucher: activeVoucherData
                        };
                        this.logger.log(`[VOUCHER] Voucher '${voucher.code}' (${voucher.type}) berhasil dikaitkan ke sesi meja ${tableId}`);
                    }
                } catch (voucherErr) {
                    // Voucher gagal divalidasi — log warning tapi jangan blok sesi
                    this.logger.warn(`[VOUCHER] Gagal memproses voucher '${voucherCode}': ${voucherErr.message}`);
                    // Re-throw agar kasir tahu ada masalah
                    throw new _common.BadRequestException(`Voucher gagal: ${voucherErr.message}`);
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
            // 🛡️ TV-CLIENT GUARD: Tabel PLAYSTATION dengan ipAddress menggunakan HTTP wakeup,
            // bukan relay MQTT. Jangan kirim perintah MQTT agar tidak cross-trigger relay meja lain.
            const isTvClientMode = table.stationType === _tableentity.StationType.PLAYSTATION && !!table.ipAddress;
            if (table.macAddress && !isTvClientMode) {
                const topicMac = this.getEffectiveMqttMac(table);
                // 🛡️ Play Time (Open) Fix: Kirim 1440m (24 jam) alih-alih 0 agar tidak auto-OFF (v18.5)
                const durationToEsp = type === 'open' ? 1440 : durationMinutes || 0;
                // Clear any technician override since a real session has started
                this.technicalOverrides.delete(table.id);
                const result = this.mqttService.publishLightCommand(topicMac, table.id, true, table.relayPin, durationToEsp, false, true, {
                    targetMac: table.macAddress
                }, table.hardwareType, 'startSession');
                // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
                this.commandLocks.set(tableId, Date.now() + 5000);
                // 🛡️ DAFTARKAN UNTUK VERIFIKASI (v15.2)
                const token = result.token || 0;
                this.pendingVerifications.set(table.id, {
                    targetState: true,
                    targetToken: token,
                    attempts: 1,
                    lastSent: Date.now(),
                    table: savedTable
                });
            } else if (isTvClientMode) {
                this.logger.log(`[PS-TV] Table ${table.tableName} is TV Client mode — skipping MQTT relay, using HTTP wakeup only.`);
            }
            // --- TV Client HTTP Trigger: WAKEUP (PS mode) ---
            if (table.stationType === _tableentity.StationType.PLAYSTATION && table.ipAddress) {
                try {
                    const hours = durationMinutes ? Math.floor(durationMinutes / 60) : 0;
                    const mins = durationMinutes ? durationMinutes % 60 : 0;
                    const durationStr = type === 'open' ? 'Open Billing' : `${hours}jam : ${mins.toString().padStart(2, '0')}menit`;
                    const wakeupUrl = `http://${table.ipAddress}:1717/wakeup?title=${encodeURIComponent(finalCustomerName)}&duration=${encodeURIComponent(durationStr)}`;
                    _axios.default.get(wakeupUrl, {
                        timeout: 3000
                    }).catch((e)=>this.logger.error(`[PS-TV] Failed to send /wakeup to ${table.ipAddress}: ${e.message}`));
                    this.logger.log(`[PS-TV] Sent /wakeup command to TV at ${table.ipAddress} with title: ${finalCustomerName}, duration: ${durationStr}`);
                } catch (e) {
                    this.logger.error(`[PS-TV] Failed to send /wakeup to ${table.ipAddress}: ${e.message}`);
                }
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
            this.pendingVerifications.delete(tableId);
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
                        pkg = packages.find((p)=>(p.type === _billiardpackageentity.PackageType.HOURLY || p.type === _billiardpackageentity.PackageType.PLAYTIME) && p.categoryId === table.categoryId);
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
                            // Final Notification after settlement (NON-BLOCKING)
                            const finalSnap = await this.transactionService.getTransactionById(transaction.id);
                            this.memberService.sendSessionCompletionNotification(finalSnap.memberId, {
                                tableName: table.tableName,
                                duration: finalSnap.sessionDuration,
                                billiardTotal: Number(finalSnap.billiardTotal || 0),
                                cafeTotal: Number(finalSnap.cafeTotal || 0),
                                grandTotal: Number(finalSnap.grandTotal || 0),
                                orderItems: finalSnap.orderItems || [],
                                awardedPoints: Number(finalSnap.awardedPoints || 0)
                            }).catch((e)=>this.logger.error(`Session Completion WA Failed: ${e.message}`));
                        } catch (err) {
                            this.logger.error(`AUTO-DEBIT STOP FAILED for table ${tableId}: ${err.message}`);
                            if (err.status === 402 || err.message?.includes('Saldo tidak cukup')) {
                                this.billiardGateway.broadcastWarning('Saldo Kurang', `Gagal pelunasan otomatis untuk meja ${table.tableName}. Saldo member tidak cukup.`, tableId);
                            }
                        }
                    }
                }
                if (userName) {
                    let detailStr = `Stop sesi meja ${table.tableName}. Durasi: ${session.durationMinutes} menit. Total Billiard: Rp ${billiardCost.toLocaleString()}`;
                    if (transaction) {
                        try {
                            const freshTrans = await this.transactionService.getTransactionById(transaction.id);
                            if (freshTrans) {
                                const cafeTot = Number(freshTrans.cafeTotal || 0);
                                const sc = Number(freshTrans.serviceChargeAmount || 0);
                                const tax = Number(freshTrans.vatAmount || 0);
                                const grand = Number(freshTrans.grandTotal || 0);
                                let itemStr = '';
                                if (freshTrans.orderItems && freshTrans.orderItems.length > 0) {
                                    const items = freshTrans.orderItems.filter((i)=>i.status !== 'CANCELLED').map((i)=>`${i.quantity}x ${i.menuItem?.name || 'Item Cafe'}`).join(', ');
                                    if (items) {
                                        itemStr = ` | Item Cafe: ${items}`;
                                    }
                                }
                                detailStr += ` | Cafe: Rp ${cafeTot.toLocaleString()} | SC: Rp ${sc.toLocaleString()} | PPN: Rp ${tax.toLocaleString()} | Grand Total: Rp ${grand.toLocaleString()}${itemStr}`;
                            }
                        } catch (err) {
                            this.logger.error(`Gagal melampirkan detail item ke audit trail: ${err.message}`);
                        }
                    }
                    await this.reportService.logAction('STOP_SESSION', userName, detailStr, tableId);
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
                    table.lastSessionData = null;
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
                    table.lastSessionData = null;
                } else {
                    table.status = _tableentity.TableStatus.WAITING_PAYMENT;
                    if (!table.endTime) {
                        table.endTime = new Date();
                    }
                    if (finalTrans && !finalTrans.endTime) {
                        await this.transactionService.updateTransaction(finalTrans.id, {
                            endTime: table.endTime
                        });
                    }
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
            // 🛡️ TV-CLIENT GUARD: Tabel PLAYSTATION dengan ipAddress menggunakan HTTP sleep,
            // bukan relay MQTT. Jangan kirim perintah MQTT agar tidak cross-trigger relay meja lain.
            const isTvClientModeStop = table.stationType === _tableentity.StationType.PLAYSTATION && !!table.ipAddress;
            if (table.macAddress && !isTvClientModeStop) {
                const topicMac = this.getEffectiveMqttMac(table);
                const result = this.mqttService.publishLightCommand(topicMac, table.id, false, table.relayPin, 0, false, true, {
                    targetMac: table.macAddress
                }, table.hardwareType, 'stopSession');
                // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
                this.commandLocks.set(tableId, Date.now() + 5000);
                // 🛡️ DAFTARKAN UNTUK VERIFIKASI (v15.2)
                const token = result.token || 0;
                this.pendingVerifications.set(table.id, {
                    targetState: false,
                    targetToken: token,
                    attempts: 1,
                    lastSent: Date.now(),
                    table: savedTable
                });
            } else if (isTvClientModeStop) {
                this.logger.log(`[PS-TV] Table ${table.tableName} is TV Client mode — skipping MQTT relay OFF, using HTTP sleep only.`);
            }
            // --- TV Client HTTP Trigger: SLEEP (PS mode) ---
            if (table.stationType === _tableentity.StationType.PLAYSTATION && table.ipAddress) {
                await this.triggerTvSleep(table, finalTrans);
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
            return;
        }
        this.cronRunning = true;
        const startTime = Date.now();
        const now = new Date();
        try {
            const globalSettings = await this.settingsService.getSettings();
            const threshold = globalSettings.endingSoonThreshold ?? 2; // Default 2 menit sesuai setting
            const allPackages = await this.getPackages();
            // this.logger.log(`handleCron: [1/3] Fetching prepaid tables...`);
            // 1. Handle Prepaid Sessions (Warning & Auto Stop)
            const prepaidTables = await this.tableRepository.find({
                where: [
                    {
                        status: _tableentity.TableStatus.IN_USE,
                        sessionType: 'prepaid',
                        deletedAt: (0, _typeorm1.IsNull)()
                    },
                    {
                        status: _tableentity.TableStatus.WARNING,
                        sessionType: 'prepaid',
                        deletedAt: (0, _typeorm1.IsNull)()
                    }
                ]
            });
            if (prepaidTables.length > 0) {
                this.logger.log(`handleCron: Processing ${prepaidTables.length} prepaid tables...`);
            }
            const prepaidTableIds = prepaidTables.map((t)=>t.id);
            const prepaidTxs = prepaidTableIds.length > 0 ? await this.transactionService.getActiveTransactionsByTableIds(prepaidTableIds, {
                loadDeepRelations: false
            }) : [];
            const prepaidTxMap = new Map(prepaidTxs.map((tx)=>[
                    tx.tableId,
                    tx
                ]));
            await Promise.allSettled(prepaidTables.map(async (table)=>{
                try {
                    this.logger.log(`handleCron: Processing prepaid table ${table.tableName}...`);
                    if (table.endTime && now >= table.endTime) {
                        // ⏱️ Time expired → AUTO-STOP → WAITING_PAYMENT
                        this.logger.warn(`[AUTO-STOP] ⏰ Meja ${table.tableName} waktu habis. Mengalihkan ke WAITING_PAYMENT...`);
                        const isBusy = await this.redisService.get(`lock:cutoff_${table.id}`) || await this.redisService.get(`lock:table_stop_${table.id}`) || await this.redisService.get(`lock:table_start_${table.id}`) || await this.redisService.get(`lock:table_extend_${table.id}`);
                        if (!isBusy) {
                            await this.stopSession(table.id, undefined, 'Sistem (Auto-Cutoff Prepaid)');
                        }
                    } else if (table.endTime) {
                        // Check if approaching expiration within the next 15 seconds for precise scheduling
                        const diffMs = table.endTime.getTime() - now.getTime();
                        if (diffMs <= 15000 && !await this.redisService.get(`lock:cutoff_${table.id}`)) {
                            this.logger.log(`Table ${table.id} PREPAID approaching cutoff in ~${(diffMs / 1000).toFixed(1)}s. Scheduling precise stop.`);
                            await this.redisService.acquireLock(`cutoff_${table.id}`, 20000);
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
                            this.logger.warn(`[ENDING-SOON] 🟠 Meja ${table.tableName} sisa ${remaining} menit (threshold: ${threshold}). Status → WARNING (Orange).`);
                            table.status = _tableentity.TableStatus.WARNING;
                            statusChanged = true;
                            // --- TV Client HTTP Trigger: WARNING MASUK (PS mode) ---
                            // Kirim notifikasi pertama saat status baru masuk WARNING (sesuai threshold pengaturan)
                            if (table.stationType === _tableentity.StationType.PLAYSTATION && table.ipAddress) {
                                try {
                                    const warnKey = `ps_tv_warned_entry:${table.id}:${table.startTime?.getTime() || 0}`;
                                    const alreadyWarnedEntry = await this.redisService.get(warnKey);
                                    if (!alreadyWarnedEntry) {
                                        const msg = encodeURIComponent(`⚠️ PERHATIAN! Waktu bermain Anda tersisa ${remaining} menit lagi. Segera hubungi kasir untuk perpanjangan.`);
                                        await _axios.default.get(`http://${table.ipAddress}:1717/text?text=${msg}`, {
                                            timeout: 3000
                                        });
                                        await this.redisService.set(warnKey, '1', 3600);
                                        this.logger.log(`[PS-TV] ⚠️ Sent ENDING-SOON alert (${remaining} min) to TV at ${table.ipAddress}`);
                                    }
                                } catch (e) {
                                    this.logger.error(`[PS-TV] Failed to send warning to ${table.ipAddress}: ${e.message}`);
                                }
                            }
                        } else if (remaining > threshold && table.status === _tableentity.TableStatus.WARNING) {
                            table.status = _tableentity.TableStatus.IN_USE;
                            statusChanged = true;
                        }
                        // --- TV CRITICAL MINUTE ALERTS: 3 menit & 1 menit ---
                        // Berjalan terlepas dari status change, selama tabel masih WARNING/IN_USE dan ada PS TV
                        if (table.stationType === _tableentity.StationType.PLAYSTATION && table.ipAddress && table.endTime && [
                            _tableentity.TableStatus.IN_USE,
                            _tableentity.TableStatus.WARNING
                        ].includes(table.status)) {
                            const criticalMins = [
                                3,
                                1
                            ]; // Menit kritis yang akan dikirim ulang
                            for (const critMin of criticalMins){
                                if (remaining === critMin) {
                                    const critKey = `ps_tv_warned_${critMin}min:${table.id}:${table.startTime?.getTime() || 0}`;
                                    const alreadySent = await this.redisService.get(critKey);
                                    if (!alreadySent) {
                                        try {
                                            const urgentMsg = critMin === 1 ? encodeURIComponent(`🚨 WAKTU HAMPIR HABIS! Sisa 1 MENIT lagi. Segera ke kasir!`) : encodeURIComponent(`⏰ Waktu bermain Anda tersisa ${critMin} menit. Hubungi kasir sekarang.`);
                                            await _axios.default.get(`http://${table.ipAddress}:1717/text?text=${urgentMsg}`, {
                                                timeout: 3000
                                            });
                                            await this.redisService.set(critKey, '1', 3600);
                                            this.logger.log(`[PS-TV] 🔴 Sent ${critMin}-min CRITICAL alert to TV at ${table.ipAddress}`);
                                        } catch (e) {
                                            this.logger.error(`[PS-TV] Failed to send ${critMin}-min alert to ${table.ipAddress}: ${e.message}`);
                                        }
                                    }
                                }
                            }
                        }
                        if (statusChanged) {
                            await this.tableRepository.update(table.id, {
                                remainingMinutes: table.remainingMinutes,
                                status: table.status
                            });
                            // Fetch the transaction from map instead of attachTransactionData(saved)
                            const tx = prepaidTxMap.get(table.id);
                            const tableWithTx = {
                                ...table,
                                activeTransaction: tx
                            };
                            await this.clearAllTablesCache();
                            this.clearMacCache();
                            this.billiardGateway.broadcastTableUpdate(tableWithTx);
                        }
                    }
                } catch (e) {
                    this.logger.error(`Error processing prepaid table ${table.id}: ${e.message}`);
                }
            }));
            // this.logger.log(`handleCron: [3/3] Fetching member open tables...`);
            // 2. Handle Member Open Table Auto-Cutoff (Precision Billing)
            const openTablesWithMember = await this.tableRepository.find({
                where: {
                    status: _tableentity.TableStatus.IN_USE,
                    sessionType: 'open',
                    memberId: (0, _typeorm1.Not)((0, _typeorm1.IsNull)()),
                    deletedAt: (0, _typeorm1.IsNull)()
                }
            });
            if (openTablesWithMember.length > 0) {
                this.logger.log(`handleCron: Processing ${openTablesWithMember.length} member tables...`);
            }
            if (openTablesWithMember.length > 0) {
                const tableIds = openTablesWithMember.map((t)=>t.id);
                const memberIds = openTablesWithMember.map((t)=>t.memberId).filter((id)=>id);
                // Batch fetch all active transactions for these tables
                const activeTxs = await this.transactionService.getActiveTransactionsByTableIds(tableIds, {
                    loadDeepRelations: false
                });
                const txMap = new Map(activeTxs.map((tx)=>[
                        tx.tableId,
                        tx
                    ]));
                // Batch fetch all relevant members
                const members = await this.memberRepository.find({
                    where: {
                        id: (0, _typeorm1.In)(memberIds)
                    },
                    relations: [
                        'tier'
                    ]
                });
                const memberMap = new Map(members.map((m)=>[
                        m.id,
                        m
                    ]));
                await Promise.allSettled(openTablesWithMember.map(async (table)=>{
                    try {
                        this.logger.log(`handleCron: Processing member table ${table.tableName}...`);
                        if (await this.redisService.get(`lock:cutoff_${table.id}`)) {
                            return; // Already scheduled a precise cutoff for this table
                        }
                        if (!table.startTime || !table.memberId) return;
                        // Use pre-fetched member
                        const member = memberMap.get(table.memberId);
                        if (!member) return;
                        // Use pre-fetched transaction
                        const transaction = txMap.get(table.id);
                        if (!transaction) return;
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
                                pkg = allPackages.find((p)=>p.id === table.packageId) || {};
                            } else {
                                pkg = allPackages.find((p)=>(p.type === _billiardpackageentity.PackageType.HOURLY || p.type === _billiardpackageentity.PackageType.PLAYTIME) && p.categoryId === table.categoryId);
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
                                        this.logger.log(`Backgrounding Low Balance Warning to Member ${member.name} (Table ${table.tableName})`);
                                        const remainingMin = Math.ceil(usableAmount / (ratePerHour / 60));
                                        const message = `⚠️ *Peringatan Saldo Menipis*\n\n` + `Halo ${member.name},\nsaldo member Anda saat ini tersisa sekitar *Rp ${memberBalance.toLocaleString('id-ID')}*.\n\n` + `Estimasi sisa waktu bermain di Meja *${table.tableName}* adalah sekitar *${remainingMin} menit* lagi sebelum sistem menghentikan sesi secara otomatis.\n\n` + `Silakan lakukan top-up di kasir jika ingin memperpanjang waktu bermain Anda. Terima kasih!`;
                                        // 🛡️ NON-BLOCKING WA NOTIFICATION (v18.6)
                                        // Fire-and-forget to prevent WA service from hanging the cron job
                                        this.whatsappService.sendMessage(member.phone, message).catch((err)=>this.logger.error(`Cron WA Warning Failed: ${err.message}`));
                                        await this.redisService.set(warningSentKey, 'true', 3600 * 4); // Expire in 4h
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        this.logger.error(`Error processing member table ${table.id}: ${e.message}`);
                    }
                }));
            }
            // --- TV CLIENT BACKGROUND PING (Heartbeat) ---
            // Karena TV Client tidak mengirim MQTT secara otomatis, backend yang harus nge-ping secara berkala (cron)
            const psTables = await this.tableRepository.find({
                where: {
                    stationType: _tableentity.StationType.PLAYSTATION,
                    deletedAt: (0, _typeorm1.IsNull)()
                }
            });
            for (const psTable of psTables){
                if (psTable.ipAddress) {
                    // Fire and forget, don't await to avoid blocking cron
                    _axios.default.get(`http://${psTable.ipAddress}:1717/ping`, {
                        timeout: 3000
                    }).then(async ()=>{
                        await this.handleHeartbeat(psTable.id, {
                            online: true,
                            status: 'online',
                            hwType: 'TV_CLIENT',
                            mode: 'HTTP',
                            tableIdentity: psTable.tableName,
                            isRetained: false
                        });
                    }).catch(()=>{
                    // Ignore timeouts. If it fails consecutively for 60s, BilliardGateway will mark it offline
                    });
                }
            }
        } finally{
            this.cronRunning = false;
            const duration = Date.now() - startTime;
            if (duration > 1000) {
                this.logger.log(`handleCron: [DONE] Completed in ${duration}ms.`);
            }
        }
    }
    /**
   * 🛡️ MASS PING (v7.2)
   * Force all hardware units to report their status immediately.
   * Untuk ESPNOW_NODE: ping dikirim ke Gateway MAC (Komandan), bukan MAC Prajurit.
   */ async pingAllTables(caller = 'SYSTEM') {
        this.logger.log(`[PING-ALL] [Caller: ${caller}] Requesting status from all tables...`);
        const tables = await this.tableRepository.find({
            where: {
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        tables.forEach((t)=>{
            if (!t.macAddress) return;
            // ✅ Untuk ESPNOW_NODE, kirim ping ke Gateway MAC (Komandan) karena
            // Komandan-lah yang subscribe ke MQTT, bukan Prajurit secara langsung.
            const effectiveMac = this.getEffectiveMqttMac(t);
            // Gunakan relayPin sebagai tableId untuk ESPNOW_NODE agar Komandan bisa 
            // mencocokkannya dengan registry internalnya.
            const pingTableId = t.hardwareType === 'ESPNOW_NODE' && t.relayPin ? t.relayPin : t.id;
            this.mqttService.pingTable(effectiveMac, pingTableId);
            this.logger.debug(`[PING] Table ${t.tableName} → MAC: ${effectiveMac} (MesaId: ${pingTableId})`);
        });
    }
    async handleHeartbeat(tableId, telemetry) {
        // 1. ALWAYS notify WebSocket Gateway for instant 'ONLINE' status in UI
        this.billiardGateway.handleHeartbeat(tableId, telemetry);
        // 🛡️ REAL-TIME CACHE SYNC (v17.5)
        // If device reports 'offline' (LWT), clear the tables cache immediately
        // and force immediate eviction from memory for the UI.
        if (telemetry?.status === 'offline') {
            this.billiardGateway.forceOffline(tableId);
            await this.clearAllTablesCache();
            return;
        }
        const now = Date.now();
        const lastUpdate = this.lastHeartbeatDbUpdate.get(tableId) || 0;
        const throttleMs = 30 * 1000;
        const hwStateReceived = telemetry?.lightState !== undefined;
        // 🛡️ THROTTLE DB UPDATES (v1.5)
        // Only fetch from DB and update if:
        // 1. Throttling period (30s) has passed
        // 2. OR hardware reported a potential state change (lightState)
        if (now - lastUpdate < throttleMs && !hwStateReceived) {
            return;
        }
        const table = await this.getTableById(tableId);
        if (!table) return;
        const updateData = {};
        if (telemetry?.ip) updateData.ipAddress = telemetry.ip;
        if (telemetry?.rssi !== undefined) updateData.rssi = telemetry.rssi;
        if (telemetry?.uptime !== undefined) updateData.uptime = telemetry.uptime;
        updateData.lastHeartbeat = new Date();
        // 🛡️ MANUAL OVERRIDE DETECTION (v15.3.3)
        const hwStatusMatch = hwStateReceived && telemetry.lightState === table.isLightOn;
        const isPending = this.pendingVerifications.has(tableId);
        const pendingTargetState = isPending ? this.pendingVerifications.get(tableId)?.targetState : null;
        // 🛡️ CRITICAL FIX v2: Jangan biarkan heartbeat meng-overwrite perintah user yang sedang berlangsung
        // Jika lightState berbeda dari DB:
        // - Jika TIDAK ada pending: User MANUAL override → update DB
        // - Jika ADA pending dan lightState MATCH dengan target: Command berhasil → update DB
        // - Jika ADA pending tapi lightState BELUM MATCH target: Command masih jalan → KEEP DB, tunggu success
        const isMatchingPendingTarget = isPending && pendingTargetState !== null && telemetry.lightState === pendingTargetState;
        const shouldUpdateState = hwStateReceived && !hwStatusMatch && (!isPending || isMatchingPendingTarget);
        if (shouldUpdateState) {
            this.logger.log(`[MANUAL-OVERRIDE] 🔌 Meja ${table.tableName || tableId} berubah status menjadi ${telemetry.lightState ? 'ON' : 'OFF'} ${isPending ? '(command success)' : '(manual override)'}`);
            updateData.isLightOn = telemetry.lightState;
        }
        // 🛡️ ONLY update DB if truly needed (throttled + state changed)
        if (now - lastUpdate > throttleMs || shouldUpdateState) {
            this.lastHeartbeatDbUpdate.set(tableId, now);
            await this.tableRepository.update(tableId, updateData);
            // Update cache and broadcast
            const updatedTable = await this.tableRepository.findOne({
                where: {
                    id: tableId,
                    deletedAt: (0, _typeorm1.IsNull)()
                }
            });
            if (updatedTable) {
                await this.attachTransactionData(updatedTable, {
                    loadDeepRelations: false
                });
                await this.clearAllTablesCache(); // 🛡️ Ensure dashboard sync (v17.8)
                this.billiardGateway.broadcastTableUpdate(updatedTable);
            }
        }
    }
    async handleTableOffline(tableId) {
        this.logger.debug(`[EVENT] Table ${tableId} went offline - clearing cache.`);
        await this.clearAllTablesCache();
    }
    /**
   * Updates heartbeats for all tables associated with a MAC address.
   * Useful for multi-relay controllers or old-style MAC-topic WiFi nodes.
   */ async handleHeartbeatByMac(mac, telemetry) {
        const normalized = this.normalizeMac(mac);
        // ✅ v7.2: Use fast in-memory cache first
        const cachedId = this.espnowMacIdCache.get(normalized);
        if (cachedId) {
            return this.handleHeartbeat(cachedId, telemetry);
        }
        const tables = await this.getTablesByMac(mac);
        if (!tables || tables.length === 0) {
            if (!mac.startsWith('ESPNOW')) {
                this.logger.warn(`Received heartbeat for unknown MAC: ${mac}`);
            }
            return;
        }
        // 🛡️ STRICT COLLISION RESOLUTION (v17.8)
        // If multiple tables share a MAC, only update 'active' tables or the first one.
        // This prevents unplugged tables from being marked online by their 'twins'.
        const activeTables = tables.filter((t)=>t.status !== _tableentity.TableStatus.AVAILABLE);
        const tablesToUpdate = activeTables.length > 0 ? activeTables : [
            tables[0]
        ];
        if (tables.length > 1) {
            this.logger.warn(`[MAC-COLLISION] ⚠️ Detect ${tables.length} tables sharing MAC ${mac}: ${tables.map((t)=>t.tableName).join(', ')}`);
        }
        for (const table of tablesToUpdate){
            await this.handleHeartbeat(table.id, telemetry);
        }
    }
    async rebootTable(tableId) {
        const table = await this.getTableById(tableId);
        if (!table || !table.macAddress) return {
            success: false,
            message: 'Table or MAC not found'
        };
        const topicMac = this.getEffectiveMqttMac(table);
        this.mqttService.publishSystemCommand(topicMac, 'REBOOT');
        return {
            success: true,
            message: `Reboot command sent to ${table.tableName}`
        };
    }
    async emergencyStop(username, managerPin) {
        if (!managerPin) {
            throw new _common.BadRequestException('Otorisasi ditolak. Emergency Stop memerlukan PIN Supervisor/Manajer.');
        }
        const userRepository = this.dataSource.getRepository('User');
        const manager = await userRepository.findOne({
            where: {
                pin: managerPin
            },
            relations: [
                'role'
            ]
        });
        if (!manager) {
            throw new _common.BadRequestException('Otorisasi ditolak. PIN Manajer tidak valid.');
        }
        const roleName = manager.role?.name?.toUpperCase() || '';
        if (![
            'MANAGER',
            'SUPERVISOR',
            'ADMIN',
            'OWNER',
            'SUPERADMIN'
        ].includes(roleName)) {
            throw new _common.BadRequestException('Otorisasi ditolak. Membutuhkan hak akses Manajer/Supervisor.');
        }
        const managerName = manager.username || manager.fullName || 'Manager';
        const activeTables = await this.tableRepository.find({
            where: {
                isLightOn: true,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        this.logger.warn(`EMERGENCY STOP TRIGGERED BY ${username} (Authorized by ${managerName}). Shutting down ${activeTables.length} tables.`);
        for (const table of activeTables){
            if (table.macAddress) {
                const topicMac = this.getEffectiveMqttMac(table);
                this.mqttService.publishLightCommand(topicMac, table.id, false, table.relayPin, 0, false, true, {
                    targetMac: table.macAddress
                }, table.hardwareType, 'emergencyStop');
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
        const topicMac = this.getEffectiveMqttMac(table);
        const result = this.mqttService.publishLightCommand(topicMac, table.id, true, table.relayPin, durationMinutes || 0, false, true, {
            type,
            startTime: table.startTime ? table.startTime.toISOString() : new Date().toISOString(),
            endTime: table.endTime ? table.endTime.toISOString() : null,
            targetMac: table.macAddress
        }, table.hardwareType, 'switchSession');
        // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
        this.commandLocks.set(tableId, Date.now() + 5000);
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
            this.pendingVerifications.delete(tableId);
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
                let customConfig = null;
                if (globalSettings.customPricingDynamic && Array.isArray(globalSettings.customPricingDynamic)) {
                    customConfig = globalSettings.customPricingDynamic.find((c)=>c.categoryId === table.categoryId);
                }
                if (customConfig) {
                    const currentDayCode = this.getBusinessDayCode(globalSettings?.businessDayOffset);
                    const activeRate = this.transactionService.calculateCurrentPackagePrice({
                        price: customConfig.basePrice,
                        timeSlots: customConfig.timeSlots
                    }, currentDayCode);
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
            // 🛡️ TV-CLIENT GUARD: Tabel PLAYSTATION dengan ipAddress menggunakan HTTP wakeup,
            // bukan relay MQTT. Jangan kirim perintah MQTT agar tidak cross-trigger relay meja lain.
            const isTvClientModeExtend = table.stationType === _tableentity.StationType.PLAYSTATION && !!table.ipAddress;
            if (table.macAddress && !isTvClientModeExtend) {
                const topicMac = this.getEffectiveMqttMac(table);
                const result = this.mqttService.publishLightCommand(topicMac, table.id, true, table.relayPin, table.remainingMinutes || 1, true, true, {
                    targetMac: table.macAddress
                }, table.hardwareType);
                // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
                this.commandLocks.set(tableId, Date.now() + 5000);
                // 🛡️ REGISTER FOR VERIFIKASI (v17.3)
                const tokenValue = result?.token || 0;
                this.pendingVerifications.set(table.id, {
                    targetState: true,
                    targetToken: tokenValue,
                    attempts: 1,
                    lastSent: Date.now(),
                    table: savedTable
                });
            } else if (isTvClientModeExtend) {
                this.logger.log(`[PS-TV] Table ${table.tableName} is TV Client mode — skipping MQTT relay extend, using HTTP wakeup only.`);
            }
            // --- TV Client HTTP Trigger: WAKEUP (PS mode for Extend) ---
            if (table.stationType === _tableentity.StationType.PLAYSTATION && table.ipAddress) {
                try {
                    const hours = Math.floor(extensionMinutes / 60);
                    const mins = extensionMinutes % 60;
                    const durationStr = `${hours}jam : ${mins.toString().padStart(2, '0')}menit`;
                    const wakeupUrl = `http://${table.ipAddress}:1717/wakeup?title=${encodeURIComponent('Tambahan waktu')}&duration=${encodeURIComponent(durationStr)}`;
                    _axios.default.get(wakeupUrl, {
                        timeout: 3000
                    }).catch((e)=>this.logger.error(`[PS-TV] Failed to send extend /wakeup to ${table.ipAddress}: ${e.message}`));
                    this.logger.log(`[PS-TV] Sent extend /wakeup command to TV at ${table.ipAddress} with duration: ${durationStr}`);
                } catch (e) {
                    this.logger.error(`[PS-TV] Failed to send extend /wakeup to ${table.ipAddress}: ${e.message}`);
                }
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
            toTable.lastSessionData = fromTable.lastSessionData; // <--- SINKRONISASI VOUCHER
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
            fromTable.lastSessionData = null; // <--- PEMBERSIHAN
            const savedFrom = await this.tableRepository.save(fromTable);
            const savedTo = await this.tableRepository.save(toTable);
            // Invalidate caches for both tables
            await this.redisService.del(`bill_preview_${fromTableId}`).catch(()=>{});
            await this.redisService.del(`bill_preview_${toTableId}`).catch(()=>{});
            // 4. IoT Coordination
            // Turn OFF source table - force:true bypasses ESP32 30s race condition protection
            if (fromTable.macAddress) {
                const topicMac = this.getEffectiveMqttMac(fromTable);
                this.mqttService.publishLightCommand(topicMac, fromTable.id, false, fromTable.relayPin, 0, false, true, {
                    targetMac: fromTable.macAddress
                }, fromTable.hardwareType, 'moveTable');
            }
            // Turn ON new table with migrated duration/type
            if (toTable.macAddress) {
                const topicMac = this.getEffectiveMqttMac(toTable);
                this.mqttService.publishLightCommand(topicMac, toTable.id, true, toTable.relayPin, toTable.remainingMinutes || 0, false, true, {
                    type: toTable.sessionType,
                    startTime: toTable.startTime ? toTable.startTime.toISOString() : new Date().toISOString(),
                    endTime: toTable.endTime ? toTable.endTime.toISOString() : null,
                    targetMac: toTable.macAddress
                }, toTable.hardwareType, 'moveTable');
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
    async resetTable(id, userName, managerPin) {
        if (!managerPin) {
            throw new _common.BadRequestException('Otorisasi ditolak. Force Reset memerlukan PIN Supervisor/Manajer.');
        }
        const userRepository = this.dataSource.getRepository('User');
        const manager = await userRepository.findOne({
            where: {
                pin: managerPin
            },
            relations: [
                'role'
            ]
        });
        if (!manager) {
            throw new _common.BadRequestException('Otorisasi ditolak. PIN Manajer tidak valid.');
        }
        const roleName = manager.role?.name?.toUpperCase() || '';
        if (![
            'MANAGER',
            'SUPERVISOR',
            'ADMIN',
            'OWNER',
            'SUPERADMIN'
        ].includes(roleName)) {
            throw new _common.BadRequestException('Otorisasi ditolak. Membutuhkan hak akses Manajer/Supervisor.');
        }
        const managerName = manager.username || manager.fullName || 'Manager';
        const table = await this.getTableById(id);
        if (!table) throw new _common.NotFoundException('Table not found');
        // GRACE PERIOD VOUCHER LOGIC
        let voucherVoidMessage = '';
        if (table.startTime) {
            try {
                const activeTx = await this.transactionService.getActiveTransactionByTable(table.id, false);
                if (activeTx && activeTx.voucherId) {
                    const now = new Date();
                    const startTime = new Date(table.startTime);
                    const minutesPlayed = Math.floor((now.getTime() - startTime.getTime()) / 60000);
                    const GRACE_PERIOD_MINUTES = 5;
                    if (minutesPlayed <= GRACE_PERIOD_MINUTES) {
                        await this.voucherService.atomicDecrementUsage(activeTx.voucherId);
                        voucherVoidMessage = ` [Voucher ID:${activeTx.voucherId} Di-Rollback (Durasi ${minutesPlayed}m <= ${GRACE_PERIOD_MINUTES}m)]`;
                    } else {
                        voucherVoidMessage = ` [Voucher ID:${activeTx.voucherId} HANGUS (Durasi ${minutesPlayed}m > ${GRACE_PERIOD_MINUTES}m)]`;
                    }
                }
            } catch (err) {
                this.logger.error(`Gagal memproses rollback voucher saat reset table ${id}: ${err.message}`);
            }
        }
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
        table.lastSessionData = null;
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
            const topicMac = this.getEffectiveMqttMac(table);
            const resetResult = this.mqttService.publishLightCommand(topicMac, table.id, false, table.relayPin, 0, false, true, {
                targetMac: table.macAddress
            }, table.hardwareType, 'resetTable');
            // 🛡️ SELF-HEALING: Daftarkan perintah OFF ke pendingVerifications
            // agar Smart Verification Loop (setInterval 10s) secara otomatis
            // melakukan retry hingga 5x jika sinyal gagal diterima hardware.
            const resetToken = resetResult?.token || 0;
            this.pendingVerifications.set(table.id, {
                targetState: false,
                targetToken: resetToken,
                attempts: 1,
                lastSent: Date.now(),
                table: savedTable
            });
            this.logger.log(`[SELF-HEALING] ✅ Meja ${table.tableName} terdaftar untuk verifikasi sinyal OFF setelah Void/Reset.`);
        }
        this.billiardGateway.broadcastTableUpdate(savedTable);
        if (userName) {
            await this.reportService.logAction('FORCE_RESET_TABLE', userName || 'Sistem', `Reset paksa Meja ${table.tableName}. Status kembali AVAILABLE. (Diotorisasi oleh: ${managerName})${voucherVoidMessage}`, id);
        }
        return savedTable;
    }
    async sendTvMessage(id, message) {
        const table = await this.tableRepository.findOne({
            where: {
                id,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        if (!table) {
            throw new _common.NotFoundException('Meja tidak ditemukan');
        }
        if (table.stationType !== _tableentity.StationType.PLAYSTATION) {
            throw new _common.BadRequestException('Meja bukan bertipe PlayStation');
        }
        if (!table.ipAddress) {
            throw new _common.BadRequestException('IP Address TV belum dikonfigurasi');
        }
        try {
            await _axios.default.get(`http://${table.ipAddress}:1717/text?text=${encodeURIComponent(message)}`, {
                timeout: 3000
            });
            return {
                success: true,
                message: `Pesan berhasil dikirim ke TV`
            };
        } catch (err) {
            this.logger.error(`Gagal mengirim pesan ke TV ${table.ipAddress}: ${err.message}`);
            throw new _common.BadRequestException(`Gagal menghubungi TV client (${table.ipAddress}): ${err.message}`);
        }
    }
    async triggerTvSleep(table, tx) {
        if (table.stationType !== _tableentity.StationType.PLAYSTATION || !table.ipAddress) return;
        try {
            const activeTx = tx || await this.transactionService.getActiveTransactionByTable(table.id, true);
            let query = '';
            if (activeTx) {
                const customerName = activeTx.customerName || 'Pelanggan';
                const tableName = table.tableName;
                const invoiceNumber = activeTx.invoiceNumber || '';
                // Calculate play duration
                let playDuration = '';
                if (table.startTime) {
                    const diffMs = new Date().getTime() - table.startTime.getTime();
                    const hrs = Math.floor(diffMs / 3600000);
                    const mins = Math.floor(diffMs % 3600000 / 60000);
                    playDuration = `${hrs} jam ${mins} menit`;
                } else {
                    playDuration = activeTx.sessionDuration || '';
                }
                const billiardTotal = activeTx.billiardTotal || 0;
                const cafeTotal = activeTx.cafeTotal || 0;
                const grandTotal = activeTx.grandTotal || 0;
                const orderItems = (activeTx.orderItems || []).filter((item)=>item.status !== 'CANCELLED').map((item)=>({
                        name: item.customName || item.menuItem?.name || 'Item',
                        qty: item.quantity,
                        subtotal: Number(item.priceAtOrder || 0) * Number(item.quantity || 0)
                    }));
                const statusParam = activeTx.status === _transactionentity.TransactionStatus.PAID ? 'LUNAS' : 'BELUM_BAYAR';
                query = `?invoiceNumber=${encodeURIComponent(invoiceNumber)}` + `&customerName=${encodeURIComponent(customerName)}` + `&tableName=${encodeURIComponent(tableName)}` + `&playDuration=${encodeURIComponent(playDuration)}` + `&billiardTotal=${billiardTotal}` + `&cafeTotal=${cafeTotal}` + `&grandTotal=${grandTotal}` + `&status=${statusParam}` + `&orders=${encodeURIComponent(JSON.stringify(orderItems))}`;
            }
            const url = `http://${table.ipAddress}:1717/sleep${query}`;
            await _axios.default.get(url, {
                timeout: 3000
            });
            this.logger.log(`[PS-TV] Sent /sleep command with invoice to TV at ${table.ipAddress} (Status: ${activeTx?.status || 'UNKNOWN'})`);
        } catch (e) {
            this.logger.error(`[PS-TV] Failed to send /sleep to ${table.ipAddress}: ${e.message}`);
        }
    }
    async tvEmergencyControl(id, action, title, duration) {
        const table = await this.tableRepository.findOne({
            where: {
                id,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        if (!table) throw new _common.NotFoundException('Meja tidak ditemukan');
        if (table.stationType !== _tableentity.StationType.PLAYSTATION) throw new _common.BadRequestException('Meja bukan bertipe PlayStation');
        if (!table.ipAddress) throw new _common.BadRequestException('IP Address TV belum dikonfigurasi');
        try {
            if (action === 'sleep') {
                this.logger.warn(`[EMERGENCY] 🔒 Kasir mengunci layar TV ${table.tableName} (${table.ipAddress})`);
                await this.triggerTvSleep(table);
            } else {
                const t = encodeURIComponent(title || 'Lanjutkan Bermain');
                const d = encodeURIComponent(duration || 'Manual Unlock');
                const url = `http://${table.ipAddress}:1717/wakeup?title=${t}&duration=${d}`;
                this.logger.log(`[EMERGENCY] 🔓 Kasir membuka kunci layar TV ${table.tableName} (${table.ipAddress})`);
                await _axios.default.get(url, {
                    timeout: 4000
                });
            }
            // Broadcast audit log to all connected dashboards
            this.billiardGateway.broadcastWarning(action === 'sleep' ? '🔒 Layar TV Dikunci Darurat' : '🔓 Layar TV Dibuka', `${table.tableName}: TV ${action === 'sleep' ? 'dikunci oleh kasir' : 'dibuka kunci oleh kasir'}`, table.id);
            return {
                success: true,
                action,
                table: table.tableName
            };
        } catch (err) {
            this.logger.error(`[EMERGENCY] Gagal ${action} ke TV ${table.ipAddress}: ${err.message}`);
            throw new _common.BadRequestException(`Gagal menghubungi TV (${table.ipAddress}): ${err.message}`);
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    //  PS BATCH PING — Ping semua PS dengan concurrency limit (max 20 bersamaan)
    //  Menghindari flood 200 HTTP request sekaligus yang dapat timeout.
    // ═══════════════════════════════════════════════════════════════════════════
    async pingAllPlaystations() {
        this.logger.log('[PS-BATCH-PING] Starting batch ping for all PlayStation tables...');
        const psTables = await this.tableRepository.find({
            where: {
                stationType: _tableentity.StationType.PLAYSTATION,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        if (psTables.length === 0) {
            return {
                total: 0,
                online: 0,
                offline: 0,
                results: []
            };
        }
        const BATCH_SIZE = 20; // max concurrent HTTP requests
        const BATCH_DELAY = 200; // ms delay antar batch
        const HTTP_TIMEOUT = 2000; // timeout per request (lebih pendek dari individual ping)
        const results = [];
        let online = 0;
        let offline = 0;
        // Helper: delay
        const sleep = (ms)=>new Promise((r)=>setTimeout(r, ms));
        // Helper: ping 1 unit PS
        const pingOne = async (table)=>{
            if (!table.ipAddress) {
                const r = {
                    id: table.id,
                    tableName: table.tableName,
                    ip: null,
                    online: false,
                    reason: 'No IP configured'
                };
                results.push(r);
                offline++;
                return r;
            }
            try {
                await _axios.default.get(`http://${table.ipAddress}:1717/ping`, {
                    timeout: HTTP_TIMEOUT
                });
                // Update heartbeat di cache & websocket
                await this.handleHeartbeat(table.id, {
                    online: true,
                    status: 'online',
                    hwType: 'TV_CLIENT',
                    mode: 'HTTP',
                    tableIdentity: table.tableName,
                    isRetained: false
                });
                const r = {
                    id: table.id,
                    tableName: table.tableName,
                    ip: table.ipAddress,
                    online: true
                };
                results.push(r);
                online++;
                return r;
            } catch (e) {
                await this.handleHeartbeat(table.id, {
                    online: false,
                    status: 'offline',
                    hwType: 'TV_CLIENT'
                });
                const r = {
                    id: table.id,
                    tableName: table.tableName,
                    ip: table.ipAddress,
                    online: false,
                    reason: e.message
                };
                results.push(r);
                offline++;
                return r;
            }
        };
        // Proses dalam gelombang (batch)
        for(let i = 0; i < psTables.length; i += BATCH_SIZE){
            const batch = psTables.slice(i, i + BATCH_SIZE);
            this.logger.log(`[PS-BATCH-PING] Wave ${Math.floor(i / BATCH_SIZE) + 1}: pinging ${batch.length} units...`);
            await Promise.allSettled(batch.map((t)=>pingOne(t)));
            if (i + BATCH_SIZE < psTables.length) {
                await sleep(BATCH_DELAY);
            }
        }
        this.logger.log(`[PS-BATCH-PING] Done. Total=${psTables.length} Online=${online} Offline=${offline}`);
        return {
            total: psTables.length,
            online,
            offline,
            results
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    //  AUTO-DISCOVER PS IPs — Scan subnet untuk temukan TV Android (port 1717)
    //  Contoh: subnet = "192.168.1" → scan 192.168.1.1–192.168.1.254
    // ═══════════════════════════════════════════════════════════════════════════
    async discoverPsIps(subnetInput) {
        // Auto-detect subnet dari interface jaringan jika tidak disuplai
        let subnet = subnetInput;
        if (!subnet) {
            const os = require('os');
            const ifaces = os.networkInterfaces();
            for (const name of Object.keys(ifaces)){
                for (const iface of ifaces[name]){
                    if (iface.family === 'IPv4' && !iface.internal && iface.address !== '127.0.0.1') {
                        const parts = iface.address.split('.');
                        if (parts.length === 4) {
                            subnet = parts.slice(0, 3).join('.');
                            break;
                        }
                    }
                }
                if (subnet) break;
            }
        }
        if (!subnet) {
            subnet = '192.168.1';
        }
        this.logger.log(`[PS-DISCOVER] Scanning subnet ${subnet}.1 – ${subnet}.254 on port 1717...`);
        const CONCURRENT = 50; // 50 concurrent scan, cepat tapi tidak flood router
        const TIMEOUT = 800; // 800ms per IP (pendek untuk scan)
        const found = [];
        let scanned = 0;
        const tryIp = async (ip)=>{
            scanned++;
            try {
                const res = await _axios.default.get(`http://${ip}:1717/ping`, {
                    timeout: TIMEOUT,
                    validateStatus: ()=>true
                });
                if (res.status < 500) {
                    // TV Android merespons
                    const tvName = res.data?.deviceName || res.data?.name || ip;
                    this.logger.log(`[PS-DISCOVER] ✅ Found TV at ${ip} — "${tvName}"`);
                    found.push({
                        ip,
                        deviceName: tvName,
                        responseMs: Date.now()
                    });
                }
            } catch  {
            // No response — skip
            }
        };
        // Buat semua 254 IP lalu proses dalam batch 50
        const ips = [];
        for(let i = 1; i <= 254; i++){
            ips.push(`${subnet}.${i}`);
        }
        const sleep = (ms)=>new Promise((r)=>setTimeout(r, ms));
        for(let i = 0; i < ips.length; i += CONCURRENT){
            await Promise.allSettled(ips.slice(i, i + CONCURRENT).map((ip)=>tryIp(ip)));
        }
        this.logger.log(`[PS-DISCOVER] Scan complete. Found ${found.length} TV(s) in ${subnet}.x`);
        return {
            found,
            scanned,
            subnet
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    //  BATCH UPDATE IP — Update IP Address banyak PS sekaligus
    // ═══════════════════════════════════════════════════════════════════════════
    async batchUpdateIpAddress(updates) {
        let updated = 0;
        const failed = [];
        for (const item of updates){
            try {
                const table = await this.tableRepository.findOne({
                    where: {
                        id: item.id,
                        deletedAt: (0, _typeorm1.IsNull)()
                    }
                });
                if (!table) {
                    failed.push({
                        id: item.id,
                        reason: 'Not found'
                    });
                    continue;
                }
                if (table.stationType !== _tableentity.StationType.PLAYSTATION) {
                    failed.push({
                        id: item.id,
                        tableName: table.tableName,
                        reason: 'Bukan PS table'
                    });
                    continue;
                }
                // Validasi format IP sederhana
                const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                if (item.ipAddress && !ipRegex.test(item.ipAddress)) {
                    failed.push({
                        id: item.id,
                        reason: `Format IP tidak valid: ${item.ipAddress}`
                    });
                    continue;
                }
                await this.tableRepository.update(item.id, {
                    ipAddress: item.ipAddress || undefined
                });
                updated++;
            } catch (e) {
                failed.push({
                    id: item.id,
                    reason: e.message
                });
            }
        }
        // Clear cache setelah batch update
        await this.clearAllTablesCache();
        this.logger.log(`[BATCH-IP] Updated ${updated} PS IPs. Failed: ${failed.length}`);
        return {
            updated,
            failed
        };
    }
    constructor(tableRepository, sessionRepository, packageRepository, mqttService, billiardGateway, transactionService, settingsService, cafeService, promoService, reportService, waitingListService, memberService, dataSource, // itemUpdating replaced by Redis locks
    redisService, whatsappService, aiService, memberRepository, voucherService){
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
        this.memberRepository = memberRepository;
        this.voucherService = voucherService;
        this.packagesCache = null;
        this.logger = new _common.Logger(BilliardService.name);
        this.macTableCache = new Map();
        this.lastHeartbeatDbUpdate = new Map(); // tableId -> timestamp
        this.gatewayStatuses = new Map();
        this.pendingVerifications = new Map(); // 🛡️ SMART VERIFY (v15.2)
        this.lastCommandAt = new Map(); // 🛡️ ANTI-SPAM (v17.2)
        this.technicalOverrides = new Map(); // tableId -> expirationTimestamp (v18.5)
        this.lastBroadcastOnlineStatus = new Map(); // tableId -> last broadcasted online status (anti-spam)
        // ✅ v7.2: Fast MAC→tableId cache tanpa query DB saat runtime
        // Di-populate sekali saat startup, update saat ada perubahan MAC
        this.espnowMacIdCache = new Map(); // prajuritMAC → DB table id
        this.commandLocks = new Map(); // tableId -> timestamp (v7.12)
        // ✅ v7.0: Per-Prajurit node registry (dari Komandan v7.0)
        this.prajuritNodeMap = new Map();
        this.cronRunning = false;
    }
};
_ts_decorate([
    (0, _schedule.Cron)('*/15 * * * * *'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardService.prototype, "handleCron", null);
_ts_decorate([
    (0, _eventemitter.OnEvent)('table.offline'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardService.prototype, "handleTableOffline", null);
BilliardService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_tableentity.Table)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_sessionentity.Session)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_billiardpackageentity.BilliardPackage)),
    _ts_param(7, (0, _common.Inject)((0, _common.forwardRef)(()=>_cafeservice.CafeService))),
    _ts_param(10, (0, _common.Inject)((0, _common.forwardRef)(()=>_waitinglistservice.WaitingListService))),
    _ts_param(16, (0, _typeorm.InjectRepository)(_memberentity.Member)),
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
        typeof _aiservice.AIService === "undefined" ? Object : _aiservice.AIService,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _voucherservice.VoucherService === "undefined" ? Object : _voucherservice.VoucherService
    ])
], BilliardService);

//# sourceMappingURL=billiard.service.js.map