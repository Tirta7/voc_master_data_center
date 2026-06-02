import { Controller, Get, Post, Body, Res, Sse, Query } from '@nestjs/common';
import { Observable, map, filter, merge, interval } from 'rxjs';
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
   * SSE endpoint — Frontend subscribe ke sini untuk menerima broadcast real-time
   * GET /api/license/stream
   */
  @Sse('stream')
  stream(): Observable<any> {
    const keepAlive$ = interval(30000).pipe(map(() => ({ data: '', type: 'ping' })));
    const data$ = this.licenseService.broadcast$.pipe(
      map((broadcasts) => ({ data: JSON.stringify(broadcasts) }))
    );
    return merge(data$, keepAlive$);
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
}
