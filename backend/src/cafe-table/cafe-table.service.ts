import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull, DataSource } from 'typeorm';
import { CafeTable, CafeTableStatus } from './entities/cafe-table.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../transaction/entities/transaction.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { BilliardService } from '../billiard/billiard.service';
import { forwardRef, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

let invoiceCounter = 1;
function genInvoice() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `CAFE-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(invoiceCounter++).padStart(4, '0')}-${Math.floor(Math.random() * 1000)}`;
}

import { FinanceService } from '../finance/finance.service';
import { CashflowType } from '../finance/entities/cashflow.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { TransactionService } from '../transaction/transaction.service';
import { ShiftService } from '../finance/shift.service';
import { AIService } from '../ai/ai.service';

@Injectable()
export class CafeTableService {
  constructor(
    @InjectRepository(CafeTable)
    private cafeTableRepo: Repository<CafeTable>,

    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,

    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,

    private financeService: FinanceService,
    private billiardGateway: BilliardGateway,
    private transactionService: TransactionService,
    private shiftService: ShiftService,

    @Inject(forwardRef(() => BilliardService))
    private billiardService: BilliardService,

    private readonly dataSource: DataSource,
    private readonly aiService: AIService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private openingSessions = new Set<number>();
  private checkingOut = new Set<number>();

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Optimized findAll() for scalability - single query with JOINs
   * Previously had N+1 problem: 1 + N queries for N tables
   * Now uses single query with LEFT JOINs
   */
  async findAll(): Promise<
    (CafeTable & { activeTransaction?: any; grandTotal: number })[]
  > {
    // 1. Fetch all cafe tables
    const tables = await this.cafeTableRepo.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    // 2. Extract active transaction IDs
    const activeTxIds = tables
      .map((t) => t.currentTransactionId)
      .filter((id) => id != null);

    // 3. Fetch active transactions in a single batch query
    let activeTransactions: Transaction[] = [];
    if (activeTxIds.length > 0) {
      activeTransactions = await this.transactionRepo.find({
        where: {
          id: In(activeTxIds),
          status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]),
        },
        relations: [
          'orderItems',
          'orderItems.menuItem',
          'orderItems.menuItem.category',
          'openedBy',
          'createdBy',
          'member',
          'member.tier',
        ],
      });
    }

