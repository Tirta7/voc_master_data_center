"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SeederModule", {
    enumerable: true,
    get: function() {
        return SeederModule;
    }
});
const _common = require("@nestjs/common");
const _seedercontroller = require("./seeder.controller");
const _seederservice = require("./seeder.service");
const _billiardmodule = require("../billiard/billiard.module");
const _inventorymodule = require("../inventory/inventory.module");
const _cafemodule = require("../cafe/cafe.module");
const _settingsmodule = require("../settings/settings.module");
const _membermodule = require("../member/member.module");
const _usermodule = require("../user/user.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SeederModule = class SeederModule {
};
SeederModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _billiardmodule.BilliardModule,
            _inventorymodule.InventoryModule,
            _cafemodule.CafeModule,
            (0, _common.forwardRef)(()=>_settingsmodule.SettingsModule),
            _membermodule.MemberModule,
            _usermodule.UserModule
        ],
        controllers: [
            _seedercontroller.SeederController
        ],
        providers: [
            _seederservice.SeederService
        ]
    })
], SeederModule);

//# sourceMappingURL=seeder.module.js.map