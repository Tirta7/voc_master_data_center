import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Transaction, TransactionStatus } from '../transaction/entities/transaction.entity';
import { Table, TableStatus } from '../billiard/entities/table.entity';
import { CafeTable, CafeTableStatus } from '../cafe-table/entities/cafe-table.entity';
import { TransactionService } from '../transaction/transaction.service';
import { SettingsService } from '../settings/settings.service';
import { EventsGateway } from '../socket/events.gateway';

export class PaymentNotificationDto {
  provider?: string;
  source_name?: string;
  method?: string;
  amount?: number | string;
  title?: string;
  text?: string;
  secret?: string;
  [key: string]: any;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger('WebhookService');

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(CafeTable)
    private readonly cafeTableRepository: Repository<CafeTable>,
    @Inject(forwardRef(() => TransactionService))
    private readonly transactionService: TransactionService,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Parse amount dari field `amount` atau extract dari `text`
   */
  private parseAmount(amountRaw: any, textRaw?: string): number {
    if (typeof amountRaw === 'number' && !isNaN(amountRaw) && amountRaw > 0) {
      return Math.round(amountRaw);
    }
    if (typeof amountRaw === 'string') {
      const clean = amountRaw.replace(/[^0-9]/g, '');
      if (clean) return parseInt(clean, 10);
    }
    if (textRaw) {
      const m =
        textRaw.match(/(?:Rp\.?|IDR)\s*([\d\.,]+)/i) ||
        textRaw.match(/([\d\.,]+)\s*(?:berhasil|sukses|masuk|diterima)/i);
      if (m && m[1]) {
        const clean = m[1].replace(/[^0-9]/g, '');
        if (clean) return parseInt(clean, 10);
      }
    }
    return 0;
  }

  /**
   * Validasi SECRET_KEY dari header `X-VOCML-Secret`
   */
  async validateSecretKey(incomingSecret?: string): Promise<boolean> {
    const settings = await this.settingsService.getSettings();
    const validSecrets = [
      settings.paymentWebhookSecret,
      this.configService.get<string>('PAYMENT_WEBHOOK_SECRET'),
      this.configService.get<string>('VOCML_SECRET_KEY'),
      this.configService.get<string>('VOCML_SECRET'),
    ].filter(Boolean) as string[];

    if (validSecrets.length === 0) {
      // Jika belum ada secret yang diatur, izinkan fallback bawaan
      validSecrets.push('VOCML_UNIVERSAL_SECRET_2026');
    }

    if (!incomingSecret) return false;
    const cleanSecret = incomingSecret.trim().replace(/^Bearer\s+/i, '');
    return validSecrets.some((s) => s.trim() === cleanSecret);
  }

