"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TransactionController", {
    enumerable: true,
    get: function() {
        return TransactionController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _transactionservice = require("./transaction.service");
const _invoiceservice = require("./invoice.service");
const _hardwareservice = require("../hardware/hardware.service");
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
let TransactionController = class TransactionController {
    async getDebtTransactions() {
        return this.transactionService.getDebtTransactions();
    }
    async getDebtCount() {
        return this.transactionService.getDebtCount();
    }
    /**
   * POST /transactions/:id/multi-payer
   * Pembayaran per orang dengan rincian item tertentu.
   */ async processMultiPayer(id, req, data) {
        this.logger.log(`Incoming multi-payer request for Transaction ID: ${id} at ${new Date().toISOString()}`);
        this.logger.log(`Payload: ${JSON.stringify(data)}`);
        try {
            const result = await this.transactionService.processMultiPayerPayment(id, data, req.user.id);
            return result;
        } catch (error) {
            this.logger.error(`[Controller] Multi-payer FAILED: ${error.message}`, error.stack);
            throw error;
        }
    }
    /**
   * POST /transactions/:id/pay-items
   * Bayar item tertentu saja (Pay per Item)
   */ async payItems(id, data) {
        return this.transactionService.paySelectedItems(id, data.orderItemIds, data.paymentMethod);
    }
    async getTableTransaction(tableId, type) {
        let transaction;
        if (type === 'cafe') {
            transaction = await this.transactionService.getActiveTransactionByCafeTable(tableId);
        } else if (type === 'billiard') {
            transaction = await this.transactionService.getActiveTransactionByTable(tableId);
        } else {
            // Original fallback logic for backward compatibility
            transaction = await this.transactionService.getActiveTransactionByTable(tableId);
            if (!transaction) {
                transaction = await this.transactionService.getActiveTransactionByCafeTable(tableId);
            }
        }
        if (!transaction) throw new _common.NotFoundException('No active transaction found for this table');
        return transaction;
    }
    async getByInvoiceNumber(invoiceNumber) {
        return this.transactionService.getTransactionInfoByInvoice(invoiceNumber);
    }
    async getTransaction(id) {
        return this.transactionService.getTransactionById(id);
    }
    async moveTable(data) {
        await this.transactionService.moveTable(data.fromTableId, data.toTableId);
        return {
            success: true
        };
    }
    async pay(id, paymentDetails, req) {
        this.logger.log(`[Controller] pay called for Transaction ID: ${id}. Payload: ${JSON.stringify(paymentDetails)}`);
        try {
            return await this.transactionService.processPayment(id, paymentDetails, req.user?.id);
        } catch (error) {
            this.logger.error(`[Controller] pay FAILED for ID: ${id}: ${error.message}`, error.stack);
            throw error;
        }
    }
    async printInvoice(id, ip) {
        const transaction = await this.transactionService.getTransactionById(id);
        const invoiceText = await this.invoiceService.generateThermalInvoice(transaction);
        // Send to printer
        await this.hardwareService.printRaw(ip || '192.168.1.100', 9100, invoiceText);
        return {
            success: true
        };
    }
    async getInvoiceText(id) {
        return {
            text: 'Invoice text will go here'
        };
    }
    /**
   * POST /transactions/payment/:id/print
   * Cetak ulang struk pembayaran individu
   */ async printPaymentReceipt(id, ip) {
        return this.transactionService.printPaymentReceipt(id, ip);
    }
    async mergeTransactions(data) {
        return this.transactionService.mergeTransactions(data.sourceTableId, data.targetTableId, data.type);
    }
    async hold(id, data) {
        return this.transactionService.holdTransaction(id, data.customerPhone, data.customerName);
    }
    /**
   * GET /transactions/:id/split-evenly?peopleCount=4
   * Hitung bagi rata estimasi tagihan
   */ async splitEvenly(id, peopleCount) {
        return this.transactionService.calculateSplitEvenly(id, peopleCount);
    }
    async applyVoucher(id, code, req) {
        return this.transactionService.applyVoucher(id, code, req.user?.id);
    }
    async removeVoucher(id) {
        return this.transactionService.removeVoucher(id);
    }
    async submitRating(id, data) {
        return this.transactionService.submitRating(id, data.waiterRating, data.kasirRating, data.ratingMessage);
    }
    constructor(transactionService, invoiceService, hardwareService){
        this.transactionService = transactionService;
        this.invoiceService = invoiceService;
        this.hardwareService = hardwareService;
        this.logger = new _common.Logger(TransactionController.name);
    }
};
_ts_decorate([
    (0, _common.Get)('debt'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "getDebtTransactions", null);
_ts_decorate([
    (0, _common.Get)('debt/count'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "getDebtCount", null);
_ts_decorate([
    (0, _common.Post)(':id/multi-payer'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Request)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "processMultiPayer", null);
_ts_decorate([
    (0, _common.Post)(':id/pay-items'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "payItems", null);
_ts_decorate([
    (0, _common.Get)('table/:tableId'),
    _ts_param(0, (0, _common.Param)('tableId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Query)('type')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "getTableTransaction", null);
_ts_decorate([
    (0, _common.Get)('invoice/:invoiceNumber'),
    _ts_param(0, (0, _common.Param)('invoiceNumber')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "getByInvoiceNumber", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "getTransaction", null);
_ts_decorate([
    (0, _common.Post)('move'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "moveTable", null);
_ts_decorate([
    (0, _common.Post)(':id/pay'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "pay", null);
_ts_decorate([
    (0, _common.Post)(':id/print'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('printerIp')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "printInvoice", null);
_ts_decorate([
    (0, _common.Get)(':id/invoice'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "getInvoiceText", null);
_ts_decorate([
    (0, _common.Post)('payment/:id/print'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('printerIp')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "printPaymentReceipt", null);
_ts_decorate([
    (0, _common.Post)('merge'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "mergeTransactions", null);
_ts_decorate([
    (0, _common.Post)(':id/hold'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "hold", null);
_ts_decorate([
    (0, _common.Get)(':id/split-evenly'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Query)('peopleCount', new _common.DefaultValuePipe(1), _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "splitEvenly", null);
_ts_decorate([
    (0, _common.Post)(':id/voucher/apply'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('code')),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "applyVoucher", null);
_ts_decorate([
    (0, _common.Post)(':id/voucher/remove'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "removeVoucher", null);
_ts_decorate([
    (0, _common.Post)(':id/rating'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TransactionController.prototype, "submitRating", null);
TransactionController = _ts_decorate([
    (0, _common.Controller)('transactions'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _transactionservice.TransactionService === "undefined" ? Object : _transactionservice.TransactionService,
        typeof _invoiceservice.InvoiceService === "undefined" ? Object : _invoiceservice.InvoiceService,
        typeof _hardwareservice.HardwareService === "undefined" ? Object : _hardwareservice.HardwareService
    ])
], TransactionController);

//# sourceMappingURL=transaction.controller.js.map