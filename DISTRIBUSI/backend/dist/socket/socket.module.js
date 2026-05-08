"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SocketModule", {
    enumerable: true,
    get: function() {
        return SocketModule;
    }
});
const _common = require("@nestjs/common");
const _billiardgateway = require("./billiard.gateway");
const _eventsgateway = require("./events.gateway");
const _usermodule = require("../user/user.module");
const _chatmodule = require("../chat/chat.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SocketModule = class SocketModule {
};
SocketModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            (0, _common.forwardRef)(()=>_usermodule.UserModule),
            (0, _common.forwardRef)(()=>_chatmodule.ChatModule)
        ],
        providers: [
            _billiardgateway.BilliardGateway,
            _eventsgateway.EventsGateway
        ],
        exports: [
            _billiardgateway.BilliardGateway,
            _eventsgateway.EventsGateway
        ]
    })
], SocketModule);

//# sourceMappingURL=socket.module.js.map