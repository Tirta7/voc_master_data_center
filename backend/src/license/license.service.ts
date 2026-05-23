import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom, Subject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

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

  // SSE subject — emit saat status lisensi berubah (untuk auto-redirect instan)
  readonly statusChange$ = new Subject<{ status: string; daysLeft: number; expiredAt: string | null }>();

  private lastEmittedStatus: string = '';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.gasUrl = this.configService.get<string>('GAS_WEBAPP_URL');
    this.gasSecret = this.configService.get<string>('GAS_SECRET');
    this.machineId = this.getOrGenerateMachineId();
    this.licenseKey = this.getPersistedLicenseKey();

    this.state = {
      status: 'OFFLINE',
      expiredAt: null,
      daysLeft: 0,
      machineId: this.machineId,
      lastChecked: new Date().toISOString(),
    };
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

  // Cek lisensi setiap 10 detik (lebih cepat agar blokir/aktif langsung terdeteksi)
  @Cron('*/10 * * * * *')
  async checkLicenseAndBroadcasts() {
    if (!this.gasUrl) {
      this.logger.warn('GAS_WEBAPP_URL tidak diset. Lisensi tidak akan diverifikasi.');
      return;
    }
    await this.checkLicense();
  }

  // Polling broadcast lebih cepat: setiap 10 detik agar toast dari Master langsung tampil
  @Cron('*/10 * * * * *')
  async pollBroadcasts() {
    if (!this.gasUrl) return;
    await this.fetchBroadcasts();
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
        this.state.status = 'OFFLINE';
        this.state.lastChecked = new Date().toISOString();
      } else {
        this.logger.error('Toleransi offline terlampaui. Mengunci aplikasi.');
        this.state.status = 'EXPIRED';
        this.state.lastChecked = new Date().toISOString();
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
}
