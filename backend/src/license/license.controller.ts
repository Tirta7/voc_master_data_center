import { Controller, Get, Post, Body, Res, Sse, Query } from '@nestjs/common';
import { Observable, map, filter, merge, interval, defer, of } from 'rxjs';
import { LicenseService } from './license.service';

@Controller('api/license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('status')
  async getStatus(@Query('force') force?: string) {
    if (force === 'true') {
      await this.licenseService.checkLicense();
    }
    return this.licenseService.getState();
  }

  @Post('activate')
  async activate(@Body() body: { licenseKey: string }) {
    return this.licenseService.activateLicense(body.licenseKey);
  }

  /**
   * Daftar pesan broadcast aktif dari VOCML (snapshot).
   * GET /api/license/messages?refresh=true
   */
  @Get('messages')
  async getMessages(@Query('refresh') refresh?: string) {
    if (refresh === 'true') await this.licenseService.fetchMessages();
    return this.licenseService.getMessages();
  }

  /**
   * SSE endpoint — Frontend subscribe ke sini untuk menerima broadcast real-time
   * GET /api/license/stream
   * Selalu mengirim daftar LENGKAP pesan aktif (list kosong = semua pesan dihapus/nonaktif).
   */
  @Sse('stream')
  stream(): Observable<any> {
    const keepAlive$ = interval(30000).pipe(map(() => ({ data: '', type: 'ping' })));
    const initial$ = defer(() => of(this.licenseService.getMessages())).pipe(
      map((broadcasts) => ({ data: JSON.stringify(broadcasts) }))
    );
    const data$ = this.licenseService.broadcast$.pipe(
      map((broadcasts) => ({ data: JSON.stringify(broadcasts) }))
    );
    return merge(initial$, data$, keepAlive$);
  }

  /**
   * SSE endpoint — Push status lisensi ke frontend INSTAN saat berubah
   * GET /api/license/status-stream
   */
  @Sse('status-stream')
  statusStream(): Observable<any> {
    const keepAlive$ = interval(30000).pipe(map(() => ({ data: '', type: 'ping' })));
    const data$ = this.licenseService.statusChange$.pipe(
      filter((v): v is NonNullable<typeof v> => v !== null), // skip nilai awal null BehaviorSubject
      map((statusData) => ({ data: JSON.stringify(statusData) }))
    );
    return merge(data$, keepAlive$);
  }
  /**
   * Endpoint untuk mengambil informasi QRIS Dinamis dan Nominal Perpanjangan
   */
  @Get('renewal-info')
  async getRenewalInfo() {
    return this.licenseService.getRenewalInfo();
  }

  /**
   * Endpoint yang dipanggil oleh frontend saat menampilkan toast warning lisensi.
   */
  @Post('notify-warning')
  async triggerWarning() {
    return this.licenseService.triggerExpiryWarning();
  }
}
