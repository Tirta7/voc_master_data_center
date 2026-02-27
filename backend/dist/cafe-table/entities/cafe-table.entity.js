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
    get CafeTable () {
        return CafeTable;
    },
    get CafeTableStatus () {
        return CafeTableStatus;
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
var CafeTableStatus = /*#__PURE__*/ function(CafeTableStatus) {
    CafeTableStatus["AVAILABLE"] = "available";
    CafeTableStatus["OCCUPIED"] = "occupied";
    CafeTableStatus["RESERVED"] = "reserved";
    return CafeTableStatus;
}({});
let CafeTable = class CafeTable {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], CafeTable.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true
    }),
    _ts_metadata("design:type", String)
], CafeTable.prototype, "tableName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 4
    }),
    _ts_metadata("design:type", Number)
], CafeTable.prototype, "capacity", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: CafeTableStatus,
        default: "available"
    }),
    _ts_metadata("design:type", String)
], CafeTable.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], CafeTable.prototype, "currentTransactionId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 255,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], CafeTable.prototype, "currentCustomer", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], CafeTable.prototype, "isBooked", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], CafeTable.prototype, "bookedByWaitingId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], CafeTable.prototype, "bookedByName", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], CafeTable.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], CafeTable.prototype, "updatedAt", void 0);
CafeTable = _ts_decorate([
    (0, _typeorm.Entity)('cafe_tables')
], CafeTable);

//# sourceMappingURL=cafe-table.entity.js.map