    // 4. Map transactions back to tables
    return tables.map((t) => {
      const activeTransaction =
        activeTransactions.find((tx) => tx.id === t.currentTransactionId) ||
        null;
      const grandTotal = activeTransaction
        ? Number(activeTransaction.grandTotal || 0)
        : 0;
      return { ...t, activeTransaction, grandTotal };
    });
  }

  async create(data: {
    tableName: string;
    capacity?: number;
  }): Promise<CafeTable> {
    const tableName = data.tableName?.trim();
    if (!tableName) throw new BadRequestException('Nama meja harus diisi.');

    const existing = await this.cafeTableRepo
      .createQueryBuilder('table')
      .where('LOWER(table.tableName) = LOWER(:tableName)', { tableName })
      .getOne();
    if (existing)
      throw new BadRequestException(
        `Meja dengan nama "${tableName}" sudah ada.`,
      );

    const table = this.cafeTableRepo.create({
      tableName: tableName,
      capacity: data.capacity ?? 4,
      status: CafeTableStatus.AVAILABLE,
    });
    const savedTable = await this.cafeTableRepo.save(table);
    this.billiardGateway.broadcastTableUpdate({
      ...savedTable,
      type: 'cafe',
      _action: 'ADD',
    });
    return savedTable;
  }

  async update(
    id: number,
    data: Partial<{ tableName: string; capacity: number }>,
  ): Promise<CafeTable> {
    const table = await this.cafeTableRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!table) throw new NotFoundException(`Meja Cafe #${id} tidak ditemukan`);

    if (data.tableName) {
      const tableName = data.tableName.trim();
      const existing = await this.cafeTableRepo
        .createQueryBuilder('table')
        .where(
          'LOWER(table.tableName) = LOWER(:tableName) AND table.id != :id',
          { tableName, id },
        )
        .getOne();
      if (existing)
        throw new BadRequestException(
          `Meja dengan nama "${tableName}" sudah ada.`,
        );
      table.tableName = tableName;
    }

    if (data.capacity !== undefined) table.capacity = data.capacity;

    const savedTable = await this.cafeTableRepo.save(table);
    this.billiardGateway.broadcastTableUpdate({
      ...savedTable,
      type: 'cafe',
      _action: 'UPDATE',
    });
    return savedTable;
  }

  async remove(id: number): Promise<void> {
    const table = await this.cafeTableRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!table) throw new NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
    if (table.status !== CafeTableStatus.AVAILABLE)
      throw new BadRequestException(
        `Meja tidak bisa dihapus karena statusnya masih ${table.status}. Harap selesaikan sesi/pembayaran terlebih dahulu.`,
      );

    // Soft delete: set deletedAt and rename to avoid unique constraint conflicts
    const timestamp = new Date().getTime();
    table.deletedAt = new Date();
    table.tableName = `${table.tableName} (DELETED-${timestamp})`;
    await this.cafeTableRepo.save(table);
    this.billiardGateway.broadcastTableUpdate({
      id,
      type: 'cafe',
      _action: 'DELETE',
    } as any);
  }

  // ── Session Management ────────────────────────────────────────────────────

  async openSession(
    id: number,
    customerName?: string,
    userId?: number,
    memberId?: number,
  ): Promise<{ cafeTable: CafeTable; transaction: Transaction }> {
    if (this.openingSessions.has(id)) {
      throw new ConflictException('Meja sedang dalam proses pembukaan sesi.');
    }
    this.openingSessions.add(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const table = await queryRunner.manager.findOne(CafeTable, {
        where: { id, deletedAt: IsNull() },
      });
      if (!table)
        throw new NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
      if (table.status === CafeTableStatus.OCCUPIED)
        throw new BadRequestException('Meja sudah terpakai');

      if (memberId) {
        const activeSession = await queryRunner.manager.findOne(Transaction, {
          where: {
            memberId,
            status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]),
          },
        });
        if (activeSession)
          throw new ConflictException('Member ini sudah memiliki sesi aktif.');
      }

      const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
      const activeShift = userId ? await this.shiftService.getActiveShift(userId) : null;

      const tx = queryRunner.manager.create(Transaction, {
        invoiceNumber: genInvoice(),
        customerName: customerName ?? undefined,
        cafeTableId: id,
        status: TransactionStatus.UNPAID,
        type: TransactionType.CAFE,
        cafeTotal: 0,
        billiardTotal: 0,
        grandTotal: 0,
        sessionType: 'cafe-only',
        startTime: new Date(),
        openedByUserId: userId ?? null,
        createdByUserId: userId ?? null,
        memberId: memberId ?? null,
        businessDayId: activeDay.id,
        shiftId: activeShift?.id ?? null,
      });
      const savedTx = await queryRunner.manager.save(tx);

      table.status = CafeTableStatus.OCCUPIED;
      table.currentTransactionId = savedTx.id;
      table.currentCustomer = customerName ?? null;
      await queryRunner.manager.save(table);

      await queryRunner.commitTransaction();

      this.billiardGateway.broadcastTableUpdate({ ...table, type: 'cafe' });

      // Trigger AI Upselling Prompt
      this.aiService.broadcastUpsellPrompt(id, table.tableName);

      this.eventEmitter.emit('session.started', {
        tableName: table.tableName,
        customerName: customerName ?? 'Tamu',
      });

      return { cafeTable: table, transaction: savedTx };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
      this.openingSessions.delete(id);
    }
  }

  async getActiveTransaction(id: number): Promise<Transaction | null> {
    const table = await this.cafeTableRepo.findOne({ where: { id } });
    if (!table || !table.currentTransactionId) return null;

    return this.transactionRepo.findOne({
      where: {
        id: table.currentTransactionId,
        status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]),
      },
      relations: [
        'orderItems',
        'orderItems.menuItem',
        'orderItems.menuItem.category',
        'member',
        'member.tier',
      ],
    });
  }

  // ── Transfer to Billiard ─────────────────────────────────────────────────

  async transferToBilliard(
    cafeTableId: number,
    billiardTableId: number,
  ): Promise<{ billiardTransaction: Transaction }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get data within transaction
      const cafeTable = await queryRunner.manager.findOne(CafeTable, {
        where: { id: cafeTableId },
      });
      if (!cafeTable)
        throw new NotFoundException(
          `Meja Cafe #${cafeTableId} tidak ditemukan`,
        );
      if (
        cafeTable.status !== CafeTableStatus.OCCUPIED ||
        !cafeTable.currentTransactionId
      )
        throw new BadRequestException('Meja cafe tidak memiliki sesi aktif');

      const cafeTxId = cafeTable.currentTransactionId;

      const billiardTx = await queryRunner.manager.findOne(Transaction, {
        where: { tableId: billiardTableId, status: TransactionStatus.UNPAID },
      });
      if (!billiardTx)
        throw new BadRequestException(
          'Meja billiard tujuan tidak memiliki sesi aktif.',
        );

      // 2. Move items
      await queryRunner.manager.update(
        OrderItem,
        { transactionId: cafeTxId },
        { transactionId: billiardTx.id },
      );

      // 3. Clear source cafe table
      cafeTable.status = CafeTableStatus.AVAILABLE;
      cafeTable.currentTransactionId = null;
      cafeTable.currentCustomer = null;
      await queryRunner.manager.save(cafeTable);

      // 4. Update source tx status
      await queryRunner.manager.update(Transaction, cafeTxId, {
        status: TransactionStatus.CANCELLED,
      });

      await queryRunner.commitTransaction();

      // 5. Success broadcast (outside tx)
      await this.transactionService.updateTotals(billiardTx.id);
      this.billiardGateway.broadcastTableUpdate({ ...cafeTable, type: 'cafe' });

      const billiardTable =
        await this.billiardService.getTableById(billiardTableId);
      if (billiardTable) {
        await this.billiardService.attachTransactionData(billiardTable);
        this.billiardGateway.broadcastTableUpdate(billiardTable);
      }

      const updated = await this.transactionService.getTransactionById(
        billiardTx.id,
      );
      return { billiardTransaction: updated };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Checkout ─────────────────────────────────────────────────────────────

  async checkout(
    cafeTableId: number,
    paymentData: { method: string; amount: number },
    userId?: number,
  ): Promise<Transaction> {
    const cafeTable = await this.cafeTableRepo.findOneBy({ id: cafeTableId });
    if (!cafeTable || !cafeTable.currentTransactionId)
      throw new BadRequestException('Tidak ada sesi aktif di meja ini');

    const tx = await this.transactionRepo.findOne({
      where: { id: cafeTable.currentTransactionId },
      relations: [
        'orderItems',
        'orderItems.menuItem',
        'orderItems.menuItem.category',
      ],
    });
    if (!tx) throw new NotFoundException('Transaksi tidak ditemukan');

    // Recalculate total from order items
    const cafeTotal =
      tx.orderItems?.reduce(
        (s, i) => s + Number(i.priceAtOrder) * i.quantity,
        0,
      ) || 0;
    tx.cafeTotal = cafeTotal;
    tx.grandTotal = cafeTotal;
    tx.paidAmount = paymentData.amount;
    tx.status = TransactionStatus.PAID;
    tx.endTime = new Date();
    tx.paymentDetails = [
      { method: paymentData.method, amount: paymentData.amount },
    ];
    if (userId) tx.createdByUserId = userId; // The person who handles the payment/checkout
    await this.transactionRepo.save(tx);

    cafeTable.status = CafeTableStatus.AVAILABLE;
    cafeTable.currentTransactionId = null;
    cafeTable.currentCustomer = null;
    await this.cafeTableRepo.save(cafeTable);
    this.billiardGateway.broadcastTableUpdate({ ...cafeTable, type: 'cafe' });

    // Log financial cashflow
    await this.financeService.logCashflow({
      amount: tx.paidAmount,
      type: CashflowType.IN,
      source: 'sale:cafe',
      referenceId: tx.invoiceNumber,
      description: `Payment for INV: ${tx.invoiceNumber} (${paymentData.method})`,
      businessDayId: tx.businessDayId ?? undefined,
      shiftId: tx.shiftId ?? undefined,
    });

    return tx;
  }

  // ── Close / Force Close ───────────────────────────────────────────────────

  async closeSession(cafeTableId: number): Promise<void> {
    const cafeTable = await this.cafeTableRepo.findOneBy({ id: cafeTableId });
    if (!cafeTable) throw new NotFoundException('Meja tidak ditemukan');
    if (cafeTable.currentTransactionId) {
      await this.transactionRepo.update(cafeTable.currentTransactionId, {
        status: TransactionStatus.CANCELLED,
      });
    }
    cafeTable.status = CafeTableStatus.AVAILABLE;
    cafeTable.currentTransactionId = null;
    cafeTable.currentCustomer = null;
    await this.cafeTableRepo.save(cafeTable);
  }
}
