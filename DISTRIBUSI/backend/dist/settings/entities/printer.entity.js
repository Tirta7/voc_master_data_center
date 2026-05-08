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
    get Printer () {
        return Printer;
    },
    get PrinterType () {
        return PrinterType;
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
var PrinterType = /*#__PURE__*/ function(PrinterType) {
    PrinterType["CASHIER"] = "CASHIER";
    PrinterType["KITCHEN"] = "KITCHEN";
    PrinterType["BARTENDER"] = "BARTENDER";
    return PrinterType;
}({});
let Printer = class Printer {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Printer.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Printer.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Printer.prototype, "ipAddress", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 9100
    }),
    _ts_metadata("design:type", Number)
], Printer.prototype, "port", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: PrinterType,
        default: "KITCHEN"
    }),
    _ts_metadata("design:type", String)
], Printer.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 1
    }),
    _ts_metadata("design:type", Number)
], Printer.prototype, "floor", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], Printer.prototype, "coverageZones", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], Printer.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Printer.prototype, "isOnline", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Printer.prototype, "isBackup", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Printer.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Printer.prototype, "updatedAt", void 0);
Printer = _ts_decorate([
    (0, _typeorm.Entity)('printers')
], Printer);

//# sourceMappingURL=printer.entity.js.map