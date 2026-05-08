"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ApprovalModule", {
    enumerable: true,
    get: function() {
        return ApprovalModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _approvalentity = require("../entities/approval.entity");
const _approvalservice = require("./approval.service");
const _approvalcontroller = require("./approval.controller");
const _approvallistener = require("./approval.listener");
const _usermodule = require("../../user/user.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ApprovalModule = class ApprovalModule {
};
ApprovalModule = _ts_decorate([
    (0, _common.Global)(),
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _approvalentity.ApprovalRequest,
                _approvalentity.ApprovalHistory
            ]),
            _usermodule.UserModule
        ],
        controllers: [
            _approvalcontroller.ApprovalController
        ],
        providers: [
            _approvalservice.ApprovalService,
            _approvallistener.ApprovalListener
        ],
        exports: [
            _approvalservice.ApprovalService
        ]
    })
], ApprovalModule);

//# sourceMappingURL=approval.module.js.map