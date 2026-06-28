import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom, Subject, BehaviorSubject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { QrisUtil } from './qris.util';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type LicenseStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'BLOCKED' | 'NOT_REGISTERED' | 'OFFLINE';

export interface LicenseState {
  status: LicenseStatus;
  expiredAt: string | null;
  daysLeft: number;
  graceDaysLeft?: number;
  message?: string;
  machineId: string;
  lastChecked: string;
}

export interface BroadcastMessage {
  id: string | number;
  target: string;
  pesan: string;
  tipe: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
}

@Injectable()
export class LicenseService implements OnModuleInit {
  private readonly logger = new Logger(LicenseService.name);
  private readonly gasUrl: string | undefined;
  private readonly gasSecret: string | undefined;
  private readonly machineId: string;
  private licenseKey: string;

  // Offline tolerance: 1 hari (ms) - dikurangi agar tidak bisa melewati expiry
  private readonly OFFLINE_TOLERANCE_MS = 1 * 24 * 60 * 60 * 1000;

  private state: LicenseState;
  private lastSuccessfulCheck = 0;

  // SSE subject — frontend subscribe ke sini untuk terima broadcast real-time
  readonly broadcast$ = new Subject<BroadcastMessage[]>();

  // SSE subject — BehaviorSubject agar subscriber baru LANGSUNG dapat status terkini
  // (penting: kalau lisensi sudah EXPIRED sebelum frontend connect, langsung terkunci)
  readonly statusChange$ = new BehaviorSubject<{ status: string; daysLeft: number; expiredAt: string | null } | null>(null);

  private lastEmittedStatus: string = '';

  private loadPersistedState(): LicenseState | null {
    const storageDir = path.join(process.cwd(), 'storage');
    const licenseStateFile = path.join(storageDir, 'license-state.json');
    try {
      if (fs.existsSync(licenseStateFile)) {
        const content = fs.readFileSync(licenseStateFile, 'utf8').trim();
        if (content) {
          const parsed = JSON.parse(content) as LicenseState;
          if (parsed && typeof parsed === 'object' && parsed.status) {
            return parsed;
          }
        }
      }
    } catch (err) {
      this.logger.error('Gagal membaca license-state.json', err);
    }
    return null;
  }

  private persistState(state: LicenseState) {
    const storageDir = path.join(process.cwd(), 'storage');
    const licenseStateFile = path.join(storageDir, 'license-state.json');
    try {
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      fs.writeFileSync(licenseStateFile, JSON.stringify(state, null, 2), 'utf8');
      this.logger.log(`License state berhasil disimpan ke file lokal: status=${state.status}`);
    } catch (err) {
      this.logger.error('Gagal menyimpan license-state.json', err);
    }
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.gasUrl = this.configService.get<string>('GAS_WEBAPP_URL');
    this.gasSecret = this.configService.get<string>('GAS_SECRET');
    this.machineId = this.getOrGenerateMachineId();
    this.licenseKey = this.getPersistedLicenseKey();

    const persistedState = this.loadPersistedState();
    if (persistedState) {
      this.state = persistedState;
      const lastCheckedTime = new Date(persistedState.lastChecked).getTime();
      this.lastSuccessfulCheck = isNaN(lastCheckedTime) ? Date.now() : lastCheckedTime;

      // Safety net: jika status tersimpan ACTIVE/GRACE tapi expiredAt sudah lewat, paksa EXPIRED
      if (this.state.expiredAt && (this.state.status === 'ACTIVE' || this.state.status === 'GRACE')) {
        const expiredEndOfDay = new Date(this.state.expiredAt);
        expiredEndOfDay.setHours(23, 59, 59, 999);
        if (new Date() > expiredEndOfDay) {
          this.logger.warn(`[LICENSE] Startup check: Tanggal expired ${this.state.expiredAt} sudah terlampaui. Mengubah ke EXPIRED.`);
          this.state.status = 'EXPIRED';
          this.state.daysLeft = -1;
        }
      }
    } else {
      // Belum pernah berhasil check lisensi sama sekali (fresh install/unverified)
      // Wajib start sebagai NOT_REGISTERED agar langsung terkunci
      this.state = {
        status: 'NOT_REGISTERED',
        expiredAt: null,
        daysLeft: 0,
        machineId: this.machineId,
        lastChecked: new Date().toISOString(),
      };
      this.lastSuccessfulCheck = 0;
    }
  }

