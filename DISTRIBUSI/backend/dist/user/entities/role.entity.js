"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Role", {
    enumerable: true,
    get: function() {
        return Role;
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
let Role = class Role {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Role.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true
    }),
    _ts_metadata("design:type", String)
], Role.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json'
    }),
    _ts_metadata("design:type", Array)
], Role.prototype, "permissions", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 1
    }),
    _ts_metadata("design:type", Number)
], Role.prototype, "approvalLevel", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Role.prototype, "description", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)('User', (user)=>user.role),
    _ts_metadata("design:type", Array)
], Role.prototype, "users", void 0);
Role = _ts_decorate([
    (0, _typeorm.Entity)('roles')
], Role);

//# sourceMappingURL=role.entity.js.map