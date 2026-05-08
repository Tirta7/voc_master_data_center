"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get ApprovalHistory () {
        return ApprovalHistory;
    },
    get ApprovalModuleType () {
        return ApprovalModuleType;
    },
    get ApprovalRequest () {
        return ApprovalRequest;
    },
    get ApprovalStatus () {
        return ApprovalStatus;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("../../user/entities/user.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var ApprovalModuleType = /*#__PURE__*/ function(ApprovalModuleType) {
    ApprovalModuleType["WASTE"] = "WASTE";
    ApprovalModuleType["EXPENSE"] = "EXPENSE";
    ApprovalModuleType["CLOSING"] = "CLOSING";
    ApprovalModuleType["STOCK_UPDATE"] = "STOCK_UPDATE";
    ApprovalModuleType["DATA_EDIT"] = "DATA_EDIT";
    ApprovalModuleType["TABLE_ACCESS"] = "TABLE_ACCESS";
    return ApprovalModuleType;
}({});
var ApprovalStatus = /*#__PURE__*/ function(ApprovalStatus) {
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
    return ApprovalStatus;
}({});
let ApprovalRequest = class ApprovalRequest {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], ApprovalRequest.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: ApprovalModuleType
    }),
    _ts_metadata("design:type", String)
], ApprovalRequest.prototype, "moduleType", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], ApprovalRequest.prototype, "referenceId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json'
    }),
    _ts_metadata("design:type", Array)
], ApprovalRequest.prototype, "requiredLevels", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ApprovalRequest.prototype, "currentLevelIndex", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: ApprovalStatus,
        default: "PENDING"
    }),
    _ts_metadata("design:type", String)
], ApprovalRequest.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], ApprovalRequest.prototype, "metadata", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], ApprovalRequest.prototype, "requestedByUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'requestedByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], ApprovalRequest.prototype, "requestedBy", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)(()=>ApprovalHistory, (history)=>history.approvalRequest),
    _ts_metadata("design:type", Array)
], ApprovalRequest.prototype, "history", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ApprovalRequest.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ApprovalRequest.prototype, "updatedAt", void 0);
ApprovalRequest = _ts_decorate([
    (0, _typeorm.Entity)('approval_requests')
], ApprovalRequest);
let ApprovalHistory = class ApprovalHistory {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], ApprovalHistory.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], ApprovalHistory.prototype, "approvalRequestId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>ApprovalRequest, (req)=>req.history),
    (0, _typeorm.JoinColumn)({
        name: 'approvalRequestId'
    }),
    _ts_metadata("design:type", typeof ApprovalRequest === "undefined" ? Object : ApprovalRequest)
], ApprovalHistory.prototype, "approvalRequest", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], ApprovalHistory.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], ApprovalHistory.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], ApprovalHistory.prototype, "level", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], ApprovalHistory.prototype, "action", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], ApprovalHistory.prototype, "note", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ApprovalHistory.prototype, "createdAt", void 0);
ApprovalHistory = _ts_decorate([
    (0, _typeorm.Entity)('approval_history')
], ApprovalHistory);

//# sourceMappingURL=approval.entity.js.map