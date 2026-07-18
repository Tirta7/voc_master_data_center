"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SettingsService", {
    enumerable: true,
    get: function() {
        return SettingsService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _settingentity = require("./entities/setting.entity");
const _eventsgateway = require("../socket/events.gateway");
const _approvalservice = require("../common/approval/approval.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let SettingsService = class SettingsService {
    async onModuleInit() {
        await this.getSettings();
    }
    async getSettings() {
        if (this.cachedSettings) return this.cachedSettings;
        let settings = await this.settingsRepository.findOne({
            where: {
                id: 1
            }
        });
        if (!settings) {
            settings = this.settingsRepository.create({
                id: 1
            });
            await this.settingsRepository.save(settings);
        }
        // Seed default bounceBackConfig if it doesn't exist
        if (!settings.bounceBackConfig || !Array.isArray(settings.bounceBackConfig)) {
            settings.bounceBackConfig = [
                {
                    tierName: "Tier 1 - Pelanggan Reguler",
                    minAmount: 50000,
                    maxAmount: 100000,
                    rewardType: "FREE_ITEM",
                    rewardValue: 1,
                    minClaimTransaction: 0,
                    expiryDays: 7
                },
                {
                    tierName: "Tier 2 - Pelanggan Setia",
                    minAmount: 100001,
                    maxAmount: 250000,
                    rewardType: "DISCOUNT_FIXED",
                    rewardValue: 15000,
                    minClaimTransaction: 50000,
                    expiryDays: 14
                },
                {
                    tierName: "Tier 3 - Pelanggan VIP",
                    minAmount: 250001,
                    maxAmount: 99999999,
                    rewardType: "FREE_BILLIARD_MINUTES",
                    rewardValue: 60,
                    minClaimTransaction: 0,
                    expiryDays: 30
                }
            ];
            await this.settingsRepository.save(settings);
        }
        this.cachedSettings = settings;
        return settings;
    }
    getEndingSoonThresholdSync() {
        return this.cachedSettings?.endingSoonThreshold ?? 5;
    }
    async updateSettings(data, userName) {
        const settings = await this.getSettings();
        if (userName) {
            const changes = [];
            const dataObj = data;
            const settingsObj = settings;
            for (const key of Object.keys(dataObj)){
                const oldValStr = JSON.stringify(settingsObj[key]);
                const newValStr = JSON.stringify(dataObj[key]);
                if (oldValStr !== newValStr) {
                    if (typeof dataObj[key] !== 'object' || dataObj[key] === null) {
                        changes.push(`${key}: ${settingsObj[key]} -> ${dataObj[key]}`);
                    } else {
                        changes.push(`${key}: diperbarui`);
                    }
                }
            }
            if (changes.length > 0) {
                await this.reportService.logAction('UPDATE_SETTINGS', userName, `Ubah pengaturan: ${changes.join(', ')}`);
            }
        }
        Object.assign(settings, data);
        const updated = await this.settingsRepository.save(settings);
        this.cachedSettings = updated;
        // Sync pending approval requests if config changed
        if (data.approvalConfig) {
            await this.approvalService.syncPendingRequestsWithNewConfig(data.approvalConfig);
        }
        // Broadcast perubahan ke semua client (termasuk member game)
        this.eventsGateway.loyaltyUpdated({
            type: 'SETTINGS_UPDATE',
            settings: updated
        });
        // Notify hardware if wallpaper changed
        if (data.tftWallpaper) {
            this.mqttService.broadcastDisplaySync(updated.tftWallpaper);
        }
        return updated;
    }
    constructor(settingsRepository, reportService, eventsGateway, approvalService, mqttService){
        this.settingsRepository = settingsRepository;
        this.reportService = reportService;
        this.eventsGateway = eventsGateway;
        this.approvalService = approvalService;
        this.mqttService = mqttService;
        this.cachedSettings = null;
    }
};
SettingsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_settingentity.Setting)),
    _ts_param(1, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { ReportService: ReportService1 } = require('../report/report.service');
        return ReportService1;
    }))),
    _ts_param(2, (0, _common.Inject)((0, _common.forwardRef)(()=>_eventsgateway.EventsGateway))),
    _ts_param(3, (0, _common.Inject)((0, _common.forwardRef)(()=>_approvalservice.ApprovalService))),
    _ts_param(4, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { MqttService } = require('../mqtt/mqtt.service');
        return MqttService;
    }))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof ReportService === "undefined" ? Object : ReportService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway,
        typeof _approvalservice.ApprovalService === "undefined" ? Object : _approvalservice.ApprovalService,
        Object
    ])
], SettingsService);

//# sourceMappingURL=settings.service.js.map