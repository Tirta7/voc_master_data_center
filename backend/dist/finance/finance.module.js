"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FinanceModule", {
    enumerable: true,
    get: function() {
        return FinanceModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _financeservice = require("./finance.service");
const _financecontroller = require("./finance.controller");
const _expenseentity = require("./entities/expense.entity");
const _cashflowentity = require("./entities/cashflow.entity");
const _businessdayentity = require("./entities/business-day.entity");
const _shiftentity = require("./entities/shift.entity");
const _shiftservice = require("./shift.service");
const _shiftcontroller = require("./shift.controller");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _userentity = require("../user/entities/user.entity");
const _settingentity = require("../settings/entities/setting.entity");
const _socketmodule = require("../socket/socket.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let FinanceModule = class FinanceModule {
};
FinanceModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _expenseentity.Expense,
                _cashflowentity.Cashflow,
                _businessdayentity.BusinessDay,
                _shiftentity.Shift,
                _transactionentity.Transaction,
                _userentity.User,
                _settingentity.Setting
            ]),
            _socketmodule.SocketModule
        ],
        controllers: [
            _financecontroller.FinanceController,
            _shiftcontroller.ShiftController
        ],
        providers: [
            _financeservice.FinanceService,
            _shiftservice.ShiftService
        ],
        exports: [
            _financeservice.FinanceService,
            _shiftservice.ShiftService
        ]
    })
], FinanceModule);

//# sourceMappingURL=finance.module.js.map