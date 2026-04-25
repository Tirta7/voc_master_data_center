"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BilliardModule", {
    enumerable: true,
    get: function() {
        return BilliardModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _billiardcontroller = require("./billiard.controller");
const _firmwarecontroller = require("./firmware.controller");
const _billiardservice = require("./billiard.service");
const _firmwareservice = require("./firmware.service");
const _tableentity = require("./entities/table.entity");
const _sessionentity = require("./entities/session.entity");
const _billiardpackageentity = require("./entities/billiard-package.entity");
const _transactionmodule = require("../transaction/transaction.module");
const _settingsmodule = require("../settings/settings.module");
const _socketmodule = require("../socket/socket.module");
const _promomodule = require("../promo/promo.module");
const _cafemodule = require("../cafe/cafe.module");
const _reportmodule = require("../report/report.module");
const _waitinglistmodule = require("../waiting-list/waiting-list.module");
const _membermodule = require("../member/member.module");
const _mqttmodule = require("../mqtt/mqtt.module");
const _aimodule = require("../ai/ai.module");
const _memberentity = require("../member/entities/member.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let BilliardModule = class BilliardModule {
};
BilliardModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _tableentity.Table,
                _sessionentity.Session,
                _billiardpackageentity.BilliardPackage,
                _memberentity.Member
            ]),
            _transactionmodule.TransactionModule,
            _socketmodule.SocketModule,
            _settingsmodule.SettingsModule,
            _promomodule.PromoModule,
            (0, _common.forwardRef)(()=>_cafemodule.CafeModule),
            _reportmodule.ReportModule,
            (0, _common.forwardRef)(()=>_waitinglistmodule.WaitingListModule),
            _membermodule.MemberModule,
            _mqttmodule.MqttModule,
            _aimodule.AIModule
        ],
        controllers: [
            _billiardcontroller.BilliardController,
            _firmwarecontroller.FirmwareController
        ],
        providers: [
            _billiardservice.BilliardService,
            _firmwareservice.FirmwareService
        ],
        exports: [
            _billiardservice.BilliardService,
            _firmwareservice.FirmwareService
        ]
    })
], BilliardModule);

//# sourceMappingURL=billiard.module.js.map