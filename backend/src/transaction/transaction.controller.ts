import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionService } from './transaction.service';
import { InvoiceService } from './invoice.service';
import { HardwareService } from '../hardware/hardware.service';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly invoiceService: InvoiceService,
    private readonly hardwareService: HardwareService,
  ) {}

  @Get('debt')
  async getDebtTransactions() {
    return this.transactionService.getDebtTransactions();
  }

  @Get('debt/count')
  async getDebtCount() {
    return this.transactionService.getDebtCount();
  }

  /**
   * POST /transactions/:id/multi-payer
   * Pembayaran per orang dengan rincian item tertentu.
   */
  @Post(':id/multi-payer')
  async processMultiPayer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body()
    data: {
      orderItemIds: number[];
      payerName: string;
      paymentMethod: string;
      billiardPortion?: number;
    },
  ) {
    this.logger.log(
      `Incoming multi-payer request for Transaction ID: ${id} at ${new Date().toISOString()}`,
    );
    this.logger.log(`Payload: ${JSON.stringify(data)}`);
    try {
      const result = await this.transactionService.processMultiPayerPayment(
        id,
        data,
        req.user.id,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[Controller] Multi-payer FAILED: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * POST /transactions/:id/pay-items
   * Bayar item tertentu saja (Pay per Item)
   */
  @Post(':id/pay-items')
  async payItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { orderItemIds: number[]; paymentMethod: string },
  ) {
    return this.transactionService.paySelectedItems(
      id,
      data.orderItemIds,
      data.paymentMethod,
    );
  }

  @Get('table/:tableId')
  async getTableTransaction(
    @Param('tableId', ParseIntPipe) tableId: number,
    @Query('type') type?: 'billiard' | 'cafe',
  ) {
    let transaction;

    if (type === 'cafe') {
      transaction =
        await this.transactionService.getActiveTransactionByCafeTable(tableId);
    } else if (type === 'billiard') {
      transaction =
        await this.transactionService.getActiveTransactionByTable(tableId);
    } else {
      // Original fallback logic for backward compatibility
      transaction =
        await this.transactionService.getActiveTransactionByTable(tableId);
      if (!transaction) {
        transaction =
          await this.transactionService.getActiveTransactionByCafeTable(
            tableId,
          );
      }
    }

    if (!transaction)
      throw new NotFoundException('No active transaction found for this table');
    return transaction;
  }

  @Get('invoice/:invoiceNumber')
  async getByInvoiceNumber(@Param('invoiceNumber') invoiceNumber: string) {
    return this.transactionService.getTransactionInfoByInvoice(invoiceNumber);
  }

  @Get(':id')
  async getTransaction(@Param('id', ParseIntPipe) id: number) {
    return this.transactionService.getTransactionById(id);
  }

  @Post('move')
  async moveTable(@Body() data: { fromTableId: number; toTableId: number }) {
    await this.transactionService.moveTable(data.fromTableId, data.toTableId);
    return { success: true };
  }

  @Post(':id/pay')
  async pay(
    @Param('id', ParseIntPipe) id: number,
    @Body() paymentDetails: any,
    @Request() req: any,
  ) {
    this.logger.log(
      `[Controller] pay called for Transaction ID: ${id}. Payload: ${JSON.stringify(paymentDetails)}`,
    );
    try {
      return await this.transactionService.processPayment(
        id,
        paymentDetails,
        req.user?.id,
      );
    } catch (error) {
      this.logger.error(
        `[Controller] pay FAILED for ID: ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/print')
  async printInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body('printerIp') ip: string,
  ) {
    const transaction = await this.transactionService.getTransactionById(id);
    const invoiceText =
      await this.invoiceService.generateThermalInvoice(transaction);

    // Send to printer
    await this.hardwareService.printRaw(
      ip || '192.168.1.100',
      9100,
      invoiceText,
    );
    return { success: true };
  }

  @Get(':id/invoice')
  async getInvoiceText(@Param('id', ParseIntPipe) id: number) {
    return { text: 'Invoice text will go here' };
  }

  /**
   * POST /transactions/payment/:id/print
   * Cetak ulang struk pembayaran individu
   */
  @Post('payment/:id/print')
  async printPaymentReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Body('printerIp') ip: string,
  ) {
    return this.transactionService.printPaymentReceipt(id, ip);
  }

  @Post('merge')
  async mergeTransactions(
    @Body() data: { sourceTableId: number; targetTableId: number; type?: 'billiard' | 'cafe' },
  ) {
    return this.transactionService.mergeTransactions(
      data.sourceTableId,
      data.targetTableId,
      data.type,
    );
  }

  @Post(':id/hold')
  async hold(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { customerPhone?: string; customerName?: string },
  ) {
    return this.transactionService.holdTransaction(
      id,
      data.customerPhone,
      data.customerName,
    );
  }

  /**
   * GET /transactions/:id/split-evenly?peopleCount=4
   * Hitung bagi rata estimasi tagihan
   */
  @Get(':id/split-evenly')
  async splitEvenly(
    @Param('id', ParseIntPipe) id: number,
    @Query('peopleCount', new DefaultValuePipe(1), ParseIntPipe)
    peopleCount: number,
  ) {
    return this.transactionService.calculateSplitEvenly(id, peopleCount);
  }

  @Post(':id/voucher/apply')
  async applyVoucher(
    @Param('id', ParseIntPipe) id: number,
    @Body('code') code: string,
    @Request() req: any,
  ) {
    return this.transactionService.applyVoucher(id, code, req.user?.id);
  }

  @Post(':id/voucher/remove')
  async removeVoucher(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionService.removeVoucher(id);
  }

  @Post(':id/rating')
  async submitRating(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { waiterRating: number; kasirRating: number; ratingMessage?: string },
  ) {
    return this.transactionService.submitRating(id, data.waiterRating, data.kasirRating, data.ratingMessage);
  }
}
