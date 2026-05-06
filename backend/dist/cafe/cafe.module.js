"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CafeModule", {
    enumerable: true,
    get: function() {
        return CafeModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _cafeservice = require("./cafe.service");
const _cafecontroller = require("./cafe.controller");
const _menuitementity = require("./entities/menu-item.entity");
const _categoryentity = require("./entities/category.entity");
const _orderitementity = require("./entities/order-item.entity");
const _productfinanceentity = require("./entities/product-finance.entity");
const _dailyordersummaryentity = require("./entities/daily-order-summary.entity");
const _inventorymodule = require("../inventory/inventory.module");
const _kdsmodule = require("../kds/kds.module");
const _transactionmodule = require("../transaction/transaction.module");
const _billiardmodule = require("../billiard/billiard.module");
const _promomodule = require("../promo/promo.module");
const _reportmodule = require("../report/report.module");
const _settingsmodule = require("../settings/settings.module");
const _approvalmodule = require("../common/approval/approval.module");
const _socketmodule = require("../socket/socket.module");
const _financemodule = require("../finance/finance.module");
const _aimodule = require("../ai/ai.module");
const _redismodule = require("../redis/redis.module");
const _whatsappmodule = require("../whatsapp/whatsapp.module");
const _recipeentity = require("../inventory/entities/recipe.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let CafeModule = class CafeModule {
};
CafeModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _categoryentity.Category,
                _menuitementity.MenuItem,
                _orderitementity.OrderItem,
                _recipeentity.Recipe,
                _dailyordersummaryentity.DailyOrderSummary,
                _transactionentity.Transaction,
                _cafetableentity.CafeTable,
                _productfinanceentity.ProductFinance
            ]),
            (0, _common.forwardRef)(()=>_inventorymodule.InventoryModule),
            (0, _common.forwardRef)(()=>_kdsmodule.KdsModule),
            (0, _common.forwardRef)(()=>_transactionmodule.TransactionModule),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule),
            (0, _common.forwardRef)(()=>_promomodule.PromoModule),
            (0, _common.forwardRef)(()=>_reportmodule.ReportModule),
            (0, _common.forwardRef)(()=>_financemodule.FinanceModule),
            (0, _common.forwardRef)(()=>_aimodule.AIModule),
            _redismodule.RedisModule,
            _whatsappmodule.WhatsAppModule,
            (0, _common.forwardRef)(()=>_settingsmodule.SettingsModule),
            _approvalmodule.ApprovalModule,
            (0, _common.forwardRef)(()=>_billiardmodule.BilliardModule)
        ],
        controllers: [
            _cafecontroller.CafeController
        ],
        providers: [
            _cafeservice.CafeService
        ],
        exports: [
            _cafeservice.CafeService
        ]
    })
], CafeModule);

//# sourceMappingURL=cafe.module.js.map