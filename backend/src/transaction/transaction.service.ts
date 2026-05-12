import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  Not,
  IsNull,
  DataSource,
  QueryRunner,
  EntityManager,
} from 'typeorm';
import { RedisService } from '../redis/redis.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { OrderItem, OrderItemStatus } from '../cafe/entities/order-item.entity';
import { TableStatus } from '../billiard/entities/table.entity';
import { SettingsService } from '../settings/settings.service';
import { FinanceService } from '../finance/finance.service';
import { CashflowType } from '../finance/entities/cashflow.entity';
import { Table } from '../billiard/entities/table.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { TransactionPayment } from './entities/transaction-payment.entity';
import { InvoiceService } from './invoice.service';
import { HardwareService } from '../hardware/hardware.service';
import { ShiftService } from '../finance/shift.service';

import {
  BilliardPackage,
  PackageType,
} from '../billiard/entities/billiard-package.entity';
import {
  CafeTable,
  CafeTableStatus,
} from '../cafe-table/entities/cafe-table.entity';
import { PromoService } from '../promo/promo.service';
import { ReportService } from '../report/report.service';
import { Member } from '../member/entities/member.entity';
import { MemberService } from '../member/member.service';
import { PointLedger } from '../loyalty/entities/point-ledger.entity';
import { AIService } from '../ai/ai.service';
import { Promo } from '../promo/entities/promo.entity';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(BilliardPackage)
    private readonly packageRepository: Repository<BilliardPackage>,
    @InjectRepository(CafeTable)
    private readonly cafeTableRepository: Repository<CafeTable>,
    @InjectRepository(TransactionPayment)
    private readonly transactionPaymentRepository: Repository<TransactionPayment>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    private readonly settingsService: SettingsService,
    private readonly financeService: FinanceService,
    private readonly billiardGateway: BilliardGateway,
    private readonly promoService: PromoService,
    private readonly invoiceService: InvoiceService,
    private readonly hardwareService: HardwareService,
    private readonly reportService: ReportService,
    private readonly shiftService: ShiftService,
    private readonly memberService: MemberService,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => AIService))
    private readonly aiService: AIService,
  ) {}

  // Mutex replaced by Redis distributed locks

  async createTransaction(
    tableId?: number,
    userId?: number,
    cafeTableId?: number,
    packageId?: number,
    fareName?: string,
  ): Promise<Transaction> {
    this.logger.log(
      `Creating transaction for tableId: ${tableId}, cafeTableId: ${cafeTableId}`,
    );
    try {
      const now = new Date();
      const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
      const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const invoiceNumber = `TAB-${yymmdd}${hhmmss}`;

      // Safety check for forward-referenced ShiftService
      // Remove explicit check as it might throw 500 prematurely
      // if (!this.shiftService) { ... }

      // Automatic commission attribution based on table assignments
      let commissionUserId = userId;
      if (tableId) {
        const waiterId = await this.shiftService.findAssignedWaiterForTable(
          'BILLIARD',
          tableId,
        );
        if (waiterId) commissionUserId = waiterId;
      } else if (cafeTableId) {
        const waiterId = await this.shiftService.findAssignedWaiterForTable(
          'CAFE',
          cafeTableId,
        );
        if (waiterId) commissionUserId = waiterId;
      }

      // Link to the current reporting day and shift immediately for operational history visibility
      const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
      const activeShift =
        (await this.shiftService.findActiveCashierShift()) ||
        (userId ? await this.shiftService.getActiveShift(userId) : null);

      const transaction = new Transaction();
      transaction.invoiceNumber = invoiceNumber;
      transaction.packageId = (packageId ?? null) as any;
      transaction.fareName = fareName ?? null;
      transaction.tableId = tableId || null;
      transaction.cafeTableId = cafeTableId || null;
      transaction.status = TransactionStatus.UNPAID;
      transaction.type = tableId
        ? TransactionType.BILLIARD
        : cafeTableId
          ? TransactionType.CAFE
          : TransactionType.BILLIARD;
      transaction.createdByUserId = (userId ?? null) as any;
      transaction.openedByUserId = (userId ?? null) as any;
      transaction.commissionUserId = (commissionUserId ?? null) as any;
      transaction.businessDayId = activeDay.id;
      transaction.shiftId = (activeShift?.id ?? null) as any;

      const saved = await this.transactionRepository.save(transaction);
      return saved;
    } catch (error) {
      this.logger.error(
        `FAILED TO CREATE TRANSACTION: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateTransaction(
    id: number,
    data: Partial<Transaction>,
    options?: { bypassCache?: boolean; skipBroadcast?: boolean },
  ): Promise<Transaction> {
    const tx = await this.transactionRepository.findOne({ where: { id } });
    await this.transactionRepository.update(id, data);

    // Invalidate cache if linked to a table
    if (tx?.tableId) {
      await this.redisService.del(`bill_preview_${tx.tableId}`).catch(() => {});
    }

    return await this.updateTotals(
      id,
      this.transactionRepository.manager,
      options?.skipBroadcast ?? false,
    );
  }

  async getActiveTransactionByTable(
    tableId: number,
    bypassCache: boolean = false,
    options: { loadDeepRelations?: boolean } = { loadDeepRelations: true },
  ): Promise<Transaction | null> {
    const cacheKey = `bill_preview_${tableId}${options.loadDeepRelations ? '' : '_light'}`;
    if (!bypassCache) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    }

    const results = await this.getActiveTransactionsByTableIds([tableId], options);
    if (results.length === 0) return null;

    const result = results[0];

    // Invalidate/Clean relations to avoid circularity in Redis/JSON
    const { table: _t, cafeTable: _ct, ...cleanResult } = result;
    await this.redisService.set(cacheKey, cleanResult, 60);
    return result;
  }

  async getActiveTransactionsByTableIds(
    tableIds: number[],
    options: { loadDeepRelations?: boolean } = { loadDeepRelations: true },
  ): Promise<Transaction[]> {
    if (!tableIds.length) return [];

    const transactions = await this.transactionRepository.find({
      where: [
        {
          tableId: In(tableIds),
          status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]),
        },
        {
          tableId: In(tableIds),
          status: TransactionStatus.PAID,
        },
      ],
      relations: options.loadDeepRelations
        ? [
            'orderItems',
            'orderItems.menuItem',
            'orderItems.menuItem.category',
            'table',
            'payments',
            'openedBy',
            'createdBy',
            'member',
            'member.tier',
          ]
        : ['orderItems', 'table', 'payments', 'member'], // Minimal relations for calculation
      order: { createdAt: 'DESC' },
    });

    // Filter out PAID transactions for tables that are already AVAILABLE
    // Note: The table relation is checked BEFORE it gets stripped by calculateBilliardTransient
    const filteredTransactions = transactions.filter((tr) => {
      if (tr.status === TransactionStatus.PAID) {
        return (
          tr.table &&
          tr.table.status !== TableStatus.AVAILABLE &&
          tr.table.status !== null
        );
      }
      return true;
    });

    // Deduplication: For cross-midnight sessions, if multiple transactions exist for the same table,
    // only keep the MOST RECENT active (UNPAID/PARTIAL) one. If none active, keep the most recent PAID.
    const seenTables = new Set<number>();
    const activeTransactions = filteredTransactions.filter((tr) => {
      const tId = tr.tableId!;
      if (seenTables.has(tId)) return false;
      seenTables.add(tId);
      return true;
    });


    // Batch fetch packages if needed
    const packageIds = activeTransactions
      .filter((tr) => tr.table?.packageId)
      .map((tr) => tr.table!.packageId);

    const packageMap = new Map<number, any>();
    if (packageIds.length > 0) {
      const packages = await this.packageRepository.findBy({
        id: In(packageIds),
      });
      packages.forEach((pkg) => packageMap.set(pkg.id, pkg));
    }

    // Process each transaction for transient data
    const settings = await this.settingsService.getSettings();
    const activePromos = await this.promoService.getActivePromos();

    await Promise.all(
      activeTransactions.map(async (transaction) => {
        await this.calculateBilliardTransient(transaction, packageMap);
        await this.calculateTransientTotals(
          transaction,
          settings,
          activePromos,
        );

        // Strip circular relations after processing
        (transaction as any).table = undefined;
        (transaction as any).cafeTable = undefined;
        if (transaction.orderItems) {
          transaction.orderItems.forEach((oi) => {
            (oi as any).transaction = undefined;
          });
        }
      }),
    );

    return activeTransactions;
  }

  async getActiveTransactionByCafeTable(
    cafeTableId: number,
  ): Promise<Transaction | null> {
    const cacheKey = `bill_preview_cafe_${cafeTableId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const tx = await this.transactionRepository.findOne({
      where: {
        cafeTableId,
        status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]),
      },
      relations: [
        'orderItems',
        'orderItems.menuItem',
        'orderItems.menuItem.category',
        'cafeTable',
        'payments',
        'member',
        'member.tier',
      ],
      order: { createdAt: 'DESC' },
    });

    if (!tx) return null;

    // Invalidate/Clean relations to avoid circularity in Redis/JSON
    const { table: _t, cafeTable: _ct, ...cleanTx } = tx;
    await this.redisService.set(cacheKey, cleanTx, 60);

    return this.calculateTransientTotals(tx);
  }

  /**
   * Centralized calculation logic for all transaction vitals.
   * Use this to ensure Subtotal + SC + VAT + Rounding ALWAYS equals Grand Total.
   *
   * BILLING SEGREGATION PRINCIPLE:
   * Items with isPaid=true have already been charged to the member's wallet at order time.
   * They must NOT be included in the grand total here to prevent double billing.
   * Similarly, if billiardTotal is already covered by a MEMBER payment (prepaid), it contributes 0.
   */
  private getTierDiscountPercentage(cfg: any, categoryName: string): number {
    const catUpper = String(categoryName || 'LAINNYA')
      .trim()
      .toUpperCase();
    let percent = 0;
    let found = false;

    // 1. Priority: Exact or Bidirectional Prefix Match
    // We look for the "best" match (prioritizing longer keys for more specificity)
    const entries = Object.entries(cfg).sort(
      (a, b) => b[0].length - a[0].length,
    );

    for (const [k, v] of entries) {
      const keyUpper = k.trim().toUpperCase();
      // Match if categories are identical, or if category starts with key (e.g. key "FOOD" matches "FOOD & BEV")
      // or if key starts with category (e.g. key "FOOD & BEV" matches "FOOD")
      if (
        keyUpper === catUpper ||
        catUpper.startsWith(keyUpper) ||
        keyUpper.startsWith(catUpper)
      ) {
        percent = Number(v);
        if (!isNaN(percent)) {
          found = true;
          break;
        }
      }
    }

    // 2. Fallback: Common Keywords
    if (!found || percent === 0) {
      // If keyword matches but value is 0 or missing, try falling back to 'other'
      if (catUpper.includes('MAKAN') || catUpper.includes('FOOD')) {
        percent = Number(cfg.food ?? cfg.other ?? 0);
      } else if (
        catUpper.includes('MINUM') ||
        catUpper.includes('DRINK') ||
        catUpper.includes('BEVERAGE')
      ) {
        percent = Number(cfg.drink ?? cfg.other ?? 0);
      } else {
        percent = Number(cfg.other || 0);
      }
    }

    return isNaN(percent) ? 0 : percent;
  }

  private calculateVitals(
    transaction: Transaction,
    settings: any,
  ): {
    session: Partial<Transaction> & { tierDiscountAmount: number };
    remaining: Partial<Transaction> & {
      tierDiscountAmount: number;
      effectiveBilliardTotal: number;
    };
  } {
    // --- BILLIARD TOTAL RESOLUTION ---
    // Use segments (billingDetails) as the Source of Truth if available.
    // This prevents stale/corrupt billiardTotal values from sticking when multi-day sessions are active.
    let billiardTotal = Number(transaction.billiardTotal || 0);
    if (
      Array.isArray(transaction.billingDetails) &&
      transaction.billingDetails.length > 0
    ) {
      const segmentsSum = transaction.billingDetails.reduce(
        (sum, seg) => sum + Number(seg.subtotal || seg.amount || 0),
        0,
      );
      if (segmentsSum > billiardTotal) {
        billiardTotal = segmentsSum;
      }
    }
    const orderItems = transaction.orderItems || [];

    // --- SESSION TOTAL CALCULATION (Everything from start to finish) ---
    const sessionCategoryTotals: Record<string, number> = {};
    orderItems.forEach((item) => {
      if (
        item.status?.toUpperCase() === 'CANCELLED' ||
        item.status?.toUpperCase() === 'CANCEL_REQUESTED'
      )
        return;
      const lineTotal =
        Number(item.priceAtOrder || 0) * Number(item.quantity || 0);
      const category = item.menuItem?.category;
      const categoryName =
        typeof category === 'object'
          ? category?.name || 'LAINNYA'
          : category || 'LAINNYA';
      const catUpper = String(categoryName).trim().toUpperCase();
      sessionCategoryTotals[catUpper] =
        (sessionCategoryTotals[catUpper] || 0) + lineTotal;
    });

    // --- REMAINING BALANCE CALCULATION (Unpaid only) ---
    const memberBilliardPaid = (transaction.payments || [])
      .filter(
        (p) =>
          (p.paymentMethod === 'MEMBER' || p.paymentMethod === 'MEMBERSHIP') &&
          Number(p.billiardPortion) > 0,
      )
      .reduce((sum: number, p: any) => sum + Number(p.billiardPortion), 0);

    const legacyBilliardPaid = (
      Array.isArray(transaction.paymentDetails)
        ? transaction.paymentDetails
        : []
    )
      .filter(
        (p: any) =>
          (p.method === 'MEMBER' || p.method === 'MEMBERSHIP') &&
          Number(p.billiardPortion) > 0,
      )
      .reduce((sum: number, p: any) => sum + Number(p.billiardPortion), 0);

    const toNumOverall = (val: any) => {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    };

    const totalBilliardPaid = Math.max(0, toNumOverall(memberBilliardPaid)); // Legacy logic used max(member, legacy)
    const effectiveBilliardTotal = Math.max(
      0,
      toNumOverall(billiardTotal) - totalBilliardPaid,
    );

    const unpaidCategoryTotals: Record<string, number> = {};
    orderItems.forEach((item) => {
      if (
        item.status?.toUpperCase() === 'CANCELLED' ||
        item.status?.toUpperCase() === 'CANCEL_REQUESTED' ||
        item.isPaid
      )
        return;
      const lineTotal =
        toNumOverall(item.priceAtOrder) * toNumOverall(item.quantity);
      const category = item.menuItem?.category;
      const categoryName =
        typeof category === 'object'
          ? category?.name || 'LAINNYA'
          : category || 'LAINNYA';
      const catUpper = String(categoryName).trim().toUpperCase();
      unpaidCategoryTotals[catUpper] =
        (unpaidCategoryTotals[catUpper] || 0) + lineTotal;
    });

    const toNum = (val: any) => {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    };

    const computeSet = (
      billPortion: number,
      catTotals: Record<string, number>,
    ) => {
      const cafeTotal = Object.values(catTotals).reduce(
        (sum, val) => sum + toNum(val),
        0,
      );
      const subtotal = toNum(billPortion) + cafeTotal;
      let discount = 0;

      const member = transaction.member;
      if (member && member.tier && member.tier.discountConfig) {
        const cfg = member.tier.discountConfig as any;
        const billiardDiscPercent = toNum(
          cfg.billiardOpen || cfg.billiardPackage,
        );
        const billiardDisc = toNum(billPortion) * (billiardDiscPercent / 100);

        let cafeDisc = 0;

        // --- NEW PERSISTENT DISCOUNT LOGIC ---
        // We sum up the pre-calculated discountAmount from the order items themselves.
        // This ensures that "locked-in" prices are respected.
        const totalItemDiscounts = Object.values(transaction.orderItems || [])
          .filter(
            (item) =>
              item.status?.toUpperCase() !== 'CANCELLED' && !item.isPaid,
          ) // Only for current unpaid set
          .reduce((sum, item) => sum + toNum(item.discountAmount), 0);

        // Note: The 'catTotals' passed to computeSet already filters for relevant items (session vs unpaid).
        // However, the original logic used dynamic calculation. For robustness,
        // we'll check if the items actually have discountAmount set.
        const hasPersistentDiscounts = (transaction.orderItems || []).some(
          (i) => toNum(i.discountAmount) > 0,
        );

        if (hasPersistentDiscounts) {
          // Logic for unpaid/remaining set needs to be careful:
          // computeSet is called for both 'session' (all items) and 'remaining' (unpaid items).
          // catTotals correctly reflects the set.

          // Improved cafe discount calculation:
          const setItemIds = new Set(
            (transaction.orderItems || [])
              .filter((i) => {
                const cat = i.menuItem?.category;
                const catName = typeof cat === 'object' ? cat?.name : cat;
                const catUpper = String(catName || 'LAINNYA')
                  .trim()
                  .toUpperCase();
                return catTotals[catUpper] !== undefined;
              })
              .map((i) => i.id),
          );

          cafeDisc = (transaction.orderItems || [])
            .filter(
              (i) =>
                setItemIds.has(i.id) && i.status?.toUpperCase() !== 'CANCELLED',
            )
            .reduce((sum, i) => sum + toNum(i.discountAmount), 0);
        } else {
          // Fallback to dynamic calculation if no persistent discounts found (legacy items)
          const cats = Object.keys(catTotals);
          for (const catUpper of cats) {
            const percent = this.getTierDiscountPercentage(cfg, catUpper);
            cafeDisc += toNum(catTotals[catUpper]) * (percent / 100);
          }
        }

        discount = Math.round(billiardDisc + cafeDisc);
      }

      const discountedSub = Math.max(0, subtotal - discount);
      const sc = Math.round(
        discountedSub * (toNum(settings.serviceChargePercentage) / 100),
      );
      // VAT applies to (Subtotal - Discount + Service Charge)
      const vat = Math.round(
        (discountedSub + sc) * (toNum(settings.ppnPercentage) / 100),
      );
      const rawTotal = discountedSub + sc + vat;
      const kelipatan = Math.max(1, toNum(settings.roundingKelipatan));
      const grand = isNaN(rawTotal)
        ? 0
        : Math.ceil(rawTotal / kelipatan) * kelipatan;

      return {
        cafeTotal,
        tierDiscountAmount: isNaN(discount) ? 0 : discount,
        discountAmount: isNaN(discount) ? 0 : discount,
        serviceChargeAmount: isNaN(sc) ? 0 : sc,
        vatAmount: isNaN(vat) ? 0 : vat,
        roundingAmount: isNaN(grand - rawTotal) ? 0 : grand - rawTotal,
        grandTotal: isNaN(grand) ? 0 : grand,
        billiardTotal: toNum(billPortion),
      };
    };

    return {
      session: computeSet(billiardTotal, sessionCategoryTotals),
      remaining: {
        ...computeSet(effectiveBilliardTotal, unpaidCategoryTotals),
        effectiveBilliardTotal,
      },
    };
  }

  /**
   * Internal method to calculate vitals without saving to DB (for real-time GETs)
   */
  async calculateTransientTotals(
    transaction: Transaction,
    providedSettings?: any,
    preFetchedPromos?: any[],
  ): Promise<Transaction> {
    // Ensure billiard total is calculated if this is a billiard transaction with a valid start time.
    // We run this even if table is AVAILABLE to support historical log reconstruction (reprints).
    // Calculate billiard portion if there is ANY billiard activity (Table link or START time)
    if (
      (transaction.type === TransactionType.BILLIARD ||
        transaction.tableId ||
        transaction.table) &&
      (transaction.startTime || transaction.table?.startTime)
    ) {
      await this.calculateBilliardTransient(transaction);
    }

    const settings =
      providedSettings || (await this.settingsService.getSettings());
    const { session, remaining } = this.calculateVitals(transaction, settings);

    // For real-time display (GET), we show the REMAINING balance as the grand total
    // to help the cashier know what's due NOW.
    Object.assign(transaction, remaining);

    // Promo Evaluation (Promo engine works ON TOP of tier discounts or alongside them)
    let billiardMins = 0;
    const calcStart = transaction.table?.startTime || transaction.startTime;
    const calcEnd =
      transaction.table?.status &&
      transaction.table.status !== TableStatus.AVAILABLE
        ? new Date()
        : transaction.endTime || new Date();

    if (calcStart && calcEnd) {
      billiardMins = Math.round(
        (new Date(calcEnd).getTime() - new Date(calcStart).getTime()) / 60000,
      );
      if (isNaN(billiardMins)) billiardMins = 0;
    }

    // Resolve the session type from the transaction context
    const currentSessionType =
      transaction.table?.sessionType ||
      transaction.sessionType ||
      null;

    const { discounts, appliedPromos } = await this.promoService.evaluatePromos(
      transaction.orderItems || [],
      billiardMins,
      Number(remaining.billiardTotal || 0),
      preFetchedPromos,
      currentSessionType,
    );
    const totalPromoDiscount = discounts.reduce(
      (sum, d) => sum + Number(d.amount || 0),
      0,
    );
    transaction.appliedPromos = appliedPromos;

    if (totalPromoDiscount > 0) {
      const subtotal =
        (Number(remaining.billiardTotal) || 0) +
        (Number(remaining.cafeTotal) || 0);
      const tierDisc = Number(remaining.tierDiscountAmount) || 0;
      const discountedSubtotal = Math.max(
        0,
        subtotal - tierDisc - totalPromoDiscount,
      );

      const scPercent = Number(settings.serviceChargePercentage || 0) / 100;
      const vatPercent = Number(settings.ppnPercentage || 0) / 100;

      const serviceCharge = Math.round(discountedSubtotal * scPercent);
      const vat = Math.round((discountedSubtotal + serviceCharge) * vatPercent);
      const rawTotal = discountedSubtotal + serviceCharge + vat;
      const kelipatan = Math.max(1, Number(settings.roundingKelipatan || 1));
      const roundedTotal = Math.ceil(rawTotal / kelipatan) * kelipatan;

      transaction.serviceChargeAmount = serviceCharge;
      transaction.vatAmount = vat;
      transaction.roundingAmount = roundedTotal - rawTotal;
      transaction.grandTotal = roundedTotal;
      transaction.discountAmount =
        (remaining.tierDiscountAmount || 0) + totalPromoDiscount;
    }

    // Attach full session vitals as a transient property for receipt previews
    transaction.sessionTotals = session as any;

    return transaction;
  }

  private async calculateBilliardTransient(
    transaction: Transaction,
    packageMap?: Map<number, any>,
  ) {
    const table = transaction.table;
    const startTime =
      table?.startTime ||
      (transaction.startTime ? new Date(transaction.startTime) : null);
    const endTime = new Date(
      table?.status &&
        (table.status === TableStatus.IN_USE ||
          table.status === TableStatus.WARNING)
        ? table.endTime || new Date()
        : transaction.endTime || new Date(),
    );
    const packageId = table?.packageId || transaction.packageId; // Fallback to hidden packageId if any
    const sessionType = table?.sessionType || transaction.sessionType || 'open';

    // Essential: If no start time or invalid dates, we can't calculate anything
    if (
      !startTime ||
      isNaN(new Date(startTime).getTime()) ||
      isNaN(endTime.getTime())
    )
      return;

    // 1. Resolve Package
    let pkg = null;
    const effectivePackageId = packageId || transaction.billiardPackage?.id;

    if (effectivePackageId) {
      if (packageMap) {
        pkg = packageMap.get(effectivePackageId);
      }
      if (!pkg) {
        pkg = await this.packageRepository.findOneBy({
          id: effectivePackageId,
        });
      }
    }

    // Attach package to transaction for receipt/UI display
    if (pkg) {
      transaction.billiardPackage = pkg;
    }

    // 2. Calculate Billing Details (for OPEN TABLE)
    if (sessionType === 'open') {
      const pricing = this.calculateTimeBasedPrice(
        startTime,
        endTime,
        pkg || { minutePrice: 50000 / 60 },
      );

      // ALWAYS sync with the most accurate calculation for Open Table
      transaction.billiardTotal = pricing.total;
      transaction.billingDetails = pricing.details;

      const elapsedMins = Math.round(
        (endTime.getTime() - new Date(startTime).getTime()) / 60000,
      );
      if (!isNaN(elapsedMins)) {
        const hours = Math.floor(elapsedMins / 60);
        const minutes = elapsedMins % 60;
        transaction.sessionDuration = `${hours} Hour : ${minutes} Minute : 00 Second`;
      }
    }
    // 3. Handle PREPAID
    else if (sessionType === 'prepaid') {
      const activePrice =
        table?.activePackagePrice || transaction.billiardTotal;
      transaction.billiardTotal = Number(activePrice);

      // Ensure transaction.endTime reflects the table's end time for accurate invoice headers
      if (table?.endTime) {
        transaction.endTime = table.endTime;
      }

      // Populate billing details for prepaid sessions too (for report transparency)
      // BUT: Preserve existing details if extensions were already added (e.g. by extendSession)
      let currentDetails = Array.isArray(transaction.billingDetails)
        ? transaction.billingDetails
        : [];

      // Clean up potential null/empty objects if driver mapping failed
      currentDetails = currentDetails.filter(
        (d) => d && typeof d === 'object' && Object.keys(d).length > 0,
      );

      if (currentDetails.length === 0) {
        transaction.billingDetails = [
          {
            title: pkg?.name || transaction.fareName || 'Prepaid Session',
            duration:
              pkg?.durationMinutes ||
              Math.round(
                (endTime.getTime() - new Date(startTime).getTime()) / 60000,
              ),
            subtotal: Number(activePrice),
            isExtension: false,
            ratePerHour:
              pkg?.type === PackageType.FIXED
                ? Number(activePrice)
                : Number(pkg?.minutePrice || 0) * 60,
            startTimeFormatted: new Date(startTime)
              .toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              })
              .replace(/:/g, '.'),
            endTimeFormatted: new Date(endTime)
              .toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              })
              .replace(/:/g, '.'),
          },
        ];
      }

      const diffMs = endTime.getTime() - new Date(startTime).getTime();
      const totalMins = Math.round(diffMs / 60000);
      if (!isNaN(totalMins)) {
        const hours = Math.floor(totalMins / 60);
        const minutes = totalMins % 60;
        transaction.sessionDuration = `${hours} Hour : ${minutes} Minute : 00 Second`;
      }
    }
  }

  calculateCurrentPackagePrice(pkg: any): number {
    const now = new Date();
    const timeVal = now.getHours() * 60 + now.getMinutes();

    let activePrice = Number(pkg.price || 0);
    const slots = Array.isArray(pkg.timeSlots) ? pkg.timeSlots : [];

    if (slots.length > 0) {
      let matchedAny = false;
      for (const slot of slots) {
        if (!slot?.start || !slot?.end) continue;
        const [sH, sM] = slot.start.split(':').map(Number);
        const [eH, eM] = slot.end.split(':').map(Number);
        const slotStart = sH * 60 + sM;
        const slotEnd = eH * 60 + eM;

        let isMatch = false;
        if (slotEnd < slotStart) {
          // Midnight crossover
          if (timeVal >= slotStart || timeVal < slotEnd) isMatch = true;
        } else {
          if (timeVal >= slotStart && timeVal < slotEnd) isMatch = true;
        }

        if (isMatch) {
          activePrice = Number(slot.price);
          matchedAny = true;
          break;
        }
      }

      // Fallback: If no match and activePrice is 0, use first slot price or a default
      if (!matchedAny && activePrice === 0) {
        activePrice = Number(pkg.timeSlots[0].price);
      }
    }

    // Absolute fallback to prevent Rp 0 if needed, but per user request we follow settings
    if (activePrice === 0) {
      if (pkg.minutePrice && Number(pkg.minutePrice) > 0) {
        activePrice = Number(pkg.minutePrice) * 60;
      }
    }

    return activePrice;
  }

  /**
   * Calculates the time-based price given a startTime, endTime (or now), and a package configuration.
   * Uses GMT+7 awareness.
   */
  calculateTimeBasedPrice(
    startTime: Date,
    endTime: Date,
    pkg: any,
  ): { total: number; details: any[] } {
    const start = new Date(startTime);
    const end = new Date(endTime);
    let total = 0;
    const details: any[] = [];

    // 1. Handle packages with no slots (Simple Flat Rate)
    if (!pkg.timeSlots || pkg.timeSlots.length === 0) {
      const actualSecs = Math.floor((end.getTime() - start.getTime()) / 1000);
      const billedSecs = Math.max(3600, actualSecs);
      const ratePerHour = Number(pkg.minutePrice || 0) * 60;
      const price = (ratePerHour / 3600) * billedSecs;

      total = Math.round(price);
      details.push({
        title: 'Regular Rate',
        duration: Math.floor(billedSecs / 60),
        subtotal: total,
        isExtension: false,
        ratePerHour,
        startTimeFormatted:
          start.getHours().toString().padStart(2, '0') +
          '.' +
          start.getMinutes().toString().padStart(2, '0'),
        endTimeFormatted:
          end.getHours().toString().padStart(2, '0') +
          '.' +
          end.getMinutes().toString().padStart(2, '0'),
      });
      return { total, details };
    }

    // 2. Pre-parse all slots for high-performance matching
    const parsedSlots = pkg.timeSlots
      .map((slot: any) => {
        if (!slot?.start || !slot?.end) return null;
        const [sH, sM] = slot.start.split(':').map(Number);
        const [eH, eM] = slot.end.split(':').map(Number);
        return {
          ...slot,
          startMin: sH * 60 + sM,
          endMin: eH * 60 + eM,
          price: Number(slot.price),
        };
      })
      .filter(Boolean);

    const actualDurationSeconds = Math.floor(
      (end.getTime() - start.getTime()) / 1000,
    );
    const calculationEndSeconds = Math.max(3600, actualDurationSeconds);
    const calculationEnd = new Date(
      start.getTime() + calculationEndSeconds * 1000,
    );

    let current = new Date(start);
    let currentSegment: any = null;
    let lastSegmentKey: string | null = null;

    const formatTime = (d: Date) =>
      d.getHours().toString().padStart(2, '0') +
      '.' +
      d.getMinutes().toString().padStart(2, '0');

    while (current < calculationEnd) {
      const timeVal = current.getHours() * 60 + current.getMinutes();
      const dateVal = current.toLocaleDateString('en-GB'); // Use as part of key to separate days if needed

      let matchedSlot = null;
      for (const slot of parsedSlots) {
        if (slot.endMin < slot.startMin) {
          if (timeVal >= slot.startMin || timeVal < slot.endMin)
            matchedSlot = slot;
        } else {
          if (timeVal >= slot.startMin && timeVal < slot.endMin)
            matchedSlot = slot;
        }
        if (matchedSlot) break;
      }

      const slotName = matchedSlot
        ? `${matchedSlot.start}-${matchedSlot.end}`
        : 'Default Rate';
      const slotRate = matchedSlot
        ? matchedSlot.price
        : Number(pkg.minutePrice || 0) * 60 || 50000;
      const segmentKey = `${slotName}_${dateVal}`; // Group by slot AND date for clarity in multi-day sessions

      if (!currentSegment || lastSegmentKey !== segmentKey) {
        // Finalize previous segment
        if (currentSegment) {
          currentSegment.subtotal = Math.round(currentSegment.cost);
          currentSegment.duration = Math.floor(currentSegment.duration / 60);
          currentSegment.endTimeFormatted = formatTime(current);
          details.push(currentSegment);
        }
        // Start new segment
        currentSegment = {
          title: slotName,
          date: dateVal,
          startTimeFormatted: formatTime(current),
          duration: 0,
          cost: 0,
          isExtension: false,
          ratePerHour: slotRate,
        };
        lastSegmentKey = segmentKey;
      }

      currentSegment.duration += 60;
      currentSegment.cost += (slotRate / 3600) * 60;
      current = new Date(current.getTime() + 60000);
    }

    if (currentSegment) {
      currentSegment.subtotal = Math.round(currentSegment.cost);
      currentSegment.duration = Math.floor(currentSegment.duration / 60);
      currentSegment.endTimeFormatted = formatTime(current);
      details.push(currentSegment);
    }

    total = details.reduce((sum, d) => sum + d.subtotal, 0);
    return { total: Math.round(total), details };
  }

  async getTransactionById(id: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: [
        'table',
        'cafeTable',
        'orderItems',
        'orderItems.menuItem',
        'orderItems.menuItem.category',
        'payments',
        'payments.createdBy',
        'openedBy',
        'createdBy',
        'paidBy',
        'member',
        'member.tier',
      ],
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return await this.calculateTransientTotals(transaction);
  }

  /** Lightweight lookup for ledger display — returns only essential info */
  async getTransactionInfoByInvoice(invoiceNumber: string): Promise<{
    id: number;
    invoiceNumber: string;
    customerName: string | null;
    tableId: number | null;
    cafeTableId: number | null;
    tableName: string | null;
  }> {
    const tx = await this.transactionRepository.findOne({
      where: { invoiceNumber },
      relations: ['table', 'cafeTable'],
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return {
      id: tx.id,
      invoiceNumber: tx.invoiceNumber,
      customerName: tx.customerName ?? null,
      tableId: tx.tableId ?? null,
      cafeTableId: tx.cafeTableId ?? null,
      tableName:
        (tx.table as any)?.tableName ??
        (tx.table as any)?.name ??
        tx.cafeTable?.tableName ??
        null,
    };
  }

  async moveTable(fromTableId: number, toTableId: number): Promise<void> {
    const transaction = await this.getActiveTransactionByTable(fromTableId);
    if (!transaction)
      throw new NotFoundException('No active transaction on source table');

    transaction.tableId = toTableId;
    await this.transactionRepository.save(transaction);
  }

  async mergeTransactions(
    sourceTableId: number,
    targetTableId: number,
  ): Promise<Transaction> {
    const sourceTx = await this.transactionRepository.findOne({
      where: { tableId: sourceTableId, status: Not(TransactionStatus.PAID) },
      relations: ['orderItems'],
    });
    const targetTx = await this.transactionRepository.findOne({
      where: { tableId: targetTableId, status: Not(TransactionStatus.PAID) },
      relations: ['orderItems'],
    });

    if (!sourceTx || !targetTx)
      throw new NotFoundException(
        'Source or Target active transaction not found',
      );

    // Transfer billiard total (billiard value generated so far)
    targetTx.billiardTotal =
      Number(targetTx.billiardTotal) + Number(sourceTx.billiardTotal);

    // Move all items
    for (const item of sourceTx.orderItems) {
      item.transactionId = targetTx.id;
      await this.orderItemRepository.save(item);
    }

    // Neutralize source transaction to prevent double-counting in reports
    sourceTx.status = TransactionStatus.CANCELLED;
    sourceTx.billiardTotal = 0;
    sourceTx.cafeTotal = 0;
    sourceTx.grandTotal = 0;
    sourceTx.paidAmount = 0;
    sourceTx.remarks = `Merged into ${targetTx.invoiceNumber}`;

    await this.transactionRepository.save(sourceTx);

    // Recalculate target final totals
    return this.updateTotals(targetTx.id);
  }

  /**
   * Membayar item tertentu saja (Pay per Item)
   * Ditujukan untuk mencicil pembayaran cafe saat billing billiard masih jalan
   */
  async paySelectedItems(
    transactionId: number,
    orderItemIds: number[],
    paymentMethod: string,
  ): Promise<Transaction> {
    return this.processMultiPayerPayment(transactionId, {
      orderItemIds,
      paymentMethod,
      payerName: 'Partial Payment',
    });
  }

  /**
   * PROSES PEMBAYARAN MULTI-PAYER (REDESIGN)
   * Mendukung pembayaran per orang dengan rincian item tertentu.
   */
  async processMultiPayerPayment(
    transactionId: number,
    data: {
      orderItemIds: number[];
      payerName: string;
      paymentMethod: string;
      billiardPortion?: number;
    },
    userId?: number,
  ): Promise<Transaction> {
    this.logger.log(
      `[processMultiPayerPayment] ID: ${transactionId}, Payload: ${JSON.stringify(data)}`,
    );
    const lockKey = `payment_${transactionId}`;
    const acquired = await this.redisService.acquireLock(lockKey, 10000);
    if (!acquired) {
      throw new ConflictException(
        'Transaksi ini sedang diproses pembayarannya (Redis Lock). Harap tunggu.',
      );
    }

    // Remove explicit check as it might throw 500 prematurely during race conditions
    // if (!this.shiftService) { ... }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
        relations: [
          'member',
          'member.tier',
          'orderItems',
          'orderItems.menuItem',
          'table',
          'cafeTable',
          'payments',
        ],
      });
      if (!transaction) throw new NotFoundException('Transaction not found');

      const itemsToPay = (transaction.orderItems || []).filter(
        (item) => (data.orderItemIds || []).includes(item.id) && !item.isPaid,
      );
      const billiardPortion = Math.max(0, Number(data.billiardPortion) || 0);

      if (itemsToPay.length === 0 && billiardPortion === 0) {
        await queryRunner.rollbackTransaction();
        return transaction;
      }

      // 1. Calculate Individual Payer Totals
      const settings = await this.settingsService.getSettings();
      const vitalsResult = this.calculateVitals(
        {
          billiardTotal: billiardPortion,
          orderItems: itemsToPay,
          member: transaction.member,
        } as any,
        settings,
      );
      const vitals = vitalsResult.session;

      const totalPaid = Number(vitals.grandTotal);
      const roundingAmount = Number(vitals.roundingAmount);
      const itemsSubtotal = Number(vitals.cafeTotal);
      const discountAmount = Number(vitals.discountAmount || 0);

      const paymentMethod = (data.paymentMethod || 'CASH').toUpperCase();

      // Handle Membership Payment
      if (paymentMethod === 'MEMBERSHIP' || paymentMethod === 'MEMBER') {
        if (!transaction.memberId) {
          throw new BadRequestException(
            'Transaksi ini tidak terikat dengan member',
          );
        }
        await this.memberService.deductBalance(
          transaction.memberId,
          totalPaid,
          queryRunner.manager,
        );
      }

      // 2. Create Payment Record
      const paymentRecord = queryRunner.manager.create(TransactionPayment, {
        transactionId: transaction.id,
        payerName: data.payerName || 'Payer',
        itemsSubtotal,
        billiardPortion,
        taxAmount: Number(vitals.vatAmount),
        serviceAmount: Number(vitals.serviceChargeAmount),
        roundingAmount,
        discountAmount,
        totalPaid,
        paymentMethod:
          paymentMethod === 'MEMBERSHIP' ? 'MEMBER' : paymentMethod,
        itemsSnapshot: itemsToPay.map((i) => ({
          name: i.menuItem?.name || 'Item',
          displayName: i.customName || i.menuItem?.name || 'Item',
          category:
            (typeof i.menuItem?.category === 'object'
              ? i.menuItem?.category?.name
              : i.menuItem?.category) || 'LAIN-LAIN',
          qty: Number(i.quantity || 0),
          price: Number(i.priceAtOrder || 0),
          subtotal: Number(i.priceAtOrder || 0) * Number(i.quantity || 0),
          bundleGroupId: i.bundleGroupId || null,
        })),
        createdByUserId: userId,
      });

      // Attribute to shift
      const activeShift =
        (await this.shiftService.findActiveCashierShift()) ??
        (userId ? await this.shiftService.getActiveShift(userId) : null);
      if (activeShift) {
        paymentRecord.shiftId = activeShift.id;
        paymentRecord.businessDayId = activeShift.businessDayId;
      } else {
        const activeDay =
          await this.shiftService.getOrCreateActiveBusinessDay();
        paymentRecord.businessDayId = activeDay.id;
      }

      const savedPayment = await queryRunner.manager.save(paymentRecord);

      // 3. Mark Items as Paid
      for (const item of itemsToPay) {
        item.isPaid = true;
        item.paymentId = savedPayment.id;
        await queryRunner.manager.save(item);

        // AI Tracking: Cafe Sale
        if (item.menuItemId) {
          this.aiService.trackSale('CAFE', item.menuItemId, item.quantity);
        }
      }

      // AI Tracking: Billiard Sale (if portion paid)
      if (billiardPortion > 0 && transaction.packageId) {
        this.aiService.trackSale('BILLIARD', transaction.packageId, 1);
      }

      // AI Tracking: Promo Sale
      if (
        transaction.appliedPromos &&
        Array.isArray(transaction.appliedPromos)
      ) {
        for (const pr of transaction.appliedPromos) {
          this.aiService.trackSale('PROMO', pr.id, 1);
        }
      }

      // 4. Update Transaction
      const paymentDtl = {
        method: paymentRecord.paymentMethod,
        amount: totalPaid,
        payer: paymentRecord.payerName,
        timestamp: new Date(),
        paymentId: savedPayment.id,
        billiardPortion,
      };
      transaction.paymentDetails = [
        ...(transaction.paymentDetails || []),
        paymentDtl,
      ];
      if (activeShift) {
        transaction.shiftId = activeShift.id;
        transaction.businessDayId = activeShift.businessDayId;
      }
      if (userId) transaction.createdByUserId = userId;

      // Recalculate totals by re-fetching from DB to include the NEW payment
      const savedTx = await this.updateTotals(
        transaction.id,
        queryRunner.manager,
      );

      // 5. Check completion
      if (Number(savedTx.paidAmount) >= Number(savedTx.grandTotal) - 1) {
        savedTx.status = TransactionStatus.PAID;
        await this.applyRoyaltyPoints(savedTx, queryRunner.manager);

        // Broadcast Transaction specifically for UI that listens to tx updates
        this.billiardGateway.broadcastTransactionUpdate(savedTx);

        // Handle Table Closure
        if (savedTx.tableId) {
          const table = await queryRunner.manager.findOne(Table, {
            where: { id: savedTx.tableId },
          });
          if (table) {
            const now = new Date();
            const isPrepaid = table.sessionType === 'prepaid';
            const isExpired = table.endTime && now >= table.endTime;

            // Loosen requirement: If paid in full, we release the table if it was Waiting or if it's an Open session
            // that the cashier is now finalising via payment.
            const isBilliardDone =
              table.status === TableStatus.WAITING_PAYMENT ||
              (isPrepaid && isExpired) ||
              table.status === TableStatus.IN_USE ||
              table.status === TableStatus.WARNING;

            if (isBilliardDone) {
              Object.assign(table, {
                status: TableStatus.AVAILABLE,
                sessionType: null,
                startTime: null,
                endTime: null,
                isLightOn: false,
                memberId: null,
                packageId: null,
                activePackagePrice: null,
                remainingMinutes: null,
              });
              const finalTable = await queryRunner.manager.save(Table, table);
              this.billiardGateway.broadcastTableUpdate(finalTable);
            } else {
              this.billiardGateway.broadcastTableUpdate({
                ...table,
                activeTransaction: savedTx,
              });
            }
          }
        } else if (savedTx.cafeTableId) {
          const ct = await queryRunner.manager.findOne(CafeTable, {
            where: { id: savedTx.cafeTableId },
          });
          if (ct) {
            Object.assign(ct, {
              status: CafeTableStatus.AVAILABLE,
              currentTransactionId: null,
              currentCustomer: null,
            });
            await queryRunner.manager.save(CafeTable, ct);
            this.billiardGateway.broadcastTableUpdate({
              ...ct,
              type: 'cafe',
              status: CafeTableStatus.AVAILABLE,
              activeTransaction: null,
            });
          }
        }
        await queryRunner.manager.save(savedTx);
      } else {
        savedTx.status = TransactionStatus.PARTIAL;
        await queryRunner.manager.save(savedTx);
        // Broadcast partial update
        this.billiardGateway.broadcastTransactionUpdate(savedTx);
      }

      // 6. Cashflow
      const isMemberPmt =
        paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP';
      const description = `Split Payment [${paymentRecord.payerName}] INV: ${savedTx.invoiceNumber}`;
      await this.financeService.logCashflow(
        {
          amount: isMemberPmt ? 0 : totalPaid,
          type: CashflowType.IN,
          source: isMemberPmt
            ? 'usage:member'
            : savedTx.cafeTableId && !savedTx.tableId
              ? 'sale:cafe'
              : 'sale:billiard',
          referenceId: savedTx.invoiceNumber,
          description: isMemberPmt ? `[MEMBER] ${description}` : description,
          businessDayId: (activeShift?.businessDayId || savedTx.businessDayId) ?? undefined,
          shiftId: (activeShift?.id || savedTx.shiftId) ?? undefined,
          paymentMethod: paymentMethod,
        },
        queryRunner.manager,
      );

      // 7. Update Transaction paidBy attribution
      if (!savedTx.paidByUserId && userId) {
        savedTx.paidByUserId = userId;
        await queryRunner.manager.save(savedTx);
      }

      await queryRunner.commitTransaction();
      return this.getTransactionById(transactionId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Multi-payer payment FAILED: ${err.message}`);
      throw err;
    } finally {
      await queryRunner.release();
      await this.redisService.releaseLock(lockKey);
    }
  }

  /**
   * Hitung estimasi bagi rata (Split Bill Evenly)
   */
  async calculateSplitEvenly(
    transactionId: number,
    peopleCount: number,
  ): Promise<any> {
    const transaction = await this.updateTotals(transactionId);
    const remaining =
      Number(transaction.grandTotal) - Number(transaction.paidAmount);

    return {
      total: Number(transaction.grandTotal),
      paid: Number(transaction.paidAmount),
      remaining: remaining > 0 ? remaining : 0,
      peopleCount,
      perPerson: Math.ceil((remaining > 0 ? remaining : 0) / peopleCount),
    };
  }

  async splitTransaction(
    sourceTransactionId: number,
    orderItemIds: number[],
  ): Promise<Transaction> {
    const sourceTx = await this.getTransactionById(sourceTransactionId);
    const newTx = await this.createTransaction();

    const itemsToMove = sourceTx.orderItems.filter((item) =>
      orderItemIds.includes(item.id),
    );
    for (const item of itemsToMove) {
      item.transactionId = newTx.id;
      await this.orderItemRepository.save(item);
    }

    await this.updateTotals(sourceTransactionId);
    return this.updateTotals(newTx.id);
  }

  async updateTotals(
    transactionOrId: number | Transaction,
    queryManager: EntityManager = this.transactionRepository.manager,
    skipBroadcast = false,
  ): Promise<Transaction> {
    const settings = await this.settingsService.getSettings();
    this.logger.log(
      `[updateTotals] Start for ${typeof transactionOrId === 'number' ? 'ID: ' + transactionOrId : 'Transaction: ' + (transactionOrId as any).invoiceNumber}`,
    );
    let transactionId: number;
    let billiardTotal: number;
    let billingDetails: any;
    let paidAmount: number;
    let paymentDetails: any;
    let orderItems: OrderItem[];

    let businessDayId: number | null = null;
    let shiftId: number | null = null;
    let createdByUserId: number | null = null;

    let foundTx: Transaction | null = null;
    if (typeof transactionOrId === 'number') {
      transactionId = transactionOrId;
      foundTx = await queryManager.findOne(Transaction, {
        where: { id: transactionId },
        relations: ['orderItems', 'table', 'member', 'member.tier', 'payments'],
      });
      if (!foundTx) throw new NotFoundException('Transaction not found');
      billiardTotal = Number(foundTx.billiardTotal || 0);
      billingDetails = foundTx.billingDetails;
      paidAmount = Number(foundTx.paidAmount || 0);
      paymentDetails = foundTx.paymentDetails;
      orderItems = foundTx.orderItems || [];

      businessDayId = foundTx.businessDayId;
      shiftId = foundTx.shiftId;
      createdByUserId = foundTx.createdByUserId;
    } else {
      const tx = transactionOrId;
      transactionId = tx.id;
      billiardTotal = Number(tx.billiardTotal || 0);
      billingDetails = tx.billingDetails;
      paidAmount = Number(tx.paidAmount || 0);
      paymentDetails = tx.paymentDetails;

      businessDayId = tx.businessDayId;
      shiftId = tx.shiftId;
      createdByUserId = tx.createdByUserId;

      if (tx.orderItems && tx.payments) {
        orderItems = tx.orderItems;
        foundTx = tx; // Ensure foundTx is set!
      } else {
        foundTx = await queryManager.findOne(Transaction, {
          where: { id: transactionId },
          relations: [
            'orderItems',
            'orderItems.menuItem',
            'orderItems.menuItem.category',
            'table',
            'member',
            'member.tier',
            'payments',
          ],
        });
        if (!foundTx) throw new NotFoundException('Transaction not found');
        orderItems = foundTx.orderItems || [];
      }
    }

    // Use centralized vitals calculation based on discounts
    if (!foundTx) {
      this.logger.error(
        `[updateTotals] foundTx is STILL NULL after resolution! txOrId type: ${typeof transactionOrId}`,
      );
      throw new Error('Internal Server Error: Transaction context lost');
    }
    const txForVitals = foundTx;
    this.logger.log(
      `[updateTotals] txForVitals resolved: ${txForVitals.invoiceNumber}`,
    );

    // IMPORTANT: For active sessions, we must ensure computeSet uses the LATEST billiard total
    // instead of whatever stale value might be in txObj.billiardTotal.
    if (
      txForVitals.table &&
      txForVitals.table.startTime &&
      txForVitals.table.status !== TableStatus.AVAILABLE
    ) {
      await this.calculateBilliardTransient(txForVitals);
    }

    const { session, remaining } = this.calculateVitals(txForVitals, settings);
    let finalVitals = session; // WE PERSIST THE FULL SESSION TOTAL TO THE DB

    // Re-evaluate promos for permanence
    let billiardMins = 0;

    // Use the transaction object regardless of how it was passed
    const txObj =
      typeof transactionOrId === 'object' ? transactionOrId : foundTx;

    // Search for relevant date info
    if (
      txObj?.table?.startTime &&
      txObj?.table?.status !== TableStatus.AVAILABLE
    ) {
      billiardMins = Math.round(
        (new Date().getTime() - new Date(txObj.table.startTime).getTime()) /
          60000,
      );
    } else if (txObj?.startTime && txObj?.endTime) {
      billiardMins = Math.round(
        (new Date(txObj.endTime).getTime() -
          new Date(txObj.startTime).getTime()) /
          60000,
      );
    }

    // Resolve session type for promo guard (Open Table should not be affected by fixed-price bundle promos)
    const txSessionType =
      txObj?.table?.sessionType || txObj?.sessionType || null;

    const { discounts, appliedPromos } = await this.promoService.evaluatePromos(
      orderItems,
      billiardMins,
      Number(session.billiardTotal || 0),
      undefined,
      txSessionType,
    );
    const totalPromoDiscount = discounts.reduce(
      (sum, d) => sum + Number(d.amount || 0),
      0,
    );

    if (totalPromoDiscount > 0) {
      // Use effectiveBilliardTotal from remaining to check against unpaid portion IF needed,
      // but for reports, we usually want the session-wide promo effect.
      const subtotal =
        Number(session.billiardTotal || 0) + Number(session.cafeTotal || 0);
      const discountedSubtotal = Math.max(
        0,
        subtotal - Number(session.tierDiscountAmount || 0) - totalPromoDiscount,
      );
      const scPercent = Number(settings.serviceChargePercentage || 0) / 100;
      const vatPercent = Number(settings.ppnPercentage || 0) / 100;

      const serviceCharge = Math.round(discountedSubtotal * scPercent);
      const vat = Math.round((discountedSubtotal + serviceCharge) * vatPercent);
      const rawTotal = discountedSubtotal + serviceCharge + vat;
      const kelipatan = Math.max(1, Number(settings.roundingKelipatan || 1));
      const roundedTotal = Math.ceil(rawTotal / kelipatan) * kelipatan;

      finalVitals = {
        ...finalVitals,
        serviceChargeAmount: serviceCharge,
        vatAmount: vat,
        roundingAmount: roundedTotal - rawTotal,
        grandTotal: roundedTotal,
        discountAmount:
          Number(session.tierDiscountAmount || 0) + totalPromoDiscount,
      };
    }

    // Use a targeted UPDATE to avoid circular entity issues with `.save(entity)`
    // NOTE: We do NOT update billiardTotal here because:
    //   - For prepaid sessions: billiardTotal holds the original package price (needed for reports/receipts)
    //   - The effective (unpaid) portion is already factored into grandTotal via effectiveBilliardTotal
    // Calculate total paid and reconstruct paymentDetails from all related formal payments
    const calculatedPaidAmount = (foundTx?.payments || []).reduce(
      (sum: number, p: any) => sum + Number(p.totalPaid || 0),
      0,
    );
    const reconstructedPaymentDetails = (foundTx?.payments || []).map(
      (p: any) => ({
        method: p.paymentMethod,
        amount: Number(p.totalPaid),
        payer: p.payerName || 'Unknown',
        timestamp: p.createdAt || new Date(),
        paymentId: p.id,
      }),
    );

    // IMPORTANT: Use JSON.stringify for appliedPromos to ensure DB compatibility if driver has issues with auto-mapping
    this.logger.log(
      `[updateTotals] Performing DB update for ID: ${transactionId}`,
    );
    try {
      await queryManager.update(Transaction, transactionId, {
        cafeTotal: Number(finalVitals.cafeTotal || 0),
        serviceChargeAmount: Number(finalVitals.serviceChargeAmount || 0),
        vatAmount: Number(finalVitals.vatAmount || 0),
        roundingAmount: Number(finalVitals.roundingAmount || 0),
        grandTotal: Number(finalVitals.grandTotal || 0),
        discountAmount: Number(finalVitals.discountAmount || 0),
        billiardTotal: Number(finalVitals.billiardTotal || 0),
        packageId: txObj.packageId || txObj.table?.packageId || undefined,
        paidAmount: calculatedPaidAmount,
        billingDetails: Array.isArray(txForVitals.billingDetails)
          ? txForVitals.billingDetails
          : [],
        appliedPromos: appliedPromos || null,
        endTime: txObj.endTime || undefined, // PERSIST synchronized end time
        paymentDetails:
          reconstructedPaymentDetails.length > 0
            ? reconstructedPaymentDetails
            : paymentDetails || null,
        businessDayId: businessDayId,
        shiftId: shiftId,
        createdByUserId: createdByUserId,
      });
    } catch (dbErr) {
      this.logger.error(
        `[updateTotals] DATABASE UPDATE FAILED: ${dbErr.message}`,
        dbErr.stack,
      );
      throw dbErr;
    }

    const finalResult = await queryManager.findOne(Transaction, {
      where: { id: transactionId },
      relations: [
        'orderItems',
        'orderItems.menuItem',
        'orderItems.menuItem.category',
        'payments',
        'openedBy',
        'createdBy',
        'member',
        'member.tier',
      ],
    });
    if (!finalResult)
      throw new NotFoundException(
        `Transaction ${transactionId} not found after update`,
      );

    // Broadcast for real-time payroll/ledger refresh
    if (!skipBroadcast) {
      this.billiardGateway.broadcastTransactionUpdate(finalResult);
    }

    // Invalidate Bill Preview Cache for the table
    if (finalResult.tableId) {
      await this.redisService
        .del(`bill_preview_${finalResult.tableId}`)
        .catch(() => {});
      await this.redisService.del('billiard_all_tables').catch(() => {});
    } else if ((finalResult as any).cafeTableId) {
      await this.redisService
        .del(`bill_preview_cafe_${(finalResult as any).cafeTableId}`)
        .catch(() => {});
      await this.redisService.del('cafe_all_tables').catch(() => {});
    }

    return finalResult;
  }

  async setBilliardTotal(
    transactionId: number,
    amount: number,
    details?: any,
    userName?: string,
    endTime?: Date,
    skipBroadcast = false,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['orderItems', 'table'],
    });
    if (!transaction) throw new NotFoundException('Transaction not found');

    const oldAmount = Number(transaction.billiardTotal);
    transaction.billiardTotal = amount;

    if (endTime) {
      transaction.endTime = endTime;
    }

    if (userName && Number(amount) !== oldAmount) {
      await this.reportService.logAction(
        'BILLIARD_PRICE_OVERRIDE',
        userName,
        `Ubah harga billiard manual dari Rp ${oldAmount.toLocaleString()} ke Rp ${Number(amount).toLocaleString()}`,
        transaction.tableId ?? undefined,
        transaction.invoiceNumber,
      );
    }

    if (details) {
      if (Array.isArray(details)) {
        transaction.billingDetails = details;
      } else {
        // If this is a final summary object from stopSession, it often duplicates the breakdown.
        // We intelligently replace or append. For now, let's ensure we don't duplicate.
        const current = Array.isArray(transaction.billingDetails)
          ? transaction.billingDetails
          : [];
        // Allow duplicate Tambahan Waktu entries (e.g. extending twice with the same package)
        const isExtend =
          details.title &&
          (details.title.includes('Extend') ||
            details.title.includes('Tambahan'));

        let isDuplicate = false;
        if (!isExtend) {
          isDuplicate = current.some(
            (d) => d.subtotal === details.subtotal && d.title === details.title,
          );
        }

        if (!isDuplicate) {
          // PROTECTION: If this is an extension but the history is empty,
          // we must materialize the "Base" session item first to prevent
          // calculateBilliardTransient from adding a redundant one later based on the new total.
          if (
            isExtend &&
            current.length === 0 &&
            transaction.sessionType === 'prepaid'
          ) {
            const basePrice =
              oldAmount > 0 ? oldAmount : amount - (details.subtotal || 0);
            current.push({
              title: transaction.fareName || 'Base Session',
              duration: 0, // Will be refined by transient calculation if possible
              subtotal: basePrice,
              isExtension: false,
              ratePerHour: 0,
              logTime: new Date().toISOString(),
            });
          }

          transaction.billingDetails = [
            ...current,
            { ...details, logTime: new Date().toISOString() },
          ];
        }
      }
    }

    // CRITICAL: Persist the changes (billiardTotal and billingDetails) before calling updateTotals
    // otherwise updateTotals will pull stale data from the DB for recalculations.
    await this.transactionRepository.save(transaction);

    // Invalidate Cache immediately after save
    if (transaction.tableId) {
      await this.redisService
        .del(`bill_preview_${transaction.tableId}`)
        .catch(() => {});
    }

    // Re-fetch to ensure we have latest totals
    return this.updateTotals(
      transactionId,
      this.transactionRepository.manager,
      skipBroadcast,
    );
  }

  async processPayment(
    transactionId: number,
    paymentDetails: any,
    userId?: number,
  ): Promise<Transaction> {
    this.logger.log(
      `[processPayment] ID: ${transactionId}, Payload: ${JSON.stringify(paymentDetails)}`,
    );

    // ── IDEMPOTENCY CHECK ──────────────────────────────────────────
    const idempKey = paymentDetails.idempotencyKey;
    if (idempKey) {
      const existing = await this.redisService.getIdempotency(idempKey);
      if (existing) {
        this.logger.log(
          `[processPayment] ID: ${transactionId} - Returning cached idempotent result`,
        );
        return existing;
      }
    }

    // ── MUTEX: distributed lock ────────────────────────────────────
    const lockKey = `payment_${transactionId}`;
    const acquired = await this.redisService.acquireLock(lockKey, 10000); // 10s wait
    if (!acquired) {
      throw new ConflictException(
        'Pembayaran sedang diproses oleh kasir lain.',
      );
    }
    // ─────────────────────────────────────────────────────────────

    // if (!this.shiftService) { ... }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { id: transactionId },
        relations: ['orderItems', 'table', 'member', 'member.tier', 'payments'],
      });
      if (!transaction) throw new NotFoundException('Transaction not found');

      const amount = Number(paymentDetails.amount);
      const settings = await this.settingsService.getSettings();

      // 🛡️ SNAP END TIME (v17.9)
      // If payment is being made while the table is still IN_USE, we must fix the endTime NOW.
      // Otherwise, every second that passes during recursive updateTotals calls will increase the grandTotal.
      if (transaction.table && transaction.table.status !== TableStatus.AVAILABLE && !transaction.endTime) {
        transaction.endTime = new Date();
        await queryRunner.manager.save(Transaction, transaction);
        this.logger.log(`[processPayment] 🛡️ Snapped endTime for INV: ${transaction.invoiceNumber} to prevent bill growth.`);
      }

      // Refresh Package Data
      if (
        !transaction.billiardPackage &&
        (transaction.packageId || (transaction as any).billiardPackageId)
      ) {
        const pkgId =
          transaction.packageId || (transaction as any).billiardPackageId;
        const pkg = await queryRunner.manager.findOne(BilliardPackage, {
          where: { id: pkgId },
        });
        if (pkg) {
          transaction.billiardPackage = pkg;
          transaction.packageId = pkg.id;
        }
      }

      const paymentMethod = (paymentDetails.method || 'CASH').toUpperCase();
      if (paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP') {
        if (!transaction.memberId)
          throw new BadRequestException('Bukan transaksi member');
        await this.memberService.deductBalance(
          transaction.memberId,
          amount,
          queryRunner.manager,
        );
      }

      // Create Formal Payment Record
      const paymentRecord = queryRunner.manager.create(TransactionPayment, {
        transactionId: transaction.id,
        payerName:
          paymentDetails.payer || transaction.customerName || 'Customer',
        itemsSubtotal: 0,
        billiardPortion: 0,
        taxAmount: 0,
        serviceAmount: 0,
        roundingAmount: 0,
        discountAmount: 0,
        totalPaid: amount,
        paymentMethod:
          paymentMethod === 'MEMBERSHIP' ? 'MEMBER' : paymentMethod,
        itemsSnapshot: [],
        createdByUserId: userId,
      });

      // Link to shift
      const activeShift =
        (await this.shiftService.findActiveCashierShift()) ??
        (userId ? await this.shiftService.getActiveShift(userId) : null);
      if (activeShift) {
        paymentRecord.shiftId = activeShift.id;
        paymentRecord.businessDayId = activeShift.businessDayId;
        transaction.shiftId = activeShift.id;
        transaction.businessDayId = activeShift.businessDayId;
      } else {
        const activeDay =
          await this.shiftService.getOrCreateActiveBusinessDay();
        paymentRecord.businessDayId = activeDay.id;
        transaction.businessDayId = activeDay.id;
      }

      const savedPayment = await queryRunner.manager.save(paymentRecord);

      // Update details
      transaction.paymentDetails = [
        ...(transaction.paymentDetails || []),
        {
          method: paymentRecord.paymentMethod,
          amount: amount,
          payer: paymentRecord.payerName,
          timestamp: new Date(),
          paymentId: savedPayment.id,
        },
      ];
      if (userId) transaction.createdByUserId = userId;
      if (paymentDetails.customerName)
        transaction.customerName = paymentDetails.customerName;
      if (paymentDetails.customerPhone)
        transaction.customerPhone = paymentDetails.customerPhone;

      // Recalculate totals by re-fetching from DB to include the NEW payment
      this.logger.log(
        `[processPayment] Fetching latest totals for ID: ${transactionId}`,
      );
      const savedTx = await this.updateTotals(
        transactionId,
        queryRunner.manager,
      );
      this.logger.log(
        `[processPayment] updateTotals DONE for ID: ${transactionId}. PaidAmount: ${savedTx.paidAmount}, GrandTotal: ${savedTx.grandTotal}`,
      );

      // 🛡️ INCREASE TOLERANCE (v17.9)
      // Use Rp 10 tolerance to avoid UNPAID status caused by slight PPN/Service/Rounding discrepancies during race conditions.
      if (Number(savedTx.paidAmount) >= Number(savedTx.grandTotal) - 10) {
        savedTx.status = TransactionStatus.PAID;
        await this.applyRoyaltyPoints(savedTx, queryRunner.manager);

        // Mark items
        if (savedTx.orderItems) {
          for (const item of savedTx.orderItems) {
            if (!item.isPaid && item.status !== 'CANCELLED') {
              item.isPaid = true;
              item.paymentId = savedPayment.id;
              await queryRunner.manager.save(item);

              // AI Tracking: Cafe Sale
              if (item.menuItemId) {
                this.aiService.trackSale(
                  'CAFE',
                  item.menuItemId,
                  item.quantity,
                );
              }
            }
          }
        }

        // AI Tracking: Billiard Sale
        if (savedTx.packageId && savedTx.type === TransactionType.BILLIARD) {
          this.aiService.trackSale('BILLIARD', savedTx.packageId, 1);
        }

        // AI Tracking: Promo Sale
        if (Array.isArray(savedTx.appliedPromos)) {
          for (const pr of savedTx.appliedPromos) {
            this.aiService.trackSale('PROMO', pr.id, 1);
          }
        }

        // --- NEW: Promo ROI Tracking ---
        if (
          Array.isArray(savedTx.appliedPromos) &&
          savedTx.appliedPromos.length > 0
        ) {
          // Fetch full promo data to get estimatedHpp and fixedPrice
          const promoIds = savedTx.appliedPromos.map((p) => p.id);
          const fullPromos = await queryRunner.manager.find(Promo, {
            where: { id: In(promoIds) },
          });

          for (const pRef of savedTx.appliedPromos) {
            const promo = fullPromos.find((p) => p.id === pRef.id);
            if (promo) {
              // PRECISE ATTRIBUTION:
              // We only credit the PROMO'S price to its effectiveness, not the entire bill.
              // If no fixed price is set (old data), we fall back to a reasonable estimate.
              const bundlePrice = Number(promo.ruleJson?.fixedPrice || 0);
              const revenue =
                bundlePrice > 0 ? bundlePrice : Number(savedTx.grandTotal);

              const hpp = Number(promo.estimatedHpp || 0);
              const profit = Math.max(0, revenue - hpp);

              await this.promoService.trackPromoUsage(pRef.id, revenue, profit);
            }
          }
        }

        if (savedTx.tableId) {
          const table = await queryRunner.manager.findOne(Table, {
            where: { id: savedTx.tableId },
          });
          if (table) {
            const now = new Date();
            const isPrepaid = table.sessionType === 'prepaid';
            const isExpired = table.endTime && now >= table.endTime;

            if (
              table.status === TableStatus.WAITING_PAYMENT ||
              (isPrepaid && isExpired)
            ) {
              Object.assign(table, {
                status: TableStatus.AVAILABLE,
                sessionType: null,
                startTime: null,
                endTime: null,
                remainingMinutes: null,
                packageId: null,
                activePackagePrice: null,
                isLightOn: false,
                memberId: null,
              });
              const savedTable = await queryRunner.manager.save(Table, table);
              this.billiardGateway.broadcastTableUpdate(savedTable);
            } else if (savedTx.status === TransactionStatus.PAID) {
              // 🎯 FAILSAFE (v17.9): If marked PAID but table is still IN_USE/WARNING/OFFLINE,
              // we must release it now since the customer has paid in full.
              Object.assign(table, {
                status: TableStatus.AVAILABLE,
                sessionType: null,
                startTime: null,
                endTime: null,
                remainingMinutes: null,
                packageId: null,
                activePackagePrice: null,
                isLightOn: false,
                memberId: null,
              });
              const savedTable = await queryRunner.manager.save(Table, table);
              this.billiardGateway.broadcastTableUpdate(savedTable);
            } else {
              this.billiardGateway.broadcastTableUpdate({
                ...table,
                activeTransaction: savedTx,
              });
            }
          }
        } else if (savedTx.cafeTableId) {
          const ct = await queryRunner.manager.findOne(CafeTable, {
            where: { id: savedTx.cafeTableId },
          });
          if (ct) {
            Object.assign(ct, {
              status: CafeTableStatus.AVAILABLE,
              currentTransactionId: null,
              currentCustomer: null,
            });
            await queryRunner.manager.save(CafeTable, ct);
            this.billiardGateway.broadcastTableUpdate({
              ...ct,
              type: 'cafe',
              status: CafeTableStatus.AVAILABLE,
              activeTransaction: null,
            });
          }
        } else {
          // ── NEW: Held Bill (Debt) fully paid ──
          this.billiardGateway.broadcastDebtUpdate();
        }
      } else if (savedTx.paidAmount > 0) {
        savedTx.status = TransactionStatus.PARTIAL;
        this.billiardGateway.broadcastTransactionUpdate(savedTx);
      }

      const finalSaved = await queryRunner.manager.save(savedTx);

      // Cashflow
      const isMemberPmt =
        paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP';
      const desc = `Payment INV: ${savedTx.invoiceNumber} (${paymentRecord.paymentMethod})`;
      await this.financeService.logCashflow(
        {
          amount: isMemberPmt ? 0 : amount,
          type: CashflowType.IN,
          source:
            savedTx.cafeTableId && !savedTx.tableId
              ? 'sale:cafe'
              : 'sale:billiard',
          referenceId: savedTx.invoiceNumber,
          description: isMemberPmt ? `[MEMBER] ${desc}` : desc,
          businessDayId: savedTx.businessDayId ?? undefined,
          shiftId: savedTx.shiftId ?? undefined,
          paymentMethod: isMemberPmt ? 'MEMBER' : paymentMethod,
        },
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      // Non-blocking trigger for AI Performance Pulse
      if (finalSaved.businessDayId) {
        this.aiService
          .calculatePerformanceAchievement(finalSaved.businessDayId)
          .catch((e) =>
            this.logger.error(`Failed to trigger AI Pulse: ${e.message}`),
          );
      }

      return finalSaved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Payment failed: ${err.message}`);
      throw err;
    } finally {
      await queryRunner.release();
      await this.redisService.releaseLock(lockKey);
    }
  }

  async holdTransaction(
    id: number,
    customerPhone?: string,
    customerName?: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['table', 'cafeTable'],
    });
    if (!transaction) throw new NotFoundException('Transaction not found');

    // 1. Capture customer details for the debt
    if (customerName) transaction.customerName = customerName;
    if (customerPhone) transaction.customerPhone = customerPhone;

    // 2. Mark status as DEBT if not already PAID or PARTIAL
    if (transaction.status === TransactionStatus.UNPAID) {
      transaction.status = TransactionStatus.DEBT;
    }

    // 3. Unlink the table
    const tableId = transaction.tableId;
    const cafeTableId = transaction.cafeTableId;

    transaction.tableId = null;
    transaction.table = null;
    transaction.cafeTableId = null;
    transaction.cafeTable = null;

    const saved = await this.transactionRepository.save(transaction);

    // 4. Reset the Billiard table status
    if (tableId) {
      const table = await this.tableRepository.findOne({
        where: { id: tableId },
      });
      if (table) {
        Object.assign(table, {
          status: TableStatus.AVAILABLE,
          sessionType: null,
          startTime: null,
          endTime: null,
          remainingMinutes: null,
          isLightOn: false,
          memberId: null,
        });
        const savedTable = await this.tableRepository.save(table);
        this.billiardGateway.broadcastTableUpdate({
          ...savedTable,
          status: TableStatus.AVAILABLE,
          activeTransaction: null,
        });
      }
    }

    // 5. Reset the Cafe table status
    if (cafeTableId) {
      const ct = await this.cafeTableRepository.findOne({
        where: { id: cafeTableId },
      });
      if (ct) {
        Object.assign(ct, {
          status: CafeTableStatus.AVAILABLE,
          currentTransactionId: null,
          currentCustomer: null,
        });
        await this.cafeTableRepository.save(ct);
        this.billiardGateway.broadcastTableUpdate({
          ...ct,
          type: 'cafe',
          status: CafeTableStatus.AVAILABLE,
          activeTransaction: null,
        });
      }
    }
    this.billiardGateway.broadcastDebtUpdate();
    return saved;
  }

  async getDebtTransactions(): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        status: In([TransactionStatus.DEBT, TransactionStatus.PARTIAL]),
        tableId: IsNull(),
      },
      relations: ['table', 'orderItems', 'orderItems.menuItem', 'member'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDebtCount(): Promise<number> {
    return this.transactionRepository.count({
      where: {
        status: In([TransactionStatus.DEBT, TransactionStatus.PARTIAL]),
        tableId: IsNull(),
      },
    });
  }

  /**
   * Mengirim struk pembayaran individu ke printer
   */
  async printPaymentReceipt(
    paymentId: number,
    printerIp: string,
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log(
        `Attempting to print receipt for Payment ID: ${paymentId} to IP: ${printerIp}`,
      );

      const payment = await this.transactionPaymentRepository.findOne({
        where: { id: paymentId },
        relations: [
          'transaction',
          'transaction.table',
          'transaction.orderItems',
          'transaction.orderItems.menuItem',
          'transaction.orderItems.menuItem.category',
        ],
      });

      if (!payment) {
        this.logger.error(`Payment record with ID ${paymentId} not found`);
        throw new NotFoundException('Payment record not found');
      }

      if (!payment.transaction) {
        this.logger.error(
          `Transaction relation missing for Payment ID ${paymentId}`,
        );
        throw new Error('Transaction data missing');
      }

      const receiptText = await this.invoiceService.generateThermalReceipt(
        payment,
        payment.transaction,
      );

      this.logger.log(`Sending receipt text to printer: ${printerIp}`);
      await this.hardwareService.printRaw(
        printerIp || '192.168.1.100',
        9100,
        receiptText,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Cetak Struk Gagal [Payment ID: ${paymentId}]:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Unified logic to award royalty points on transaction completion.
   */
  private async applyRoyaltyPoints(
    transaction: Transaction,
    manager?: any,
  ): Promise<void> {
    const queryManager = manager || this.transactionRepository.manager;
    // WE REMOVED THE Guard isPointsAwarded TO ALLOW ADDITIVE AWARDS FOR MULTIPLE PAYMENTS (e.g. Billiard then Cafe later)
    if (transaction.type === TransactionType.TOPUP) return;
    if (!transaction.memberId) return;

    try {
      const settings = await this.settingsService.getSettings();
      const pointsPerUnit = Number(settings.royaltyPointsPerAmount || 1000);
      // pointsPerUnit=0 effectively disables royalty (set royaltyPointsPerAmount=0 in settings)
      if (pointsPerUnit <= 0) return;

      const member = await queryManager.findOne(Member, {
        where: { id: transaction.memberId },
        relations: ['tier'],
      });

      if (!member) {
        this.logger.warn(
          `[Royalty] Member ${transaction.memberId} not found, skipping points`,
        );
        return;
      }

      // Update cumulative total spend (triggers auto tier-upgrade check)
      const currentSpend = Number(transaction.grandTotal || 0);
      const spendToAward = currentSpend - Number(transaction.awardedSpend || 0);

      if (spendToAward > 0) {
        await this.memberService.updateTotalSpend(
          member.id,
          spendToAward,
          queryManager,
        );
        transaction.awardedSpend = currentSpend;
      }

      // ✅ FIX: Use multiplier=1 as fallback for members without a tier
      let multiplier = Number(member.tier?.pointMultiplier || 1);

      // Double-point-days bonus: check if today is a double point day for this tier
      const today = new Date().getDay(); // 0=Sun…6=Sat
      const doublePointDays: number[] = member.tier?.doublePointDays || [];
      if (doublePointDays.includes(today)) {
        multiplier *= 2;
        this.logger.log(
          `[Royalty] 2x Double Point Day applied for ${member.name} (day: ${today})`,
        );
      }

      // Calculate points based on the amount PAID so far
      const totalEligiblePoints =
        Math.floor(Number(transaction.paidAmount || 0) / pointsPerUnit) *
        multiplier;
      const pointsToAward =
        totalEligiblePoints - Number(transaction.awardedPoints || 0);

      if (pointsToAward > 0) {
        await this.memberService.awardPoints(
          member.id,
          pointsToAward,
          queryManager,
        );

        // ✅ Accrue Point Ledger
        const ledger = new PointLedger();
        ledger.memberId = member.id;
        ledger.type = 'EARN';
        ledger.amount = pointsToAward;
        ledger.description = `Point dari TRX: ${transaction.invoiceNumber}`;
        ledger.referenceId = transaction.invoiceNumber;

        await queryManager.save(PointLedger, ledger);

        // ✅ Update Transaction accumulators
        transaction.awardedPoints =
          Number(transaction.awardedPoints || 0) + pointsToAward;

        // IMPORTANT: Use queryManager directly to ensure it participates in the payment transaction
        await queryManager.save(Transaction, transaction);

        this.logger.log(
          `[Royalty] ✅ Awarded ${pointsToAward} pts to "${member.name}" ` +
            `(Tier: ${member.tier?.name || 'none'}, x${multiplier}) ` +
            `for INV: ${transaction.invoiceNumber} (Total: Rp ${transaction.grandTotal})`,
        );
      } else {
        this.logger.log(
          `[Royalty] 0 pts to award for INV: ${transaction.invoiceNumber} (Total: Rp ${transaction.grandTotal}, perUnit: ${pointsPerUnit})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[Royalty] FAILED to award points for INV ${transaction.invoiceNumber}: ${error.message}`,
      );
    }
  }
}
