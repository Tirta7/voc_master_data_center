"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserModule", {
    enumerable: true,
    get: function() {
        return UserModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _userentity = require("./entities/user.entity");
const _roleentity = require("./entities/role.entity");
const _payrollconfigentity = require("./entities/payroll-config.entity");
const _violationentity = require("./entities/violation.entity");
const _userstatuslogentity = require("./entities/user-status-log.entity");
const _payrollreleaseentity = require("./entities/payroll-release.entity");
const _userservice = require("./user.service");
const _usercontroller = require("./user.controller");
const _socketmodule = require("../socket/socket.module");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _attendanceentity = require("../attendance/entities/attendance.entity");
const _financemodule = require("../finance/finance.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let UserModule = class UserModule {
};
UserModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _userentity.User,
                _roleentity.Role,
                _payrollconfigentity.PayrollConfig,
                _violationentity.Violation,
                _transactionentity.Transaction,
                _orderitementity.OrderItem,
                _userstatuslogentity.UserStatusLog,
                _payrollreleaseentity.PayrollRelease,
                _attendanceentity.Attendance
            ]),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule),
            (0, _common.forwardRef)(()=>_financemodule.FinanceModule)
        ],
        providers: [
            _userservice.UserService
        ],
        controllers: [
            _usercontroller.UserController
        ],
        exports: [
            _userservice.UserService
        ]
    })
], UserModule);

//# sourceMappingURL=user.module.js.map