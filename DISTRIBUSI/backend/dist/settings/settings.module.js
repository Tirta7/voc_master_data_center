"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SettingsModule", {
    enumerable: true,
    get: function() {
        return SettingsModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _settingsservice = require("./settings.service");
const _printerservice = require("./printer.service");
const _settingscontroller = require("./settings.controller");
const _settingsuploadcontroller = require("./settings-upload.controller");
const _settingentity = require("./entities/setting.entity");
const _printerentity = require("./entities/printer.entity");
const _holidayentity = require("./entities/holiday.entity");
const _reportmodule = require("../report/report.module");
const _socketmodule = require("../socket/socket.module");
const _hardwareservice = require("../hardware/hardware.service");
const _schedule = require("@nestjs/schedule");
const _printercontroller = require("./printer.controller");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SettingsModule = class SettingsModule {
};
SettingsModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _settingentity.Setting,
                _printerentity.Printer,
                _holidayentity.PublicHoliday,
                _holidayentity.BusinessClosure
            ]),
            _schedule.ScheduleModule.forRoot(),
            (0, _common.forwardRef)(()=>_reportmodule.ReportModule),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule)
        ],
        controllers: [
            _settingscontroller.SettingsController,
            _settingsuploadcontroller.SettingsUploadController,
            _printercontroller.PrinterController
        ],
        providers: [
            _settingsservice.SettingsService,
            _printerservice.PrinterService,
            _hardwareservice.HardwareService
        ],
        exports: [
            _settingsservice.SettingsService,
            _printerservice.PrinterService,
            _hardwareservice.HardwareService
        ]
    })
], SettingsModule);

//# sourceMappingURL=settings.module.js.map