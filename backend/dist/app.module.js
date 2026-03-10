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
const _config = require("@nestjs/config");
const _typeorm = require("@nestjs/typeorm");
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
                        synchronize: true
                    };
                },
                inject: [
                    _config.ConfigService
                ]
            }),
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
            _loyaltymodule.LoyaltyModule
        ],
        controllers: [
            _appcontroller.AppController
        ],
        providers: [
            _appservice.AppService
        ]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map