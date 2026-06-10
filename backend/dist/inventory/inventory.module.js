"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InventoryModule", {
    enumerable: true,
    get: function() {
        return InventoryModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _inventoryservice = require("./inventory.service");
const _inventorycontroller = require("./inventory.controller");
const _ingrediententity = require("./entities/ingredient.entity");
const _recipeentity = require("./entities/recipe.entity");
const _wasteentity = require("./entities/waste.entity");
const _supplierentity = require("./entities/supplier.entity");
const _stockinentity = require("./entities/stock-in.entity");
const _stockpaymententity = require("./entities/stock-payment.entity");
const _stockinstallmentplanentity = require("./entities/stock-installment-plan.entity");
const _ingredientbatchentity = require("./entities/ingredient-batch.entity");
const _inventorygateway = require("./inventory.gateway");
const _promomodule = require("../promo/promo.module");
const _financemodule = require("../finance/finance.module");
const _reportmodule = require("../report/report.module");
const _whatsappmodule = require("../whatsapp/whatsapp.module");
const _settingsmodule = require("../settings/settings.module");
const _mqttmodule = require("../mqtt/mqtt.module");
const _cafemodule = require("../cafe/cafe.module");
const _socketmodule = require("../socket/socket.module");
const _approvalmodule = require("../common/approval/approval.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let InventoryModule = class InventoryModule {
};
InventoryModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _ingrediententity.Ingredient,
                _recipeentity.Recipe,
                _wasteentity.Waste,
                _supplierentity.Supplier,
                _stockinentity.StockIn,
                _stockpaymententity.StockPayment,
                _stockinstallmentplanentity.StockInstallmentPlan,
                _ingredientbatchentity.IngredientBatch
            ]),
            _promomodule.PromoModule,
            (0, _common.forwardRef)(()=>_financemodule.FinanceModule),
            (0, _common.forwardRef)(()=>_reportmodule.ReportModule),
            _whatsappmodule.WhatsAppModule,
            _settingsmodule.SettingsModule,
            _mqttmodule.MqttModule,
            _approvalmodule.ApprovalModule,
            (0, _common.forwardRef)(()=>_cafemodule.CafeModule),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule)
        ],
        controllers: [
            _inventorycontroller.InventoryController
        ],
        providers: [
            _inventoryservice.InventoryService,
            _inventorygateway.InventoryGateway
        ],
        exports: [
            _inventoryservice.InventoryService,
            _inventorygateway.InventoryGateway
        ]
    })
], InventoryModule);

//# sourceMappingURL=inventory.module.js.map