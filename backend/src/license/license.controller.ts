import { Controller, Get, Post, Body, Res, Sse, Query } from '@nestjs/common';
import type { Response } from 'express';
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
   * Juga mengirim event bernama `license` berisi snapshot status lisensi + `billing`
   * (event bernama tidak masuk ke `onmessage`, jadi listener broadcast lama tidak terganggu).
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
    const licenseInitial$ = defer(() => of(this.licenseService.getState())).pipe(
      map((state) => ({ type: 'license', data: JSON.stringify(state) }))
    );
    const license$ = this.licenseService.license$.pipe(
      filter((v) => v !== null),
      map((state) => ({ type: 'license', data: JSON.stringify(state) }))
    );
    return merge(initial$, licenseInitial$, data$, license$, keepAlive$);
  }

  /**
   * Tagihan QRIS terakhir (snapshot). GET /api/license/billing
   */
  @Get('billing')
  getBilling() {
    const s = this.licenseService.getState();
    return { status: s.status, billing: this.licenseService.getBilling() };
  }

  /**
   * Proxy gambar QRIS tagihan agar browser kasir tidak perlu akses langsung ke VOCML.
   * GET /api/license/billing/qris.png?size=512&t=<amount>
   */
  @Get('billing/qris.png')
  async getBillingQris(@Res() res: Response, @Query('size') size?: string) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const png = await this.licenseService.getBillingQrisPng(Number(size) || 512);
      if (!png) return res.status(404).json({ error: 'no_billing' });
      res.setHeader('Content-Type', 'image/png');
      return res.end(png);
    } catch {
      return res.status(502).json({ error: 'qris_unavailable' });
    }
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
  async getRenewalInfo(@Query('refresh') refresh?: string) {
    return this.licenseService.getRenewalInfo(refresh === 'true');
  }

  /**
   * Endpoint yang dipanggil oleh frontend saat menampilkan toast warning lisensi.
   */
  @Post('notify-warning')
  async triggerWarning() {
    return this.licenseService.triggerExpiryWarning();
  }
}
