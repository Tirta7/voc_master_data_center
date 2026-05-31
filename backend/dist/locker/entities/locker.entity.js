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
    get Locker () {
        return Locker;
    },
    get LockerStatus () {
        return LockerStatus;
    }
});
const _typeorm = require("typeorm");
const _categoryentity = require("../../category/entities/category.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var LockerStatus = /*#__PURE__*/ function(LockerStatus) {
    LockerStatus["AVAILABLE"] = "AVAILABLE";
    LockerStatus["OCCUPIED"] = "OCCUPIED";
    LockerStatus["MAINTENANCE"] = "MAINTENANCE";
    return LockerStatus;
}({});
let Locker = class Locker {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Locker.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true
    }),
    _ts_metadata("design:type", String)
], Locker.prototype, "number", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'varchar'
    }),
    _ts_metadata("design:type", String)
], Locker.prototype, "label", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Locker.prototype, "categoryId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_categoryentity.AssetCategory, (cat)=>cat.lockers, {
        nullable: true,
        onDelete: 'SET NULL'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'categoryId'
    }),
    _ts_metadata("design:type", typeof Relation === "undefined" ? Object : Relation)
], Locker.prototype, "categoryRelation", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        default: 'AVAILABLE'
    }),
    _ts_metadata("design:type", String)
], Locker.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Locker.prototype, "macAddress", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Locker.prototype, "relayPin", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], Locker.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Locker.prototype, "pricePerHour", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'text'
    }),
    _ts_metadata("design:type", String)
], Locker.prototype, "notes", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)('LockerSession', (session)=>session.locker),
    _ts_metadata("design:type", typeof Relation === "undefined" ? Object : Relation)
], Locker.prototype, "sessions", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Locker.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Locker.prototype, "updatedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Locker.prototype, "deletedAt", void 0);
Locker = _ts_decorate([
    (0, _typeorm.Entity)('lockers')
], Locker);

//# sourceMappingURL=locker.entity.js.map