"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MemberModule", {
    enumerable: true,
    get: function() {
        return MemberModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _memberservice = require("./member.service");
const _membercontroller = require("./member.controller");
const _memberentity = require("./entities/member.entity");
const _membertierentity = require("./entities/member-tier.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _shiftentity = require("../finance/entities/shift.entity");
const _financemodule = require("../finance/finance.module");
const _socketmodule = require("../socket/socket.module");
const _settingsmodule = require("../settings/settings.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let MemberModule = class MemberModule {
};
MemberModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _memberentity.Member,
                _membertierentity.MemberTier,
                _transactionentity.Transaction,
                _shiftentity.Shift
            ]),
            _financemodule.FinanceModule,
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule),
            (0, _common.forwardRef)(()=>_settingsmodule.SettingsModule)
        ],
        controllers: [
            _membercontroller.MemberController
        ],
        providers: [
            _memberservice.MemberService
        ],
        exports: [
            _memberservice.MemberService
        ]
    })
], MemberModule);

//# sourceMappingURL=member.module.js.map