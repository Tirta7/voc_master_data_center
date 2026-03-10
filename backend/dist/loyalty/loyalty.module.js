"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LoyaltyModule", {
    enumerable: true,
    get: function() {
        return LoyaltyModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _loyaltycontroller = require("./loyalty.controller");
const _loyaltyservice = require("./loyalty.service");
const _pointrewardentity = require("./entities/point-reward.entity");
const _pointledgerentity = require("./entities/point-ledger.entity");
const _membermodule = require("../member/member.module");
const _memberentity = require("../member/entities/member.entity");
const _settingsmodule = require("../settings/settings.module");
const _cafemodule = require("../cafe/cafe.module");
const _socketmodule = require("../socket/socket.module");
const _missionentity = require("./entities/mission.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let LoyaltyModule = class LoyaltyModule {
};
LoyaltyModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _pointrewardentity.PointReward,
                _pointledgerentity.PointLedger,
                _memberentity.Member,
                _missionentity.Mission,
                _missionentity.MemberMission
            ]),
            _membermodule.MemberModule,
            _settingsmodule.SettingsModule,
            _cafemodule.CafeModule,
            _socketmodule.SocketModule
        ],
        controllers: [
            _loyaltycontroller.LoyaltyController
        ],
        providers: [
            _loyaltyservice.LoyaltyService
        ],
        exports: [
            _loyaltyservice.LoyaltyService
        ]
    })
], LoyaltyModule);

//# sourceMappingURL=loyalty.module.js.map