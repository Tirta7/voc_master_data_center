import { Controller, Post, UseGuards } from '@nestjs/common';
import { ExternalSyncService } from './external-sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/external-sync')
@UseGuards(JwtAuthGuard)
export class ExternalSyncController {
  constructor(private readonly syncService: ExternalSyncService) {}

  @Post('sync-now')
  async syncNow() {
    await this.syncService.syncAllData();
    return { success: true, message: 'Sinkronisasi ke Google Apps Script berhasil dimulai.' };
  }
}
