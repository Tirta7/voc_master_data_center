import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { SettingsUploadController } from './settings-upload.controller';
import { Setting } from './entities/setting.entity';
import { forwardRef } from '@nestjs/common';
import { ReportModule } from '../report/report.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Setting]),
    forwardRef(() => ReportModule),
    forwardRef(() => SocketModule),
  ],
  controllers: [SettingsController, SettingsUploadController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
