"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AttendanceModule", {
    enumerable: true,
    get: function() {
        return AttendanceModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _attendanceentity = require("./entities/attendance.entity");
const _employeeshiftscheduleentity = require("./entities/employee-shift-schedule.entity");
const _attendanceservice = require("./attendance.service");
const _attendancecontroller = require("./attendance.controller");
const _userentity = require("../user/entities/user.entity");
const _holidayentity = require("../settings/entities/holiday.entity");
const _violationentity = require("../user/entities/violation.entity");
const _payrollconfigentity = require("../user/entities/payroll-config.entity");
const _settingsmodule = require("../settings/settings.module");
const _socketmodule = require("../socket/socket.module");
const _mqttmodule = require("../mqtt/mqtt.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AttendanceModule = class AttendanceModule {
};
AttendanceModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _attendanceentity.Attendance,
                _employeeshiftscheduleentity.EmployeeShiftSchedule,
                _userentity.User,
                _holidayentity.BusinessClosure,
                _violationentity.Violation,
                _payrollconfigentity.PayrollConfig
            ]),
            _settingsmodule.SettingsModule,
            _socketmodule.SocketModule,
            (0, _common.forwardRef)(()=>_mqttmodule.MqttModule)
        ],
        controllers: [
            _attendancecontroller.AttendanceController
        ],
        providers: [
            _attendanceservice.AttendanceService
        ],
        exports: [
            _attendanceservice.AttendanceService
        ]
    })
], AttendanceModule);

//# sourceMappingURL=attendance.module.js.map