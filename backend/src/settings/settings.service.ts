import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import type { ReportService } from '../report/report.service';
import { EventsGateway } from '../socket/events.gateway';
import { ApprovalService } from '../common/approval/approval.service';

@Injectable()
export class SettingsService implements OnModuleInit {
  private cachedSettings: Setting | null = null;

  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
    @Inject(
      forwardRef(() => {
        const { ReportService } = require('../report/report.service');
        return ReportService;
      }),
    )
    private readonly reportService: ReportService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    @Inject(forwardRef(() => ApprovalService))
    private readonly approvalService: ApprovalService,
    @Inject(forwardRef(() => {
      const { MqttService } = require('../mqtt/mqtt.service');
      return MqttService;
    }))
    private readonly mqttService: any,
  ) {}

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

  getEndingSoonThresholdSync(): number {
    return this.cachedSettings?.endingSoonThreshold ?? 5;
  }

  async updateSettings(
    data: Partial<Setting>,
    userName?: string,
  ): Promise<Setting> {
    const settings = await this.getSettings();

    if (userName) {
      const changes = [];
      const dataObj = data as any;
      const settingsObj = settings as any;
      for (const key of Object.keys(dataObj)) {
        if (dataObj[key] !== settingsObj[key]) {
          changes.push(
            `${key}: ${JSON.stringify(settingsObj[key])} -> ${JSON.stringify(dataObj[key])}`,
          );
        }
      }
      if (changes.length > 0) {
        await this.reportService.logAction(
          'UPDATE_SETTINGS',
          userName,
          `Ubah pengaturan: ${changes.join(', ')}`,
        );
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
      settings: updated,
    });

    // Notify hardware if wallpaper changed
    if (data.tftWallpaper) {
        this.mqttService.broadcastDisplaySync(updated.tftWallpaper);
    }

    return updated;
  }
}
