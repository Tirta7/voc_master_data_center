import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { CafeTable, CafeTableStatus } from './entities/cafe-table.entity';
import { Transaction, TransactionStatus } from '../transaction/entities/transaction.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { BilliardService } from '../billiard/billiard.service';
import { forwardRef, Inject } from '@nestjs/common';

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

        @Inject(forwardRef(() => BilliardService))
        private billiardService: BilliardService,
    ) { }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    async findAll(): Promise<(CafeTable & { activeTransaction?: any; grandTotal: number })[]> {
        const tables = await this.cafeTableRepo.find({ order: { createdAt: 'DESC' } });

        const result = [];
        for (const t of tables) {
            let activeTransaction = null;
            let grandTotal = 0;
            if (t.currentTransactionId) {
                activeTransaction = await this.transactionRepo.findOne({
                    where: { id: t.currentTransactionId, status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]) },
                    relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'openedBy', 'createdBy', 'member', 'member.tier'],
                });
                if (activeTransaction) {
                    grandTotal = Number(activeTransaction.grandTotal || 0);
                }
            }
            result.push({ ...t, activeTransaction, grandTotal });
        }
        return result;
    }

    async create(data: { tableName: string; capacity?: number }): Promise<CafeTable> {
        const tableName = data.tableName?.trim();
        if (!tableName) throw new BadRequestException('Nama meja harus diisi.');

        const existing = await this.cafeTableRepo
            .createQueryBuilder('table')
            .where('LOWER(table.tableName) = LOWER(:tableName)', { tableName })
            .getOne();
        if (existing) throw new BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);

        const table = this.cafeTableRepo.create({
            tableName: tableName,
            capacity: data.capacity ?? 4,
            status: CafeTableStatus.AVAILABLE,
        });
        const savedTable = await this.cafeTableRepo.save(table);
        this.billiardGateway.broadcastTableUpdate({ ...savedTable, type: 'cafe', _action: 'ADD' });
        return savedTable;
    }

    async update(id: number, data: Partial<{ tableName: string; capacity: number }>): Promise<CafeTable> {
        const table = await this.cafeTableRepo.findOneBy({ id });
        if (!table) throw new NotFoundException(`Meja Cafe #${id} tidak ditemukan`);

        if (data.tableName) {
            const tableName = data.tableName.trim();
            const existing = await this.cafeTableRepo
                .createQueryBuilder('table')
                .where('LOWER(table.tableName) = LOWER(:tableName) AND table.id != :id', { tableName, id })
                .getOne();
            if (existing) throw new BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);
            table.tableName = tableName;
        }

        if (data.capacity !== undefined) table.capacity = data.capacity;

        const savedTable = await this.cafeTableRepo.save(table);
        this.billiardGateway.broadcastTableUpdate({ ...savedTable, type: 'cafe', _action: 'UPDATE' });
        return savedTable;
    }

    async remove(id: number): Promise<void> {
        const table = await this.cafeTableRepo.findOneBy({ id });
        if (!table) throw new NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
        if (table.status === CafeTableStatus.OCCUPIED)
            throw new BadRequestException('Meja sedang terpakai, tidak bisa dihapus');

        await this.cafeTableRepo.remove(table);
        this.billiardGateway.broadcastTableUpdate({ id, type: 'cafe', _action: 'DELETE' } as any);
    }

    // ── Session Management ────────────────────────────────────────────────────

    async openSession(id: number, customerName?: string, userId?: number, memberId?: number): Promise<{ cafeTable: CafeTable; transaction: Transaction }> {
        const table = await this.cafeTableRepo.findOneBy({ id });
        if (!table) throw new NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
        if (table.status === CafeTableStatus.OCCUPIED)
            throw new BadRequestException('Meja sudah terpakai');

        if (memberId) {
            const activeSession = await this.transactionRepo.findOne({
                where: {
                    memberId,
                    status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL])
                }
            });

            if (activeSession) {
                throw new ConflictException('Member ini sudah memiliki sesi aktif di meja lain.');
            }
        }

        const tx = this.transactionRepo.create({
            invoiceNumber: genInvoice(),
            customerName: customerName ?? undefined,
            cafeTableId: id,
            tableId: null as any,
            status: TransactionStatus.UNPAID,
            cafeTotal: 0,
            billiardTotal: 0,
            grandTotal: 0,
            sessionType: 'cafe-only',
            startTime: new Date(),
            openedByUserId: userId,
            createdByUserId: userId,
            memberId: memberId || null,
        });
        const savedTx = await this.transactionRepo.save(tx);

        table.status = CafeTableStatus.OCCUPIED;
        table.currentTransactionId = savedTx.id;
        table.currentCustomer = customerName ?? null;
        await this.cafeTableRepo.save(table);
        this.billiardGateway.broadcastTableUpdate({ ...table, type: 'cafe' });

        return { cafeTable: table, transaction: savedTx };
    }

    async getActiveTransaction(id: number): Promise<Transaction | null> {
        const table = await this.cafeTableRepo.findOne({ where: { id } });
        if (!table || !table.currentTransactionId) return null;

        return this.transactionRepo.findOne({
            where: { id: table.currentTransactionId, status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]) },
            relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'member', 'member.tier'],
        });
    }

    // ── Transfer to Billiard ─────────────────────────────────────────────────

    async transferToBilliard(cafeTableId: number, billiardTableId: number): Promise<{ billiardTransaction: Transaction }> {
        // 1. Get cafe table & its active transaction
        const cafeTable = await this.cafeTableRepo.findOneBy({ id: cafeTableId });
        if (!cafeTable) throw new NotFoundException(`Meja Cafe #${cafeTableId} tidak ditemukan`);
        if (cafeTable.status !== CafeTableStatus.OCCUPIED || !cafeTable.currentTransactionId)
            throw new BadRequestException('Meja cafe tidak memiliki sesi aktif');

        const cafeTxId = cafeTable.currentTransactionId;

        // 2. Get target billiard transaction
        const billiardTx = await this.transactionRepo.findOne({
            where: { tableId: billiardTableId, status: TransactionStatus.UNPAID },
        });
        if (!billiardTx) throw new BadRequestException('Meja billiard tidak memiliki sesi aktif. Silahkan buka meja billiard tujuan terlebih dahulu.');

        // 3. Move all order items from cafe tx → billiard tx
        await this.orderItemRepo.update(
            { transactionId: cafeTxId },
            { transactionId: billiardTx.id },
        );

        // 4. Update totals for the target billiard transaction
        await this.transactionService.updateTotals(billiardTx.id);

        // 5. Update totals for the source cafe transaction (it should drop to 0)
        await this.transactionService.updateTotals(cafeTxId);

        // 6. Cancel the now-empty cafe transaction & free the cafe table
        await this.transactionRepo.update(cafeTxId, { status: TransactionStatus.CANCELLED });

        cafeTable.status = CafeTableStatus.AVAILABLE;
        cafeTable.currentTransactionId = null;
        cafeTable.currentCustomer = null;
        await this.cafeTableRepo.save(cafeTable);

        // 7. Success broadcast
        this.billiardGateway.broadcastTableUpdate({ ...cafeTable, type: 'cafe' });

        // 8. Broadcast target billiard table update for real-time dashboard sync
        const billiardTable = await this.billiardService.getTableById(billiardTableId);
        if (billiardTable) {
            await this.billiardService.attachTransactionData(billiardTable);
            this.billiardGateway.broadcastTableUpdate(billiardTable);
        }

        const updated = await this.transactionService.getTransactionById(billiardTx.id);
        return { billiardTransaction: updated };
    }

    // ── Checkout ─────────────────────────────────────────────────────────────

    async checkout(cafeTableId: number, paymentData: { method: string; amount: number }, userId?: number): Promise<Transaction> {
        const cafeTable = await this.cafeTableRepo.findOneBy({ id: cafeTableId });
        if (!cafeTable || !cafeTable.currentTransactionId)
            throw new BadRequestException('Tidak ada sesi aktif di meja ini');

        const tx = await this.transactionRepo.findOne({
            where: { id: cafeTable.currentTransactionId },
            relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category'],
        });
        if (!tx) throw new NotFoundException('Transaksi tidak ditemukan');

        // Recalculate total from order items
        const cafeTotal = tx.orderItems?.reduce((s, i) => s + Number(i.priceAtOrder) * i.quantity, 0) || 0;
        tx.cafeTotal = cafeTotal;
        tx.grandTotal = cafeTotal;
        tx.paidAmount = paymentData.amount;
        tx.status = TransactionStatus.PAID;
        tx.endTime = new Date();
        tx.paymentDetails = [{ method: paymentData.method, amount: paymentData.amount }];
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
        });

        return tx;
    }

    // ── Close / Force Close ───────────────────────────────────────────────────

    async closeSession(cafeTableId: number): Promise<void> {
        const cafeTable = await this.cafeTableRepo.findOneBy({ id: cafeTableId });
        if (!cafeTable) throw new NotFoundException('Meja tidak ditemukan');
        if (cafeTable.currentTransactionId) {
            await this.transactionRepo.update(cafeTable.currentTransactionId, { status: TransactionStatus.CANCELLED });
        }
        cafeTable.status = CafeTableStatus.AVAILABLE;
        cafeTable.currentTransactionId = null;
        cafeTable.currentCustomer = null;
        await this.cafeTableRepo.save(cafeTable);
    }
}
