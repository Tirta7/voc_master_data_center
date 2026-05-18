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

    // OFFLINE tetap diizinkan (toleransi 7 hari dikelola di service)
    if (this.licenseService.getState().status === 'OFFLINE') return true;

    // ACTIVE atau GRACE = izinkan
    if (!this.licenseService.isLocked()) return true;

    // EXPIRED / BLOCKED / NOT_REGISTERED = blokir
    return false;
  }
}
