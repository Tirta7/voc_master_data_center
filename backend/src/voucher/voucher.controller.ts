import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VoucherService } from './voucher.service';
import { Voucher } from './entities/voucher.entity';

@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll() {
    return this.voucherService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string) {
    return this.voucherService.findOne(+id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() data: Partial<Voucher>) {
    return this.voucherService.create(data);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: string, @Body() data: Partial<Voucher>) {
    return this.voucherService.update(+id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async delete(@Param('id') id: string) {
    return this.voucherService.delete(+id);
  }

  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  async validateVoucher(
    @Body() data: { 
      code: string; 
      transactionSubtotal?: number;
      tableStartTime?: string;   // ISO timestamp, opsional (default: sekarang)
      memberId?: number;         // untuk validasi voucher member-specific
      usageContext?: 'SESSION_START' | 'PAYMENT';
    }, 
    @Request() req: any,
  ) {
    const tableStartTime = data.tableStartTime ? new Date(data.tableStartTime) : undefined;
    const voucher = await this.voucherService.validateVoucher(
      data.code, 
      req.user?.id, 
      data.transactionSubtotal ?? 0,
      tableStartTime,
      data.memberId,
      data.usageContext,
    );

    // Sertakan effect preview agar frontend bisa tampilkan summary ke kasir
    const effect = this.voucherService.calculateVoucherEffect(voucher, data.transactionSubtotal ?? 0);
    return { voucher, effect };
  }
}
