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
const _settingscontroller = require("./settings.controller");
const _settingsuploadcontroller = require("./settings-upload.controller");
const _settingentity = require("./entities/setting.entity");
const _reportmodule = require("../report/report.module");
const _socketmodule = require("../socket/socket.module");
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
                _settingentity.Setting
            ]),
            (0, _common.forwardRef)(()=>_reportmodule.ReportModule),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule)
        ],
        controllers: [
            _settingscontroller.SettingsController,
            _settingsuploadcontroller.SettingsUploadController
        ],
        providers: [
            _settingsservice.SettingsService
        ],
        exports: [
            _settingsservice.SettingsService
        ]
    })
], SettingsModule);

//# sourceMappingURL=settings.module.js.map