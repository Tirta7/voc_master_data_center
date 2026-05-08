"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatModule", {
    enumerable: true,
    get: function() {
        return ChatModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _chatentity = require("./entities/chat.entity");
const _chatservice = require("./chat.service");
const _chatcontroller = require("./chat.controller");
const _socketmodule = require("../socket/socket.module");
const _financemodule = require("../finance/finance.module");
const _aimodule = require("../ai/ai.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ChatModule = class ChatModule {
};
ChatModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _chatentity.ChatMessage
            ]),
            (0, _common.forwardRef)(()=>_socketmodule.SocketModule),
            (0, _common.forwardRef)(()=>_financemodule.FinanceModule),
            (0, _common.forwardRef)(()=>_aimodule.AIModule)
        ],
        providers: [
            _chatservice.ChatService
        ],
        controllers: [
            _chatcontroller.ChatController
        ],
        exports: [
            _chatservice.ChatService
        ]
    })
], ChatModule);

//# sourceMappingURL=chat.module.js.map