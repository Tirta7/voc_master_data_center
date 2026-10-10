import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Subject, BehaviorSubject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { checkLicense } from './vocml-client';
import { QrisUtil } from './qris.util';
import * as QRCode from 'qrcode';

/** Tagihan QRIS dari VOCML (field `billing` di /api/v1/check). */
export interface LicenseBilling {
  reason: 'locked' | 'expired';
  amount: number;
  amount_text: string;
  currency: string;
  merchant_name: string;
  merchant_city: string;
  qris: string;
  qris_image_url: string;
  note: string;
  contact: string;
}

export type LicenseStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'BLOCKED' | 'NOT_REGISTERED' | 'OFFLINE';

export interface LicenseState {
  status: LicenseStatus;
  expiredAt: string | null;
  daysLeft: number;
  graceDaysLeft?: number;
  message?: string;
  machineId: string;
  lastChecked: string;
  licenseKey?: string | null;
  serverOnline?: boolean;
  serverUrl?: string;
  rawStatus?: string;
  lockReason?: string;
  /** Tagihan QRIS — hanya terisi saat EXPIRED / BLOCKED dan admin mengatur QRIS. */
  billing?: LicenseBilling | null;
}

export interface BroadcastMessage {
  id: string | number;
  target?: string;
  judul?: string;
  pesan: string;
  tipe: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
  /** Tampil ulang tiap N menit. 0 = tampil sekali saja (sampai ditutup). */
  intervalMenit: number;
  /** Lama tampil sebelum otomatis disembunyikan (detik). 0 = tetap tampil sampai ditutup. */
  durasiDetik: number;
  /** Dipakai frontend untuk mendeteksi pesan yang diedit agar muncul lagi. */
  versi: string;
}

@Injectable()
export class LicenseService implements OnModuleInit {
  private readonly logger = new Logger(LicenseService.name);
  private readonly machineId: string;
  
