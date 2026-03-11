import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  Transaction,
  TransactionStatus,
} from '../transaction/entities/transaction.entity';
import { OrderItem, OrderItemStatus } from '../cafe/entities/order-item.entity';
import { Cashflow } from '../finance/entities/cashflow.entity';
import { AuditLog } from '../report/entities/audit-log.entity';
import { Session } from '../billiard/entities/session.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  private lastRunDate: string | null = null;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Cashflow)
    private readonly cashflowRepo: Repository<Cashflow>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => BilliardGateway))
    private readonly billiardGateway: BilliardGateway,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Berjalan setiap menit untuk mengecek konfigurasi autoMaintenanceTime
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndRunMaintenance(): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      const maintenanceTime = settings.autoMaintenanceTime || '03:00';

      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;

      const currentDateStr = now.toISOString().split('T')[0];

      if (
        currentTimeStr === maintenanceTime &&
        this.lastRunDate !== currentDateStr
      ) {
        this.lastRunDate = currentDateStr; // Mark as run for today
        await this.runNightlyMaintenance();
      }
    } catch (e) {
      this.logger.error('Error checking maintenance schedule', e);
    }
  }

  async runNightlyMaintenance(): Promise<void> {
    this.logger.log('=== Nightly Maintenance Start ===');

    const stats = {
      auditLogsDeleted: 0,
      sessionsDeleted: 0,
      transactionsArchived: 0,
      orderItemsArchived: 0,
      cashflowArchived: 0,
    };

    try {
      stats.auditLogsDeleted = await this.purgeAuditLogs();
      stats.sessionsDeleted = await this.purgeSessions();
      stats.transactionsArchived = await this.archiveOldTransactions();
      stats.cashflowArchived = await this.archiveOldCashflow();

      this.logger.log(`=== Nightly Maintenance Complete ===`);
      this.logger.log(JSON.stringify(stats));
    } catch (err) {
      this.logger.error('Maintenance error:', err);
    }
  }

  /**
   * Hapus audit_logs lebih dari 30 hari
   */
  async purgeAuditLogs(retentionDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditLogRepo.delete({
      createdAt: LessThan(cutoffDate),
    });

    const count = result.affected || 0;
    this.logger.log(
      `Purged ${count} audit logs older than ${retentionDays} days`,
    );
    return count;
  }

  /**
   * Hapus sessions lebih dari 90 hari
   */
  async purgeSessions(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.sessionRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    const count = result.affected || 0;
    this.logger.log(
      `Purged ${count} sessions older than ${retentionDays} days`,
    );
    return count;
  }

  /**
   * Archive transaksi PAID/CANCELLED lebih dari 90 hari ke tabel arsip
   */
  async archiveOldTransactions(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await this.ensureArchiveTablesExist();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let archivedCount = 0;
    try {
      await queryRunner.query(
        `
                INSERT INTO order_items_archive
                SELECT oi.* FROM order_items oi
                INNER JOIN transactions t ON oi."transactionId" = t.id
                WHERE t.status IN ('PAID', 'CANCELLED')
                  AND t."createdAt" < $1
                ON CONFLICT DO NOTHING
            `,
        [cutoffDate],
      );

      await queryRunner.query(
        `
                INSERT INTO transaction_payments_archive
                SELECT tp.* FROM transaction_payments tp
                INNER JOIN transactions t ON tp."transactionId" = t.id
                WHERE t.status IN ('PAID', 'CANCELLED')
                  AND t."createdAt" < $1
                ON CONFLICT DO NOTHING
            `,
        [cutoffDate],
      );

      await queryRunner.query(
        `
                DELETE FROM order_items oi
                USING transactions t
                WHERE oi."transactionId" = t.id
                  AND t.status IN ('PAID', 'CANCELLED')
                  AND t."createdAt" < $1
            `,
        [cutoffDate],
      );

      await queryRunner.query(
        `
                DELETE FROM transaction_payments tp
                USING transactions t
                WHERE tp."transactionId" = t.id
                  AND t.status IN ('PAID', 'CANCELLED')
                  AND t."createdAt" < $1
            `,
        [cutoffDate],
      );

      await queryRunner.query(
        `
                INSERT INTO transactions_archive
                SELECT * FROM transactions
                WHERE status IN ('PAID', 'CANCELLED')
                  AND "createdAt" < $1
                ON CONFLICT DO NOTHING
            `,
        [cutoffDate],
      );

      const deleteResult = await queryRunner.query(
        `
                DELETE FROM transactions
                WHERE status IN ('PAID', 'CANCELLED')
                  AND "createdAt" < $1
            `,
        [cutoffDate],
      );

      archivedCount = deleteResult[1] || 0;
      await queryRunner.commitTransaction();

      this.logger.log(
        `Archived ${archivedCount} transactions older than ${retentionDays} days`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error archiving transactions:', err);
    } finally {
      await queryRunner.release();
    }

    return archivedCount;
  }

  /**
   * Archive cashflow lebih dari 1 tahun ke tabel arsip
   */
  async archiveOldCashflow(retentionDays = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await this.ensureArchiveTablesExist();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let archivedCount = 0;
    try {
      await queryRunner.query(
        `
                INSERT INTO cashflow_archive
                SELECT * FROM cashflow WHERE timestamp < $1
                ON CONFLICT DO NOTHING
            `,
        [cutoffDate],
      );

      const deleteResult = await queryRunner.query(
        `
                DELETE FROM cashflow WHERE timestamp < $1
            `,
        [cutoffDate],
      );

      archivedCount = deleteResult[1] || 0;
      await queryRunner.commitTransaction();

      this.logger.log(
        `Archived ${archivedCount} cashflow records older than ${retentionDays} days`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error archiving cashflow:', err);
    } finally {
      await queryRunner.release();
    }

    return archivedCount;
  }

  /**
   * Buat tabel arsip jika belum ada (dijalankan otomatis)
   */
  async ensureArchiveTablesExist(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const tablesToSync = [
        { original: 'transactions', archive: 'transactions_archive' },
        { original: 'order_items', archive: 'order_items_archive' },
        {
          original: 'transaction_payments',
          archive: 'transaction_payments_archive',
        },
        { original: 'cashflow', archive: 'cashflow_archive' },
      ];

      for (const { original, archive } of tablesToSync) {
        // PostgreSQL: CREATE TABLE (LIKE source INCLUDING ALL) copies columns, constraints, indexes
        await queryRunner.query(`
                    CREATE TABLE IF NOT EXISTS "${archive}" (LIKE "${original}" INCLUDING ALL);
                `);

        // Sync any columns present in original but missing in archive
        const columnsResult = await queryRunner.query(
          `
                    SELECT c.column_name, c.udt_name, c.is_nullable, c.column_default,
                           c.character_maximum_length, c.numeric_precision, c.numeric_scale
                    FROM information_schema.columns c
                    WHERE c.table_schema = current_schema()
                      AND c.table_name = $1
                      AND c.column_name NOT IN (
                          SELECT column_name FROM information_schema.columns
                          WHERE table_schema = current_schema() AND table_name = $2
                      )
                `,
          [original, archive],
        );

        for (const col of columnsResult) {
          this.logger.log(
            `Syncing schema: Adding column ${col.column_name} to ${archive}`,
          );
          // Build a simplified type string from PG information_schema
          let colType = col.udt_name;
          if (col.character_maximum_length)
            colType = `varchar(${col.character_maximum_length})`;
          else if (col.numeric_precision && col.udt_name === 'numeric')
            colType = `numeric(${col.numeric_precision},${col.numeric_scale ?? 0})`;
          let sql = `ALTER TABLE "${archive}" ADD COLUMN "${col.column_name}" ${colType}`;
          if (col.is_nullable === 'NO') sql += ' NOT NULL';
          if (col.column_default) sql += ` DEFAULT ${col.column_default}`;
          await queryRunner.query(sql);
        }
      }

      this.logger.log('Archive tables checked/synchronized successfully');
    } catch (err) {
      this.logger.error('Error synchronizing archive tables:', err);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Ambil statistik ukuran tabel (untuk monitoring admin)
   */
  async getDatabaseStats(): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const dbNameResult = await queryRunner.query(
        `SELECT current_database() AS "dbName"`,
      );
      const dbName = dbNameResult[0]?.dbName || 'billiard_db';

      // PostgreSQL: use pg_stat_user_tables + pg_total_relation_size for size stats
      const tableSizes = await queryRunner.query(`
                SELECT
                    c.relname AS "tableName",
                    n_live_tup AS "estimatedRows",
                    ROUND(pg_total_relation_size(c.oid) / 1024.0 / 1024.0, 2) AS "sizeMB",
                    ROUND(pg_relation_size(c.oid) / 1024.0 / 1024.0, 2) AS "dataMB",
                    ROUND((pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) / 1024.0 / 1024.0, 2) AS "indexMB"
                FROM pg_stat_user_tables s
                JOIN pg_class c ON c.relname = s.relname
                WHERE schemaname = current_schema()
                ORDER BY pg_total_relation_size(c.oid) DESC
            `);

      const [transactions, orderItems, cashflow, auditLogs, sessions] =
        await Promise.all([
          this.transactionRepo.count(),
          this.orderItemRepo.count(),
          this.cashflowRepo.count(),
          this.auditLogRepo.count(),
          this.sessionRepo.count(),
        ]);

      const settings = await this.settingsService.getSettings();
      const maintenanceTimeStr = settings.autoMaintenanceTime || '03:00';
      const [mh, mm] = maintenanceTimeStr.split(':').map(Number);

      const nextMaintenanceDate = new Date();
      nextMaintenanceDate.setHours(mh, mm, 0, 0);
      if (nextMaintenanceDate <= new Date()) {
        nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + 1);
      }

      return {
        lastChecked: new Date().toISOString(),
        nextScheduledMaintenance: nextMaintenanceDate.toISOString(),
        retentionPolicy: {
          auditLogs: '30 hari',
          sessions: '90 hari',
          transactions: '90 hari (arsip)',
          cashflow: '1 tahun (arsip)',
        },
        activeCounts: {
          transactions,
          orderItems,
          cashflow,
          auditLogs,
          sessions,
        },
        tableSizes,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Preview: Hitung berapa record yang AKAN terdampak (dry-run, tidak hapus data)
   */
  async getPreviewCounts(params: {
    auditLogDays?: number;
    sessionDays?: number;
    transactionDays?: number;
    cashflowDays?: number;
  }): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const now = new Date();

      const cutoffAudit = new Date(now);
      cutoffAudit.setDate(now.getDate() - (params.auditLogDays ?? 30));

      const cutoffSession = new Date(now);
      cutoffSession.setDate(now.getDate() - (params.sessionDays ?? 90));

      const cutoffTransaction = new Date(now);
      cutoffTransaction.setDate(now.getDate() - (params.transactionDays ?? 90));

      const cutoffCashflow = new Date(now);
      cutoffCashflow.setDate(now.getDate() - (params.cashflowDays ?? 365));

      const [auditRes, sessionRes, transRes, cashRes] = await Promise.all([
        queryRunner.query(
          `SELECT COUNT(*) AS cnt FROM audit_logs WHERE "createdAt" < $1`,
          [cutoffAudit],
        ),
        queryRunner.query(
          `SELECT COUNT(*) AS cnt FROM sessions WHERE "createdAt" < $1`,
          [cutoffSession],
        ),
        queryRunner.query(
          `SELECT COUNT(*) AS cnt FROM transactions WHERE status IN ('PAID','CANCELLED') AND "createdAt" < $1`,
          [cutoffTransaction],
        ),
        queryRunner.query(
          `SELECT COUNT(*) AS cnt FROM cashflow WHERE timestamp < $1`,
          [cutoffCashflow],
        ),
      ]);

      return {
        auditLogs: Number(auditRes[0]?.cnt ?? 0),
        sessions: Number(sessionRes[0]?.cnt ?? 0),
        transactions: Number(transRes[0]?.cnt ?? 0),
        cashflow: Number(cashRes[0]?.cnt ?? 0),
        cutoffs: {
          auditLogs: cutoffAudit.toISOString(),
          sessions: cutoffSession.toISOString(),
          transactions: cutoffTransaction.toISOString(),
          cashflow: cutoffCashflow.toISOString(),
        },
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * PERFORM HARD RESET (DANGER!)
   * This will wipe all operational data and reset all statuses to AVAILABLE.
   */
  async performHardReset(): Promise<void> {
    this.logger.warn('!!! HARD RESET INITIATED !!!');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Truncate Operational Tables
      const tablesToTruncate = [
        'transactions',
        'order_items',
        'transaction_payments',
        'cashflow',
        'audit_logs',
        'sessions',
        'waiting_lists',
        'shifts',
        'business_days',
        'expenses',
      ];

      for (const table of tablesToTruncate) {
        await queryRunner.query(
          `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`,
        );
      }

      // 2. Reset Status Fields
      await queryRunner.query(`
                UPDATE tables SET 
                    status = 'available', 
                    "isLightOn" = false, 
                    "sessionType" = NULL, 
                    "startTime" = NULL, 
                    "endTime" = NULL, 
                    "remainingMinutes" = NULL, 
                    "packageId" = NULL, 
                    "activePackagePrice" = NULL, 
                    "lastSessionData" = NULL, 
                    "isBooked" = false, 
                    "bookedByWaitingId" = NULL, 
                    "bookedByName" = NULL, 
                    "memberId" = NULL;
            `);

      await queryRunner.query(`
                UPDATE cafe_tables SET 
                    status = 'available', 
                    "currentTransactionId" = NULL, 
                    "currentCustomer" = NULL, 
                    "isBooked" = false, 
                    "bookedByWaitingId" = NULL, 
                    "bookedByName" = NULL;
            `);

      await queryRunner.query(`UPDATE members SET balance = 0, points = 0;`);

      await queryRunner.commitTransaction();
      this.logger.log('Hard reset complete. Operational data wiped.');

      // 3. Broadcast Reset
      if (this.billiardGateway?.server) {
        this.billiardGateway.server.emit('hard_reset_confirmed');
        this.billiardGateway.server.emit('tables_update');
        this.billiardGateway.server.emit('audit_update');
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('HARD RESET FAILED:', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
