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
    get WaitingList () {
        return WaitingList;
    },
    get WaitingListStatus () {
        return WaitingListStatus;
    },
    get WaitingListType () {
        return WaitingListType;
    }
});
const _typeorm = require("typeorm");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var WaitingListStatus = /*#__PURE__*/ function(WaitingListStatus) {
    WaitingListStatus["PENDING"] = "PENDING";
    WaitingListStatus["CHECKED_IN"] = "CHECKED_IN";
    WaitingListStatus["CANCELLED"] = "CANCELLED";
    return WaitingListStatus;
}({});
var WaitingListType = /*#__PURE__*/ function(WaitingListType) {
    WaitingListType["BILLIARD"] = "BILLIARD";
    WaitingListType["CAFE"] = "CAFE";
    return WaitingListType;
}({});
let WaitingList = class WaitingList {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], WaitingList.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: WaitingListType,
        default: "BILLIARD"
    }),
    _ts_metadata("design:type", String)
], WaitingList.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], WaitingList.prototype, "customerName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], WaitingList.prototype, "phoneNumber", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 1
    }),
    _ts_metadata("design:type", Number)
], WaitingList.prototype, "pax", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: WaitingListStatus,
        default: "PENDING"
    }),
    _ts_metadata("design:type", String)
], WaitingList.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], WaitingList.prototype, "targetTableId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], WaitingList.prototype, "targetTableName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], WaitingList.prototype, "handledById", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], WaitingList.prototype, "handledByName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], WaitingList.prototype, "note", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], WaitingList.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], WaitingList.prototype, "updatedAt", void 0);
WaitingList = _ts_decorate([
    (0, _typeorm.Entity)('waiting_lists')
], WaitingList);

//# sourceMappingURL=waiting-list.entity.js.map