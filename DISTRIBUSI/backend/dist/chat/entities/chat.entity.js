"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatMessage", {
    enumerable: true,
    get: function() {
        return ChatMessage;
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
let ChatMessage = class ChatMessage {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], ChatMessage.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Index)(),
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], ChatMessage.prototype, "senderId", void 0);
_ts_decorate([
    (0, _typeorm.Index)(),
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], ChatMessage.prototype, "receiverId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text'
    }),
    _ts_metadata("design:type", String)
], ChatMessage.prototype, "message", void 0);
_ts_decorate([
    (0, _typeorm.Index)(),
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ChatMessage.prototype, "timestamp", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], ChatMessage.prototype, "isRead", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 'USER'
    }),
    _ts_metadata("design:type", String)
], ChatMessage.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'simple-json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], ChatMessage.prototype, "readByUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], ChatMessage.prototype, "sender", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], ChatMessage.prototype, "receiver", void 0);
ChatMessage = _ts_decorate([
    (0, _typeorm.Entity)('chat_messages')
], ChatMessage);

//# sourceMappingURL=chat.entity.js.map