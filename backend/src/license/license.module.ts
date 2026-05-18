import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LicenseService } from './license.service';
import { LicenseController } from './license.controller';

@Module({
  imports: [HttpModule],
  providers: [LicenseService],
  controllers: [LicenseController],
  exports: [LicenseService],
})
export class LicenseModule {}
