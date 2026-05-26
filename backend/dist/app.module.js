"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AppModule", {
    enumerable: true,
    get: function() {
        return AppModule;
    }
});
const _common = require("@nestjs/common");
const _schedule = require("@nestjs/schedule");
const _socketmodule = require("./socket/socket.module");
const _eventemitter = require("@nestjs/event-emitter");
const _config = require("@nestjs/config");
const _typeorm = require("@nestjs/typeorm");
const _throttler = require("@nestjs/throttler");
const _core = require("@nestjs/core");
const _appcontroller = require("./app.controller");
const _appservice = require("./app.service");
const _billiardmodule = require("./billiard/billiard.module");
const _inventorymodule = require("./inventory/inventory.module");
const _cafemodule = require("./cafe/cafe.module");
const _kdsmodule = require("./kds/kds.module");
const _transactionmodule = require("./transaction/transaction.module");
const _membermodule = require("./member/member.module");
const _whatsappmodule = require("./whatsapp/whatsapp.module");
const _hardwaremodule = require("./hardware/hardware.module");
const _reportmodule = require("./report/report.module");
const _settingsmodule = require("./settings/settings.module");
const _financemodule = require("./finance/finance.module");
const _seedermodule = require("./seeder/seeder.module");
const _maintenancemodule = require("./maintenance/maintenance.module");
const _promomodule = require("./promo/promo.module");
const _cafetablemodule = require("./cafe-table/cafe-table.module");
const _usermodule = require("./user/user.module");
const _authmodule = require("./auth/auth.module");
const _waitinglistmodule = require("./waiting-list/waiting-list.module");
const _mqttmodule = require("./mqtt/mqtt.module");
const _lockermodule = require("./locker/locker.module");
const _loyaltymodule = require("./loyalty/loyalty.module");
const _redismodule = require("./redis/redis.module");
const _aimodule = require("./ai/ai.module");
const _chatmodule = require("./chat/chat.module");
const _attendancemodule = require("./attendance/attendance.module");
const _approvalmodule = require("./common/approval/approval.module");
const _externalsyncmodule = require("./external-sync/external-sync.module");
const _licensemodule = require("./license/license.module");
const _vouchermodule = require("./voucher/voucher.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AppModule = class AppModule {
};
AppModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _config.ConfigModule.forRoot({
                isGlobal: true
            }),
            _schedule.ScheduleModule.forRoot(),
            _eventemitter.EventEmitterModule.forRoot(),
            // Rate Limiting: 1000 requests per 60s globally. Prevents API flooding for real-time dashboards.
            _throttler.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 1000
                }
            ]),
            _typeorm.TypeOrmModule.forRootAsync({
                imports: [
                    _config.ConfigModule
                ],
                useFactory: (configService)=>{
                    const url = configService.get('DATABASE_URL');
                    if (url) {
                        return {
                            type: 'postgres',
                            url: url,
                            autoLoadEntities: true,
                            synchronize: true,
                            ssl: {
                                rejectUnauthorized: false
                            },
                            // DB Connection Pool for 100+ concurrent tables
                            extra: {
                                max: 80,
                                min: 10,
                                idleTimeoutMillis: 60000,
                                connectionTimeoutMillis: 10000
                            }
                        };
                    }
                    return {
                        type: 'postgres',
                        host: configService.get('DB_HOST'),
                        port: configService.get('DB_PORT'),
                        username: configService.get('DB_USERNAME'),
                        password: configService.get('DB_PASSWORD'),
                        database: configService.get('DB_DATABASE'),
                        autoLoadEntities: true,
                        synchronize: true,
                        // DB Connection Pool for 100+ concurrent tables
                        extra: {
                            max: 80,
                            min: 10,
                            idleTimeoutMillis: 60000,
                            connectionTimeoutMillis: 10000
                        }
                    };
                },
                inject: [
                    _config.ConfigService
                ]
            }),
            _redismodule.RedisModule,
            _billiardmodule.BilliardModule,
            _inventorymodule.InventoryModule,
            _cafemodule.CafeModule,
            _kdsmodule.KdsModule,
            _transactionmodule.TransactionModule,
            _membermodule.MemberModule,
            _whatsappmodule.WhatsAppModule,
            _hardwaremodule.HardwareModule,
            _reportmodule.ReportModule,
            _settingsmodule.SettingsModule,
            _financemodule.FinanceModule,
            _seedermodule.SeederModule,
            _socketmodule.SocketModule,
            _maintenancemodule.MaintenanceModule,
            _promomodule.PromoModule,
            _cafetablemodule.CafeTableModule,
            _usermodule.UserModule,
            _authmodule.AuthModule,
            _waitinglistmodule.WaitingListModule,
            _mqttmodule.MqttModule,
            _lockermodule.LockerModule,
            _loyaltymodule.LoyaltyModule,
            _aimodule.AIModule,
            _chatmodule.ChatModule,
            _attendancemodule.AttendanceModule,
            _approvalmodule.ApprovalModule,
            _externalsyncmodule.ExternalSyncModule,
            _licensemodule.LicenseModule,
            _vouchermodule.VoucherModule
        ],
        controllers: [
            _appcontroller.AppController
        ],
        providers: [
            _appservice.AppService,
            // Apply rate limiting globally to all HTTP endpoints
            {
                provide: _core.APP_GUARD,
                useClass: _throttler.ThrottlerGuard
            }
        ]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map