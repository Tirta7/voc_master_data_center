"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CafeTableService", {
    enumerable: true,
    get: function() {
        return CafeTableService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _cafetableentity = require("./entities/cafe-table.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _billiardservice = require("../billiard/billiard.service");
const _eventemitter = require("@nestjs/event-emitter");
const _financeservice = require("../finance/finance.service");
const _cashflowentity = require("../finance/entities/cashflow.entity");
const _billiardgateway = require("../socket/billiard.gateway");
const _transactionservice = require("../transaction/transaction.service");
const _shiftservice = require("../finance/shift.service");
const _aiservice = require("../ai/ai.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let invoiceCounter = 1;
function genInvoice() {
    const now = new Date();
    const pad = (n)=>String(n).padStart(2, '0');
    return `CAFE-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(invoiceCounter++).padStart(4, '0')}-${Math.floor(Math.random() * 1000)}`;
}
let CafeTableService = class CafeTableService {
    // ── CRUD ─────────────────────────────────────────────────────────────────
    /**
   * Optimized findAll() for scalability - single query with JOINs
   * Previously had N+1 problem: 1 + N queries for N tables
   * Now uses single query with LEFT JOINs
   */ async findAll() {
        // 1. Fetch all cafe tables
        const tables = await this.cafeTableRepo.find({
            where: {
                deletedAt: (0, _typeorm1.IsNull)()
            },
            order: {
                createdAt: 'DESC'
            }
        });
        // 2. Extract active transaction IDs
        const activeTxIds = tables.map((t)=>t.currentTransactionId).filter((id)=>id != null);
        // 3. Fetch active transactions in a single batch query
        let activeTransactions = [];
        if (activeTxIds.length > 0) {
            activeTransactions = await this.transactionRepo.find({
                where: {
                    id: (0, _typeorm1.In)(activeTxIds),
                    status: (0, _typeorm1.In)([
                        _transactionentity.TransactionStatus.UNPAID,
                        _transactionentity.TransactionStatus.PARTIAL
                    ])
                },
                relations: [
                    'orderItems',
                    'orderItems.menuItem',
                    'orderItems.menuItem.category',
                    'openedBy',
                    'createdBy',
                    'member',
                    'member.tier'
                ]
            });
        }
        // 4. Map transactions back to tables
        return tables.map((t)=>{
            const activeTransaction = activeTransactions.find((tx)=>tx.id === t.currentTransactionId) || null;
            const grandTotal = activeTransaction ? Number(activeTransaction.grandTotal || 0) : 0;
            return {
                ...t,
                activeTransaction,
                grandTotal
            };
        });
    }
    async create(data) {
        const tableName = data.tableName?.trim();
        if (!tableName) throw new _common.BadRequestException('Nama meja harus diisi.');
        const existing = await this.cafeTableRepo.createQueryBuilder('table').where('LOWER(table.tableName) = LOWER(:tableName)', {
            tableName
        }).getOne();
        if (existing) throw new _common.BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);
        const table = this.cafeTableRepo.create({
            tableName: tableName,
            capacity: data.capacity ?? 4,
            status: _cafetableentity.CafeTableStatus.AVAILABLE
        });
        const savedTable = await this.cafeTableRepo.save(table);
        this.billiardGateway.broadcastTableUpdate({
            ...savedTable,
            type: 'cafe',
            _action: 'ADD'
        });
        return savedTable;
    }
    async update(id, data) {
        const table = await this.cafeTableRepo.findOne({
            where: {
                id,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        if (!table) throw new _common.NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
        if (data.tableName) {
            const tableName = data.tableName.trim();
            const existing = await this.cafeTableRepo.createQueryBuilder('table').where('LOWER(table.tableName) = LOWER(:tableName) AND table.id != :id', {
                tableName,
                id
            }).getOne();
            if (existing) throw new _common.BadRequestException(`Meja dengan nama "${tableName}" sudah ada.`);
            table.tableName = tableName;
        }
        if (data.capacity !== undefined) table.capacity = data.capacity;
        const savedTable = await this.cafeTableRepo.save(table);
        this.billiardGateway.broadcastTableUpdate({
            ...savedTable,
            type: 'cafe',
            _action: 'UPDATE'
        });
        return savedTable;
    }
    async remove(id) {
        const table = await this.cafeTableRepo.findOne({
            where: {
                id,
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        if (!table) throw new _common.NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
        if (table.status !== _cafetableentity.CafeTableStatus.AVAILABLE) throw new _common.BadRequestException(`Meja tidak bisa dihapus karena statusnya masih ${table.status}. Harap selesaikan sesi/pembayaran terlebih dahulu.`);
        // Soft delete: set deletedAt and rename to avoid unique constraint conflicts
        const timestamp = new Date().getTime();
        table.deletedAt = new Date();
        table.tableName = `${table.tableName} (DELETED-${timestamp})`;
        await this.cafeTableRepo.save(table);
        this.billiardGateway.broadcastTableUpdate({
            id,
            type: 'cafe',
            _action: 'DELETE'
        });
    }
    // ── Session Management ────────────────────────────────────────────────────
    async openSession(id, customerName, userId, memberId) {
        if (this.openingSessions.has(id)) {
            throw new _common.ConflictException('Meja sedang dalam proses pembukaan sesi.');
        }
        this.openingSessions.add(id);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const table = await queryRunner.manager.findOne(_cafetableentity.CafeTable, {
                where: {
                    id,
                    deletedAt: (0, _typeorm1.IsNull)()
                }
            });
            if (!table) throw new _common.NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
            if (table.status === _cafetableentity.CafeTableStatus.OCCUPIED) throw new _common.BadRequestException('Meja sudah terpakai');
            if (memberId) {
                const activeSession = await queryRunner.manager.findOne(_transactionentity.Transaction, {
                    where: {
                        memberId,
                        status: (0, _typeorm1.In)([
                            _transactionentity.TransactionStatus.UNPAID,
                            _transactionentity.TransactionStatus.PARTIAL
                        ])
                    }
                });
                if (activeSession) throw new _common.ConflictException('Member ini sudah memiliki sesi aktif.');
            }
            const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
            const activeShift = userId ? await this.shiftService.getActiveShift(userId) : null;
            const tx = queryRunner.manager.create(_transactionentity.Transaction, {
                invoiceNumber: genInvoice(),
                customerName: customerName ?? undefined,
                cafeTableId: id,
                status: _transactionentity.TransactionStatus.UNPAID,
                type: _transactionentity.TransactionType.CAFE,
                cafeTotal: 0,
                billiardTotal: 0,
                grandTotal: 0,
                sessionType: 'cafe-only',
                startTime: new Date(),
                openedByUserId: userId ?? null,
                createdByUserId: userId ?? null,
                memberId: memberId ?? null,
                businessDayId: activeDay.id,
                shiftId: activeShift?.id ?? null
            });
            const savedTx = await queryRunner.manager.save(tx);
            table.status = _cafetableentity.CafeTableStatus.OCCUPIED;
            table.currentTransactionId = savedTx.id;
            table.currentCustomer = customerName ?? null;
            await queryRunner.manager.save(table);
            await queryRunner.commitTransaction();
            this.billiardGateway.broadcastTableUpdate({
                ...table,
                type: 'cafe'
            });
            // Trigger AI Upselling Prompt
            this.aiService.broadcastUpsellPrompt(id, table.tableName);
            let cashierName = 'Admin';
            if (activeShift?.user?.name) cashierName = activeShift.user.name;
            this.eventEmitter.emit('session.started', {
                tableName: table.tableName,
                customerName: customerName ?? 'Tamu',
                tableType: 'Cafe',
                userName: cashierName
            });
            return {
                cafeTable: table,
                transaction: savedTx
            };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally{
            await queryRunner.release();
            this.openingSessions.delete(id);
        }
    }
    async getActiveTransaction(id) {
        const table = await this.cafeTableRepo.findOne({
            where: {
                id
            }
        });
        if (!table || !table.currentTransactionId) return null;
        return this.transactionRepo.findOne({
            where: {
                id: table.currentTransactionId,
                status: (0, _typeorm1.In)([
                    _transactionentity.TransactionStatus.UNPAID,
                    _transactionentity.TransactionStatus.PARTIAL
                ])
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category',
                'member',
                'member.tier'
            ]
        });
    }
    // ── Transfer to Billiard ─────────────────────────────────────────────────
    async transferToBilliard(cafeTableId, billiardTableId) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // 1. Get data within transaction
            const cafeTable = await queryRunner.manager.findOne(_cafetableentity.CafeTable, {
                where: {
                    id: cafeTableId
                }
            });
            if (!cafeTable) throw new _common.NotFoundException(`Meja Cafe #${cafeTableId} tidak ditemukan`);
            if (cafeTable.status !== _cafetableentity.CafeTableStatus.OCCUPIED || !cafeTable.currentTransactionId) throw new _common.BadRequestException('Meja cafe tidak memiliki sesi aktif');
            const cafeTxId = cafeTable.currentTransactionId;
            const billiardTx = await queryRunner.manager.findOne(_transactionentity.Transaction, {
                where: {
                    tableId: billiardTableId,
                    status: _transactionentity.TransactionStatus.UNPAID
                }
            });
            if (!billiardTx) throw new _common.BadRequestException('Meja billiard tujuan tidak memiliki sesi aktif.');
            // 2. Move items
            await queryRunner.manager.update(_orderitementity.OrderItem, {
                transactionId: cafeTxId
            }, {
                transactionId: billiardTx.id
            });
            // 3. Clear source cafe table
            cafeTable.status = _cafetableentity.CafeTableStatus.AVAILABLE;
            cafeTable.currentTransactionId = null;
            cafeTable.currentCustomer = null;
            await queryRunner.manager.save(cafeTable);
            // 4. Update source tx status
            await queryRunner.manager.update(_transactionentity.Transaction, cafeTxId, {
                status: _transactionentity.TransactionStatus.CANCELLED
            });
            await queryRunner.commitTransaction();
            // 5. Success broadcast (outside tx)
            await this.transactionService.updateTotals(billiardTx.id);
            this.billiardGateway.broadcastTableUpdate({
                ...cafeTable,
                type: 'cafe'
            });
            const billiardTable = await this.billiardService.getTableById(billiardTableId);
            if (billiardTable) {
                await this.billiardService.attachTransactionData(billiardTable);
                this.billiardGateway.broadcastTableUpdate(billiardTable);
            }
            const updated = await this.transactionService.getTransactionById(billiardTx.id);
            return {
                billiardTransaction: updated
            };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally{
            await queryRunner.release();
        }
    }
    // ── Checkout ─────────────────────────────────────────────────────────────
    async checkout(cafeTableId, paymentData, userId) {
        const cafeTable = await this.cafeTableRepo.findOneBy({
            id: cafeTableId
        });
        if (!cafeTable || !cafeTable.currentTransactionId) throw new _common.BadRequestException('Tidak ada sesi aktif di meja ini');
        const tx = await this.transactionRepo.findOne({
            where: {
                id: cafeTable.currentTransactionId
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category'
            ]
        });
        if (!tx) throw new _common.NotFoundException('Transaksi tidak ditemukan');
        // Recalculate total from order items
        const cafeTotal = tx.orderItems?.reduce((s, i)=>s + Number(i.priceAtOrder) * i.quantity, 0) || 0;
        tx.cafeTotal = cafeTotal;
        tx.grandTotal = cafeTotal;
        tx.paidAmount = paymentData.amount;
        tx.status = _transactionentity.TransactionStatus.PAID;
        tx.endTime = new Date();
        tx.paymentDetails = [
            {
                method: paymentData.method,
                amount: paymentData.amount
            }
        ];
        if (userId) tx.createdByUserId = userId; // The person who handles the payment/checkout
        await this.transactionRepo.save(tx);
        cafeTable.status = _cafetableentity.CafeTableStatus.AVAILABLE;
        cafeTable.currentTransactionId = null;
        cafeTable.currentCustomer = null;
        await this.cafeTableRepo.save(cafeTable);
        this.billiardGateway.broadcastTableUpdate({
            ...cafeTable,
            type: 'cafe'
        });
        // Log financial cashflow
        await this.financeService.logCashflow({
            amount: tx.paidAmount,
            type: _cashflowentity.CashflowType.IN,
            source: 'sale:cafe',
            referenceId: tx.invoiceNumber,
            description: `Payment for INV: ${tx.invoiceNumber} (${paymentData.method})`,
            businessDayId: tx.businessDayId ?? undefined,
            shiftId: tx.shiftId ?? undefined
        });
        return tx;
    }
    // ── Close / Force Close ───────────────────────────────────────────────────
    async closeSession(cafeTableId) {
        const cafeTable = await this.cafeTableRepo.findOneBy({
            id: cafeTableId
        });
        if (!cafeTable) throw new _common.NotFoundException('Meja tidak ditemukan');
        if (cafeTable.currentTransactionId) {
            await this.transactionRepo.update(cafeTable.currentTransactionId, {
                status: _transactionentity.TransactionStatus.CANCELLED
            });
        }
        cafeTable.status = _cafetableentity.CafeTableStatus.AVAILABLE;
        cafeTable.currentTransactionId = null;
        cafeTable.currentCustomer = null;
        await this.cafeTableRepo.save(cafeTable);
    }
    constructor(cafeTableRepo, transactionRepo, orderItemRepo, financeService, billiardGateway, transactionService, shiftService, billiardService, dataSource, aiService, eventEmitter){
        this.cafeTableRepo = cafeTableRepo;
        this.transactionRepo = transactionRepo;
        this.orderItemRepo = orderItemRepo;
        this.financeService = financeService;
        this.billiardGateway = billiardGateway;
        this.transactionService = transactionService;
        this.shiftService = shiftService;
        this.billiardService = billiardService;
        this.dataSource = dataSource;
        this.aiService = aiService;
        this.eventEmitter = eventEmitter;
        this.openingSessions = new Set();
        this.checkingOut = new Set();
    }
};
CafeTableService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_cafetableentity.CafeTable)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(7, (0, _common.Inject)((0, _common.forwardRef)(()=>_billiardservice.BilliardService))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _financeservice.FinanceService === "undefined" ? Object : _financeservice.FinanceService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof _transactionservice.TransactionService === "undefined" ? Object : _transactionservice.TransactionService,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService,
        typeof _billiardservice.BilliardService === "undefined" ? Object : _billiardservice.BilliardService,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource,
        typeof _aiservice.AIService === "undefined" ? Object : _aiservice.AIService,
        typeof _eventemitter.EventEmitter2 === "undefined" ? Object : _eventemitter.EventEmitter2
    ])
], CafeTableService);

//# sourceMappingURL=cafe-table.service.js.map