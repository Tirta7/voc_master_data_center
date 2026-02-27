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
const _financeservice = require("../finance/finance.service");
const _cashflowentity = require("../finance/entities/cashflow.entity");
const _billiardgateway = require("../socket/billiard.gateway");
const _transactionservice = require("../transaction/transaction.service");
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
    async findAll() {
        const tables = await this.cafeTableRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
        const result = [];
        for (const t of tables){
            let activeTransaction = null;
            let grandTotal = 0;
            if (t.currentTransactionId) {
                activeTransaction = await this.transactionRepo.findOne({
                    where: {
                        id: t.currentTransactionId,
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
                if (activeTransaction) {
                    grandTotal = Number(activeTransaction.grandTotal || 0);
                }
            }
            result.push({
                ...t,
                activeTransaction,
                grandTotal
            });
        }
        return result;
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
        return this.cafeTableRepo.save(table);
    }
    async update(id, data) {
        const table = await this.cafeTableRepo.findOneBy({
            id
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
        return this.cafeTableRepo.save(table);
    }
    async remove(id) {
        const table = await this.cafeTableRepo.findOneBy({
            id
        });
        if (!table) throw new _common.NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
        if (table.status === _cafetableentity.CafeTableStatus.OCCUPIED) throw new _common.BadRequestException('Meja sedang terpakai, tidak bisa dihapus');
        await this.cafeTableRepo.remove(table);
    }
    // ── Session Management ────────────────────────────────────────────────────
    async openSession(id, customerName, userId, memberId) {
        const table = await this.cafeTableRepo.findOneBy({
            id
        });
        if (!table) throw new _common.NotFoundException(`Meja Cafe #${id} tidak ditemukan`);
        if (table.status === _cafetableentity.CafeTableStatus.OCCUPIED) throw new _common.BadRequestException('Meja sudah terpakai');
        if (memberId) {
            const activeSession = await this.transactionRepo.findOne({
                where: {
                    memberId,
                    status: (0, _typeorm1.In)([
                        _transactionentity.TransactionStatus.UNPAID,
                        _transactionentity.TransactionStatus.PARTIAL
                    ])
                }
            });
            if (activeSession) {
                throw new _common.ConflictException('Member ini sudah memiliki sesi aktif di meja lain.');
            }
        }
        const tx = this.transactionRepo.create({
            invoiceNumber: genInvoice(),
            customerName: customerName ?? undefined,
            cafeTableId: id,
            tableId: null,
            status: _transactionentity.TransactionStatus.UNPAID,
            cafeTotal: 0,
            billiardTotal: 0,
            grandTotal: 0,
            sessionType: 'cafe-only',
            startTime: new Date(),
            openedByUserId: userId,
            createdByUserId: userId,
            memberId: memberId || null
        });
        const savedTx = await this.transactionRepo.save(tx);
        table.status = _cafetableentity.CafeTableStatus.OCCUPIED;
        table.currentTransactionId = savedTx.id;
        table.currentCustomer = customerName ?? null;
        await this.cafeTableRepo.save(table);
        this.billiardGateway.broadcastTableUpdate({
            ...table,
            type: 'cafe'
        });
        return {
            cafeTable: table,
            transaction: savedTx
        };
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
        // 1. Get cafe table & its active transaction
        const cafeTable = await this.cafeTableRepo.findOneBy({
            id: cafeTableId
        });
        if (!cafeTable) throw new _common.NotFoundException(`Meja Cafe #${cafeTableId} tidak ditemukan`);
        if (cafeTable.status !== _cafetableentity.CafeTableStatus.OCCUPIED || !cafeTable.currentTransactionId) throw new _common.BadRequestException('Meja cafe tidak memiliki sesi aktif');
        const cafeTxId = cafeTable.currentTransactionId;
        // 2. Get target billiard transaction
        const billiardTx = await this.transactionRepo.findOne({
            where: {
                tableId: billiardTableId,
                status: _transactionentity.TransactionStatus.UNPAID
            }
        });
        if (!billiardTx) throw new _common.BadRequestException('Meja billiard tidak memiliki sesi aktif. Silahkan buka meja billiard tujuan terlebih dahulu.');
        // 3. Move all order items from cafe tx → billiard tx
        await this.orderItemRepo.update({
            transactionId: cafeTxId
        }, {
            transactionId: billiardTx.id
        });
        // 4. Update totals for the target billiard transaction
        await this.transactionService.updateTotals(billiardTx.id);
        // 5. Update totals for the source cafe transaction (it should drop to 0)
        await this.transactionService.updateTotals(cafeTxId);
        // 6. Cancel the now-empty cafe transaction & free the cafe table
        await this.transactionRepo.update(cafeTxId, {
            status: _transactionentity.TransactionStatus.CANCELLED
        });
        cafeTable.status = _cafetableentity.CafeTableStatus.AVAILABLE;
        cafeTable.currentTransactionId = null;
        cafeTable.currentCustomer = null;
        await this.cafeTableRepo.save(cafeTable);
        // 7. Success broadcast
        this.billiardGateway.broadcastTableUpdate({
            ...cafeTable,
            type: 'cafe'
        });
        // 8. Broadcast target billiard table update for real-time dashboard sync
        const billiardTable = await this.billiardService.getTableById(billiardTableId);
        if (billiardTable) {
            await this.billiardService.attachTransactionData(billiardTable);
            this.billiardGateway.broadcastTableUpdate(billiardTable);
        }
        const updated = await this.transactionService.getTransactionById(billiardTx.id);
        return {
            billiardTransaction: updated
        };
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
            description: `Payment for INV: ${tx.invoiceNumber} (${paymentData.method})`
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
    constructor(cafeTableRepo, transactionRepo, orderItemRepo, financeService, billiardGateway, transactionService, billiardService){
        this.cafeTableRepo = cafeTableRepo;
        this.transactionRepo = transactionRepo;
        this.orderItemRepo = orderItemRepo;
        this.financeService = financeService;
        this.billiardGateway = billiardGateway;
        this.transactionService = transactionService;
        this.billiardService = billiardService;
    }
};
CafeTableService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_cafetableentity.CafeTable)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(6, (0, _common.Inject)((0, _common.forwardRef)(()=>_billiardservice.BilliardService))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _financeservice.FinanceService === "undefined" ? Object : _financeservice.FinanceService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof _transactionservice.TransactionService === "undefined" ? Object : _transactionservice.TransactionService,
        typeof _billiardservice.BilliardService === "undefined" ? Object : _billiardservice.BilliardService
    ])
], CafeTableService);

//# sourceMappingURL=cafe-table.service.js.map