  private getOrGenerateMachineId(): string {
    // 1. Cek dari environment variable
    let id = this.configService.get<string>('MACHINE_ID');
    if (id && id !== 'VOC-UNREGISTERED' && id.trim() !== '') {
      return id.trim();
    }

    // 2. Cek dari file persistent storage
    const storageDir = path.join(process.cwd(), 'storage');
    const machineIdFile = path.join(storageDir, 'machine-id.txt');

    try {
      // Pastikan directory storage ada
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      if (fs.existsSync(machineIdFile)) {
        const storedId = fs.readFileSync(machineIdFile, 'utf8').trim();
        if (storedId && storedId.startsWith('VOC-')) {
          return storedId;
        }
      }

      // 3. Buat baru jika belum ada
      const randomHex = randomBytes(6).toString('hex').toUpperCase(); // 12 karakter random hex
      const newId = `VOC-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}-${randomHex.slice(8, 12)}`;
      
      fs.writeFileSync(machineIdFile, newId, 'utf8');
      this.logger.log(`Membuat Serial Number baru yang persisten: ${newId}`);
      return newId;
    } catch (err) {
      this.logger.error('Gagal membaca/menulis machine-id.txt, menggunakan fallback random', err);
      // Fallback random non-persisten
      const randomHex = randomBytes(6).toString('hex').toUpperCase();
      return `VOC-TMP-${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}-${randomHex.slice(8, 12)}`;
    }
  }

  private getPersistedLicenseKey(): string {
    // 1. Cek dari environment variable
    const envKey = this.configService.get<string>('LICENSE_KEY');
    if (envKey && envKey.trim() !== '') {
      return envKey.trim();
    }

    // 2. Cek dari file persistent storage
    const storageDir = path.join(process.cwd(), 'storage');
    const licenseKeyFile = path.join(storageDir, 'license-key.txt');

    try {
      if (fs.existsSync(licenseKeyFile)) {
        const storedKey = fs.readFileSync(licenseKeyFile, 'utf8').trim();
        if (storedKey && storedKey.trim() !== '') {
          return storedKey;
        }
      }
    } catch (err) {
      this.logger.error('Gagal membaca license-key.txt', err);
    }
    return '';
  }

  private persistLicenseKey(key: string) {
    const storageDir = path.join(process.cwd(), 'storage');
    const licenseKeyFile = path.join(storageDir, 'license-key.txt');
    try {
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      fs.writeFileSync(licenseKeyFile, key.trim(), 'utf8');
      this.licenseKey = key.trim();
      this.logger.log(`License key berhasil disimpan secara persisten: ${key.trim()}`);
    } catch (err) {
      this.logger.error('Gagal menyimpan license-key.txt', err);
    }
  }

  async onModuleInit() {
    this.logger.log(`LicenseService init. Machine ID: ${this.machineId}`);
    // Delay 5 detik agar semua service siap, lalu cek lisensi & broadcast
    setTimeout(async () => {
      await this.checkLicense();
      await this.fetchBroadcasts();
    }, 5000);
  }

  // ─── SMART POLLING ──────────────────────────────────────────────
  // Cek cepat setiap 10 detik KHUSUS saat status LOCKED (EXPIRED/BLOCKED/NOT_REGISTERED)
  // → Agar lisensi langsung terbuka sesaat setelah pembayaran terdeteksi GAS
  @Cron('*/10 * * * * *')
  async fastCheckWhenLocked() {
    if (!this.gasUrl) return;
    const isLocked = ['EXPIRED', 'BLOCKED', 'NOT_REGISTERED'].includes(this.state.status);
    if (isLocked) {
      await this.checkLicense();
    }
  }

