"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReportModule", {
    enumerable: true,
    get: function() {
        return ReportModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _reportservice = require("./report.service");
const _reportcontroller = require("./report.controller");
const _shiftentity = require("../finance/entities/shift.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _ingrediententity = require("../inventory/entities/ingredient.entity");
const _expenseentity = require("../finance/entities/expense.entity");
const _settingsmodule = require("../settings/settings.module");
const _mqttmodule = require("../mqtt/mqtt.module");
const _socketmodule = require("../socket/socket.module");
const _whatsappmodule = require("../whatsapp/whatsapp.module");
const _financemodule = require("../finance/finance.module");
const _usermodule = require("../user/user.module");
const _auditlogentity = require("./entities/audit-log.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _menuitementity = require("../cafe/entities/menu-item.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ReportModule = class ReportModule {
};
ReportModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _shiftentity.Shift,
                _transactionentity.Transaction,
                _ingrediententity.Ingredient,
                _expenseentity.Expense,
                _auditlogentity.AuditLog,
                _orderitementity.OrderItem,
                _menuitementity.MenuItem
            ]),
            (0, _common.forwardRef)(()=>_settingsmodule.SettingsModule),
            _mqttmodule.MqttModule,
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule),
            _whatsappmodule.WhatsAppModule,
            _financemodule.FinanceModule,
            (0, _common.forwardRef)(()=>_usermodule.UserModule)
        ],
        controllers: [
            _reportcontroller.ReportController
        ],
        providers: [
            _reportservice.ReportService
        ],
        exports: [
            _reportservice.ReportService
        ]
    })
], ReportModule);

//# sourceMappingURL=report.module.js.map