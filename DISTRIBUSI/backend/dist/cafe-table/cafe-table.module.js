"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CafeTableModule", {
    enumerable: true,
    get: function() {
        return CafeTableModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _cafetableentity = require("./entities/cafe-table.entity");
const _cafetableservice = require("./cafe-table.service");
const _cafetablecontroller = require("./cafe-table.controller");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _financemodule = require("../finance/finance.module");
const _socketmodule = require("../socket/socket.module");
const _transactionmodule = require("../transaction/transaction.module");
const _billiardmodule = require("../billiard/billiard.module");
const _aimodule = require("../ai/ai.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let CafeTableModule = class CafeTableModule {
};
CafeTableModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _cafetableentity.CafeTable,
                _transactionentity.Transaction,
                _orderitementity.OrderItem
            ]),
            (0, _common.forwardRef)(()=>_financemodule.FinanceModule),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule),
            (0, _common.forwardRef)(()=>_transactionmodule.TransactionModule),
            (0, _common.forwardRef)(()=>_billiardmodule.BilliardModule),
            (0, _common.forwardRef)(()=>_aimodule.AIModule)
        ],
        providers: [
            _cafetableservice.CafeTableService
        ],
        controllers: [
            _cafetablecontroller.CafeTableController
        ],
        exports: [
            _cafetableservice.CafeTableService
        ]
    })
], CafeTableModule);

//# sourceMappingURL=cafe-table.module.js.map