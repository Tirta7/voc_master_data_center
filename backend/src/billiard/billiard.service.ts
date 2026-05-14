import {
  Injectable,
  Inject,
  OnModuleInit,
  Logger,
  NotFoundException,
  forwardRef,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, DataSource, In } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { Table, TableStatus, HardwareType } from './entities/table.entity';
import { Session } from './entities/session.entity';
import {
  BilliardPackage,
  PackageType,
} from './entities/billiard-package.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { MqttService } from '../mqtt/mqtt.service';
import { TransactionService } from '../transaction/transaction.service';
import { SettingsService } from '../settings/settings.service';
import { CafeService } from '../cafe/cafe.service';
import { PromoService } from '../promo/promo.service';
import { PromoType } from '../promo/entities/promo.entity';
import { ReportService } from '../report/report.service';
import { WaitingListService } from '../waiting-list/waiting-list.service';
import { MemberService } from '../member/member.service';
import { TransactionStatus } from '../transaction/entities/transaction.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { AIService } from '../ai/ai.service';
import { Member } from '../member/entities/member.entity';

@Injectable()
export class BilliardService implements OnModuleInit {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(BilliardPackage)
    private readonly packageRepository: Repository<BilliardPackage>,
    private readonly mqttService: MqttService,
    private readonly billiardGateway: BilliardGateway,
    private readonly transactionService: TransactionService,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => CafeService))
    private readonly cafeService: CafeService,
    private readonly promoService: PromoService,
    private readonly reportService: ReportService,
    @Inject(forwardRef(() => WaitingListService))
    private readonly waitingListService: WaitingListService,
    private readonly memberService: MemberService,
    private readonly dataSource: DataSource,
    // itemUpdating replaced by Redis locks
    private readonly redisService: RedisService,
    private readonly whatsappService: WhatsAppService,
    private readonly aiService: AIService,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) { }

  private packagesCache: { data: BilliardPackage[]; expiry: number } | null = null;

  private readonly logger = new Logger(BilliardService.name);
  private macTableCache = new Map<string, Table[]>();
  private lastHeartbeatDbUpdate = new Map<number, number>(); // tableId -> timestamp
  private gatewayStatuses = new Map<string, { online: number; total: number; lastSeen: Date }>();
  private pendingVerifications = new Map<number, {
    targetState: boolean,
    targetToken: number,
    attempts: number,
    lastSent: number,
    table: Table
  }>(); // 🛡️ SMART VERIFY (v15.2)
  private lastCommandAt = new Map<number, { time: number, state: boolean }>(); // 🛡️ ANTI-SPAM (v17.2)
  private technicalOverrides = new Map<number, number>(); // tableId -> expirationTimestamp (v18.5)
  private lastBroadcastOnlineStatus = new Map<number, boolean>(); // tableId -> last broadcasted online status (anti-spam)

  // ✅ v7.2: Fast MAC→tableId cache tanpa query DB saat runtime
  // Di-populate sekali saat startup, update saat ada perubahan MAC
  private espnowMacIdCache = new Map<string, number>(); // prajuritMAC → DB table id
  private commandLocks = new Map<number, number>(); // tableId -> timestamp (v7.12)

  // ✅ v7.0: Per-Prajurit node registry (dari Komandan v7.0)
  public prajuritNodeMap = new Map<string, {
    mesaId: number;
    mac: string;
    online: boolean;
    lastCmd: number;
    lastSeenS: number;    // detik lalu
    ackPending: boolean;
    gatewayMac: string;
    floor_id: number;
    block_id: string;
    updatedAt: Date;
  }>();

  private clearMacCache() {
    this.macTableCache.clear();
    this.espnowMacIdCache.clear(); // ✅ Reset fast cache juga
    this.logger.debug('MAC-to-Table cache cleared.');
  }

  /**
   * Normalizes MAC address by removing colons, dashes and converting to uppercase.
   */
  private normalizeMac(mac: string | null | undefined): string {
    if (!mac) return '';
    return mac.trim().replace(/[:\-]/g, '').toUpperCase();
  }

  /**
   * Hybrid Routing Helper:
   * Returns the MQTT topic MAC address.
   * For ESPNOW_NODE: Returns espnowGatewayMac (commands must go through the Gateway).
   * For direct WiFi: Returns macAddress.
   */
  private getEffectiveMqttMac(table: any): string {
    if (table.hardwareType === 'ESPNOW_NODE' && table.espnowGatewayMac) {
      return this.normalizeMac(table.espnowGatewayMac);
    }
    return this.normalizeMac(table.macAddress);
  }

  /**
   * Helper to find all tables associated with a MAC (handles both normalized and colon-format)
   */
  private async getTablesByMac(mac: string): Promise<Table[]> {
    const normalized = this.normalizeMac(mac);
    if (!normalized) return [];

    // Check cache first
    const cached = this.macTableCache.get(normalized);
    if (cached) return cached;

    // 1. Try direct find (Normalized)
    let tables = await this.tableRepository.find({
      where: { macAddress: normalized, deletedAt: IsNull() },
    });

    // 2. Fallback to colon-format (Legacy)
    if (tables.length === 0 && normalized.length === 12) {
      const withColons = normalized.match(/.{1,2}/g)?.join(':');
      if (withColons) {
        tables = await this.tableRepository.find({
          where: { macAddress: withColons, deletedAt: IsNull() },
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
        where: { hardwareType: HardwareType.ESPNOW_NODE, deletedAt: IsNull() },
        select: ['id', 'macAddress']
      }).then(espnowTables => {
        for (const t of espnowTables) {
          if (t.macAddress) {
            const norm = this.normalizeMac(t.macAddress);
            this.espnowMacIdCache.set(norm, t.id);
          }
        }
        this.logger.log(`[CACHE-v7.2] Loaded ${this.espnowMacIdCache.size} ESP-NOW MACs into fast cache.`);
      }).catch(err => {
        this.logger.error(`[CACHE-v7.2] Failed to pre-populate cache: ${err.message}`);
      });

      this.mqttService.onMessage(async (topic: string, payload: Buffer, packet: any) => {
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
                hardwareType: HardwareType.ESPNOW_NODE,
                deletedAt: IsNull() 
              }
            });
            if (tableByMesa) {
              this.logger.log(`[AUTO-LEARN] 🪄 Meja ${tableByMesa.tableName} (Pin:${incomingMesaId}) dikenali via MAC baru: ${macAddress}`);
              tableByMesa.macAddress = macAddress;
              await this.tableRepository.save(tableByMesa);
              this.espnowMacIdCache.set(macAddress, tableByMesa.id);
              tables = [tableByMesa];
            }
          }

          for (const table of tables) {
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
              tableIdentity: table.tableName,
            });

            if (statusChanged) {
              this.lastBroadcastOnlineStatus.set(table.id, isOnline);

              this.handleHeartbeat(table.id, {
                ...data,
                online: isOnline,
                status: isOnline ? 'online' : 'offline',
                hwType: 'ESPNOW_NODE',
              });

              // 🚨 Broadcast ke UI hanya saat status berubah
              const freshTable = await this.getTableById(table.id);
              if (freshTable) {
                this.billiardGateway.broadcastTableUpdate({
                  ...freshTable,
                  online: isOnline,
                  isOffline: !isOnline,
                  hwState: isOnline ? (data.lightState ? 'ON' : 'OFF') : 'OFF',
                  hwType: 'ESPNOW_NODE',
                  mode: 'OTOMATIS',
                  type: 'billiard',
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
            const syncData = tables.map((t) => {
              let remainingMinutes = 0;
              if (t.isLightOn && t.endTime) {
                const diffMs = t.endTime.getTime() - now.getTime();
                remainingMinutes = Math.max(0, Math.ceil(diffMs / 60000));
              }

              return {
                tableId: t.id,
                status: t.isLightOn ? 'ON' : 'OFF',
                relayPin: t.relayPin,
                remainingMinutes, // 🛡️ FAILS-SAFE TIMER HYDRATION (v17.5)
              };
            });
            this.mqttService.publish(`billiard/table/${macAddress}/sync_response`, { tables: syncData, timestamp: new Date().toISOString() });
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
          for (const [mac, status] of this.gatewayStatuses.entries()) {
            if (now.getTime() - status.lastSeen.getTime() > 60000) {
              this.gatewayStatuses.delete(mac);
            }
          }

          // Hitung Agregat
          let totalGateways = this.gatewayStatuses.size;
          let totalOnlinePrajurit = 0;
          let totalRegisteredPrajurit = 0;
          this.gatewayStatuses.forEach((s: any) => {
            totalOnlinePrajurit += s.online;
            totalRegisteredPrajurit += s.total;
          });

          this.logger.log(`[GATEWAY-HEARTBEAT] STATS: ${totalGateways} Komandan Terdaftar | ${totalOnlinePrajurit}/${totalRegisteredPrajurit} Prajurit Online`);
          this.billiardGateway.server.emit('gateway_status', { ...data, mac: rawMac, lastSeen: new Date() });
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
              for (const p of prajurit) {
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
                  updatedAt: new Date(),
                });

                // ✅ v7.2: BRIDGE — feed gateway report ke handleHeartbeat agar
                // dashboard Online/Offline terupdate TANPA perlu individual heartbeat.
                // Komandan kirim GW-REPORT setiap 30 detik → cukup untuk status meja.
                // dashboard Online/Offline terupdate TANPA perlu query DB lambat.
                const pMac = this.normalizeMac(p.mac);
                this.logger.log(`[BRIDGE-TRACE] Meja ${p.mesaId} | MAC: ${pMac} | Online: ${p.online}`);

                // 🚀 JALUR EKSPRES (v7.5): Cari berdasarkan MesaID (relayPin) + ESPNOW_NODE
                // Ini solusi paling jitu karena MesaID tidak mungkin salah.
                let tableId: number | undefined = pMac ? this.espnowMacIdCache.get(pMac) : undefined;

                if (!tableId) {
                  const tableByMesa = await this.tableRepository.findOne({
                    where: { 
                      relayPin: p.mesaId, 
                      hardwareType: HardwareType.ESPNOW_NODE,
                      deletedAt: IsNull()
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
                    rssi: p.rssi || -60,
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
                        type: 'billiard',
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
                lastSeen: new Date(),
              });

              this.logger.log(
                `[GW-v7] Lantai ${floorId}${blockId} | ${data.online_count || 0}/${prajurit.length} Prajurit Online`,
              );
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

            for (const p of peers) {
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
                  where: { macAddress: this.normalizeMac(rawMac), relayPin: p.id, deletedAt: IsNull() }
                });
              }

              for (const table of tables) {
                // Update status real-time via gateway
                this.handleHeartbeat(table.id, {
                  online: p.on !== false,
                  status: (p.l === 1 || p.s === 1) ? 'ON' : 'OFF',
                  lightState: p.l === 1 || p.s === 1,
                  mesaId: p.id,
                  rssi: p.r || -50,
                  uptime: p.u || 0,
                  remainingMin: p.rem || 0,
                  token: p.t || 0,
                  hwType: 'ESPNOW_NODE', // 🎯 Identitas fix untuk Prajurit
                  mode: 'AUTO',
                  tableIdentity: table.tableName,
                  isRetained
                });
              }
            }

            // 🚀 GLOBAL SYNC (v12/13): Paksa UI sinkron dengan status real-time memori
            const dbTables = await this.tableRepository.find({
              where: { deletedAt: IsNull() },
              order: { id: 'ASC' }
            });

            // 💧 HYDRATION (v13): Bungkus data DB dengan data Radio di memori
            const hydratedTables = dbTables.map(table => {
              const online = this.billiardGateway.isTableOnline(table.id);
              const telemetry = this.billiardGateway.liveTelemetry.get(table.id) || {};

              return {
                ...table,
                online,
                // Pastikan status hardware (v13) menang di UI
                hwState: telemetry.lightState !== undefined ? (telemetry.lightState ? 'ON' : 'OFF') : table.status,
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
        if ((type === 'table' && (parts[3] === 'status' || parts[4] === 'status')) ||
          (type === 'status' && parts[0] === 'billiard')) {
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
                  where: { relayPin: mesaId, hardwareType: HardwareType.ESPNOW_NODE, deletedAt: IsNull() }
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

            for (const table of tables) {
              const tableRelayVal = table.relayPin !== null ? parseInt(String(table.relayPin).replace(/\D/g, '')) : 0;

              // 🧠 HYBRID LOGIC: Jika data mengandung array 'relays' (Mode PCF8575), 
              // ambil status spesifik berdasarkan index Relay Pin meja ini.
              let specificData: any = { ...data };
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

              if (isOnlyOneForMac || isIdMatch || (isHybrid && tableRelayVal === mesaIdFromTopic)) {
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
                  table.hardwareType = HardwareType.ESPNOW_NODE;
                  await this.tableRepository.save(table);
                  this.clearMacCache();
                }

                const isOtomatis = data.masterEnabled === true || data.mode === 'AUTO' || data.mode === 'OTOMATIS';
                const reportedMode = isOtomatis ? 'OTOMATIS' : 'MANUAL (LOCK)';
                const isOffline = specificData.status === 'offline';
                const logTag = isOffline ? '[HEARTBEAT-OFFLINE]' : '[HEARTBEAT-OK]';
                this.logger.log(`${logTag} ${tableIdentity} (${table.macAddress}) | Mode: ${reportedHw} [${reportedMode}] | Status: ${specificData.status}${isRetained ? ' (RETAINED-GHOST)' : ''}`);
                this.handleHeartbeat(table.id, { ...specificData, hwType: reportedHw, mode: reportedMode, tableIdentity, isRetained, online: true });
              }
            }
          } catch (err) {
            this.logger.error(`Error parsing table status: ${err.message}`, err.stack);
          }
        }
      });

      this.logger.log('MQTT Service initialized and synchronized with hardware.');

      // 🛡️ STARTUP SYNC (v18.7): Ping all tables after 10s to force fresh heartbeats
      setTimeout(() => {
        this.pingAllTables('STARTUP_SYNC');
      }, 10000);

      // 🛡️ SMART VERIFICATION LOOP (v16.0): Cek tiap 10 detik apakah hardware sudah sinkron
      setInterval(() => {
        const now = Date.now();
        this.pendingVerifications.forEach((cmd, tableId) => {
          const telemetry = this.billiardGateway.liveTelemetry.get(tableId);
          const online = this.billiardGateway.isTableOnline(tableId);

          if (!online) return; // Tunggu online baru verifikasi

          const isManualLock = telemetry?.mode?.startsWith('MANUAL') ||
            ((this.technicalOverrides.get(tableId) ?? 0) > now);

          if (isManualLock) {
            this.logger.log(`[MANUAL-OVERRIDE] 🖐️ Meja ${tableId} dalam mode Override Teknikal / Panel. Sinkronisasi dibatalkan.`);
            this.pendingVerifications.delete(tableId);
            return;
          }

          // 🛡️ SAFETY GUARD v16.0: KRITIS — Jangan retry OFF jika billing masih berjalan!
          // Mencegah mematikan meja yang masih ada sisa waktu billing.
          // remainingMin dari Prajurit heartbeat adalah sumber kebenaran yang paling akurat.
          if (!cmd.targetState && (telemetry?.remainingMin ?? 0) > 0) {
            this.logger.warn(
              `[VERIFY-CANCEL] 🛡️ Meja ${tableId}: Retry OFF DIBATALKAN — ` +
              `billing masih berjalan (${telemetry.remainingMin} menit tersisa). ` +
              `Perintah OFF stale diabaikan untuk mencegah pemadaman paksa.`
            );
            this.pendingVerifications.delete(tableId);
            return;
          }

          // 🛡️ MATCH LOGIC v16.0: Perbaikan untuk ESPNOW_NODE
          // Token di ESP-NOW bisa berbeda karena timing mesh — lightState saja cukup.
          // Untuk non-ESPNOW (WiFi langsung), tetap enforce token agar presisi.
          const isEspNow = telemetry?.hwType === 'ESPNOW_NODE' || cmd.table.hardwareType === 'ESPNOW_NODE';
          const isMatch = telemetry &&
            (telemetry.lightState === cmd.targetState) &&
            (
              cmd.targetToken === 0 ||
              String(telemetry.token) === String(cmd.targetToken) ||
              isEspNow || // ESPNOW_NODE: lightState match = cukup konfirmasi
              (cmd.attempts >= 1) // Non-ESPNOW: setelah 1 retry, lightState cukup
            );

          if (isMatch) {
            this.logger.log(`[VERIFY-OK] ✅ Meja ${tableId} Terverifikasi Sinkron (Token: ${cmd.targetToken})`);
            this.pendingVerifications.delete(tableId);
          } else if (now - cmd.lastSent > 8000) {
            // Jika sudah 8 detik (naik dari 5s) belum sinkron → RETRY
            // Toleransi lebih panjang untuk mesh ESP-NOW yang membutuhkan waktu propagasi
            if (cmd.attempts < 5) { // 5x percobaan (naik dari 3x) = total ~40 detik toleransi
              const logLevel = cmd.attempts >= 3 ? 'warn' : 'log';
              this.logger[logLevel](
                `[RETRY-SYNC] 🔄 Meja ${tableId} tidak sinkron! ` +
                `Mengirim ulang perintah ${cmd.targetState ? 'ON' : 'OFF'} ` +
                `(Token: ${cmd.targetToken}) [Percobaan ${cmd.attempts + 1}/5]`
              );

              const topicMac = this.getEffectiveMqttMac(cmd.table);
              this.mqttService.publishLightCommand(
                topicMac, cmd.table.id, cmd.targetState, cmd.table.relayPin,
                0, false, true, { token: cmd.targetToken },
                cmd.table.hardwareType,
                'SmartVerificationLoop'
              );

              cmd.attempts++;
              cmd.lastSent = now;
            } else {
              // Setelah 5x gagal: tampilkan WARNING di UI saja, TIDAK kirim perintah lagi
              this.logger.error(`[VERIFY-FAIL] ❌ Meja ${tableId} GAGAL SINKRON setelah 5x percobaan! Hubungi teknisi.`);
              this.billiardGateway.broadcastWarning(
                "Gagal Sinkron",
                `Meja ${cmd.table.tableName} tidak merespon perintah otomatis. Periksa koneksi unit di lapangan!`,
                tableId
              );
              this.pendingVerifications.delete(tableId);
            }
          }
        });
      }, 10000); // 10 Detik interval agar tidak spamming jika hardware telat lapor


    } catch (err) {
      this.logger.warn('Could not connect to MQTT Broker.');
    }
  }

  async getAllTables(): Promise<Table[]> {
    const cacheKey = 'billiard_all_tables';
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const tables = await this.tableRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    const tableIds = tables
      .filter((t) => t.status !== TableStatus.AVAILABLE)
      .map((t) => t.id);

    if (tableIds.length === 0) {
      const results = tables.map((t) => this.hydrateTable(t));
      await this.redisService.set(cacheKey, results, 2);
      return results;
    }

    const activeTransactions =
      await this.transactionService.getActiveTransactionsByTableIds(tableIds);
    const transactionMap = new Map();
    [...activeTransactions]
      .reverse()
      .forEach((tr) => transactionMap.set(tr.tableId, tr));

    const finalResults = tables.map((table) => {
      const transaction = transactionMap.get(table.id);
      if (transaction) {
        // Strip relations to avoid circularity during serialization
        const { table: _t, cafeTable: _ct, ...cleanTx } = transaction;
        table.activeTransaction = cleanTx;
        table.grandTotal = Number(transaction.grandTotal || 0);
      }
      return this.hydrateTable(table);
    });

    await this.redisService.set(cacheKey, finalResults, 2);
    return finalResults;
  }

  /**
   * 💧 HYDRATION (v17.2): Injeksi status real-time memori ke objek table
   * Berguna untuk memastikan data akurat saat refresh halaman (GET /tables)
   */
  private hydrateTable(table: any) {
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
      hwState: telemetry.lightState !== undefined
        ? (telemetry.lightState ? 'ON' : 'OFF')
        : (table.isLightOn ? 'ON' : 'OFF'),
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
   */
  async attachTransactionData(table: Table, options: { loadDeepRelations?: boolean } = { loadDeepRelations: true }): Promise<Table> {
    (table as any).type = 'billiard';
    if (table.status !== TableStatus.AVAILABLE) {
      const transaction =
        await this.transactionService.getActiveTransactionByTable(table.id, false, options);
      if (transaction) {
        // Strip back-references to avoid circularity crashes during WebSocket/MQTT serialization
        const { table: _t, cafeTable: _ct, ...cleanTx } = transaction;
        table.activeTransaction = cleanTx as any;
        table.grandTotal = Number(transaction.grandTotal || 0);
      }
    }
    return table;
  }

  async getTableById(id: number): Promise<Table | null> {
    const table = await this.tableRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!table) return null;
    await this.attachTransactionData(table);
    return this.hydrateTable(table) as any;
  }

  async getSuggestedMesaId(): Promise<number> {
    const result = await this.tableRepository
      .createQueryBuilder('table')
      .select('MAX(table.relayPin)', 'max')
      .getRawOne();

    const max = result?.max ? Number(result.max) : 0;
    return max + 1;
  }

  async createTable(tableData: Partial<Table>): Promise<Table> {
    const tableName = tableData.tableName?.trim();
    if (!tableName) throw new BadRequestException('Nama meja harus diisi.');

    const existing = await this.tableRepository
      .createQueryBuilder('table')
      .where('LOWER(table.tableName) = LOWER(:tableName)', { tableName })
      .getOne();
    if (existing)
      throw new BadRequestException(
        `Meja dengan nama "${tableName}" sudah ada.`,
      );

    const macAddress = this.normalizeMac(tableData.macAddress);
    if (macAddress) {
      const isPcf = tableData.hardwareType === HardwareType.PCF8575;

      if (isPcf) {
        // Mode PCF: Izinkan MAC sama, tapi kombinasi MAC + RelayPin (Channel) harus unik
        const macRelayExists = await this.tableRepository.findOne({
          where: { macAddress, relayPin: tableData.relayPin, deletedAt: IsNull() }
        });
        if (macRelayExists) {
          throw new BadRequestException(
            `Channel ${tableData.relayPin} pada MAC ${macAddress} sudah digunakan oleh ${macRelayExists.tableName}.`
          );
        }
      } else {
        // Mode MOC/Lainnya: 1 MAC = 1 Meja (Strict Uniqueness)
        const macExists = await this.tableRepository.findOne({
          where: { macAddress, deletedAt: IsNull() }
        });
        if (macExists) {
          throw new BadRequestException(
            `MAC Address ${macAddress} sudah digunakan oleh ${macExists.tableName}. Untuk panel PCF8575, ubah Tipe Hardware terlebih dahulu.`
          );
        }
      }
    }

    const table = this.tableRepository.create({
      ...tableData,
      tableName,
      macAddress,
    });
    const savedTable = await this.tableRepository.save(table);
    await this.clearAllTablesCache();
    this.clearMacCache();
    this.billiardGateway.broadcastTableUpdate({
      ...savedTable,
      type: 'billiard',
      _action: 'ADD',
    });
    return savedTable;
  }

  async updateTableStatus(
    id: number,
    status: TableStatus,
  ): Promise<Table | null> {
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

  async updateTable(id: number, data: Partial<Table>): Promise<Table> {
    const table = await this.getTableById(id);
    if (!table) throw new NotFoundException('Table not found');

    if (data.tableName) {
      const tableName = data.tableName.trim();
      const existing = await this.tableRepository
        .createQueryBuilder('table')
        .where(
          'LOWER(table.tableName) = LOWER(:tableName) AND table.id != :id',
          { tableName, id },
        )
        .getOne();
      if (existing)
        throw new BadRequestException(
          `Meja dengan nama "${tableName}" sudah ada.`,
        );
      table.tableName = tableName;
    }

    const macAddress = data.macAddress !== undefined ? this.normalizeMac(data.macAddress) : table.macAddress;
    const hardwareType = data.hardwareType || table.hardwareType;
    const relayPin = data.relayPin !== undefined ? data.relayPin : table.relayPin;

    if (macAddress && (macAddress !== table.macAddress || data.relayPin !== undefined || data.hardwareType !== undefined)) {
      const isPcf = hardwareType === HardwareType.PCF8575;

      if (isPcf) {
        // Mode PCF: Cek kombinasi MAC + Pin unik (kecuali dirinya sendiri)
        const macRelayExists = await this.tableRepository.findOne({
          where: { macAddress, relayPin, id: Not(id), deletedAt: IsNull() }
        });
        if (macRelayExists) {
          throw new BadRequestException(
            `Kombinasi MAC ${macAddress} dan Channel ${relayPin} sudah digunakan oleh ${macRelayExists.tableName}.`
          );
        }
      } else {
        // Mode MOC/Lainnya: MAC harus unik (kecuali dirinya sendiri)
        const macExists = await this.tableRepository.findOne({
          where: { macAddress, id: Not(id), deletedAt: IsNull() }
        });
        if (macExists) {
          throw new BadRequestException(
            `MAC Address ${macAddress} sudah digunakan oleh ${macExists.tableName}.`
          );
        }
      }
    }

    Object.assign(table, {
      ...data,
      tableName: data.tableName?.trim() || table.tableName,
      macAddress,
    });
    // Simpan perubahan ke database
    const savedTable = await this.tableRepository.save(table);

    // 🧹 Bersihkan MAC cache agar lookup heartbeat berikutnya fresh dari DB
    this.clearMacCache();
    this.logger.log(`[MAC-CACHE] Cache dibersihkan setelah update Meja ${savedTable.tableName}`);

    // Jika relayPin berubah & ada MAC Address → kirim /config/set ke ESP32
    // agar SPIFFS pada firmware langsung terupdate tanpa restart
    if (
      data.relayPin !== undefined &&
      data.relayPin !== null &&
      savedTable.macAddress &&
      savedTable.relayPin != null
    ) {
      const oldRelayPin = table.relayPin; // nilai sebelum save
      if (data.relayPin !== oldRelayPin) {
        this.logger.log(
          `[PIN UPDATE] Table ${savedTable.id} relayPin changed → sending config to ESP32 MAC:${savedTable.macAddress}`,
        );
        this.mqttService.publishPinConfig(
          this.getEffectiveMqttMac(savedTable),
          savedTable.relayPin,
        );
      }
    }

    await this.attachTransactionData(savedTable);
    await this.clearAllTablesCache();
    this.clearMacCache();
    this.billiardGateway.broadcastTableUpdate({
      ...savedTable,
      _action: 'UPDATE',
    });
    return savedTable;
  }

  async deleteTable(id: number): Promise<void> {
    const table = await this.getTableById(id);
    if (!table) throw new NotFoundException('Table not found');

    if (table.status !== TableStatus.AVAILABLE) {
      throw new BadRequestException(
        `Meja tidak bisa dihapus karena statusnya masih ${table.status}. Harap selesaikan sesi/pembayaran terlebih dahulu.`,
      );
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
      _action: 'DELETE',
    } as any);
  }

  // --- Package Management ---
  async getPackages(): Promise<BilliardPackage[]> {
    const now = Date.now();
    if (this.packagesCache && this.packagesCache.expiry > now) {
      return this.packagesCache.data;
    }

    const packages = await this.packageRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    this.packagesCache = {
      data: packages,
      expiry: now + 10000, // 10 seconds cache
    };

    return packages;
  }

  async createPackage(
    data: Partial<BilliardPackage>,
  ): Promise<BilliardPackage> {
    const pkg = this.packageRepository.create(data);
    const saved = await this.packageRepository.save(pkg);
    this.packagesCache = null; // Clear cache for immediate update
    return saved;
  }

  async updatePackage(
    id: number,
    data: Partial<BilliardPackage>,
  ): Promise<BilliardPackage> {
    const pkg = await this.packageRepository.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');

    Object.assign(pkg, data);
    const updated = await this.packageRepository.save(pkg);
    this.packagesCache = null; // Clear cache for immediate update
    return updated;
  }

  async deletePackage(id: number): Promise<void> {
    const pkg = await this.packageRepository.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');

    await this.packageRepository.delete(id);
    this.packagesCache = null; // Clear cache for immediate update
  }

  async toggleLight(id: number, isOn: boolean): Promise<Table | null> {
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
      if (last && (now - last.time < 800) && last.state === isOn) {
        this.logger.debug(`[ANTI-SPAM] 🛑 Skip toggleLight (${isOn ? 'ON' : 'OFF'}) untuk meja ${id} (Cooldown 800ms)`);
        return table;
      }
      this.lastCommandAt.set(id, { time: now, state: isOn });

      table.isLightOn = isOn;
      const savedTable = await this.tableRepository.save(table);
      await this.attachTransactionData(savedTable);

      // 🛡️ SET TECHNICAL OVERRIDE LOCK (v18.5)
      // Cegah billing logic meng-auto-off meja ini selama 60 detik
      this.technicalOverrides.set(id, now + 60000);

      const topicMac = this.getEffectiveMqttMac(table);
      const result = this.mqttService.publishLightCommand(
        topicMac,
        table.id,
        isOn,
        table.relayPin,
        isOn ? 1440 : 0, // 🛡️ 24H duration for manual ON, 0 for manual OFF
        false,
        true,
        { targetMac: table.macAddress },
        table.hardwareType,
        'toggleLight'
      );

      // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
      this.commandLocks.set(id, Date.now() + 5000);

      // 🛡️ DAFTARKAN UNTUK VERIFIKASI (v15.2)
      const token = (result as any).token || 0;
      this.pendingVerifications.set(table.id, {
        targetState: isOn,
        targetToken: token,
        attempts: 1,
        lastSent: Date.now(),
        table: savedTable
      });

      await this.clearAllTablesCache();
      this.clearMacCache();
      this.billiardGateway.broadcastTableUpdate(savedTable);
      return savedTable;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  async pingTable(id: number): Promise<{
    success: boolean;
    topic: string;
    sentAt: string;
    table: Partial<Table>;
  }> {
    const table = await this.getTableById(id);
    if (!table) throw new NotFoundException(`Table ${id} not found`);

    const topicMac = this.getEffectiveMqttMac(table);
    const mesaId = table.relayPin ? parseInt(String(table.relayPin).replace(/\D/g, '')) : table.id;
    const result = this.mqttService.pingTable(topicMac, mesaId);

    this.logger.log(
      `Ping sent to table ${table.tableName} (mac: ${topicMac}), topic: ${result.topic}`,
    );

    // Also broadcast a real-time notification via WebSocket so operators can see it
    await this.clearAllTablesCache();
    this.clearMacCache();

    const hydratedTable = this.hydrateTable(table);
    this.billiardGateway.broadcastTableUpdate({
      ...hydratedTable,
      type: 'billiard',
      _action: 'PING_SENT',
      _pingTopic: result.topic,
      _pingAt: result.sentAt,
    } as any);

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
        status: table.status,
      },
    };
  }

  async testGpioPin(id: number, pin: number, isOn: boolean): Promise<any> {
    const table = await this.getTableById(id);
    if (!table) throw new NotFoundException(`Table ${id} not found`);

    const topicMac = this.getEffectiveMqttMac(table);
    const result = this.mqttService.publishGpioCommand(topicMac, pin, isOn);

    this.logger.log(
      `GPIO Test sent to table ${table.tableName} (mac: ${topicMac}), Pin: ${pin}, Status: ${isOn ? 'ON' : 'OFF'}`,
    );

    return {
      success: true,
      pin,
      status: isOn ? 'ON' : 'OFF',
      sentAt: result.sentAt,
      topic: result.topic,
    };
  }

  async rebootEsp32(id: number): Promise<any> {
    const table = await this.getTableById(id);
    if (!table) throw new NotFoundException(`Table ${id} not found`);

    const macOrId = table.macAddress || String(table.id);
    const result = this.mqttService.publishSystemCommand(macOrId, 'REBOOT');

    this.logger.log(
      `REBOOT command sent to table ${table.tableName} (mac: ${macOrId})`,
    );

    return {
      success: true,
      message: 'Reboot command sent',
      sentAt: result.sentAt,
    };
  }

  async startSession(
    tableId: number,
    type: 'prepaid' | 'open',
    durationMinutes?: number,
    customerName?: string,
    packageId?: number,
    customPriceSettings?: { basePrice: number; timeSlots: any[] },
    promoId?: number,
    userId?: number,
    userName?: string,
    memberId?: number,
    idempotencyKey?: string,
  ) {
    // ── IDEMPOTENCY: check cache ───────────────────────────────────
    if (idempotencyKey) {
      const cached = await this.redisService.getIdempotency(idempotencyKey);
      if (cached) return cached;
    }

    // ── MUTEX: cegah double-start untuk meja yang sama ─────────────
    const lockKey = `table_start_${tableId}`;
    const acquired = await this.redisService.acquireLock(lockKey, 5000);
    if (!acquired) {
      this.logger.warn(
        `startSession: Table ${tableId} sudah dalam proses start (Redis Lock), diabaikan.`,
      );
      return null;
    }
    // ─────────────────────────────────────────────────────────────
    try {
      // 🛡️ STOP ANY BACKGROUND RETRY IMMEDIATELY (v17.3)
      this.pendingVerifications.delete(tableId);

      this.logger.log(
        `BilliardService.startSession called for tableId: ${tableId}, customer: ${customerName}, memberId: ${memberId}, packageId: ${packageId}`,
      );
      const table = await this.getTableById(tableId);

      if (!table) {
        this.logger.warn(`Table ${tableId} NOT FOUND`);
        return null;
      }

      if (table.status !== TableStatus.AVAILABLE) {
        this.logger.warn(
          `Table ${tableId} is NOT AVAILABLE (Status: ${table.status}). Aborting startSession.`,
        );
        return null;
      }

      // 1 Member 1 Table Locking System
      if (memberId) {
        const activeSession = await this.tableRepository.findOne({
          where: { memberId, status: Not(TableStatus.AVAILABLE) },
        });
        if (activeSession && activeSession.id !== tableId) {
          throw new ConflictException(
            `Member ini sedang digunakan di Meja ${activeSession.tableName}. Harap selesaikan sesi sebelumnya.`,
          );
        }
      }

      let selectedPackage: BilliardPackage | null = null;
      let selectedPromo: any = null;

      if (promoId) {
        const activePromos = await this.promoService.getActivePromos();
        selectedPromo = activePromos.find((p) => p.id === promoId);
        if (
          selectedPromo &&
          (selectedPromo.type === PromoType.PACKAGE ||
            selectedPromo.type === PromoType.BUNDLE)
        ) {
          durationMinutes = selectedPromo.ruleJson.requireBilliardMinutes;
          type = 'prepaid';
        }
      } else if (packageId) {
        selectedPackage = await this.packageRepository.findOne({
          where: { id: packageId },
        });
        if (selectedPackage) {
          if (
            selectedPackage.type === PackageType.FIXED ||
            selectedPackage.type === PackageType.DURATION ||
            selectedPackage.type === PackageType.PLAYTIME
          ) {
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
      table.status = TableStatus.IN_USE;
      table.isLightOn = true;
      table.sessionType = type;
      table.startTime = new Date();
      table.memberId = memberId || null;
      table.packageId = packageId || null;
      table.remainingMinutes = null;

      if (type === 'prepaid' && durationMinutes) {
        table.endTime = new Date(
          table.startTime.getTime() + durationMinutes * 60000,
        );
        table.remainingMinutes = durationMinutes;

        const globalSettings = await this.settingsService.getSettings();
        const threshold = globalSettings.endingSoonThreshold || 5;
        if (durationMinutes <= threshold) table.status = TableStatus.WARNING;
      }

      // --- 2. CALCULATE PRICING ---
      let fareName = type === 'prepaid' ? 'Custom Session' : 'Open Table';
      let sessionPrice = 0;

      if (selectedPromo) {
        fareName = selectedPromo.name;
        sessionPrice = Number(selectedPromo.ruleJson.fixedPrice) || 0;
      } else if (selectedPackage) {
        fareName = selectedPackage.name;
        const activeRate =
          this.transactionService.calculateCurrentPackagePrice(selectedPackage);
        sessionPrice =
          selectedPackage.type === PackageType.FIXED
            ? activeRate
            : (durationMinutes! / 60) * activeRate;
      } else if (type === 'prepaid' && durationMinutes) {
        const globalSettings = await this.settingsService.getSettings();
        const customConfig =
          table.category === 'VIP'
            ? globalSettings.customDurationPricingVip
            : globalSettings.customDurationPricingRegular;
        if (customConfig) {
          const activeRate =
            this.transactionService.calculateCurrentPackagePrice({
              price: customConfig.basePrice,
              timeSlots: customConfig.timeSlots,
            });
          sessionPrice = (durationMinutes / 60) * activeRate;
        }
      }

      table.activePackagePrice = sessionPrice > 0 ? sessionPrice : null;

      // --- 3. CREATE/UPDATE TRANSACTION ---
      let transaction =
        await this.transactionService.getActiveTransactionByTable(
          tableId,
          true,
        );
      if (!transaction) {
        transaction = await this.transactionService.createTransaction(
          tableId,
          userId,
          undefined,
          packageId,
          fareName,
        );
      }

      let finalCustomerName = customerName;
      if (
        memberId &&
        (!finalCustomerName ||
          finalCustomerName === 'Tamu' ||
          finalCustomerName === 'Customer')
      ) {
        const member = await this.memberService.getMemberById(memberId);
        if (member) finalCustomerName = member.name;
      }
      if (!finalCustomerName) {
        finalCustomerName =
          table.isBooked && table.bookedByName ? table.bookedByName : 'Tamu';
      }

      // Sync all info to transaction in one go + Recalculate Totals
      transaction = await this.transactionService.updateTransaction(
        transaction.id,
        {
          customerName: finalCustomerName,
          fareName,
          startTime: table.startTime,
          sessionType: type,
          memberId: (memberId || null) as any,
          packageId: (packageId || null) as any,
          billiardTotal: sessionPrice,
        },
      );

      // Handle Booking check-in
      if (table.isBooked) {
        if (table.bookedByWaitingId)
          await this.waitingListService.checkIn(table.bookedByWaitingId);
        table.isBooked = false;
        table.bookedByWaitingId = null as any;
        table.bookedByName = null as any;
      }

      // --- 4. AUTO-DEBIT (Prepaid Member) ---
      if (type === 'prepaid' && memberId && sessionPrice > 0) {
        try {
          await this.transactionService.processMultiPayerPayment(
            transaction.id,
            {
              orderItemIds: [],
              payerName: finalCustomerName,
              paymentMethod: 'MEMBER',
              billiardPortion: sessionPrice,
            },
            userId,
          );
        } catch (err) {
          this.logger.error(`AUTO-DEBIT FAILED: ${err.message}`);
          this.billiardGateway.broadcastWarning(
            'Gagal Potong Saldo',
            `Session gagal: ${err.message}`,
            tableId,
          );
          throw err;
        }
      }

      // --- 5. AUTO-ORDER (Promo Bundle) ---
      if (
        selectedPromo &&
        selectedPromo.ruleJson.requireMenuItems?.length > 0
      ) {
        const itemsToOrder = selectedPromo.ruleJson.requireMenuItems.map(
          (item: any, idx: number) => ({
            id: item.id,
            quantity: item.quantity,
            note: `Promo Bundle: ${selectedPromo.name}`,
            customName: idx === 0 ? `[PAKET] ${selectedPromo.name}` : undefined,
            priceOverride: 0,
          }),
        );
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
        this.aiService
          .updateSoldQuantities(
            0,
            transaction.businessDayId,
            1,
            transaction.id,
            tableId,
            (packageId || table.packageId) as number,
            userId,
            promoId,
          )
          .catch((err) =>
            this.logger.error(`AI Tracking Error (Billiard): ${err.message}`),
          );
      }

      if (userName) {
        const details = `Mulai meja ${table.tableName} (${fareName}) - Tamu: ${finalCustomerName}`;
        await this.reportService.logAction(
          'START_SESSION',
          userName,
          details,
          tableId,
        );
      }

      if (table.macAddress) {
        const topicMac = this.getEffectiveMqttMac(table);
        // 🛡️ Play Time (Open) Fix: Kirim 1440m (24 jam) alih-alih 0 agar tidak auto-OFF (v18.5)
        const durationToEsp = type === 'open' ? 1440 : (durationMinutes || 0);

        // Clear any technician override since a real session has started
        this.technicalOverrides.delete(table.id);

        const result = this.mqttService.publishLightCommand(
          topicMac,
          table.id,
          true,
          table.relayPin,
          durationToEsp,
          false,
          true, // force = true
          {},
          table.hardwareType,
          'startSession'
        );

        // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
        this.commandLocks.set(tableId, Date.now() + 5000);

        // 🛡️ DAFTARKAN UNTUK VERIFIKASI (v15.2)
        const token = (result as any).token || 0;
        this.pendingVerifications.set(table.id, {
          targetState: true,
          targetToken: token,
          attempts: 1,
          lastSent: Date.now(),
          table: savedTable
        });
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
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  async stopSession(
    tableId: number,
    userId?: number,
    userName?: string,
    idempotencyKey?: string,
  ) {
    // ── IDEMPOTENCY: check cache ───────────────────────────────────
    if (idempotencyKey) {
      const cached = await this.redisService.getIdempotency(idempotencyKey);
      if (cached) return cached;
    }

    // ── MUTEX: distributed lock ────────────────────────────────────
    const lockKey = `table_stop_${tableId}`;
    const acquired = await this.redisService.acquireLock(lockKey, 5000);
    if (!acquired) {
      this.logger.warn(
        `stopSession: Table ${tableId} is already stopping (Redis Lock), skipping.`,
      );
      return null;
    }
    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    try {
      this.pendingVerifications.delete(tableId);
      const table = await this.getTableById(tableId);
      if (!table) return null;

      // Create session record if session was active
      this.logger.log(
        `Stopping session for table ${tableId}. Type: ${table.sessionType}, ActivePrice: ${table.activePackagePrice}`,
      );
      if (table.startTime && table.sessionType) {
        const session = this.sessionRepository.create({
          table: table,
          sessionType: table.sessionType,
          startTime: table.startTime,
          endTime: new Date(),
          durationMinutes: Math.round(
            (new Date().getTime() - table.startTime.getTime()) / 60000,
          ),
          memberId: table.memberId ?? undefined,
        } as any) as unknown as Session;
        const savedSession = await this.sessionRepository.save(session);

        // Update transaction total (Billiard)
        let billiardCost = 0;
        let billingDetails: any = null;

        const transaction =
          await this.transactionService.getActiveTransactionByTable(
            tableId,
            true,
          );

        if (table.sessionType === 'open') {
          let pkg: any = {};
          if (table.packageId) {
            pkg =
              (await this.packageRepository.findOne({
                where: { id: table.packageId },
              })) || {};
          } else {
            const packages = await this.getPackages();
            pkg = packages.find(
              (p) =>
                (p.type === PackageType.HOURLY ||
                  p.type === PackageType.PLAYTIME) &&
                p.tableCategory === table.category,
            );
            if (!pkg)
              pkg = packages.find(
                (p) =>
                  p.type === PackageType.HOURLY ||
                  p.type === PackageType.PLAYTIME,
              );
            if (!pkg) pkg = { minutePrice: 50000 / 60 };
          }

          const pricing = this.transactionService.calculateTimeBasedPrice(
            table.startTime,
            new Date(),
            pkg,
          );
          billiardCost = pricing.total;
          billingDetails = pricing.details;
        } else if (table.sessionType === 'prepaid') {
          // FOR PREPAID: Use the activePackagePrice (which includes extensions) as the absolute cost.
          billiardCost = Number(table.activePackagePrice || 0);

          let pkgDuration = session.durationMinutes;
          let pkgName = '';
          if (table.packageId) {
            const pkg = await this.packageRepository.findOneBy({
              id: table.packageId,
            });
            if (pkg) {
              pkgDuration = pkg.durationMinutes || pkgDuration;
              pkgName = pkg.name;
            }
          }

          billingDetails = {
            title: pkgName || transaction?.fareName || 'Prepaid Session',
            duration: pkgDuration,
            subtotal: billiardCost,
          };
        } else {
          billiardCost = Number(table.activePackagePrice || 0);
        }

        // Only enforce 1 hour minimum for OPEN tables here as a safety fallback
        if (
          (billiardCost === 0 || billiardCost === null) &&
          table.startTime &&
          table.sessionType === 'open'
        ) {
          const elapsedMs = new Date().getTime() - table.startTime.getTime();
          const elapsedMin = Math.max(60, Math.ceil(elapsedMs / 60000));
          const packages = await this.getPackages();
          const hourlyRate =
            packages.find((p) => p.type === PackageType.HOURLY)?.price || 50000;
          billiardCost = (elapsedMin / 60) * Number(hourlyRate);
        }

        billiardCost = Math.round(billiardCost);

        if (transaction) {
          let durationSecs = Math.floor(
            (session.endTime.getTime() - session.startTime.getTime()) / 1000,
          );
          if (
            table.sessionType === 'prepaid' &&
            table.startTime &&
            table.endTime
          ) {
            const diffMs = table.endTime.getTime() - table.startTime.getTime();
            durationSecs = Math.floor(diffMs / 1000);
          }

          const hours = Math.floor(durationSecs / 3600);
          const minutes = Math.floor((durationSecs % 3600) / 60);
          const seconds = durationSecs % 60;

          const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

          const fareNameLabel = table.packageId
            ? (
              await this.packageRepository.findOne({
                where: { id: table.packageId },
              })
            )?.name
            : transaction.fareName || 'Open Table';

          // Force a full totals recalculation (Grand Total = Billiard + SC + VAT - Discounts)
          // Using setBilliardTotal ensures the transaction.grandTotal is accurate before we attempt AUTO-DEBIT.
          // For PREPAID: We do NOT append a summary item because the breakdown was already
          // created by startSession and extendSession. We only sync the final total and end time.
          // For OPEN: We append the calculated details breakdown.
          const finalSyncDetails =
            table.sessionType === 'prepaid'
              ? undefined
              : {
                title: fareNameLabel || 'Open Table',
                duration: session.durationMinutes,
                subtotal: billiardCost,
                startTimeFormatted: (table.startTime || transaction.startTime)
                  ?.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  .replace(/:/g, '.'),
                endTimeFormatted: session.endTime
                  .toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  .replace(/:/g, '.'),
              };

          await this.transactionService.setBilliardTotal(
            transaction.id,
            billiardCost,
            finalSyncDetails,
            userName,
            session.endTime,
            true, // skipBroadcast: true (Interim Update)
          );

          // --- AUTO-DEBIT: Potong Saldo Otomatis untuk Member (Open Table/Hourly) ---
          if ((table as any).memberId) {
            try {
              const updatedTrans =
                await this.transactionService.getTransactionById(
                  transaction.id,
                );

              // Calculate unpaid items
              const unpaidItemIds = (updatedTrans.orderItems || [])
                .filter((i) => !i.isPaid && i.status !== 'CANCELLED')
                .map((i) => i.id);

              // Calculate total unpaid amount
              const unpaidAmount =
                Number(updatedTrans.grandTotal || 0) -
                Number(updatedTrans.paidAmount || 0);

              if (unpaidAmount > 0) {
                await this.transactionService.processMultiPayerPayment(
                  transaction.id,
                  {
                    orderItemIds: unpaidItemIds,
                    payerName: updatedTrans.customerName || 'Member',
                    paymentMethod: 'MEMBER',
                    billiardPortion: Number(updatedTrans.billiardTotal || 0),
                  },
                  userId,
                );

                this.logger.log(
                  `AUTO-DEBIT STOP: Member ${table.memberId} settled Rp ${unpaidAmount} for table ${tableId}`,
                );
              }

              // DO NOT set to AVAILABLE here. Let it transition to WAITING_PAYMENT
              // table.status = TableStatus.AVAILABLE;
              // table.memberId = null;

              // Final Notification after settlement (NON-BLOCKING)
              const finalSnap =
                await this.transactionService.getTransactionById(
                  transaction.id,
                );
              this.memberService.sendSessionCompletionNotification(
                finalSnap.memberId!,
                {
                  tableName: table.tableName,
                  duration: finalSnap.sessionDuration,
                  billiardTotal: Number(finalSnap.billiardTotal || 0),
                  cafeTotal: Number(finalSnap.cafeTotal || 0),
                  grandTotal: Number(finalSnap.grandTotal || 0),
                  orderItems: finalSnap.orderItems || [],
                  awardedPoints: Number(finalSnap.awardedPoints || 0),
                },
              ).catch(e => this.logger.error(`Session Completion WA Failed: ${e.message}`));
            } catch (err) {
              this.logger.error(
                `AUTO-DEBIT STOP FAILED for table ${tableId}: ${err.message}`,
              );
              if (
                err.status === 402 ||
                err.message?.includes('Saldo tidak cukup')
              ) {
                this.billiardGateway.broadcastWarning(
                  'Saldo Kurang',
                  `Gagal pelunasan otomatis untuk meja ${table.tableName}. Saldo member tidak cukup.`,
                  tableId,
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
            tableId,
          );
        }
      }

      // Re-fetch the table to ensure we do not overwrite a status transition
      // that happened during auto-debit (like WAITING_PAYMENT -> AVAILABLE)
      const freshTable = await this.tableRepository.findOne({
        where: { id: tableId },
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
      if (table.status !== TableStatus.AVAILABLE) {
        finalTrans = await this.transactionService.getActiveTransactionByTable(
          tableId,
          true,
        );
        if (finalTrans) {
          // Use a 1-IDR tolerance for floating point / rounding issues
          const unpaidAmount =
            Number(finalTrans.grandTotal || 0) -
            Number(finalTrans.paidAmount || 0);
          if (
            unpaidAmount <= 1 ||
            finalTrans.status === TransactionStatus.PAID
          ) {
            isFullyPaid = true;
          }
        }

        if (isFullyPaid) {
          table.status = TableStatus.AVAILABLE;
          table.sessionType = null;
          table.startTime = null;
          table.endTime = null;
          table.memberId = null;
          table.packageId = null;
          table.activePackagePrice = null;
          table.remainingMinutes = null;

          if (finalTrans && finalTrans.status !== TransactionStatus.PAID) {
            await this.transactionService.updateTransaction(finalTrans.id, {
              status: TransactionStatus.PAID,
              endTime: new Date(), // Record final end time
            });
          }
        } else if (finalTrans && finalTrans.status === TransactionStatus.PAID) {
          // Safety: if transaction is PAID but calculation has tiny discrepancy
          table.status = TableStatus.AVAILABLE;
          table.sessionType = null;
          table.startTime = null;
          table.endTime = null;
          table.memberId = null;
          table.packageId = null;
          table.activePackagePrice = null;
          table.remainingMinutes = null;
        } else {
          table.status = TableStatus.WAITING_PAYMENT;
        }
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
          savedTable.activeTransaction?.invoiceNumber,
        );
      }

      if (table.macAddress) {
        const topicMac = this.getEffectiveMqttMac(table);
        const result = this.mqttService.publishLightCommand(
          topicMac,
          table.id,
          false,
          table.relayPin,
          0, // duration 0 (OFF)
          false,
          true, // force
          {},
          table.hardwareType,
          'stopSession'
        );

        // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
        this.commandLocks.set(tableId, Date.now() + 5000);

        // 🛡️ DAFTARKAN UNTUK VERIFIKASI (v15.2)
        const token = (result as any).token || 0;
        this.pendingVerifications.set(table.id, {
          targetState: false,
          targetToken: token,
          attempts: 1,
          lastSent: Date.now(),
          table: savedTable
        });
      }

      await this.clearAllTablesCache();
      this.clearMacCache();
      const res = savedTable;
      if (idempotencyKey) {
        await this.redisService.setIdempotency(idempotencyKey, res);
      }
      this.billiardGateway.broadcastTableUpdate(savedTable);
      return res;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  private cronRunning = false;

  @Cron('*/15 * * * * *')
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
          { status: TableStatus.IN_USE, sessionType: 'prepaid', deletedAt: IsNull() },
          { status: TableStatus.WARNING, sessionType: 'prepaid', deletedAt: IsNull() },
        ],
      });

      if (prepaidTables.length > 0) {
        this.logger.log(`handleCron: Processing ${prepaidTables.length} prepaid tables...`);
      }
      const prepaidTableIds = prepaidTables.map(t => t.id);
      const prepaidTxs = prepaidTableIds.length > 0
        ? await this.transactionService.getActiveTransactionsByTableIds(prepaidTableIds, { loadDeepRelations: false })
        : [];
      const prepaidTxMap = new Map(prepaidTxs.map(tx => [tx.tableId, tx]));

      await Promise.allSettled(
        prepaidTables.map(async (table) => {
          try {
            this.logger.log(
              `handleCron: Processing prepaid table ${table.tableName}...`,
            );
            if (table.endTime && now >= table.endTime) {
              // ⏱️ Time expired → AUTO-STOP → WAITING_PAYMENT
              this.logger.warn(`[AUTO-STOP] ⏰ Meja ${table.tableName} waktu habis. Mengalihkan ke WAITING_PAYMENT...`);
              const isBusy =
                (await this.redisService.get(`lock:cutoff_${table.id}`)) ||
                (await this.redisService.get(`lock:table_stop_${table.id}`)) ||
                (await this.redisService.get(`lock:table_start_${table.id}`)) ||
                (await this.redisService.get(`lock:table_extend_${table.id}`));

              if (!isBusy) {
                await this.stopSession(table.id, undefined, 'Sistem (Auto-Cutoff Prepaid)');
              }
            } else if (table.endTime) {
              // Check if approaching expiration within the next 15 seconds for precise scheduling
              const diffMs = table.endTime.getTime() - now.getTime();
              if (
                diffMs <= 15000 &&
                !(await this.redisService.get(`lock:cutoff_${table.id}`))
              ) {
                this.logger.log(
                  `Table ${table.id} PREPAID approaching cutoff in ~${(diffMs / 1000).toFixed(1)}s. Scheduling precise stop.`,
                );

                await this.redisService.acquireLock(
                  `cutoff_${table.id}`,
                  20000,
                );
                setTimeout(async () => {
                  try {
                    const checkTable = await this.tableRepository.findOne({
                      where: { id: table.id },
                    });
                    // Only stop if still in use/warning and hasn't been extended/stopped in the meantime
                    if (
                      checkTable &&
                      [TableStatus.IN_USE, TableStatus.WARNING].includes(
                        checkTable.status,
                      ) &&
                      checkTable.endTime &&
                      new Date() >= checkTable.endTime
                    ) {
                      await this.stopSession(
                        table.id,
                        undefined,
                        'Sistem (Auto-Cutoff Prepaid)',
                      );
                    }
                  } catch (e) {
                    this.logger.error(
                      `Error during precise prepaid cutoff: ${e.message}`,
                    );
                  } finally {
                    await this.redisService.releaseLock(
                      `lock:cutoff_${table.id}`,
                    );
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

              if (
                remaining <= threshold &&
                table.status !== TableStatus.WARNING
              ) {
                this.logger.warn(`[ENDING-SOON] 🟠 Meja ${table.tableName} sisa ${remaining} menit (threshold: ${threshold}). Status → WARNING (Orange).`);
                table.status = TableStatus.WARNING;
                statusChanged = true;
              } else if (
                remaining > threshold &&
                table.status === TableStatus.WARNING
              ) {
                table.status = TableStatus.IN_USE;
                statusChanged = true;
              }

              if (statusChanged) {
                await this.tableRepository.update(table.id, {
                  remainingMinutes: table.remainingMinutes,
                  status: table.status
                });

                // Fetch the transaction from map instead of attachTransactionData(saved)
                const tx = prepaidTxMap.get(table.id);
                const tableWithTx = { ...table, activeTransaction: tx };

                await this.clearAllTablesCache();
                this.clearMacCache();
                this.billiardGateway.broadcastTableUpdate(tableWithTx);
              }
            }
          } catch (e) {
            this.logger.error(
              `Error processing prepaid table ${table.id}: ${e.message}`,
            );
          }
        }),
      );

      // this.logger.log(`handleCron: [3/3] Fetching member open tables...`);
      // 2. Handle Member Open Table Auto-Cutoff (Precision Billing)
      const openTablesWithMember = await this.tableRepository.find({
        where: {
          status: TableStatus.IN_USE,
          sessionType: 'open',
          memberId: Not(IsNull()),
          deletedAt: IsNull(),
        },
      });

      if (openTablesWithMember.length > 0) {
        this.logger.log(`handleCron: Processing ${openTablesWithMember.length} member tables...`);
      }
      if (openTablesWithMember.length > 0) {
        const tableIds = openTablesWithMember.map((t) => t.id);
        const memberIds = openTablesWithMember.map((t) => t.memberId!).filter(id => id);

        // Batch fetch all active transactions for these tables
        const activeTxs = await this.transactionService.getActiveTransactionsByTableIds(tableIds, { loadDeepRelations: false });
        const txMap = new Map(activeTxs.map((tx) => [tx.tableId, tx]));

        // Batch fetch all relevant members
        const members = await this.memberRepository.find({
          where: { id: In(memberIds) },
          relations: ['tier'],
        });
        const memberMap = new Map<number, Member>(members.map((m) => [m.id, m]));

        await Promise.allSettled(
          openTablesWithMember.map(async (table) => {
            try {
              this.logger.log(
                `handleCron: Processing member table ${table.tableName}...`,
              );
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
                this.logger.warn(
                  `Member ${member.name} reached balance buffer. Cutting off table ${table.id}`,
                );

                // Broadcast one last warning before stopping
                this.billiardGateway.broadcastWarning(
                  'Saldo Habis',
                  `Sesi meja ${table.tableName} dihentikan karena saldo member ${member.name} sudah mencapai batas minimum.`,
                  table.id,
                );

                await this.stopSession(
                  table.id,
                  undefined,
                  'Sistem (Auto-Cutoff Saldo)',
                );
              } else {
                // Check if they will run out of balance within the next 30 seconds (before next cron tick)
                // We can estimate the burn rate.
                let pkg: any = {};
                if (table.packageId) {
                  pkg = allPackages.find(p => p.id === table.packageId) || {};
                } else {
                  pkg = allPackages.find(
                    (p) =>
                      (p.type === PackageType.HOURLY ||
                        p.type === PackageType.PLAYTIME) &&
                      p.tableCategory === table.category,
                  );
                }
                const ratePerHour = Number(pkg?.minutePrice || 50000 / 60) * 60;
                const costPerSecond = ratePerHour / 3600;

                if (costPerSecond > 0) {
                  const usableAmount =
                    memberBalance - remainingToPay - balanceBuffer;
                  const remainingSeconds = usableAmount / costPerSecond;

                  if (remainingSeconds <= 32) {
                    this.logger.log(
                      `Table ${table.id} Open Table approaching cutoff in ~${remainingSeconds.toFixed(1)}s (Balance: Rp${memberBalance}, Remaining Unpaid: Rp${remainingToPay})`,
                    );

                    await this.redisService.acquireLock(
                      `lock:cutoff_${table.id}`,
                      20000,
                    );
                    const msDelay = Math.max(
                      0,
                      Math.floor(remainingSeconds * 1000),
                    );

                    setTimeout(async () => {
                      try {
                        this.logger.warn(
                          `Executing Precise Timer Cutoff for table ${table.id}`,
                        );
                        await this.stopSession(
                          table.id,
                          undefined,
                          'Sistem (Auto-Cutoff Saldo)',
                        );
                      } catch (e) {
                        this.logger.error(
                          `Error during delayed cutoff: ${e.message}`,
                        );
                      } finally {
                        await this.redisService.releaseLock(
                          `lock:cutoff_${table.id}`,
                        );
                      }
                    }, msDelay);
                  }

                  // 3. LOW BALANCE WARNING (Before Cutoff)
                  // If balance is enough for > buffer but < e.g. 15 minutes, send one-shot WA warning
                  const warningMinutes =
                    globalSettings.balanceWarningMinutes || 15;
                  const warningBuffer = warningMinutes * 60 * costPerSecond;

                  if (usableAmount > 0 && usableAmount <= warningBuffer) {
                    const warningSentKey = `wa_warning_sent:${table.id}:${table.startTime.getTime()}`;
                    const alreadySent =
                      await this.redisService.get(warningSentKey);

                    if (!alreadySent) {
                      this.logger.log(
                        `Backgrounding Low Balance Warning to Member ${member.name} (Table ${table.tableName})`,
                      );
                      const remainingMin = Math.ceil(
                        usableAmount / (ratePerHour / 60),
                      );

                      const message =
                        `⚠️ *Peringatan Saldo Menipis*\n\n` +
                        `Halo ${member.name},\nsaldo member Anda saat ini tersisa sekitar *Rp ${memberBalance.toLocaleString('id-ID')}*.\n\n` +
                        `Estimasi sisa waktu bermain di Meja *${table.tableName}* adalah sekitar *${remainingMin} menit* lagi sebelum sistem menghentikan sesi secara otomatis.\n\n` +
                        `Silakan lakukan top-up di kasir jika ingin memperpanjang waktu bermain Anda. Terima kasih!`;

                      // 🛡️ NON-BLOCKING WA NOTIFICATION (v18.6)
                      // Fire-and-forget to prevent WA service from hanging the cron job
                      this.whatsappService
                        .sendMessage(member.phone, message)
                        .catch((err) =>
                          this.logger.error(
                            `Cron WA Warning Failed: ${err.message}`,
                          ),
                        );

                      await this.redisService.set(
                        warningSentKey,
                        'true',
                        3600 * 4,
                      ); // Expire in 4h
                    }
                  }
                }
              }
            } catch (e) {
              this.logger.error(
                `Error processing member table ${table.id}: ${e.message}`,
              );
            }
          }),
        );
      }
    } finally {
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
   */
  async pingAllTables(caller = 'SYSTEM') {
    this.logger.log(`[PING-ALL] [Caller: ${caller}] Requesting status from all tables...`);
    const tables = await this.tableRepository.find({
      where: { deletedAt: IsNull() },
    });

    tables.forEach((t) => {
      if (!t.macAddress) return;

      // ✅ Untuk ESPNOW_NODE, kirim ping ke Gateway MAC (Komandan) karena
      // Komandan-lah yang subscribe ke MQTT, bukan Prajurit secara langsung.
      const effectiveMac = this.getEffectiveMqttMac(t);

      // Gunakan relayPin sebagai tableId untuk ESPNOW_NODE agar Komandan bisa 
      // mencocokkannya dengan registry internalnya.
      const pingTableId = (t.hardwareType === 'ESPNOW_NODE' && t.relayPin)
        ? t.relayPin
        : t.id;

      this.mqttService.pingTable(effectiveMac, pingTableId);
      this.logger.debug(`[PING] Table ${t.tableName} → MAC: ${effectiveMac} (MesaId: ${pingTableId})`);
    });
  }

  async handleHeartbeat(tableId: number, telemetry?: any) {
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

    const updateData: any = {};
    if (telemetry?.ip) updateData.ipAddress = telemetry.ip;
    if (telemetry?.rssi !== undefined) updateData.rssi = telemetry.rssi;
    if (telemetry?.uptime !== undefined) updateData.uptime = telemetry.uptime;
    updateData.lastHeartbeat = new Date();

    // 🛡️ MANUAL OVERRIDE DETECTION (v15.3.3)
    const hwStatusMatch = hwStateReceived && (telemetry.lightState === table.isLightOn);
    const isPending = this.pendingVerifications.has(tableId);
    const shouldUpdateState = hwStateReceived && !hwStatusMatch && !isPending;

    if (now - lastUpdate > throttleMs || shouldUpdateState) {
      if (shouldUpdateState) {
        this.logger.log(`[MANUAL-OVERRIDE] 🔌 Meja ${table.tableName || tableId} berubah status secara manual menjadi ${telemetry.lightState ? 'ON' : 'OFF'}`);
        updateData.isLightOn = telemetry.lightState;
      }

      this.lastHeartbeatDbUpdate.set(tableId, now);
      await this.tableRepository.update(tableId, updateData);

      // Update cache and broadcast
      const updatedTable = await this.tableRepository.findOne({ where: { id: tableId, deletedAt: IsNull() } });
      if (updatedTable) {
        await this.attachTransactionData(updatedTable, { loadDeepRelations: false });
        await this.clearAllTablesCache(); // 🛡️ Ensure dashboard sync (v17.8)
        this.billiardGateway.broadcastTableUpdate(updatedTable);
      }
    }
  }

  @OnEvent('table.offline')
  async handleTableOffline(tableId: number) {
    this.logger.debug(`[EVENT] Table ${tableId} went offline - clearing cache.`);
    await this.clearAllTablesCache();
  }

  /**
   * Updates heartbeats for all tables associated with a MAC address.
   * Useful for multi-relay controllers or old-style MAC-topic WiFi nodes.
   */
  async handleHeartbeatByMac(mac: string, telemetry?: any) {
    const normalized = this.normalizeMac(mac);

    // ✅ v7.2: Use fast in-memory cache first
    const cachedId = this.espnowMacIdCache.get(normalized);
    if (cachedId) {
      return this.handleHeartbeat(cachedId, telemetry);
    }

    const tables = await this.getTablesByMac(mac);
    if (!tables || tables.length === 0) {
      if (!mac.startsWith('ESPNOW')) { // Don't spam for random bridge packets
        this.logger.warn(`Received heartbeat for unknown MAC: ${mac}`);
      }
      return;
    }

    // 🛡️ STRICT COLLISION RESOLUTION (v17.8)
    // If multiple tables share a MAC, only update 'active' tables or the first one.
    // This prevents unplugged tables from being marked online by their 'twins'.
    const activeTables = tables.filter(t => t.status !== TableStatus.AVAILABLE);
    const tablesToUpdate = activeTables.length > 0 ? activeTables : [tables[0]];

    if (tables.length > 1) {
      this.logger.warn(`[MAC-COLLISION] ⚠️ Detect ${tables.length} tables sharing MAC ${mac}: ${tables.map(t => t.tableName).join(', ')}`);
    }

    for (const table of tablesToUpdate) {
      await this.handleHeartbeat(table.id, telemetry);
    }
  }

  async rebootTable(tableId: number) {
    const table = await this.getTableById(tableId);
    if (!table || !table.macAddress)
      return { success: false, message: 'Table or MAC not found' };

    const topicMac = this.getEffectiveMqttMac(table);
    this.mqttService.publishSystemCommand(topicMac, 'REBOOT');
    return {
      success: true,
      message: `Reboot command sent to ${table.tableName}`,
    };
  }

  async emergencyStop(username: string) {
    const activeTables = await this.tableRepository.find({
      where: { isLightOn: true, deletedAt: IsNull() },
    });

    this.logger.warn(
      `EMERGENCY STOP TRIGGERED BY ${username}. Shutting down ${activeTables.length} tables.`,
    );

    for (const table of activeTables) {
      if (table.macAddress) {
        this.mqttService.publishLightCommand(
          table.macAddress,
          table.id,
          false,
          table.relayPin,
          0, // duration 0 (OFF)
          false,
          true, // force = true for emergency stop
          {},
          table.hardwareType,
        );
      }
    }

    // Log the event
    if (this.reportService) {
      await (this.reportService as any).logAction(
        'EMERGENCY_STOP',
        `Admin ${username} memicu EMERGENCY STOP untuk ${activeTables.length} meja.`,
        null,
        username,
      );
    }

    return {
      success: true,
      count: activeTables.length,
      message: `Emergency stop berhasil dikirim ke ${activeTables.length} meja.`,
    };
  }

  async switchSession(
    tableId: number,
    type: 'prepaid' | 'open',
    durationMinutes?: number,
  ) {
    const table = await this.getTableById(tableId);
    if (!table || table.status !== TableStatus.IN_USE) return null;

    this.logger.log(
      `Switching session for table ${tableId} from ${table.sessionType} to ${type}`,
    );

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
    const topicMac = this.getEffectiveMqttMac(table);
    const result = this.mqttService.publishLightCommand(
      topicMac,
      table.id,
      true,
      table.relayPin,
      durationMinutes || 0,
      false,
      true,
      {
        type,
        startTime: table.startTime
          ? table.startTime.toISOString()
          : new Date().toISOString(),
        endTime: table.endTime ? table.endTime.toISOString() : null,
      },
      table.hardwareType,
      table.macAddress, // 🎯 Tambahkan MAC asli Prajurit di sini
    );

    // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
    this.commandLocks.set(tableId, Date.now() + 5000);

    await this.clearAllTablesCache();
    this.clearMacCache();
    this.billiardGateway.broadcastTableUpdate(savedTable);
    return savedTable;
  }

  async extendSession(
    tableId: number,
    durationMinutes?: number,
    packageId?: number,
    userName?: string,
    ignoreConflict: boolean = false,
    idempotencyKey?: string,
  ) {
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
      this.logger.warn(
        `extendSession: Table ${tableId} is being extended (Redis Lock), skipping.`,
      );
      return null;
    }
    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    try {
      this.pendingVerifications.delete(tableId);
      const table = await this.getTableById(tableId);
      if (
        !table ||
        ![
          TableStatus.IN_USE,
          TableStatus.WARNING,
          TableStatus.WAITING_PAYMENT,
        ].includes(table.status)
      )
        return null;

      if (table.sessionType !== 'prepaid') {
        throw new Error('Can only extend prepaid sessions');
      }

      if (table.isBooked && !ignoreConflict) {
        const recommendations =
          await this.waitingListService.findAlternativeTable(tableId);
        return {
          conflict: true,
          message: `Meja ${table.tableName} sudah dipesan oleh ${table.bookedByName}.`,
          bookedByName: table.bookedByName,
          waitingId: table.bookedByWaitingId,
          recommendations: recommendations.map((r) => ({
            id: r.id,
            tableName: r.tableName,
            remainingMinutes: r.remainingMinutes,
            status: r.status,
          })),
        };
      }

      if (table.isBooked && ignoreConflict) {
        await this.reportService.logAction(
          'WAIT_LIST_CONFLICT_BYPASSED',
          userName || 'Sistem',
          `Kasir mengabaikan antrean ${table.bookedByName} untuk perpanjang sesi Meja ${table.tableName}`,
          tableId,
        );
      }

      const now = new Date();
      let extensionMinutes = durationMinutes || 0;
      let extensionPrice = 0;

      if (packageId) {
        const pkg = await this.packageRepository.findOne({
          where: { id: packageId },
        });
        if (pkg) {
          extensionMinutes = pkg.durationMinutes;
          extensionPrice =
            this.transactionService.calculateCurrentPackagePrice(pkg);
          table.packageId = packageId;
        }
      } else if (durationMinutes) {
        // Custom duration WITHOUT package: use customDurationPricing from global settings
        const globalSettings = await this.settingsService.getSettings();
        const customConfig =
          table.category === 'VIP'
            ? globalSettings.customDurationPricingVip
            : globalSettings.customDurationPricingRegular;

        if (customConfig) {
          const activeRate =
            this.transactionService.calculateCurrentPackagePrice({
              price: customConfig.basePrice,
              timeSlots: customConfig.timeSlots,
            });
          extensionPrice = Math.round((durationMinutes / 60) * activeRate);
        } else {
          // Final fallback if no customDurationPricing is configured
          extensionPrice = Math.round((durationMinutes / 60) * 50000);
        }
      }

      // Pastikan scheduledCutoffs di-clear saat extend agar tidak ada
      // stopSession yang terlambat berjalan setelah lampu dinyalakan kembali
      await this.redisService.releaseLock(lockKey); // release extending lock
      await this.redisService.releaseLock(`lock:cutoff_${tableId}`); // clear potential cutoff lock if extended successfully

      // Selalu nyalakan lampu saat extend (baik dari WAITING_PAYMENT maupun IN_USE/WARNING)
      table.isLightOn = true;
      if (table.status === TableStatus.WAITING_PAYMENT) {
        table.status = TableStatus.IN_USE;
      }

      const currentEnd =
        table.endTime && new Date(table.endTime) > now
          ? new Date(table.endTime)
          : now;
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
        this.logger.warn(
          `extendSession: gagal ambil settings (${err.message}), pakai threshold default ${threshold}`,
        );
      }

      if (
        table.remainingMinutes > threshold &&
        table.status === TableStatus.WARNING
      ) {
        table.status = TableStatus.IN_USE;
      }

      // CUMULATIVE PRICE: Add to existing activePackagePrice (always integer)
      extensionPrice = Math.round(extensionPrice);
      table.activePackagePrice = Math.round(
        Number(table.activePackagePrice || 0) + extensionPrice,
      );

      const savedTable = await this.tableRepository.save(table);

      // SYNC TRANSACTION: di-wrap try/catch agar error billing tidak memblokir MQTT
      try {
        const transaction =
          await this.transactionService.getActiveTransactionByTable(
            table.id,
            true,
          );
        if (transaction) {
          let extensionTitle = 'Tambahan Waktu';
          if (packageId) {
            const pkg = await this.packageRepository.findOne({
              where: { id: packageId },
            });
            if (pkg) extensionTitle = `Extend ${pkg.name}`;
          }

          // Force synchronization of transaction.endTime to match new table.endTime
          // This ensures the invoice header shows the CORRECT final end time.
          transaction.endTime = table.endTime;
          await this.transactionService.setBilliardTotal(
            transaction.id,
            table.activePackagePrice,
            {
              title: extensionTitle,
              duration: extensionMinutes,
              subtotal: extensionPrice,
              startTimeFormatted: (currentEnd || now)
                .toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                })
                .replace(/:/g, '.'),
              endTimeFormatted: table.endTime
                .toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                })
                .replace(/:/g, '.'),
            },
            userName,
            table.endTime,
          );
        }
      } catch (err) {
        this.logger.warn(
          `extendSession: sync transaction gagal (${err.message}) — diabaikan, MQTT tetap dikirim`,
        );
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
        const topicMac = this.getEffectiveMqttMac(table);
        const result = this.mqttService.publishLightCommand(
          topicMac,
          table.id,
          true,
          table.relayPin,
          table.remainingMinutes || 1, // Berikan minimal 1 menit jika terdeteksi mepet
          true, // extend
          true, // force
          { targetMac: table.macAddress },
          table.hardwareType,
        );

        // 🛡️ COMMAND LOCK (v7.12): Beri jeda 5 detik agar tidak flicker
        this.commandLocks.set(tableId, Date.now() + 5000);

        // 🛡️ REGISTER FOR VERIFIKASI (v17.3)
        const tokenValue = (result as any)?.token || 0;
        this.pendingVerifications.set(table.id, {
          targetState: true,
          targetToken: tokenValue,
          attempts: 1,
          lastSent: Date.now(),
          table: savedTable
        });
      }

      // Operasi non-kritis setelah MQTT terkirim
      if (userName) {
        try {
          await this.reportService.logAction(
            'EXTEND_SESSION',
            userName,
            `Tambah waktu meja ${table.tableName} selama ${extensionMinutes} menit. Tambahan biaya: Rp ${extensionPrice.toLocaleString()}`,
            tableId,
          );
        } catch (err) {
          this.logger.warn(
            `extendSession: logAction gagal (${err.message}) — diabaikan`,
          );
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
    } finally {
      // Selalu hapus dari mutex, berhasil atau error
      await this.redisService.releaseLock(lockKey);
    }
  }

  async moveTable(
    fromTableId: number,
    toTableId: number,
    userName?: string,
    idempotencyKey?: string,
  ) {
    // ── IDEMPOTENCY: check cache ───────────────────────────────────
    if (idempotencyKey) {
      const cached = await this.redisService.getIdempotency(idempotencyKey);
      if (cached) return cached;
    }

    // ── MUTEX: distributed lock ────────────────────────────────────
    const lockKey = `table_move_${fromTableId}_${toTableId}`;
    const acquired = await this.redisService.acquireLock(lockKey, 5000);
    if (!acquired) {
      this.logger.warn(
        `moveTable: Move from ${fromTableId} to ${toTableId} is already in progress.`,
      );
      throw new Error('Proses pemindahan Meja sedang berjalan.');
    }

    try {
      const fromTable = await this.getTableById(fromTableId);
      const toTable = await this.getTableById(toTableId);

      if (!fromTable || !toTable)
        throw new NotFoundException('Source or target table not found');
      if (fromTable.status === TableStatus.AVAILABLE)
        throw new Error('Source table has no active session');
      if (toTable.status !== TableStatus.AVAILABLE)
        throw new Error('Target table is not available');

      // 1. Move Transaction
      const transaction =
        await this.transactionService.getActiveTransactionByTable(
          fromTableId,
          true,
        );
      if (transaction) {
        transaction.tableId = toTableId;
        await this.transactionService.updateTransaction(transaction.id, {
          tableId: toTableId,
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

      // Invalidate caches for both tables
      await this.redisService
        .del(`bill_preview_${fromTableId}`)
        .catch(() => { });
      await this.redisService.del(`bill_preview_${toTableId}`).catch(() => { });

      // 4. IoT Coordination
      // Turn OFF source table - force:true bypasses ESP32 30s race condition protection
      if (fromTable.macAddress) {
        this.mqttService.publishLightCommand(
          fromTable.macAddress,
          fromTable.id,
          false,
          fromTable.relayPin,
          0, // duration 0 (OFF)
          false,
          true, // force
          {},
          fromTable.hardwareType,
        );
      }

      // Turn ON new table with migrated duration/type
      if (toTable.macAddress) {
        this.mqttService.publishLightCommand(
          toTable.macAddress,
          toTable.id,
          true,
          toTable.relayPin,
          toTable.remainingMinutes || 0, // Migrasi durasi sisa ke meja baru
          false,
          true, // force
          {
            type: toTable.sessionType,
            startTime: toTable.startTime
              ? toTable.startTime.toISOString()
              : new Date().toISOString(),
            endTime: toTable.endTime ? toTable.endTime.toISOString() : null,
          },
          toTable.hardwareType,
        );
      }

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
          toTableId,
        );
      }

      this.billiardGateway.broadcastTableUpdate(savedTo);

      const res = savedTo;
      if (idempotencyKey) {
        await this.redisService.setIdempotency(idempotencyKey, res);
      }
      return res;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  async resetTable(id: number, userName?: string) {
    const table = await this.getTableById(id);
    if (!table) throw new NotFoundException('Table not found');

    // Bersihkan SEMUA field sesi agar tidak ada data bocor ke sesi berikutnya
    table.status = TableStatus.AVAILABLE;
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
    table.bookedByWaitingId = null as any;
    table.bookedByName = null as any;

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
      this.mqttService.publishLightCommand(
        topicMac,
        table.id,
        false,
        table.relayPin,
        0, // duration 0 (OFF)
        false, // not extend
        true, // force = true
        {},
        table.hardwareType,
        'resetTable'
      );
    }

    this.billiardGateway.broadcastTableUpdate(savedTable);

    if (userName) {
      await this.reportService.logAction(
        'FORCE_RESET_TABLE',
        userName,
        `Reset paksa Meja ${table.tableName}. Status kembali AVAILABLE.`,
        id,
      );
    }

    return savedTable;
  }
}