  /**
   * Handler utama webhook payment notification
   */
  async handlePaymentNotification(
    payload: PaymentNotificationDto,
    secretHeader?: string,
  ) {
    this.logger.log(
      `[Webhook Notification] Received: ${JSON.stringify(payload)} | Header: ${secretHeader ? 'PROVIDED' : 'NONE'}`,
    );

    // 1. Validasi Secret Key
    const incomingSecret = secretHeader || payload.secret;
    const isValid = await this.validateSecretKey(incomingSecret);
    if (!isValid) {
      this.logger.warn(
        `[Webhook Notification] ❌ Unauthorized: Secret mismatch or missing (provided: "${incomingSecret}")`,
      );
      throw new UnauthorizedException(
        'Akses ditolak: X-VOCML-Secret tidak valid atau tidak cocok dengan pengaturan kasir.',
      );
    }

    // 2. Parse & Validasi Amount
    const amount = this.parseAmount(payload.amount, payload.text);
    if (!amount || amount <= 0) {
      this.logger.warn(
        `[Webhook Notification] ❌ Bad Request: Amount tidak terbaca dari payload`,
      );
      throw new BadRequestException(
        'Nominal pembayaran tidak valid atau bernilai 0.',
      );
    }

    const provider = String(payload.provider || 'UNIVERSAL').toUpperCase();
    const methodType = String(payload.method || 'QRIS').toUpperCase();
    const sourceName =
      payload.source_name ||
      `${payload.provider || 'Bank'} (${payload.method || 'QRIS'})`;

    this.logger.log(
      `[Webhook Notification] Processing: Rp ${amount.toLocaleString('id-ID')} via ${sourceName} [${provider}]`,
    );

    // 3. Cari Transaksi yang Sedang Menunggu Pembayaran
    const candidates = await this.transactionRepository.find({
      where: [
        { status: TransactionStatus.UNPAID },
        { status: TransactionStatus.PARTIAL },
      ],
      relations: [
        'table',
        'cafeTable',
        'orderItems',
        'orderItems.menuItem',
        'payments',
        'member',
      ],
      order: { updatedAt: 'DESC' },
      take: 60,
    });

    let matchedTx: Transaction | null = null;

    // A. Cek kandidat yang nominal sisa / totalnya persis sama dengan amount
    const matchingList: { tx: Transaction; remaining: number; isWaiting: boolean }[] = [];

    for (const tx of candidates) {
      // Pastikan transient totals sudah dihitung jika meja masih aktif
      try {
        await this.transactionService.calculateTransientTotals(tx);
      } catch {}

      const grandTotal = Math.round(Number(tx.grandTotal || 0));
      const paidAmount = Math.round(Number(tx.paidAmount || 0));
      const remaining = Math.max(0, grandTotal - paidAmount);

      const isMatch = remaining === amount || (remaining === 0 && grandTotal === amount);
      if (isMatch) {
        const isWaiting =
          tx.table?.status === TableStatus.WAITING_PAYMENT ||
          tx.cafeTable?.status === CafeTableStatus.OCCUPIED;
        matchingList.push({ tx, remaining, isWaiting });
      }
    }

    if (matchingList.length > 0) {
      // Prioritaskan meja dengan status WAITING_PAYMENT terlebih dahulu, lalu yang paling baru
      matchingList.sort((a, b) => {
        if (a.isWaiting && !b.isWaiting) return -1;
        if (!a.isWaiting && b.isWaiting) return 1;
        return (
          new Date(b.tx.updatedAt || b.tx.createdAt).getTime() -
          new Date(a.tx.updatedAt || a.tx.createdAt).getTime()
        );
      });
      matchedTx = matchingList[0].tx;
    }

    // 4. Jika Transaksi Cocok Ditemukan
    if (matchedTx) {
      this.logger.log(
        `[Webhook Notification] ✅ MATCH FOUND! TX #${matchedTx.invoiceNumber} (ID: ${matchedTx.id}) -> Rp ${amount}`,
      );

      // Jalankan pelunasan transaksi
      const paymentMethodRecord = sourceName || `${provider} ${methodType}`;
      const payResult = await this.transactionService.processPayment(
        matchedTx.id,
        {
          amount: amount,
          method: paymentMethodRecord,
          payer:
            matchedTx.customerName ||
            matchedTx.member?.name ||
            'Pelanggan',
          note: `Auto-Lunas Webhook (${sourceName})`,
        },
        1, // System / Admin ID
      );

      const tableName =
        matchedTx.table?.tableName ||
        matchedTx.cafeTable?.tableName ||
        'Order Cabinet';
      const customerName =
        matchedTx.customerName ||
        matchedTx.member?.name ||
        'Pelanggan';

      const socketPayload = {
        transactionId: matchedTx.id,
        invoiceNumber: matchedTx.invoiceNumber,
        tableId:
          matchedTx.tableId ||
          matchedTx.table?.id ||
          matchedTx.cafeTable?.id ||
          null,
        tableName: tableName,
        customerName: customerName,
        amount: amount,
        provider: provider,
        source_name: sourceName,
        method: methodType,
        transaction: payResult,
        status: 'PAID',
        paidAmount: amount,
        timestamp: new Date().toISOString(),
      };

      // ── TRIGGER REAL-TIME KE LAYAR KASIR & CFD ───────────────────────
      try {
        // Layar Kasir: Tutup modal & trigger auto-print
        this.eventsGateway.server.emit('payment_webhook_received', socketPayload);
        this.eventsGateway.server.emit('payment_notification_success', socketPayload);

        // Layar CFD: Tampilkan animasi centang hijau besar + putar audio konfirmasi
        this.eventsGateway.server.emit('cfd_payment_success', socketPayload);

        // Update state display CFD agar sinkron
        this.eventsGateway.server.emit('billing_payment_state', {
          ...socketPayload,
          remaining: 0,
          paidAmount: amount,
          status: 'PAID',
        });
      } catch (err: any) {
        this.logger.error(`Failed to emit socket events: ${err?.message || err}`);
      }

      return {
        success: true,
        matched: true,
        message: `Pembayaran Rp ${amount.toLocaleString('id-ID')} berhasil dicocokkan & dilunaskan via ${sourceName}`,
        transactionId: matchedTx.id,
        invoiceNumber: matchedTx.invoiceNumber,
        tableName: tableName,
        amount: amount,
        source_name: sourceName,
        method: methodType,
        provider: provider,
      };
    }

    // 5. Jika TIDAK Ditemukan Tagihan yang Pas
    this.logger.warn(
      `[Webhook Notification] ⚠️ NO MATCH: Tidak ada tagihan pending dengan nominal pas Rp ${amount.toLocaleString('id-ID')}`,
    );

    // Kirim notifikasi broadcast ke kasir agar kasir tetap tahu ada uang masuk
    try {
      this.eventsGateway.server.emit('payment_webhook_unmatched', {
        amount,
        source_name: sourceName,
        provider,
        method: methodType,
        title: payload.title || 'Pembayaran Masuk',
        text: payload.text || '',
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return {
      success: false,
      matched: false,
      message: `Notifikasi diterima, namun tidak ada tagihan kasir/meja pending dengan nominal Rp ${amount.toLocaleString('id-ID')}`,
      amount,
      source_name: sourceName,
    };
  }
}
