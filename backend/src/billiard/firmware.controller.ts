import {
  Controller,
  Post,
  Body,
  Param,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FirmwareService } from './firmware.service';
import { BilliardService } from './billiard.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('billiard/firmware')
@UseGuards(AuthGuard('jwt'))
export class FirmwareController {
  private readonly logger = new Logger(FirmwareController.name);
  constructor(
    private readonly firmwareService: FirmwareService,
    private readonly billiardService: BilliardService,
  ) {}

  private get persistencePath(): string {
    const root = path.join(process.cwd(), '..');
    return path.join(root, 'firmware_builds', 'last_build.json');
  }

  private setLastCompiledBin(binPath: string) {
    try {
      if (!fs.existsSync(path.dirname(this.persistencePath))) {
        fs.mkdirSync(path.dirname(this.persistencePath), { recursive: true });
      }
      fs.writeFileSync(
        this.persistencePath,
        JSON.stringify({ binPath, timestamp: new Date().toISOString() }),
      );
    } catch (e) {
      this.logger.error(`Failed to persist build path: ${e.message}`);
    }
  }

  private getLastCompiledBin(): string | null {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const data = JSON.parse(fs.readFileSync(this.persistencePath, 'utf8'));
        if (data.binPath && fs.existsSync(data.binPath)) {
          return data.binPath;
        }
      }
    } catch (e) {
      this.logger.error(`Failed to read persisted build path: ${e.message}`);
    }
    return null;
  }

  @Post('compile')
  async compile(@Body('code') code: string) {
    if (!code) throw new BadRequestException('Source code is required');

    const result = await this.firmwareService.compileIno(code);
    if (result.success && result.binPath) {
      this.setLastCompiledBin(result.binPath);
    }
    return result;
  }

  @Post('deploy/:tableId')
  async deploy(@Param('tableId', ParseIntPipe) tableId: number) {
    const binPath = this.getLastCompiledBin();
    if (!binPath) {
      throw new BadRequestException(
        'No compiled firmware found. Please compile first.',
      );
    }

    const table = await this.billiardService.getTableById(tableId);
    if (!table) throw new NotFoundException(`Table ${tableId} not found`);

    const targetIp = (table as any).ipAddress;
    if (!targetIp) {
      throw new BadRequestException(
        `Table ${table.tableName} IP address not found. Ensure it is online.`,
      );
    }

    return this.firmwareService.flashTable(targetIp, binPath);
  }

  @Post('source')
  async saveSource(@Body('code') code: string) {
    if (!code) throw new BadRequestException('Source code is required');
    try {
      const sourcePath = path.join(
        path.dirname(this.persistencePath),
        'firmware.ino',
      );
      fs.writeFileSync(sourcePath, code);
      return { success: true };
    } catch (e) {
      this.logger.error(`Failed to save source: ${e.message}`);
      throw new BadRequestException('Failed to save source code');
    }
  }

  @Post('source/get') // Using Post for compatibility if needed, but Get is better.
  async getSource() {
    try {
      const sourcePath = path.join(
        path.dirname(this.persistencePath),
        'firmware.ino',
      );
      if (fs.existsSync(sourcePath)) {
        const code = fs.readFileSync(sourcePath, 'utf8');
        return { success: true, code };
      }
      return { success: false, message: 'No saved source found' };
    } catch (e) {
      this.logger.error(`Failed to read source: ${e.message}`);
      return { success: false, message: 'Failed to read source code' };
    }
  }
}
