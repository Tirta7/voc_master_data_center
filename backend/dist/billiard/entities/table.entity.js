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
    get HardwareType () {
        return HardwareType;
    },
    get StationType () {
        return StationType;
    },
    get Table () {
        return Table;
    },
    get TableStatus () {
        return TableStatus;
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
var StationType = /*#__PURE__*/ function(StationType) {
    StationType["BILLIARD"] = "BILLIARD";
    StationType["PLAYSTATION"] = "PLAYSTATION";
    return StationType;
}({});
var TableStatus = /*#__PURE__*/ function(TableStatus) {
    TableStatus["AVAILABLE"] = "available";
    TableStatus["IN_USE"] = "in_use";
    TableStatus["WARNING"] = "warning";
    TableStatus["WAITING_PAYMENT"] = "waiting_payment";
    TableStatus["MAINTENANCE"] = "maintenance";
    return TableStatus;
}({});
var HardwareType = /*#__PURE__*/ function(HardwareType) {
    HardwareType["PCF8575"] = "PCF8575";
    HardwareType["MOC3062"] = "MOC3062";
    HardwareType["ESPNOW_NODE"] = "ESPNOW_NODE";
    return HardwareType;
}({});
let Table = class Table {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Table.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "tableName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: StationType,
        default: "BILLIARD"
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "stationType", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Table.prototype, "categoryId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_categoryentity.AssetCategory, (cat)=>cat.tables, {
        nullable: true,
        onDelete: 'SET NULL'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'categoryId'
    }),
    _ts_metadata("design:type", typeof Relation === "undefined" ? Object : Relation)
], Table.prototype, "categoryRelation", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "macAddress", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "ipAddress", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true,
        default: 1
    }),
    _ts_metadata("design:type", Number)
], Table.prototype, "floorNumber", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "productionZone", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "espnowGatewayMac", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: HardwareType,
        default: "PCF8575",
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "hardwareType", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: TableStatus,
        default: "available"
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Table.prototype, "rssi", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'bigint',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Table.prototype, "uptime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Table.prototype, "lastHeartbeat", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Table.prototype, "isLightOn", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Table.prototype, "relayPin", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'prepaid',
            'open'
        ],
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "sessionType", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "startTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "endTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "remainingMinutes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "packageId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "activePackagePrice", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "lastSessionData", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Table.prototype, "isBooked", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Table.prototype, "bookedByWaitingId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Table.prototype, "bookedByName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "memberId", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Table.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Table.prototype, "updatedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Table.prototype, "deletedAt", void 0);
Table = _ts_decorate([
    (0, _typeorm.Entity)('tables')
], Table);

//# sourceMappingURL=table.entity.js.map