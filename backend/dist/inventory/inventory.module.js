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
const _inventorygateway = require("./inventory.gateway");
const _promomodule = require("../promo/promo.module");
const _reportmodule = require("../report/report.module");
const _whatsappmodule = require("../whatsapp/whatsapp.module");
const _settingsmodule = require("../settings/settings.module");
const _mqttmodule = require("../mqtt/mqtt.module");
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
                _wasteentity.Waste
            ]),
            _promomodule.PromoModule,
            _reportmodule.ReportModule,
            _whatsappmodule.WhatsAppModule,
            _settingsmodule.SettingsModule,
            _mqttmodule.MqttModule,
            _approvalmodule.ApprovalModule
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