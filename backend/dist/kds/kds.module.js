"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "KdsModule", {
    enumerable: true,
    get: function() {
        return KdsModule;
    }
});
const _common = require("@nestjs/common");
const _kdsgateway = require("./kds/kds.gateway");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let KdsModule = class KdsModule {
};
KdsModule = _ts_decorate([
    (0, _common.Module)({
        providers: [
            _kdsgateway.KdsGateway
        ],
        exports: [
            _kdsgateway.KdsGateway
        ]
    })
], KdsModule);

//# sourceMappingURL=kds.module.js.map