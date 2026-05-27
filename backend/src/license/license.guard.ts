import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { LicenseService } from './license.service';

/**
 * Guard global yang memblokir semua request jika lisensi EXPIRED/BLOCKED/NOT_REGISTERED.
 * Route yang dikecualikan: /api/license/*, /api/auth/login, /
 */
@Injectable()
export class LicenseGuard implements CanActivate {
  private readonly ALLOWED_PATHS = [
    '/api/license',
    '/api/auth/login',
    '/',
  ];

  constructor(private readonly licenseService: LicenseService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path: string = request.path || '';

    // Izinkan selalu route lisensi dan login
    if (this.ALLOWED_PATHS.some(p => path.startsWith(p))) {
      return true;
    }

    // OFFLINE: izinkan HANYA jika sudah pernah punya license key & expiredAt belum lewat
    if (this.licenseService.getState().status === 'OFFLINE') {
      const state = this.licenseService.getState();
      // Fresh install (tidak ada license key) → blokir, harus aktivasi dulu
      if (!this.licenseService.hasLicenseKey()) return false;
      // Sudah punya license key tapi GAS belum bisa dihubungi
      if (!state.expiredAt) return true;  // Belum pernah dapat data expiry → izinkan sementara
      const expiredEndOfDay = new Date(state.expiredAt);
      expiredEndOfDay.setHours(23, 59, 59, 999);
      if (new Date() <= expiredEndOfDay) return true; // Belum expired → izinkan
      return false; // Sudah expired meski offline → blokir
    }

    // ACTIVE atau GRACE = izinkan
    if (!this.licenseService.isLocked()) return true;

    // EXPIRED / BLOCKED / NOT_REGISTERED = blokir
    return false;
  }
}
