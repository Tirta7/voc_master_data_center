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
        this.cachedSettings = settings;
        return settings;
    }
    async updateSettings(data, userName) {
        const settings = await this.getSettings();
        if (userName) {
            const changes = [];
            const dataObj = data;
            const settingsObj = settings;
            for (const key of Object.keys(dataObj)){
                if (dataObj[key] !== settingsObj[key]) {
                    changes.push(`${key}: ${JSON.stringify(settingsObj[key])} -> ${JSON.stringify(dataObj[key])}`);
                }
            }
            if (changes.length > 0) {
                await this.reportService.logAction('UPDATE_SETTINGS', userName, `Ubah pengaturan: ${changes.join(', ')}`);
            }
        }
        Object.assign(settings, data);
        const updated = await this.settingsRepository.save(settings);
        this.cachedSettings = updated;
        return updated;
    }
    constructor(settingsRepository, reportService){
        this.settingsRepository = settingsRepository;
        this.reportService = reportService;
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
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof ReportService === "undefined" ? Object : ReportService
    ])
], SettingsService);

//# sourceMappingURL=settings.service.js.map