  // Cek rutin setiap 30 detik untuk semua kondisi
  // (Lebih cepat dari 2 menit sebelumnya, tapi tidak memberatkan saat aktif)
  @Cron('*/30 * * * * *')
  async checkLicenseAndBroadcasts() {
    if (!this.gasUrl) {
      this.logger.warn('GAS_WEBAPP_URL tidak diset. Lisensi tidak akan diverifikasi.');
      return;
    }
    await this.checkLicense();
  }

  // Polling broadcast setiap 5 menit
  @Cron('0 */5 * * * *')
  async pollBroadcasts() {
    if (!this.gasUrl) return;
    await this.fetchBroadcasts();
  }

  private lastExpiryNotificationSentAt: number = 0;

  // Cek setiap jam, jalankan notifikasi jika jam saat ini sama dengan jam pada businessDayOffset
  @Cron('0 * * * *')
  async checkLicenseExpiryBasedOnOffset() {
    if (!this.gasUrl) return;
    
    try {
      // Kita butuh ambil businessDayOffset, bisa pakai SettingsService tapi karena beda modul, 
      // baca langsung dari file atau database mungkin lebih aman, 
      // namun cara paling gampang adalah menggunakan `triggerExpiryWarning` dari frontend saat offset terjadi.
      // Di sini kita cek default fallback saja: jika offset adalah 04:00, jam 4 kita jalankan.
      const dbSettings = await this.configService.get<any>('settings'); 
      // karena kita tidak punya SettingsService di sini (module dependency), 
      // kita serahkan trigger presisi pada frontend (seperti permintaan user).
    } catch {}
  }

  async triggerExpiryWarning() {
    // Throttle: hanya kirim 1x dalam 12 jam (43200000 ms)
    const now = Date.now();
    if (now - this.lastExpiryNotificationSentAt < 12 * 60 * 60 * 1000) {
      return { success: false, message: 'Notifikasi sudah dikirim sebelumnya (throttled).' };
    }

    const { status, daysLeft, expiredAt } = this.state;
    if ((status === 'ACTIVE' && daysLeft <= 7) || status === 'GRACE' || status === 'EXPIRED' || status === 'BLOCKED') {
      this.eventEmitter.emit('license.expiring', {
        daysLeft,
        expiredAt,
        status
      });
      this.lastExpiryNotificationSentAt = now;
      this.logger.log(`Frontend triggered license warning: Emit 'license.expiring' for status ${status}`);
      return { success: true };
    }
    return { success: false, message: 'Lisensi tidak sedang dalam masa peringatan.' };
  }

