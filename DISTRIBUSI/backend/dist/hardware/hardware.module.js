"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "HardwareModule", {
    enumerable: true,
    get: function() {
        return HardwareModule;
    }
});
const _common = require("@nestjs/common");
const _hardwareservice = require("./hardware.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let HardwareModule = class HardwareModule {
};
HardwareModule = _ts_decorate([
    (0, _common.Module)({
        providers: [
            _hardwareservice.HardwareService
        ],
        exports: [
            _hardwareservice.HardwareService
        ]
    })
], HardwareModule);

//# sourceMappingURL=hardware.module.js.map