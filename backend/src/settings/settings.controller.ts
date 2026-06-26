import {
  Controller,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as os from 'os';
import * as si from 'systeminformation';
import { SettingsService } from './settings.service';
import { Setting } from './entities/setting.entity';
import { QrisUtil } from '../license/qris.util';


@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(): Promise<Setting> {
    return this.settingsService.getSettings();
  }

  @Patch()
  @UseGuards(AuthGuard('jwt'))
  async updateSettings(
    @Body() data: Partial<Setting>,
    @Request() req: any,
  ): Promise<Setting> {
    return this.settingsService.updateSettings(data, req.user.username);
  }

  @Get('ping')
  getPing() {
    return { ok: true, ts: Date.now() };
  }

  @Get('qris/dynamic')
  async getDynamicQris(@Query('amount') amount: string) {
    const settings = await this.settingsService.getSettings();
    if (!settings.clientQrisString) {
      throw new Error('Client QRIS string not configured');
    }

    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt <= 0) {
      throw new Error('Invalid amount');
    }

    const dynamicQris = QrisUtil.generateDynamicQris(settings.clientQrisString, amt);
    
    return {
      qrisString: dynamicQris,
      amount: amt
    };
  }

  @Get('network')
  @UseGuards(AuthGuard('jwt'))
  async getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const k in interfaces) {
      const networkInterface = interfaces[k];
      if (!networkInterface) continue;
      for (const address of networkInterface) {
        if (address.family === 'IPv4' && !address.internal) {
          addresses.push(address.address);
        }
      }
    }
    return {
      ipAddresses: addresses,
      primaryIp:
        addresses.find((ip) => ip.startsWith('192.168')) ||
        addresses[0] ||
        '127.0.0.1',
    };
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  async getServerStats() {
    const [cpu, mem, networkStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
    ]);

    const netIface = networkStats[0] || { rx_sec: 0, tx_sec: 0 };

    return {
      cpu: Math.round(cpu.currentLoad),
      memUsed: Math.round((mem.used / mem.total) * 100),
      memUsedMB: Math.round(mem.used / 1024 / 1024),
      memTotalMB: Math.round(mem.total / 1024 / 1024),
      download: Math.round((netIface.rx_sec || 0) / 1024), // KB/s
      upload: Math.round((netIface.tx_sec || 0) / 1024), // KB/s
      timestamp: Date.now(),
    };
  }
}
