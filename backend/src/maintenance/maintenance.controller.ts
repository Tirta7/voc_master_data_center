import {
  Controller,
  Get,
  Post,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceService } from './maintenance.service';

@Controller('admin/maintenance')
@UseGuards(AuthGuard('jwt'))
export class MaintenanceController {
  private readonly logger = new Logger(MaintenanceController.name);

  constructor(private readonly maintenanceService: MaintenanceService) {}

  /**
   * GET /admin/maintenance/stats
   * Melihat statistik ukuran tabel dan jumlah baris
   */
  @Get('stats')
  async getDatabaseStats() {
    return this.maintenanceService.getDatabaseStats();
  }

  /**
   * GET /admin/maintenance/preview?auditLogDays=30&sessionDays=90&transactionDays=90&cashflowDays=365
   * Berapa record yang AKAN terdampak (dry-run, tidak ada yang dihapus)
   */
  @Get('preview')
  async previewMaintenance(
    @Query('auditLogDays', new DefaultValuePipe(30), ParseIntPipe)
    auditLogDays: number,
    @Query('sessionDays', new DefaultValuePipe(90), ParseIntPipe)
    sessionDays: number,
    @Query('transactionDays', new DefaultValuePipe(90), ParseIntPipe)
    transactionDays: number,
    @Query('cashflowDays', new DefaultValuePipe(365), ParseIntPipe)
    cashflowDays: number,
  ) {
    return this.maintenanceService.getPreviewCounts({
      auditLogDays,
      sessionDays,
      transactionDays,
      cashflowDays,
    });
  }

  /**
   * POST /admin/maintenance/run
   * Jalankan semua maintenance secara manual
   */
  @Post('run')
  async runMaintenance() {
    await this.maintenanceService.runNightlyMaintenance();
    return {
      message: 'Maintenance selesai dijalankan. Cek server logs untuk detail.',
    };
  }

  /**
   * POST /admin/maintenance/purge-audit-logs?days=30
   * Hapus audit logs lebih dari N hari
   */
  @Post('purge-audit-logs')
  async purgeAuditLogs(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const count = await this.maintenanceService.purgeAuditLogs(days);
    return {
      message: `Berhasil menghapus ${count} audit log lebih dari ${days} hari`,
    };
  }

  /**
   * POST /admin/maintenance/purge-sessions?days=90
   * Hapus sessions lebih dari N hari
   */
  @Post('purge-sessions')
  async purgeSessions(
    @Query('days', new DefaultValuePipe(90), ParseIntPipe) days: number,
  ) {
    const count = await this.maintenanceService.purgeSessions(days);
    return {
      message: `Berhasil menghapus ${count} session lebih dari ${days} hari`,
    };
  }

  /**
   * POST /admin/maintenance/archive-transactions?days=90
   * Arsipkan transaksi PAID/CANCELLED lebih dari N hari
   */
  @Post('archive-transactions')
  async archiveTransactions(
    @Query('days', new DefaultValuePipe(90), ParseIntPipe) days: number,
  ) {
    const count = await this.maintenanceService.archiveOldTransactions(days);
    return {
      message: `Berhasil mengarsipkan ${count} transaksi lebih dari ${days} hari`,
    };
  }

  /**
   * POST /admin/maintenance/archive-cashflow?days=365
   * Arsipkan cashflow lebih dari N hari
   */
  @Post('archive-cashflow')
  async archiveCashflow(
    @Query('days', new DefaultValuePipe(365), ParseIntPipe) days: number,
  ) {
    const count = await this.maintenanceService.archiveOldCashflow(days);
    return {
      message: `Berhasil mengarsipkan ${count} cashflow lebih dari ${days} hari`,
    };
  }

  /**
   * POST /admin/maintenance/ensure-archive-tables
   * Buat tabel arsip jika belum ada
   */
  @Post('ensure-archive-tables')
  async ensureArchiveTables() {
    await this.maintenanceService.ensureArchiveTablesExist();
    return { message: 'Tabel arsip berhasil dicek/dibuat' };
  }

  /**
   * POST /admin/maintenance/hard-reset
   * RESET SEMUA DATA OPERASIONAL (DANGER!)
   */
  @Post('hard-reset')
  async hardReset() {
    await this.maintenanceService.performHardReset();
    return {
      message:
        'Database berhasil di-reset ke kondisi awal. Semua data operasional telah dihapus.',
    };
  }
}
