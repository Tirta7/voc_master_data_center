import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Subject, BehaviorSubject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { checkLicense } from './vocml-client';

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
  private readonly machineId: string;
  
  // VOC ML Config
  private readonly vocmlServerUrl = 'https://vocml.vocpos.id';
  private readonly vocmlPublicKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEADenKScMcRxd/GFPnwHLgO26Y3mKwNmtyUR1KPQgLTFI=
-----END PUBLIC KEY-----`;

  private state: LicenseState;
  
  readonly broadcast$ = new Subject<BroadcastMessage[]>();
  readonly statusChange$ = new BehaviorSubject<{ status: string; daysLeft: number; expiredAt: string | null } | null>(null);
  
  private lastEmittedStatus: string = '';

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
    }, 5000);
  }

  @Cron('*/10 * * * * *')
  async checkLicenseRegularly() {
    await this.checkLicense();
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

      const daysLeft = this.calculateDaysLeft(lic.expiresAt);

      this.state = {
        status: mappedStatus,
        expiredAt: lic.expiresAt || null,
        daysLeft: daysLeft,
        message: lic.reason,
        machineId: this.machineId,
        lastChecked: new Date().toISOString(),
      };

      this.logger.log(`VOCML License check: ${this.state.status} | Days left: ${this.state.daysLeft}`);

      if (this.state.status !== this.lastEmittedStatus) {
        this.lastEmittedStatus = this.state.status;
        this.statusChange$.next({
          status: this.state.status,
          daysLeft: this.state.daysLeft,
          expiredAt: this.state.expiredAt,
        });
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

  async getRenewalInfo(): Promise<{ success: boolean; message?: string; qrisString?: string; nominal?: number }> {
     return { success: false, message: 'Silakan lakukan pembayaran sesuai petunjuk admin.' };
  }

  async activateLicense(licenseKey: string): Promise<{ success: boolean; message: string; state: LicenseState }> {
    return { success: false, message: 'Tidak diperlukan lagi di VOCML. Cukup cek status otomatis.', state: this.state };
  }

  getState(): LicenseState {
    return this.state;
  }

  isLocked(): boolean {
    return ['EXPIRED', 'BLOCKED', 'NOT_REGISTERED', 'OFFLINE'].includes(this.state.status);
  }

  hasLicenseKey(): boolean {
    return true; 
  }
}
