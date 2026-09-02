"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TransactionModule", {
    enumerable: true,
    get: function() {
        return TransactionModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _transactionservice = require("./transaction.service");
const _transactioncontroller = require("./transaction.controller");
const _transactionentity = require("./entities/transaction.entity");
const _transactionpaymententity = require("./entities/transaction-payment.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _invoiceservice = require("./invoice.service");
const _settingsmodule = require("../settings/settings.module");
const _hardwaremodule = require("../hardware/hardware.module");
const _financemodule = require("../finance/finance.module");
const _socketmodule = require("../socket/socket.module");
const _billiardpackageentity = require("../billiard/entities/billiard-package.entity");
const _tableentity = require("../billiard/entities/table.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
const _promomodule = require("../promo/promo.module");
const _reportmodule = require("../report/report.module");
const _memberentity = require("../member/entities/member.entity");
const _membermodule = require("../member/member.module");
const _aimodule = require("../ai/ai.module");
const _vouchermodule = require("../voucher/voucher.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let TransactionModule = class TransactionModule {
};
TransactionModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _transactionentity.Transaction,
                _orderitementity.OrderItem,
                _tableentity.Table,
                _cafetableentity.CafeTable,
                _billiardpackageentity.BilliardPackage,
                _transactionpaymententity.TransactionPayment,
                _memberentity.Member
            ]),
            (0, _common.forwardRef)(()=>_settingsmodule.SettingsModule),
            _hardwaremodule.HardwareModule,
            (0, _common.forwardRef)(()=>_financemodule.FinanceModule),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule),
            (0, _common.forwardRef)(()=>_promomodule.PromoModule),
            (0, _common.forwardRef)(()=>_reportmodule.ReportModule),
            (0, _common.forwardRef)(()=>_membermodule.MemberModule),
            (0, _common.forwardRef)(()=>_aimodule.AIModule),
            (0, _common.forwardRef)(()=>_vouchermodule.VoucherModule)
        ],
        controllers: [
            _transactioncontroller.TransactionController,
            _transactioncontroller.TransactionPublicController
        ],
        providers: [
            _transactionservice.TransactionService,
            _invoiceservice.InvoiceService
        ],
        exports: [
            _transactionservice.TransactionService,
            _invoiceservice.InvoiceService
        ]
    })
], TransactionModule);

//# sourceMappingURL=transaction.module.js.map