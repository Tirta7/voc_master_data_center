import { Controller, Get, Post, Body, Res, Sse, Query } from '@nestjs/common';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
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
  stream(): Observable<{ data: string }> {
    return this.licenseService.broadcast$.pipe(
      map((broadcasts) => ({ data: JSON.stringify(broadcasts) }))
    );
  }
}
