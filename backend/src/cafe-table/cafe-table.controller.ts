import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { CafeTableService } from './cafe-table.service';
import { AuthGuard } from '@nestjs/passport';
import { LicenseService } from '../license/license.service';

@Controller('cafe-table')
export class CafeTableController {
  constructor(
    private readonly service: CafeTableService,
    private readonly licenseService: LicenseService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() body: { tableName: string; capacity?: number }) {
    return this.service.create(body);
  }

  @Post('bulk-generate')
  @UseGuards(AuthGuard('jwt'))
  bulkGenerate(@Body() body: { count: number; prefix: string; startIndex: number; capacity?: number }) {
    return this.service.bulkGenerateTables(body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }

  // ── Session ───────────────────────────────────────────────────────────────

  @Post(':id/open')
  @UseGuards(AuthGuard('jwt'))
  async openSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { customerName?: string; memberId?: number },
    @Request() req: any,
  ) {
    // 🛡️ Proteksi Lisensi VOC ML & Pemotongan Kuota Trial
    const trialRes = await this.licenseService.consumeTrial();
    if (!trialRes.allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'TRIAL_EXHAUSTED',
        message: trialRes.error || 'Kuota coba gratis Anda telah habis. Silakan pilih paket lisensi atau klaim kode voucher untuk melanjutkan.',
        billing: trialRes.billing || this.licenseService.getBilling(),
        trialExhausted: true,
        locked: false, // JANGAN kunci seluruh layar /activate; biarkan meja aktif berjalan dan tampilkan popup
      });
    }

    return this.service.openSession(
      id,
      body.customerName,
      req.user.id,
      body.memberId,
    );
  }

  @Get(':id/active-transaction')
  @UseGuards(AuthGuard('jwt'))
  getActiveTransaction(@Param('id', ParseIntPipe) id: number) {
    return this.service.getActiveTransaction(id);
  }

  @Post(':id/transfer-to-billiard')
  @UseGuards(AuthGuard('jwt'))
  transferToBilliard(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { billiardTableId: number },
  ) {
    return this.service.transferToBilliard(id, body.billiardTableId);
  }

  @Post(':id/checkout')
  @UseGuards(AuthGuard('jwt'))
  checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { method: string; amount: number },
    @Request() req: any,
  ) {
    return this.service.checkout(id, body, req.user.id);
  }

  @Post(':id/close')
  @UseGuards(AuthGuard('jwt'))
  closeSession(@Param('id', ParseIntPipe) id: number) {
    return this.service.closeSession(id);
  }
}
