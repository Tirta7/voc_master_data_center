import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom, Subject } from 'rxjs';

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
  private readonly machineId: string;
  private readonly licenseKey: string;

  // Offline tolerance: 7 hari (ms)
  private readonly OFFLINE_TOLERANCE_MS = 7 * 24 * 60 * 60 * 1000;

  private state: LicenseState;
  private lastSuccessfulCheck = 0;

  // SSE subject — frontend subscribe ke sini untuk terima broadcast real-time
  readonly broadcast$ = new Subject<BroadcastMessage[]>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.gasUrl = this.configService.get<string>('GAS_WEBAPP_URL');
    this.machineId = this.configService.get<string>('MACHINE_ID') || 'VOC-UNREGISTERED';
    this.licenseKey = this.configService.get<string>('LICENSE_KEY') || '';

    this.state = {
      status: 'OFFLINE',
      expiredAt: null,
      daysLeft: 0,
      machineId: this.machineId,
      lastChecked: new Date().toISOString(),
    };
  }

  async onModuleInit() {
    this.logger.log(`LicenseService init. Machine ID: ${this.machineId}`);
    // Delay 5 detik agar semua service siap, lalu cek lisensi
    setTimeout(() => this.checkLicenseAndBroadcasts(), 5000);
  }

  // Polling setiap 30 detik
  @Cron('*/30 * * * * *')
  async checkLicenseAndBroadcasts() {
    if (!this.gasUrl) {
      this.logger.warn('GAS_WEBAPP_URL tidak diset. Lisensi tidak akan diverifikasi.');
      return;
    }

    await Promise.all([
      this.checkLicense(),
      this.fetchBroadcasts(),
    ]);
  }

  private async checkLicense() {
    try {
      const url = `${this.gasUrl}?action=validate_license&machineId=${encodeURIComponent(this.machineId)}&licenseKey=${encodeURIComponent(this.licenseKey)}`;
      const response = await firstValueFrom(this.httpService.get(url, { timeout: 10000 }));
      const data = response.data;

      this.state = {
        ...data,
        machineId: this.machineId,
        lastChecked: new Date().toISOString(),
      };

      this.lastSuccessfulCheck = Date.now();
      this.logger.log(`License check: ${data.status} | Days left: ${data.daysLeft}`);
    } catch (err) {
      const elapsed = Date.now() - this.lastSuccessfulCheck;
      if (this.lastSuccessfulCheck > 0 && elapsed < this.OFFLINE_TOLERANCE_MS) {
        // Dalam toleransi offline — biarkan status terakhir berlaku
        this.logger.warn(`GAS tidak bisa dihubungi (offline). Pakai cache. Sisa toleransi: ${Math.ceil((this.OFFLINE_TOLERANCE_MS - elapsed) / 86400000)} hari`);
      } else if (this.lastSuccessfulCheck === 0) {
        // Belum pernah sukses sama sekali — set OFFLINE
        this.state.status = 'OFFLINE';
        this.state.lastChecked = new Date().toISOString();
      } else {
        // Melewati toleransi 7 hari — kunci
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
      const broadcasts: BroadcastMessage[] = response.data || [];

      if (broadcasts.length > 0) {
        this.logger.log(`Diterima ${broadcasts.length} broadcast dari GAS`);
        this.broadcast$.next(broadcasts);
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
        }, { timeout: 15000 })
      );
      const data = response.data;
      if (data.success) {
        // Simpan license key baru ke state
        (this as any).licenseKey = licenseKey;
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