  async checkLicense() {
    try {
      const url = `${this.gasUrl}?action=validate_license&machineId=${encodeURIComponent(this.machineId)}&licenseKey=${encodeURIComponent(this.licenseKey)}`;
      const response = await firstValueFrom(this.httpService.get(url, { timeout: 10000 }));
      const data = response.data;

      // Auto-update & persist license key jika key baru dideteksi dari response GAS
      if (data.licenseKey && data.licenseKey !== this.licenseKey) {
        this.logger.log(`Mendeteksi license key baru dari sinkronisasi remote: ${data.licenseKey}. Menyimpan secara persisten...`);
        this.persistLicenseKey(data.licenseKey);
      }

      // ─── NORMALISASI STATUS ─────────────────────────────────────────────
      // 1. GRACE + daysLeft <= 0 → langsung EXPIRED (GAS lama mungkin masih pakai grace period)
      if (data.status === 'GRACE' && (data.daysLeft === undefined || data.daysLeft <= 0)) {
        this.logger.warn(`[LICENSE] GAS mengembalikan GRACE dengan daysLeft=${data.daysLeft}. Mengubah ke EXPIRED.`);
        data.status = 'EXPIRED';
      }

      // 2. Double-check lokal: jika expiredAt sudah lewat hari ini (end-of-day), paksa EXPIRED
      //    Ini melindungi dari GAS lama yang belum di-deploy ulang
      if (data.expiredAt && (data.status === 'ACTIVE' || data.status === 'GRACE')) {
        const expiredEndOfDay = new Date(data.expiredAt);
        expiredEndOfDay.setHours(23, 59, 59, 999);
        if (new Date() > expiredEndOfDay) {
          this.logger.warn(`[LICENSE] GAS bilang ${data.status} tapi tanggal ${data.expiredAt} sudah lewat. Mengunci lokal.`);
          data.status = 'EXPIRED';
          data.daysLeft = -1;
        }
      }
      // ───────────────────────────────────────────────────────────────────

      const prevStatus = this.state.status;
      this.state = {
        ...data,
        machineId: this.machineId,
        lastChecked: new Date().toISOString(),
      };

      this.lastSuccessfulCheck = Date.now();
      this.persistState(this.state);
      this.logger.log(`License check: ${data.status} | Days left: ${data.daysLeft}`);

      // Emit SSE langsung jika status berubah (agar frontend redirect instan)
      if (data.status !== this.lastEmittedStatus) {
        this.lastEmittedStatus = data.status;
        this.statusChange$.next({
          status: data.status,
          daysLeft: data.daysLeft,
          expiredAt: data.expiredAt,
        });
        this.logger.log(`Status changed → ${data.status}. Emitting SSE to frontend.`);
      }
    } catch (err) {
      const elapsed = Date.now() - this.lastSuccessfulCheck;

      // ─── SAFETY NET: Pengecekan lokal jika GAS tidak bisa dihubungi ───
      // Jika kita punya expiredAt tersimpan dan sudah lewat akhir hari itu, kunci sekarang
      if (this.state.expiredAt) {
        const expiredEndOfDay = new Date(this.state.expiredAt);
        expiredEndOfDay.setHours(23, 59, 59, 999);
        if (new Date() > expiredEndOfDay) {
          this.logger.error(`[LICENSE] Lisensi sudah EXPIRED (${this.state.expiredAt}) dan GAS tidak bisa dihubungi. Mengunci aplikasi.`);
          this.state.status = 'EXPIRED';
          this.state.lastChecked = new Date().toISOString();
          this.persistState(this.state);
          if ('EXPIRED' !== this.lastEmittedStatus) {
            this.lastEmittedStatus = 'EXPIRED';
            this.statusChange$.next({ status: 'EXPIRED', daysLeft: -1, expiredAt: this.state.expiredAt });
          }
          return;
        }
      }

      if (this.lastSuccessfulCheck > 0 && elapsed < this.OFFLINE_TOLERANCE_MS) {
        this.logger.warn(`GAS tidak bisa dihubungi (offline). Pakai cache. Sisa toleransi: ${Math.ceil((this.OFFLINE_TOLERANCE_MS - elapsed) / 3600000)} jam`);
      } else if (this.lastSuccessfulCheck === 0) {
        this.state.status = 'NOT_REGISTERED';
        this.state.lastChecked = new Date().toISOString();
      } else {
        this.logger.error('Toleransi offline terlampaui. Mengunci aplikasi.');
        this.state.status = 'EXPIRED';
        this.state.lastChecked = new Date().toISOString();
        this.persistState(this.state);
      }
    }
  }

