"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MaintenanceModule", {
    enumerable: true,
    get: function() {
        return MaintenanceModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _schedule = require("@nestjs/schedule");
const _maintenanceservice = require("./maintenance.service");
const _maintenancecontroller = require("./maintenance.controller");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _cashflowentity = require("../finance/entities/cashflow.entity");
const _auditlogentity = require("../report/entities/audit-log.entity");
const _sessionentity = require("../billiard/entities/session.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let MaintenanceModule = class MaintenanceModule {
};
MaintenanceModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _schedule.ScheduleModule.forRoot(),
            _typeorm.TypeOrmModule.forFeature([
                _transactionentity.Transaction,
                _orderitementity.OrderItem,
                _cashflowentity.Cashflow,
                _auditlogentity.AuditLog,
                _sessionentity.Session
            ])
        ],
        controllers: [
            _maintenancecontroller.MaintenanceController
        ],
        providers: [
            _maintenanceservice.MaintenanceService
        ],
        exports: [
            _maintenanceservice.MaintenanceService
        ]
    })
], MaintenanceModule);

//# sourceMappingURL=maintenance.module.js.map