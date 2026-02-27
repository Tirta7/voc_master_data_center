"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthModule", {
    enumerable: true,
    get: function() {
        return AuthModule;
    }
});
const _common = require("@nestjs/common");
const _authservice = require("./auth.service");
const _usermodule = require("../user/user.module");
const _passport = require("@nestjs/passport");
const _jwt = require("@nestjs/jwt");
const _config = require("@nestjs/config");
const _jwtstrategy = require("./jwt.strategy");
const _authcontroller = require("./auth.controller");
const _accesscontroller = require("./access.controller");
const _typeorm = require("@nestjs/typeorm");
const _accessrequestentity = require("./entities/access-request.entity");
const _settingsmodule = require("../settings/settings.module");
const _socketmodule = require("../socket/socket.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AuthModule = class AuthModule {
};
AuthModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _usermodule.UserModule,
            _passport.PassportModule,
            _settingsmodule.SettingsModule,
            _socketmodule.SocketModule,
            _typeorm.TypeOrmModule.forFeature([
                _accessrequestentity.AccessRequest
            ]),
            _jwt.JwtModule.registerAsync({
                imports: [
                    _config.ConfigModule
                ],
                useFactory: async (configService)=>({
                        secret: configService.get('JWT_SECRET') || 'voc-secret-key-2026',
                        signOptions: {
                            expiresIn: '1d'
                        }
                    }),
                inject: [
                    _config.ConfigService
                ]
            })
        ],
        providers: [
            _authservice.AuthService,
            _jwtstrategy.JwtStrategy
        ],
        controllers: [
            _authcontroller.AuthController,
            _accesscontroller.AccessController
        ],
        exports: [
            _authservice.AuthService
        ]
    })
], AuthModule);

//# sourceMappingURL=auth.module.js.map