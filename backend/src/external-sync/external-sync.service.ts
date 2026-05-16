import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ReportService } from '../report/report.service';
import { InventoryService } from '../inventory/inventory.service';
import { ApprovalService } from '../common/approval/approval.service';
import { AIService } from '../ai/ai.service';
import { ApprovalStatus } from '../common/entities/approval.entity';
import { OnModuleInit } from '@nestjs/common';
import { FinanceService } from '../finance/finance.service';
import { UserService } from '../user/user.service';

@Injectable()
export class ExternalSyncService implements OnModuleInit {
  private readonly logger = new Logger(ExternalSyncService.name);
  private readonly gasUrl: string | undefined;
  private readonly gasSecret: string | undefined;
  private isSyncing = false;
  private lastSyncTime = 0;
  private readonly SYNC_DEBOUNCE_MS = 3000; // Min 3 seconds between syncs to avoid collisions

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly reportService: ReportService,
    private readonly inventoryService: InventoryService,
    private readonly approvalService: ApprovalService,
    private readonly aiService: AIService,
    private readonly financeService: FinanceService,
    private readonly userService: UserService,
  ) {
    this.gasUrl = this.configService.get<string>('GAS_WEBAPP_URL');
    this.gasSecret = this.configService.get<string>('GAS_SECRET');
    this.logger.log(`ExternalSyncService initialized. URL: ${this.gasUrl ? 'Set' : 'NOT SET'}, Secret: ${this.gasSecret ? 'Set' : 'NOT SET'}`);
  }

  async onModuleInit() {
    this.logger.log('Backend started. Triggering initial sync to Google Apps Script...');
    // Small delay to ensure all services are fully ready
    setTimeout(() => this.syncAllData(), 5000);
  }

  /**
   * Sync daily reports and inventory to GAS every 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncAllData(startDate?: string, endDate?: string) {
    if (!this.gasUrl || this.isSyncing) return;

    // Prevent sync collisions - minimum interval between syncs
    const now = Date.now();
    if (now - this.lastSyncTime < this.SYNC_DEBOUNCE_MS) {
      this.logger.debug(`Sync debounced. Waiting ${this.SYNC_DEBOUNCE_MS - (now - this.lastSyncTime)}ms`);
      return;
    }

    this.isSyncing = true;
    this.lastSyncTime = now;

    try {
      this.logger.log('Starting scheduled sync to Google Apps Script...');

      const sDate = startDate || new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const eDate = endDate || new Date().toISOString();

      const [detailedReport, inventory, itemsPerf, aiTarget, aiTraffic, lowStock, shiftAudits] = await Promise.all([
        startDate && endDate
          ? this.reportService.getDetailedRevenueReport(startDate, endDate)
          : this.reportService.getDailySummaryWithBreakdown(),
        this.inventoryService.getInventoryStats(),
        this.reportService.getItemsPerformance(startDate, endDate),
        this.aiService.suggestDailyTarget(),
        this.aiService.predictDailyTraffic(),
        this.inventoryService.getLowStockItems(),
        this.reportService.getShiftAuditReport(sDate, eDate),
      ]);

      // Calculate Net Profit matching local dashboard (Gross - Opex - Salary)
      const summary = detailedReport.summary;

      // 1. Fetch Actual Opex (Finance Ledger)
      const financeStats = await this.financeService.getNetProfit(new Date(sDate), new Date(eDate));
      const totalOpex = Number(financeStats?.totalOut || 0);

      // 2. Fetch Actual Salary (Payroll System)
      const month = new Date(sDate).getMonth() + 1;
      const year = new Date(sDate).getFullYear();
      const payrollStats = await this.userService.calculateBulkPayroll(
        month,
        year,
        sDate,
        eDate,
        true
      );

      const totalSalary = Object.values(payrollStats || {})
        .filter(p => p !== null)
        .reduce((sum, p: any) => sum + (Number(p.total) || 0), 0);

      const netProfit = Number(summary.grossRevenue || 0) - totalOpex - totalSalary;

      this.logger.log(`Syncing ${itemsPerf.all.length} menu items and ${inventory.totalItems} inventory items to GAS...`);

      await this.sendToGas({
        type: 'SYNC_DATA',
        timestamp: new Date().toISOString(),
        data: {
          report: {
            ...detailedReport,
            ai: {
              target: aiTarget,
              traffic: aiTraffic,
            },
            accounting: {
              opex: totalOpex,
              salaryAccrual: totalSalary,
              netProfit,
              cashRevenue: Object.entries(detailedReport.paymentMethods || {})
                .filter(([m]) => !['MEMBER', 'MEMBERSHIP'].includes(m.toUpperCase()))
                .reduce((sum, [, v]) => sum + (Number(v) || 0), 0),
              receivables: summary.unpaidAmount || 0,
              receivablesDetails: (summary.transactions || [])
                .filter((tx: any) => tx.status !== 'PAID')
                .map((tx: any) => ({
                  invoiceNumber: tx.invoiceNumber,
                  customerName: tx.customerName || 'Non-Member',
                  customerPhone: tx.customerPhone || '-',
                  grandTotal: Number(tx.grandTotal || 0),
                  paidAmount: Number(tx.paidAmount || 0),
                  outstanding: Number(tx.grandTotal || 0) - Number(tx.paidAmount || 0),
                  status: tx.status,
                  createdAt: tx.createdAt,
                })),
            },
            shiftAudits,
            lowStockCount: lowStock.length,
          },
          shiftAudits,
          inventory,
          menuRanking: itemsPerf.all,
          allIngredients: await this.inventoryService.getAllIngredients(),
          lowStock: await this.inventoryService.getLowStockItems(),
          pendingApprovals: await this.approvalService.getAllPendingRequests(),
        },
      });

      this.logger.log('Sync to GAS completed successfully.');
    } catch (error) {
      this.logger.error(`Failed to sync data to GAS: ${error.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Poll for decisions made by the owner on the GAS Dashboard
   * Runs every 2 seconds (Turbo Polling for instant feedback)
   */
  @Cron('*/2 * * * * *') // Turbo Polling: Every 2 seconds
  async pollOwnerDecisions() {
    if (!this.gasUrl || !this.gasSecret) return;

    try {
      const url = `${this.gasUrl}?mode=fetch_decisions&secret=${this.gasSecret}`;
      const response = await firstValueFrom(this.httpService.get(url));
      const decisions = response.data;

      if (!Array.isArray(decisions) || decisions.length === 0) return;

      this.logger.log(`Found ${decisions.length} new decisions from Owner Dashboard...`);

      for (const dec of decisions) {
        try {
          const rawAction = (dec.action || '').toUpperCase();

          if (rawAction === 'SYNC_RANGE') {
            const payload = JSON.parse(dec.note || '{}');
            this.logger.log(`Received SYNC_RANGE command from Owner: ${JSON.stringify(payload)}`);
            await this.syncAllData(payload.start, payload.end);
          } else {
            // Approval Decision (APPROVE / REJECT)
            const serviceAction = (rawAction === 'SETUJU' || rawAction === 'APPROVE')
              ? 'APPROVE'
              : 'REJECT';

            this.logger.log(`Processing Owner Decision: Request #${dec.requestId} -> ${serviceAction}`);

            await this.approvalService.processApproval(
              Number(dec.requestId),
              1, // Owner / Super Admin ID
              serviceAction as any,
              dec.note || 'Approved via Owner Dashboard'
            );
          }

          // Notify GAS that this is processed
          await this.sendToGas({
            type: 'MARK_PROCESSED',
            requestId: dec.requestId
          });

          this.logger.log(`Successfully applied decision for Request #${dec.requestId}`);
        } catch (itemError) {
          const errMsg = itemError.message || '';
          if (errMsg.includes('already finalized')) {
            this.logger.warn(`Request #${dec.requestId} was already processed locally. Marking as processed in GAS to stop loop.`);
            await this.sendToGas({
              type: 'MARK_PROCESSED',
              requestId: dec.requestId
            });
          } else {
            this.logger.error(`Failed to process individual decision #${dec.requestId}: ${errMsg}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to poll owner decisions: ${error.message}`);
    }
  }

  /**
   * Push audit logs immediately to GAS
   */
  @OnEvent('audit.log')
  async handleAuditLog(payload: any) {
    if (!this.gasUrl) return;

    try {
      // Only push critical audit logs immediately (e.g. STOP, VOID, CANCEL, SHIFT)
      const criticalActions = ['STOP_MANUAL', 'VOID_TRANSACTION', 'CANCEL_ORDER', 'PRICE_OVERRIDE', 'SHIFT_CLOSING_AUDIT', 'SHIFT_CLOSED'];
      if (criticalActions.includes(payload.action)) {
        await this.sendToGas({
          type: 'AUDIT_LOG',
          data: payload,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to push audit log to GAS: ${error.message}`);
    }
  }

  /**
   * Push new approval requests immediately when created
   */
  @OnEvent('approval.created')
  async handleApprovalCreated(payload: any) {
    if (!this.gasUrl) return;

    try {
      this.logger.log(`Pushing new approval request #${payload.id} to GAS...`);
      await this.sendToGas({
        type: 'APPROVAL_REQUEST',
        data: payload,
      });
    } catch (error) {
      this.logger.error(`Failed to push approval to GAS: ${error.message}`);
    }
  }

  /**
   * Sync data immediately when any operational change occurs
   * This includes: Payments, Starting/Stopping sessions, and New Orders
   */
  private syncTimeout: NodeJS.Timeout | null = null;

  @OnEvent('payment.completed')
  @OnEvent('table.update')
  @OnEvent('order.created')
  @OnEvent('order.updated')
  @OnEvent('inventory.update')
  @OnEvent('expense.created')
  @OnEvent('approval.finalized')
  @OnEvent('shift.closed')
  @OnEvent('shift.started')
  @OnEvent('audit.log')
  async handleOperationalChange() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.logger.log('Operational change detected. Debouncing sync (waiting 3s)...');
    this.syncTimeout = setTimeout(async () => {
      this.logger.log('Executing debounced sync to GAS...');
      await this.syncAllData();
      this.syncTimeout = null;
    }, 3000);
  }

  /**
   * Poll for owner decisions from GAS every 1 minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async pollDecisions() {
    if (!this.gasUrl) return;

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.gasUrl, {
          params: {
            action: 'getDecisions',
            secret: this.gasSecret,
          },
        }),
      );

      const decisions = response.data?.decisions || [];
      if (decisions.length > 0) {
        this.logger.log(`Processing ${decisions.length} decisions from GAS...`);
        for (const dec of decisions) {
          await this.processDecision(dec);
        }
      }
    } catch (error) {
      // Quietly log polling errors to avoid log spam if network is down
      this.logger.debug(`Decision polling failed: ${error.message}`);
    }
  }

  private async processDecision(decision: any) {
    try {
      if (decision.type === 'APPROVE' || decision.type === 'REJECT') {
        const userId = decision.userId || 1;

        this.logger.log(`Processing Owner Decision: Request #${decision.requestId} -> ${decision.action}`);
        await this.approvalService.processApproval(
          decision.requestId,
          userId,
          decision.action,
          `[GAS-REMOTE] ${decision.note || ''}`,
        );
      } else if (decision.action === 'SYNC_RANGE') {
        this.logger.log(`Received SYNC_RANGE command from Owner: ${JSON.stringify(decision.payload)}`);
        await this.syncAllData(decision.payload.start, decision.payload.end);
      }

      // Mark as processed in GAS
      await this.sendToGas({
        type: 'MARK_PROCESSED',
        requestId: decision.requestId,
      });

      this.logger.log(`Decision for request #${decision.requestId} applied: ${decision.action}`);
    } catch (error) {
      this.logger.error(`Failed to apply decision for request #${decision.requestId}: ${error.message}`);
    }
  }

  private async sendToGas(payload: any) {
    if (!this.gasUrl) return;

    return firstValueFrom(
      this.httpService.post(this.gasUrl, {
        ...payload,
        secret: this.gasSecret,
      }),
    );
  }
}
