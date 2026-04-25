import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { PrinterService } from './printer.service';
import { SettingsController } from './settings.controller';
import { SettingsUploadController } from './settings-upload.controller';
import { Setting } from './entities/setting.entity';
import { Printer } from './entities/printer.entity';
import { PublicHoliday, BusinessClosure } from './entities/holiday.entity';
import { forwardRef } from '@nestjs/common';
import { ReportModule } from '../report/report.module';
import { SocketModule } from '../socket/socket.module';
import { HardwareService } from '../hardware/hardware.service';
import { ScheduleModule } from '@nestjs/schedule';

import { PrinterController } from './printer.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Setting, Printer, PublicHoliday, BusinessClosure]),
    ScheduleModule.forRoot(),
    forwardRef(() => ReportModule),
    forwardRef(() => SocketModule),
  ],
  controllers: [SettingsController, SettingsUploadController, PrinterController],
  providers: [SettingsService, PrinterService, HardwareService],
  exports: [SettingsService, PrinterService, HardwareService],
})
export class SettingsModule {}
