import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Transaction, TransactionStatus } from '../transaction/entities/transaction.entity';
import { OrderItem, OrderItemStatus } from '../cafe/entities/order-item.entity';
import { Cashflow } from '../finance/entities/cashflow.entity';
import { AuditLog } from '../report/entities/audit-log.entity';
import { Session } from '../billiard/entities/session.entity';

@Injectable()
export class MaintenanceService {
    private readonly logger = new Logger(MaintenanceService.name);

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
    ) { }

    /**
     * Berjalan setiap hari jam 03:00 dini hari (saat idle)
     */
    @Cron('0 3 * * *')
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
        this.logger.log(`Purged ${count} audit logs older than ${retentionDays} days`);
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
        this.logger.log(`Purged ${count} sessions older than ${retentionDays} days`);
        return count;
    }

    /**
     * Archive transaksi PAID/CANCELLED lebih dari 90 hari ke tabel arsip
     */
    async archiveOldTransactions(retentionDays = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Pastikan tabel arsip ada (dibuat jika belum ada)
        await this.ensureArchiveTablesExist();

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        let archivedCount = 0;
        try {
            // Pindahkan order_items terkait ke arsip terlebih dahulu
            await queryRunner.query(`
                INSERT IGNORE INTO order_items_archive
                SELECT oi.* FROM order_items oi
                INNER JOIN transactions t ON oi.transactionId = t.id
                WHERE t.status IN ('PAID', 'CANCELLED')
                  AND t.createdAt < ?
            `, [cutoffDate]);

            // Pindahkan transaction_payments terkait ke arsip
            await queryRunner.query(`
                INSERT IGNORE INTO transaction_payments_archive
                SELECT tp.* FROM transaction_payments tp
                INNER JOIN transactions t ON tp.transactionId = t.id
                WHERE t.status IN ('PAID', 'CANCELLED')
                  AND t.createdAt < ?
            `, [cutoffDate]);

            // Hapus order_items yang sudah diarsip
            await queryRunner.query(`
                DELETE oi FROM order_items oi
                INNER JOIN transactions t ON oi.transactionId = t.id
                WHERE t.status IN ('PAID', 'CANCELLED')
                  AND t.createdAt < ?
            `, [cutoffDate]);

            // Hapus transaction_payments yang sudah diarsip
            await queryRunner.query(`
                DELETE tp FROM transaction_payments tp
                INNER JOIN transactions t ON tp.transactionId = t.id
                WHERE t.status IN ('PAID', 'CANCELLED')
                  AND t.createdAt < ?
            `, [cutoffDate]);

            // Pindahkan transaksi ke arsip (pilih kolom eksplisit jika perlu, tapi sync sudah memastikan jumlah kolom sama)
            const insertResult = await queryRunner.query(`
                INSERT IGNORE INTO transactions_archive
                SELECT * FROM transactions
                WHERE status IN ('PAID', 'CANCELLED')
                  AND createdAt < ?
            `, [cutoffDate]);

            // Hapus dari tabel utama
            const deleteResult = await queryRunner.query(`
                DELETE FROM transactions
                WHERE status IN ('PAID', 'CANCELLED')
                  AND createdAt < ?
            `, [cutoffDate]);

            archivedCount = deleteResult.affectedRows || 0;
            await queryRunner.commitTransaction();

            this.logger.log(`Archived ${archivedCount} transactions older than ${retentionDays} days`);
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
            // Pindahkan cashflow ke arsip
            await queryRunner.query(`
                INSERT IGNORE INTO cashflow_archive
                SELECT * FROM cashflow WHERE timestamp < ?
            `, [cutoffDate]);

            const deleteResult = await queryRunner.query(`
                DELETE FROM cashflow WHERE timestamp < ?
            `, [cutoffDate]);

            archivedCount = deleteResult.affectedRows || 0;
            await queryRunner.commitTransaction();

            this.logger.log(`Archived ${archivedCount} cashflow records older than ${retentionDays} days`);
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
                { original: 'transaction_payments', archive: 'transaction_payments_archive' },
                { original: 'cashflow', archive: 'cashflow_archive' }
            ];

            for (const { original, archive } of tablesToSync) {
                // 1. Create table IF NOT EXISTS
                await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${archive} LIKE ${original};`);

                // 2. Sync columns (Add missing columns to archive if original was updated)
                const columnsResult = await queryRunner.query(`
                    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                      AND COLUMN_NAME NOT IN (
                          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
                          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                      )
                `, [original, archive]);

                for (const col of columnsResult) {
                    this.logger.log(`Syncing schema: Adding column ${col.COLUMN_NAME} to ${archive}`);
                    let sql = `ALTER TABLE ${archive} ADD COLUMN ${col.COLUMN_NAME} ${col.COLUMN_TYPE}`;
                    if (col.IS_NULLABLE === 'NO') sql += ' NOT NULL';
                    if (col.COLUMN_DEFAULT) sql += ` DEFAULT ${col.COLUMN_DEFAULT}`;
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
            // Ambil nama database dari config
            const dbNameResult = await queryRunner.query(`SELECT DATABASE() as dbName`);
            const dbName = dbNameResult[0]?.dbName || 'billiard_db';

            const tableSizes = await queryRunner.query(`
                SELECT
                    TABLE_NAME as tableName,
                    TABLE_ROWS as estimatedRows,
                    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS sizeMB,
                    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS dataMB,
                    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS indexMB,
                    CREATE_TIME as createdAt,
                    UPDATE_TIME as lastUpdated
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ?
                ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
            `, [dbName]);

            // Hitung baris aktif untuk tabel penting
            const [transactions, orderItems, cashflow, auditLogs, sessions] = await Promise.all([
                this.transactionRepo.count(),
                this.orderItemRepo.count(),
                this.cashflowRepo.count(),
                this.auditLogRepo.count(),
                this.sessionRepo.count(),
            ]);

            const nextMaintenanceDate = new Date();
            nextMaintenanceDate.setHours(3, 0, 0, 0);
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
                    `SELECT COUNT(*) as cnt FROM audit_logs WHERE createdAt < ?`,
                    [cutoffAudit]
                ),
                queryRunner.query(
                    `SELECT COUNT(*) as cnt FROM sessions WHERE createdAt < ?`,
                    [cutoffSession]
                ),
                queryRunner.query(
                    `SELECT COUNT(*) as cnt FROM transactions WHERE status IN ('PAID','CANCELLED') AND createdAt < ?`,
                    [cutoffTransaction]
                ),
                queryRunner.query(
                    `SELECT COUNT(*) as cnt FROM cashflow WHERE timestamp < ?`,
                    [cutoffCashflow]
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
}