  private async fetchBroadcasts() {
    try {
      const url = `${this.gasUrl}?action=get_broadcasts&machineId=${encodeURIComponent(this.machineId)}`;
      const response = await firstValueFrom(this.httpService.get(url, { timeout: 10000 }));
      const data = response.data;

      if (Array.isArray(data)) {
        if (data.length > 0) {
          this.logger.log(`Diterima ${data.length} broadcast dari GAS`);
          this.broadcast$.next(data);
        }
      } else {
        this.logger.warn(`Data broadcast dari GAS bukan array yang valid: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      this.logger.debug(`Gagal fetch broadcast: ${err.message}`);
    }
  }

  async activateLicense(licenseKey: string): Promise<{ success: boolean; message: string; state: LicenseState }> {
    if (!this.gasUrl) {
      return { success: false, message: 'GAS_WEBAPP_URL tidak dikonfigurasi', state: this.state };
    }
    try {
      const url = `${this.gasUrl}`;
      const response = await firstValueFrom(
        this.httpService.post(url, {
          type: 'ACTIVATE_LICENSE',
          machineId: this.machineId,
          licenseKey,
          secret: this.gasSecret,
        }, { timeout: 15000 })
      );
      const data = response.data;
      if (data.success || data.status === 'ACTIVE') {
        // Simpan license key baru ke state & file persisten secara aman
        this.persistLicenseKey(licenseKey);
        this.state = { ...data, machineId: this.machineId, lastChecked: new Date().toISOString() };
        this.lastSuccessfulCheck = Date.now();
        this.persistState(this.state);

        // Emit SSE status changed langsung agar frontend mendeteksi
        if (this.state.status !== this.lastEmittedStatus) {
          this.lastEmittedStatus = this.state.status;
          this.statusChange$.next({
            status: this.state.status,
            daysLeft: this.state.daysLeft,
            expiredAt: this.state.expiredAt,
          });
        }
        return { success: true, message: 'Lisensi berhasil diaktifkan!', state: this.state };
      }
      return { success: false, message: data.message || 'License Key tidak valid', state: this.state };
    } catch (err) {
      return { success: false, message: 'Tidak bisa menghubungi server lisensi', state: this.state };
    }
  }

  getState(): LicenseState {
    return this.state;
  }

  isLocked(): boolean {
    return ['EXPIRED', 'BLOCKED', 'NOT_REGISTERED'].includes(this.state.status);
  }

  /** Apakah sudah ada license key tersimpan (fresh install = false) */
  hasLicenseKey(): boolean {
    return !!(this.licenseKey && this.licenseKey.trim() !== '');
  }

  async getRenewalInfo(): Promise<{ success: boolean; message?: string; qrisString?: string; nominal?: number }> {
    // Menggunakan URL Master Command untuk menarik Tagihan Unik yang ada di spreadsheet pusat
    const masterUrl = this.configService.get<string>('MASTER_COMMAND_URL') || 'https://script.google.com/macros/s/AKfycby12SLFp5c2auM7w-LW8xohAZGY2HfdVzHgYQ4oZWAHP10BcNnwpzsoyKltf7B3REjj/exec';
    
    try {
      const url = `${masterUrl}?action=get_renewal_info&machineId=${encodeURIComponent(this.machineId)}`;
      const response = await firstValueFrom(this.httpService.get(url, { timeout: 10000 }));
      const data = response.data;

      if (data.success && data.renewalPrice) {
        // String QRIS Statis milik USER (sudah divalidasi CRC-nya = 350A ✅)
        const staticQris = '00020101021126610016ID.CO.SHOPEE.WWW01189360091800232436990208232436990303UMI51440014ID.CO.QRIS.WWW0215ID10265389289810303UMI5204581753033605802ID5925VIRTUAL OPERATION CONTROL6008SIDOARJO61056127162070703A016304350A';
        
        try {
          const dynamicQris = QrisUtil.generateDynamicQris(staticQris, data.renewalPrice);
          return { success: true, nominal: data.renewalPrice, qrisString: dynamicQris };
        } catch (e) {
          this.logger.error('Gagal generate QRIS dinamis', e);
          return { success: false, message: 'Gagal men-generate QRIS' };
        }
      }
      return { success: false, message: data.message || 'Tidak dapat mengambil info tagihan' };
    } catch (err) {
      this.logger.error('Gagal menghubungi GAS untuk info renewal', err);
      return { success: false, message: 'Gagal menghubungi server lisensi' };
    }
  }
}
