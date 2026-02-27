import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import type { ReportService } from '../report/report.service';

@Injectable()
export class SettingsService implements OnModuleInit {
    private cachedSettings: Setting | null = null;

    constructor(
        @InjectRepository(Setting)
        private readonly settingsRepository: Repository<Setting>,
        @Inject(forwardRef(() => { const { ReportService } = require('../report/report.service'); return ReportService; }))
        private readonly reportService: ReportService,
    ) { }

    async onModuleInit() {
        await this.getSettings();
    }

    async getSettings(): Promise<Setting> {
        if (this.cachedSettings) return this.cachedSettings;

        let settings = await this.settingsRepository.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = this.settingsRepository.create({ id: 1 });
            await this.settingsRepository.save(settings);
        }
        this.cachedSettings = settings;
        return settings;
    }

    async updateSettings(data: Partial<Setting>, userName?: string): Promise<Setting> {
        const settings = await this.getSettings();

        if (userName) {
            const changes = [];
            const dataObj = data as any;
            const settingsObj = settings as any;
            for (const key of Object.keys(dataObj)) {
                if (dataObj[key] !== settingsObj[key]) {
                    changes.push(`${key}: ${JSON.stringify(settingsObj[key])} -> ${JSON.stringify(dataObj[key])}`);
                }
            }
            if (changes.length > 0) {
                await this.reportService.logAction(
                    'UPDATE_SETTINGS',
                    userName,
                    `Ubah pengaturan: ${changes.join(', ')}`
                );
            }
        }

        Object.assign(settings, data);
        const updated = await this.settingsRepository.save(settings);
        this.cachedSettings = updated;
        return updated;
    }
}