  // VOC ML Config
  private readonly vocmlServerUrl = 'https://vocml.vocpos.id';
  private readonly vocmlPublicKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEADenKScMcRxd/GFPnwHLgO26Y3mKwNmtyUR1KPQgLTFI=
-----END PUBLIC KEY-----`;

  private state: LicenseState;
  
  readonly broadcast$ = new Subject<BroadcastMessage[]>();
  readonly statusChange$ = new BehaviorSubject<{ status: string; daysLeft: number; expiredAt: string | null; billing?: LicenseBilling | null; message?: string } | null>(null);
  /** Snapshot status lisensi lengkap (incl. billing) untuk SSE /api/license/stream. */
  readonly license$ = new BehaviorSubject<LicenseState | null>(null);
  
  private lastEmittedStatus: string = '';

  // Pesan broadcast dari VOCML dashboard
  private messages: BroadcastMessage[] = [];
  private lastMessagesJson = '[]';
  private messagesFetching = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.machineId = this.getOrGenerateMachineId();

    this.state = {
      status: 'NOT_REGISTERED',
      expiredAt: null,
      daysLeft: 0,
      machineId: this.machineId,
      lastChecked: new Date().toISOString(),
    };
  }

  private getOrGenerateMachineId(): string {
    let id = this.configService.get<string>('MACHINE_ID');
    if (id && id !== 'VOC-UNREGISTERED' && id.trim() !== '') {
      return id.trim();
    }

    const storageDir = path.join(process.cwd(), 'storage');
    const machineIdFile = path.join(storageDir, 'machine-id.txt');

    try {
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      if (fs.existsSync(machineIdFile)) {
        const storedId = fs.readFileSync(machineIdFile, 'utf8').trim();
        if (storedId && storedId.startsWith('VOC-')) {
          return storedId;
        }
      }

      const randomHex = randomBytes(6).toString('hex').toUpperCase();
      const newId = `VOC-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}-${randomHex.slice(8, 12)}`;
      
      fs.writeFileSync(machineIdFile, newId, 'utf8');
      return newId;
    } catch (err) {
      const randomHex = randomBytes(6).toString('hex').toUpperCase();
      return `VOC-TMP-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}-${randomHex.slice(8, 12)}`;
    }
  }

  async onModuleInit() {
    this.logger.log(`LicenseService init. Machine ID: ${this.machineId}`);
    setTimeout(async () => {
      await this.checkLicense();
      await this.fetchMessages();
    }, 5000);
  }

  @Cron('*/10 * * * * *')
  async checkLicenseRegularly() {
    await this.checkLicense();
  }

  /** Ambil pesan broadcast dari VOCML tiap 1 menit. */
  @Cron('0 * * * * *')
  async fetchMessagesRegularly() {
    await this.fetchMessages();
  }

  private normalizeType(t: any): BroadcastMessage['tipe'] {
    const v = String(t || 'info').toUpperCase();
    if (v === 'WARNING' || v === 'DANGER' || v === 'SUCCESS') return v;
    if (v === 'ERROR') return 'DANGER';
    return 'INFO';
  }

  /**
   * GET {VOCML}/api/v1/messages?machine_id=...&product=billiard
   * Response: { messages: [{ id, title?, message, type, interval_minutes, display_seconds, updated_at }] }
   * VOCML hanya mengirim pesan yang AKTIF & dalam rentang tanggal tayang.
   * Pesan yang dinonaktifkan/dihapus di VOCML otomatis hilang dari aplikasi pada sinkron berikutnya.
   */
  async fetchMessages(): Promise<BroadcastMessage[]> {
    if (this.messagesFetching) return this.messages;
    this.messagesFetching = true;
    try {
      const apiKey = this.configService.get<string>('VOCML_API_KEY') || '';
      const qs = new URLSearchParams({ machine_id: this.machineId, product: 'billiard' });
      const res = await fetch(`${this.vocmlServerUrl}/api/v1/messages?${qs}`, {
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-VOCML-Key': apiKey } : {}) },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) {
        // Endpoint belum tersedia di VOCML / client belum terdaftar → kosongkan
        this.applyMessages([]);
        return this.messages;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: any = await res.json();
      const list: any[] = Array.isArray(body) ? body : Array.isArray(body?.messages) ? body.messages : [];

      const mapped: BroadcastMessage[] = list
        .filter((m) => m && m.id !== undefined && (m.message || m.pesan) && m.is_active !== false)
        .map((m) => ({
          id: m.id,
          judul: m.title || m.judul || undefined,
          pesan: String(m.message ?? m.pesan),
          tipe: this.normalizeType(m.type ?? m.tipe),
          intervalMenit: Math.max(0, Number(m.interval_minutes ?? m.intervalMenit ?? 0) || 0),
          durasiDetik: Math.max(0, Number(m.display_seconds ?? m.durasiDetik ?? 15) || 0),
          versi: String(m.updated_at ?? m.versi ?? ''),
        }));

      this.applyMessages(mapped);
    } catch (err: any) {
      // Offline: pertahankan pesan terakhir, jangan spam log
      this.logger.debug(`Gagal ambil pesan VOCML: ${err?.message || err}`);
    } finally {
      this.messagesFetching = false;
    }
    return this.messages;
  }

  private applyMessages(list: BroadcastMessage[]) {
    const json = JSON.stringify(list);
    if (json === this.lastMessagesJson) return;
    this.lastMessagesJson = json;
    this.messages = list;
    this.logger.log(`Pesan VOCML diperbarui: ${list.length} pesan aktif`);
    this.broadcast$.next(list); // push real-time ke semua browser via SSE
  }

  getMessages(): BroadcastMessage[] {
    return this.messages;
  }

  private calculateDaysLeft(expiresAt: string | undefined): number {
    if (!expiresAt) return 0;
    const exp = new Date(expiresAt);
    exp.setHours(23, 59, 59, 999);
    const diff = exp.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  async checkLicense() {
    try {
      const storeName = this.configService.get<string>('LOCATION_NAME') || 'Billiard VOC';
      const cacheFile = path.join(process.cwd(), 'storage', 'vocml-cache.json');
      
      const rawLic = await checkLicense({
        serverUrl: this.vocmlServerUrl,
        product: 'billiard',
        machineId: this.machineId,
        publicKeyPem: this.vocmlPublicKey,
        cacheFile: cacheFile,
        apiKey: this.configService.get<string>('VOCML_API_KEY') || '',
        storeName: storeName,
        appVersion: '2.0.0',
        timeoutMs: 8000
      });
      const lic: any = rawLic;

      let mappedStatus: LicenseStatus = 'NOT_REGISTERED';
      if (lic.status === 'active' || lic.status === 'expiring') mappedStatus = 'ACTIVE';
      else if (lic.status === 'expired') mappedStatus = 'EXPIRED';
      else if (lic.status === 'locked') mappedStatus = 'BLOCKED';
      else if (lic.status === 'pending') mappedStatus = 'NOT_REGISTERED';
      else if (lic.status === 'offline') mappedStatus = 'OFFLINE';
      
      if (mappedStatus === 'ACTIVE' && lic.status === 'expiring') {
        mappedStatus = 'GRACE';
      }

      // Saat online, days_left dari server dipakai apa adanya (sumber kebenaran)
      const daysLeft = !lic.offline && typeof lic.daysLeft === 'number'
        ? lic.daysLeft
        : this.calculateDaysLeft(lic.expiresAt);

      // Billing hanya relevan saat EXPIRED / BLOCKED (jangan tampilkan QRIS saat aktif)
      const billing: LicenseBilling | null =
        (mappedStatus === 'EXPIRED' || mappedStatus === 'BLOCKED') ? (lic.billing || null) : null;

      // License key & expiry SELALU mengikuti hasil terakhir (server / snapshot), tanpa
      // mempertahankan key lama — agar koreksi pengurangan masa aktif langsung berlaku.
      this.state = {
        status: mappedStatus,
        expiredAt: lic.expiresAt || null,
        daysLeft: daysLeft,
        // Sama persis dengan "Sisa Waktu" di Pengaturan (days_left dari VOCML)
        graceDaysLeft: mappedStatus === 'GRACE' ? Math.max(0, daysLeft) : undefined,
        message: lic.reason,
        machineId: this.machineId,
        lastChecked: new Date().toISOString(),
        licenseKey: lic.licenseKey ?? null,
        serverOnline: !lic.offline,
        serverUrl: this.vocmlServerUrl,
        rawStatus: lic.status,
        lockReason: lic.lockReason || '',
        billing,
      };

      this.logger.log(`VOCML License check: ${this.state.status} | Days left: ${this.state.daysLeft}${billing ? ` | Tagihan: ${billing.amount_text}` : ''}`);

      const emitKey = JSON.stringify([
        this.state.status, this.state.expiredAt || '', this.state.licenseKey || '',
        this.state.message || '', billing ? [billing.amount, billing.qris, billing.note, billing.contact, billing.reason] : null,
      ]);
      if (emitKey !== this.lastEmittedStatus) {
        this.lastEmittedStatus = emitKey;
        this.statusChange$.next({
          status: this.state.status,
          daysLeft: this.state.daysLeft,
          expiredAt: this.state.expiredAt,
          message: this.state.message,
          billing,
        });
        this.license$.next(this.state);
      }
    } catch (err) {
      this.logger.error('Error checking VOCML license', err);
    }
  }

  async triggerExpiryWarning() {
    const now = Date.now();
    const { status, daysLeft, expiredAt } = this.state;
    if ((status === 'ACTIVE' && daysLeft <= 7) || status === 'GRACE' || status === 'EXPIRED' || status === 'BLOCKED') {
      this.eventEmitter.emit('license.expiring', {
        daysLeft,
        expiredAt,
        status
      });
      return { success: true };
    }
    return { success: false, message: 'Lisensi tidak sedang dalam masa peringatan.' };
  }

  private renewalCache: { at: number; data: any } | null = null;

  /**
   * Info pembayaran perpanjangan dari VOCML.
   * GET {VOCML}/api/v1/payment-info?machine_id=...&product=billiard
   * Response VOCML: { qris_string, amount, merchant_name?, admin_whatsapp?, note?, period_label? }
   * Billiard mengubah QRIS statis → QRIS dinamis (nominal tertanam), jadi saat discan nominal terisi otomatis.
   */
  async getRenewalInfo(force = false): Promise<{
    success: boolean; message?: string; qrisString?: string; nominal?: number;
    merchantName?: string | null; adminWhatsapp?: string | null; note?: string | null; periodLabel?: string | null;
  }> {
    if (!force && this.renewalCache && Date.now() - this.renewalCache.at < 60_000) return this.renewalCache.data;
    try {
      const apiKey = this.configService.get<string>('VOCML_API_KEY') || '';
      const qs = new URLSearchParams({ machine_id: this.machineId, product: 'billiard' });
      const res = await fetch(`${this.vocmlServerUrl}/api/v1/payment-info?${qs}`, {
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-VOCML-Key': apiKey } : {}) },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'Info pembayaran belum diatur di VOCML' : `HTTP ${res.status}`);
      const b: any = await res.json();

      const amount = Math.round(Number(b.amount ?? b.nominal ?? 0));
      const staticQris = String(b.qris_string ?? b.qris ?? '').trim();
      let qrisString: string | undefined = b.qris_dynamic ? String(b.qris_dynamic) : undefined;
      if (!qrisString && staticQris) {
        qrisString = amount > 0 ? QrisUtil.generateDynamicQris(staticQris, amount) : staticQris;
      }

      const data = {
        success: !!qrisString,
        message: qrisString ? undefined : 'QRIS belum diatur di VOCML',
        qrisString,
        nominal: amount > 0 ? amount : undefined,
        merchantName: b.merchant_name || (staticQris ? QrisUtil.getMerchantName(staticQris) : null),
        adminWhatsapp: b.admin_whatsapp || null,
        note: b.note || null,
        periodLabel: b.period_label || null,
      };
      this.renewalCache = { at: Date.now(), data };
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Gagal memuat info pembayaran' };
    }
  }

  async activateLicense(licenseKey: string): Promise<{ success: boolean; message: string; state: LicenseState }> {
    return { success: false, message: 'Tidak diperlukan lagi di VOCML. Cukup cek status otomatis.', state: this.state };
  }

  getState(): LicenseState {
    return this.state;
  }

  getBilling(): LicenseBilling | null {
    return this.state.billing || null;
  }

  /**
   * PNG QRIS tagihan untuk proxy GET /api/license/billing/qris.png.
   * 1) Ambil billing.qris_image_url dari VOCML (dengan X-VOCML-Key bila ada).
   * 2) Fallback: render sendiri dari billing.qris (qrcode, ECC "M", margin 2).
   * Mengembalikan null bila tidak ada tagihan.
   */
  async getBillingQrisPng(size = 512): Promise<Buffer | null> {
    const billing = this.getBilling();
    if (!billing) return null;
    const px = Math.min(1024, Math.max(240, Math.round(size) || 512));

    if (billing.qris_image_url) {
      try {
        const url = new URL(billing.qris_image_url);
        if (!url.searchParams.has('size')) url.searchParams.set('size', String(px));
        const apiKey = this.configService.get<string>('VOCML_API_KEY') || '';
        const res = await fetch(url.toString(), {
          headers: apiKey ? { 'X-VOCML-Key': apiKey } : {},
          signal: AbortSignal.timeout(8000),
        });
        const type = res.headers.get('content-type') || '';
        if (res.ok && type.includes('image/png')) {
          return Buffer.from(await res.arrayBuffer());
        }
        this.logger.warn(`Gagal ambil QRIS VOCML: HTTP ${res.status} ${type}`);
      } catch (err: any) {
        this.logger.warn(`Gagal ambil QRIS VOCML: ${err?.message || err}`);
      }
    }

    if (!billing.qris) return null;
    return QRCode.toBuffer(billing.qris, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: px,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  isLocked(): boolean {
    return ['EXPIRED', 'BLOCKED', 'NOT_REGISTERED', 'OFFLINE'].includes(this.state.status);
  }

  hasLicenseKey(): boolean {
    return true; 
  }
}
