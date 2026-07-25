import {
  Injectable,
  ConflictException,
  NotFoundException,
  forwardRef,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not, In } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { PayrollConfig } from './entities/payroll-config.entity';
import { Violation, ViolationType } from './entities/violation.entity';
import { UserStatusLog } from './entities/user-status-log.entity';
import { PayrollRelease } from './entities/payroll-release.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import {
  Transaction,
  TransactionStatus,
} from '../transaction/entities/transaction.entity';
import { OrderItem, OrderItemStatus } from '../cafe/entities/order-item.entity';
import * as bcrypt from 'bcrypt';
import type { EventsGateway } from '../socket/events.gateway';
import { ShiftService } from '../finance/shift.service';
import { Cashflow, CashflowType } from '../finance/entities/cashflow.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import * as xlsx from 'xlsx';
import { DataSource } from 'typeorm';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(PayrollConfig)
    private payrollRepository: Repository<PayrollConfig>,
    @InjectRepository(Violation)
    private violationRepository: Repository<Violation>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserStatusLog)
    private statusLogRepository: Repository<UserStatusLog>,
    @InjectRepository(PayrollRelease)
    private payrollReleaseRepository: Repository<PayrollRelease>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @Inject(
      forwardRef(() => {
        const { EventsGateway } = require('../socket/events.gateway');
        return EventsGateway;
      }),
    )
    private eventsGateway: EventsGateway,
    @Inject(forwardRef(() => ShiftService))
    private readonly shiftService: ShiftService,
    private readonly whatsAppService: WhatsAppService,
    @Inject(forwardRef(() => {
      const { ApprovalService } = require('../common/approval/approval.service');
      return ApprovalService;
    }))
    private readonly approvalService: any,
    @Inject(forwardRef(() => {
      const { SettingsService } = require('../settings/settings.service');
      return SettingsService;
    }))
    private readonly settingsService: any,
    private readonly dataSource: DataSource,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async createEmployee(userData: any) {
    try {
      const username = (userData.username || '').trim();
      const email = (userData.email || '').trim() || null;
      const pin = (userData.pin || '').trim() || null;
      const rfid = (userData.rfid || '').trim() || null;

      // Granular Check for existing username, email, or RFID
      // Check Username
      const existingUsername = await this.userRepository.findOne({ where: { username } });
      if (existingUsername) throw new ConflictException(`Username "${username}" sudah terdaftar`);

      // Check Email
      if (email) {
        const existingEmail = await this.userRepository.findOne({ where: { email } });
        if (existingEmail) throw new ConflictException(`Email "${email}" sudah terdaftar`);
      }

      // Check RFID
      if (rfid) {
        const existingRfid = await this.userRepository.findOne({ where: { rfid } });
        if (existingRfid) throw new ConflictException(`Kartu RFID/Tag "${rfid}" sudah terdaftar pada karyawan lain (${existingRfid.name})`);
      }

      // Extract User Identity fields only
      const userFields = [
        'name',
        'placeOfBirth',
        'dateOfBirth',
        'gender',
        'address',
        'religion',
        'maritalStatus',
        'jobTitle',
        'nationality',
        'joinedAt',
        'phone',
        'baseShift',
        'fingerprintData',
        'securityMode',
        'rfid',
        'isVerified',
      ];
      const userPayload: any = {};
      userFields.forEach((f) => {
        if (userData[f] !== undefined) userPayload[f] = userData[f];
      });

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const role = await this.roleRepository.findOne({
        where: { id: userData.roleId },
      });
      if (!role) throw new NotFoundException('Role tidak ditemukan');

      const user = this.userRepository.create({
        ...userPayload,
        username,
        password: hashedPassword,
        role,
        pin,
        email, // Already null if empty
        rfid,
        status: UserStatus.OFFLINE,
        isVerified: userData.isVerified !== undefined ? userData.isVerified : true,
      });

      const savedUser = await this.userRepository.save(user);

      // Create initial payroll config
      const payroll = this.payrollRepository.create({
        user: savedUser as any,
        basicSalary: userData.basicSalary ?? 0,
        overtimeRate: userData.overtimeRate ?? 0,
        commissionService: userData.commissionService ?? 0,
        commissionSalesPercent: userData.commissionSalesPercent ?? 0,
        categoryCommissions: userData.categoryCommissions || {},
        penaltyIdle: userData.penaltyIdle ?? 5000,
        penaltyLate: userData.penaltyLate ?? 0,
        idleThreshold: userData.idleThreshold ?? 5,
      });
      await this.payrollRepository.save(payroll);

      // Initial status log
      const log = this.statusLogRepository.create({
        user: savedUser as any,
        status: UserStatus.OFFLINE,
      });
      await this.statusLogRepository.save(log);

      this.eventsGateway.employeeUpdated({
        id: (savedUser as any).id,
        action: 'created',
      });

      // Send WhatsApp welcome message if phone is provided
      const savedUserObj = savedUser as unknown as User;
      if (userData.phone) {
        const cleanPassword = userData.password; // plain text before hashing
        const msg =
          `✅ *Selamat Datang, ${savedUserObj.name}!*\n\n` +
          `Akun karyawan Anda telah berhasil dibuat.\n\n` +
          `👤 Username: *${savedUserObj.username}*\n` +
          `🔑 Password: *${cleanPassword}*\n` +
          `🏷️ Role: *${role.name}*\n\n` +
          `Silakan login di aplikasi dan segera ganti password Anda. 🙏`;
        // Non-blocking — don't fail registration if WA fails
        this.whatsAppService
          .sendMessage(userData.phone, msg)
          .catch((e) =>
            this.logger.warn(`WA welcome message failed: ${e.message}`),
          );
      }

      return savedUser;
    } catch (error) {
      this.logger.error(`SERVER_CREATE_EMPLOYEE_ERROR: ${error.message}`, error.stack);
      // Re-throw if it's already a Nest exception (e.g., ConflictException)
      if (error.status) throw error;
      throw new ConflictException(`Gagal mendaftarkan karyawan: ${error.message}`);
    }
  }

  async findAllEmployees() {
    return this.userRepository.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async findManagementStaff() {
    return this.userRepository.find({
      where: {
        role: {
          name: In([
            'ADMIN',
            'OWNER',
            'MANAGER',
            'CASHIER',
            'WAITER',
            'ADMINISTRATOR',
            'SUPERADMIN',
          ]),
        },
      },
      relations: ['role'],
    });
  }

  async updateEmployee(id: number, userData: any) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('Employee not found');

    const username = (userData.username || '').trim();
    const email = (userData.email || '').trim() || null;
    const pin = (userData.pin || '').trim() || null;
    const rfid = (userData.rfid || '').trim() || null;

    // Duplicate checks
    if (username && username !== user.username) {
      const existing = await this.userRepository.findOne({
        where: { username },
      });
      if (existing) throw new ConflictException(`Username "${username}" sudah digunakan`);
    }

    if (email && email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email } });
      if (existing) throw new ConflictException(`Email "${email}" sudah digunakan`);
    }

    if (rfid && rfid !== user.rfid) {
      const existing = await this.userRepository.findOne({ where: { rfid } });
      if (existing) throw new ConflictException(`Kartu RFID/Tag "${rfid}" sudah digunakan oleh karyawan lain (${existing.name})`);
    }

    if (userData.password && userData.password.trim()) {
      user.password = await bcrypt.hash(userData.password.trim(), 10);
    }


    if (userData.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: userData.roleId },
      });
      if (!role) throw new NotFoundException('Role not found');
      user.role = role;
      delete userData.roleId;
    }

    // Extract only User Identity fields to avoid polluting user entity with payroll data
    const userFields: (keyof User)[] = [
      'name', 'placeOfBirth', 'dateOfBirth', 'gender', 'address', 'religion',
      'maritalStatus', 'jobTitle', 'nationality', 'joinedAt', 'phone', 'baseShift',
      'fingerprintData', 'securityMode', 'rfid', 'isVerified'
    ];
    
    userFields.forEach(f => {
      if (userData[f] !== undefined) (user as any)[f] = userData[f];
    });

    Object.assign(user, {
      username: username || user.username,
      email,
      pin,
      rfid
    });

    const updatedUser = await this.userRepository.save(user);

    // Update payroll config
    const payroll = await this.payrollRepository.findOne({
      where: { user: { id } },
    });
    if (payroll) {
      payroll.basicSalary = userData.basicSalary ?? payroll.basicSalary;
      payroll.overtimeRate = userData.overtimeRate ?? payroll.overtimeRate;
      payroll.commissionService =
        userData.commissionService ?? payroll.commissionService;
      payroll.commissionSalesPercent =
        userData.commissionSalesPercent ?? payroll.commissionSalesPercent;
      payroll.categoryCommissions =
        userData.categoryCommissions ?? payroll.categoryCommissions;
      payroll.penaltyIdle = userData.penaltyIdle ?? payroll.penaltyIdle;
      payroll.penaltyLate = userData.penaltyLate ?? payroll.penaltyLate;
      payroll.idleThreshold = userData.idleThreshold ?? payroll.idleThreshold;
      await this.payrollRepository.save(payroll);
    }

    this.eventsGateway.employeeUpdated({
      id: updatedUser.id,
      action: 'updated',
    });

    return updatedUser;
  }

  async identifyByPin(pin: string) {
    return this.userRepository.findOne({
      where: [{ pin }, { rfid: pin }],
      relations: ['role'],
    });
  }

  async deleteEmployee(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Employee not found');

    // Nullify or delete references in related tables to avoid FK constraint errors
    // while preserving historical data.
    await Promise.all([
      this.violationRepository.update({ userId: id }, { userId: null as any }),
      this.payrollReleaseRepository.update({ userId: id }, { userId: null as any }),
      this.payrollReleaseRepository.update(
        { releasedByUserId: id },
        { releasedByUserId: null as any },
      ),
      this.transactionRepository.update(
        { createdByUserId: id },
        { createdByUserId: null as any },
      ),
      this.transactionRepository.update(
        { openedByUserId: id },
        { openedByUserId: null as any },
      ),
      this.transactionRepository.update(
        { commissionUserId: id },
        { commissionUserId: null as any },
      ),
      this.orderItemRepository.update(
        { createdByUserId: id },
        { createdByUserId: null as any },
      ),
      this.orderItemRepository.update(
        { completedByUserId: id },
        { completedByUserId: null as any },
      ),
      this.orderItemRepository.update(
        { commissionUserId: id },
        { commissionUserId: null as any },
      ),
      this.statusLogRepository.delete({ user: { id } }),

      this.userRepository.manager
        .createQueryBuilder()
        .update('shifts')
        .set({ userId: null })
        .where('userId = :id', { id })
        .execute(),

      // For payments, we use query builder as the entity might not be directly available in service
      this.userRepository.manager
        .createQueryBuilder()
        .update('transaction_payments')
        .set({ createdByUserId: null })
        .where('createdByUserId = :id', { id })
        .execute(),
    ]);

    await this.payrollRepository.delete({ user: { id } });
    const result = await this.userRepository.delete(id);
    this.eventsGateway.employeeUpdated({ id, action: 'deleted' });
    return result;
  }

  async updateStatus(
    userId: number,
    status: UserStatus,
    socketId?: string,
    activePage?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const oldStatus = user.status;
    const now = new Date();

    if (oldStatus === status) {
      await this.userRepository.update(userId, {
        ...(socketId && { socketId }),
        ...(activePage && { currentActivePage: activePage }),
        lastSeen: now,
      });
      return;
    }

    // Close current log
    const currentLog = await this.statusLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.endedAt IS NULL')
      .orderBy('log.startedAt', 'DESC')
      .getOne();

    if (currentLog) {
      currentLog.endedAt = now;
      currentLog.durationSeconds = Math.floor(
        (now.getTime() - currentLog.startedAt.getTime()) / 1000,
      );
      await this.statusLogRepository.save(currentLog);
    }

    // Start new log
    const newLog = this.statusLogRepository.create({
      user: { id: userId } as any,
      status,
      startedAt: now,
    });
    await this.statusLogRepository.save(newLog);

    await this.userRepository.update(userId, {
      status,
      ...(socketId && { socketId }),
      ...(activePage && { currentActivePage: activePage }),
      lastSeen: now,
    });
  }

  async findById(id: number) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['payrollConfig', 'role'],
    });
  }

  // Role Management
  async createRole(name: string, permissions: string[], description?: string, approvalLevel?: number) {
    const role = this.roleRepository.create({ name, permissions, description, approvalLevel: approvalLevel || 0 });
    const saved = await this.roleRepository.save(role);
    await this.reorderApprovalLevels();
    this.eventsGateway.roleUpdated({ id: saved.id, action: 'created' });
    return saved;
  }

  async updateRole(
    id: number,
    name: string,
    permissions: string[],
    description?: string,
    approvalLevel?: number,
  ) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    role.name = name;
    role.permissions = permissions;
    role.description = description;
    if (approvalLevel !== undefined) {
      role.approvalLevel = approvalLevel;
    }
    const saved = await this.roleRepository.save(role);
    await this.reorderApprovalLevels();
    this.eventsGateway.roleUpdated({ id: saved.id, action: 'updated' });
    return saved;
  }

  async deleteRole(id: number) {
    const usersCount = await this.userRepository.count({
      where: { role: { id } },
    });
    if (usersCount > 0) {
      throw new ConflictException('Cannot delete role assigned to users');
    }
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    
    await this.roleRepository.remove(role);
    
    // Auto-Shift: Reorder levels to fill the gap
    await this.reorderApprovalLevels();
    
    this.eventsGateway.roleUpdated({ id, action: 'deleted' });
    return { success: true };
  }

  async getMaxApprovalLevel(): Promise<number> {
    const result = await this.roleRepository
      .createQueryBuilder('role')
      .select('MAX(role.approvalLevel)', 'max')
      .getRawOne();
    return parseInt(result?.max || '0', 10);
  }

  async reorderApprovalLevels() {
    const roles = await this.roleRepository.find({
      order: { approvalLevel: 'ASC' },
    });

    const approvalRoles = roles.filter(r => r.approvalLevel > 0);
    if (approvalRoles.length === 0) return;

    let nextGaplessLevel = 1;
    let currentProcessingOldLevel = approvalRoles[0].approvalLevel;

    for (const role of approvalRoles) {
      if (role.approvalLevel > currentProcessingOldLevel) {
        nextGaplessLevel++;
        currentProcessingOldLevel = role.approvalLevel;
      }
      
      if (role.approvalLevel !== nextGaplessLevel) {
        role.approvalLevel = nextGaplessLevel;
        await this.roleRepository.save(role);
      }
    }
  }

  async findAllRoles() {
    return this.roleRepository.find({ order: { id: 'DESC' } });
  }

  async logViolation(
    userId: number,
    type: ViolationType,
    description: string,
    penaltyAmount: number,
    durationMinutes?: number,
  ) {
    if (type === ViolationType.MANUAL_PENALTY) {
      const settings = await this.settingsService.getSettings();
      const approvalConfig = settings?.approvalConfig || {};
      let requiredLevels = approvalConfig['PENALTY'] || [];
      
      // As requested by user, force PENALTY to go through Approval Center even if not configured
      if (requiredLevels.length === 0) {
        requiredLevels = [1];
      }

      if (requiredLevels.length > 0) {
        // Fetch active shift context
        const activeShift =
          (await this.shiftService.getActiveShift(userId)) ||
          (await this.shiftService.findActiveCashierShift());
        const activeDay = activeShift?.businessDayId
          ? null
          : await this.shiftService.getOrCreateActiveBusinessDay();

        const payload = {
          userId,
          type,
          description,
          penaltyAmount,
          durationMinutes,
          shiftId: activeShift?.id || null,
          businessDayId: activeShift?.businessDayId || activeDay?.id || null,
        };

        const req = await this.approvalService.createRequest({
          moduleType: 'PENALTY', // Cast ApprovalModuleType.PENALTY as string if enum isn't imported
          referenceId: 0, // 0 because it's pending creation
          requestedByUserId: userId,
          requiredLevels,
          metadata: {
            entityType: 'VIOLATION',
            itemName: description,
            payload,
          },
        });
        
        // Return a special object that the controller can use to tell the frontend
        return { isPendingApproval: true, approvalRequestId: req.id, message: 'Menunggu Persetujuan Atasan' };
      }
    }

    return this.userRepository.manager.transaction(async (manager) => {
      // Calculate amount if type is LATE_LOGIN and penaltyAmount is not explicitly passed (or passed as 0)
      let finalAmount = penaltyAmount;
      if (
        type === ViolationType.LATE_LOGIN &&
        durationMinutes &&
        penaltyAmount === 0
      ) {
        const config = await manager.findOne(PayrollConfig, {
          where: { user: { id: userId } },
        });
        if (config) {
          const rate = Number(config.penaltyLate || 0);
          finalAmount = durationMinutes * rate;
          description = `${description} (${durationMinutes} menit x Rp ${rate})`;
        }
      }

      // Fetch active shift context
      const activeShift =
        (await this.shiftService.getActiveShift(userId)) ||
        (await this.shiftService.findActiveCashierShift());
      const activeDay = activeShift?.businessDayId
        ? null
        : await this.shiftService.getOrCreateActiveBusinessDay();

      const violation = manager.create(Violation, {
        userId,
        type,
        description,
        penaltyAmount: finalAmount,
        durationMinutes,
        shiftId: activeShift?.id || null,
        businessDayId: activeShift?.businessDayId || activeDay?.id || null,
      } as any);
      const saved = await manager.save(Violation, violation);

      // --- LINK TO LEDGER (CASHFLOW) ---
      if (finalAmount > 0) {
        try {
          const user = await manager.findOne(User, { where: { id: userId } });
          const cashflow = manager.create(Cashflow, {
            amount: finalAmount,
            type: CashflowType.IN,
            source: 'penalty',
            referenceId: `VIOLATION-${saved.id}`,
            description: `[DENDA STAFF] ${user?.name || 'Staff'}: ${description}`,
            businessDayId: violation.businessDayId,
            shiftId: violation.shiftId,
            timestamp: new Date(),
          });
          await manager.save(Cashflow, cashflow);
          this.logger.log(`[LEDGER] Recorded penalty of Rp ${finalAmount} for user ${userId} in cashflow.`);
        } catch (ledgerError) {
          // Log but don't fail violation logging
          this.logger.error(`[LEDGER_ERROR] Gagal mencatat denda ke cashflow: ${ledgerError.message}`);
        }
      }

      this.eventsGateway.server.emit('violationUpdated', { userId });
      return saved;
    });
  }

  async finalizeViolation(payload: any) {
    if (!payload) return;
    
    return this.userRepository.manager.transaction(async (manager) => {
      const violation = manager.create(Violation, {
        ...payload
      } as any);
      const saved = await manager.save(Violation, violation);

      // --- LINK TO LEDGER (CASHFLOW) ---
      if (payload.penaltyAmount > 0) {
        try {
          const user = await manager.findOne(User, { where: { id: payload.userId } });
          const cashflow = manager.create(Cashflow, {
            amount: payload.penaltyAmount,
            type: CashflowType.IN,
            source: 'penalty',
            referenceId: `VIOLATION-${saved.id}`,
            description: `[DENDA STAFF] ${user?.name || 'Staff'}: ${payload.description}`,
            businessDayId: violation.businessDayId,
            shiftId: violation.shiftId,
            timestamp: new Date(),
          });
          await manager.save(Cashflow, cashflow);
          this.logger.log(`[LEDGER] Recorded penalty of Rp ${payload.penaltyAmount} for user ${payload.userId} in cashflow.`);
        } catch (ledgerError) {
          this.logger.error(`[LEDGER_ERROR] Gagal mencatat denda ke cashflow: ${ledgerError.message}`);
        }
      }

      this.eventsGateway.server.emit('violationUpdated', { userId: payload.userId });
      return saved;
    });
  }

  async calculateMonthlyPayroll(
    userId: number,
    month: number,
    year: number,
    start?: Date,
    end?: Date,
    includeReleased: boolean = false,
  ) {
    const startDate = start ? start : new Date(year, month - 1, 1);
    const endDate = end ? end : new Date(year, month, 0, 23, 59, 59);

    const existingRelease = await this.payrollReleaseRepository.findOne({
      where: { userId, month, year },
    });
    const isReleased = !!existingRelease;

    const config = await this.payrollRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'user.role'],
    });
    if (!config) return null;
    const user = config.user;

    let basicSalary = +config.basicSalary;
    if (start && end) {
      const daysInPeriod = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const daysInMonth = new Date(year, month, 0).getDate();
      // Only prorate if the period is significantly shorter than a month (avoiding boundary noise)
      if (daysInPeriod < daysInMonth - 2) {
        basicSalary = (basicSalary / daysInMonth) * daysInPeriod;
      }
    }

    // 1. Service Commission (Table Starts)
    const tableStarts = await this.transactionRepository.count({
      where: [
        {
          commissionUserId: userId,
          createdAt: Between(startDate, endDate),
          status: Not(TransactionStatus.CANCELLED),
          payrollReleaseId: includeReleased ? undefined : IsNull(),
        },
        {
          commissionUserId: IsNull(),
          createdByUserId: userId,
          createdAt: Between(startDate, endDate),
          status: Not(TransactionStatus.CANCELLED),
          payrollReleaseId: includeReleased ? undefined : IsNull(),
        },
      ],
    });
    const totalServiceCommission = tableStarts * +config.commissionService;

    // 2. Sales Commission (Granular by Category)
    const salesItems = await this.orderItemRepository
      .createQueryBuilder('oi')
      .leftJoinAndSelect('oi.menuItem', 'mi')
      .leftJoinAndSelect('mi.category', 'cat')
      .leftJoin('oi.transaction', 't')
      .where(
        '(oi.commissionUserId = :userId OR (oi.commissionUserId IS NULL AND oi.createdByUserId = :userId))',
        { userId },
      )
      .andWhere('oi.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('oi.status IN (:...statuses)', {
        statuses: [
          OrderItemStatus.DONE,
          OrderItemStatus.QUEUED,
          OrderItemStatus.PROCESSING,
        ],
      })
      .andWhere('(oi.isPaid = true OR t.status != :cancelledStatus)', {
        cancelledStatus: TransactionStatus.CANCELLED,
      })
      .andWhere(includeReleased ? '1=1' : 'oi.payrollReleaseId IS NULL')
      .getMany();

    const categoryBreakdown: Record<
      string,
      { volume: number; commission: number; percent: number }
    > = {};
    let totalSalesCommission = 0;

    const commissionsMap = config.categoryCommissions || {};
    const normalizedCommissionsMap: Record<string, number> = {};
    const displayNamesMap: Record<string, string> = {}; // Map normalized key to the first display name found

    // 1. Initialize with configured categories for visibility
    Object.entries(commissionsMap).forEach(([cat, val]) => {
      const key = cat.trim().toUpperCase();
      const percent = Number(val);
      normalizedCommissionsMap[key] = percent;

      if (!displayNamesMap[key]) {
        displayNamesMap[key] = cat.trim();
        categoryBreakdown[displayNamesMap[key]] = {
          volume: 0,
          commission: 0,
          percent,
        };
      }
    });

    const defaultPercent = Number(config.commissionSalesPercent || 0);

    salesItems.forEach((item) => {
      const rawCategory = item.menuItem?.category;
      const categoryName =
        (typeof rawCategory === 'object' ? rawCategory?.name : rawCategory) ||
        'Uncategorized';
      const categoryKey = categoryName.trim().toUpperCase();
      const originalVolume =
        Number(item.priceAtOrder || 0) * Number(item.quantity || 1);
      // Prioritize per-item persisted discount, then fallback to transaction ratio if legacy
      const itemDiscount = Number(item.discountAmount || 0);
      let discountedVolume = originalVolume - itemDiscount;

      if (itemDiscount === 0) {
        const tx = item.transaction;
        if (tx && Number(tx.discountAmount || 0) > 0) {
          const billTotal = Number(tx.billiardTotal || 0);
          const cafeTotal = Number(tx.cafeTotal || 0);
          const totalBeforeDisc = billTotal + cafeTotal;
          if (totalBeforeDisc > 0) {
            const discRatio = Number(tx.discountAmount) / totalBeforeDisc;
            discountedVolume = originalVolume * (1 - discRatio);
          }
        }
      }

      // Use specific commission if set, otherwise use default
      const percent =
        normalizedCommissionsMap[categoryKey] !== undefined
          ? normalizedCommissionsMap[categoryKey]
          : defaultPercent;

      const commission = (discountedVolume * percent) / 100;

      // Group by the first discovered display name for this normalized key
      if (!displayNamesMap[categoryKey]) {
        displayNamesMap[categoryKey] = categoryName.trim();
      }
      const displayName = displayNamesMap[categoryKey];

      if (!categoryBreakdown[displayName]) {
        categoryBreakdown[displayName] = { volume: 0, commission: 0, percent };
      }

      categoryBreakdown[displayName].volume += originalVolume; // Show original volume for transparency
      categoryBreakdown[displayName].commission += commission;
      totalSalesCommission += commission;
    });

    // 2b. Production Commission (Work done by Kitchen/Bartender)
    const productionItems = await this.orderItemRepository
      .createQueryBuilder('oi')
      .leftJoinAndSelect('oi.menuItem', 'mi')
      .leftJoinAndSelect('mi.category', 'cat')
      .leftJoin('oi.transaction', 't')
      .where('oi.completedByUserId = :userId', { userId })
      .andWhere('oi.completedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('oi.status = :status', { status: OrderItemStatus.DONE })
      .andWhere('(oi.isPaid = true OR t.status != :cancelledStatus)', {
        cancelledStatus: TransactionStatus.CANCELLED,
      })
      .andWhere(includeReleased ? '1=1' : 'oi.payrollReleaseId IS NULL')
      .getMany();

    const productionBreakdown: Record<
      string,
      { volume: number; commission: number; percent: number }
    > = {};
    let totalProductionCommission = 0;
    const prodDisplayNamesMap: Record<string, string> = {};

    // 1. Initialize production breakdown with same config
    Object.entries(commissionsMap).forEach(([cat, val]) => {
      const key = cat.trim().toUpperCase();
      const percent = Number(val);
      if (!prodDisplayNamesMap[key]) {
        prodDisplayNamesMap[key] = cat.trim();
        productionBreakdown[prodDisplayNamesMap[key]] = {
          volume: 0,
          commission: 0,
          percent,
        };
      }
    });

    productionItems.forEach((item) => {
      const rawCategory = item.menuItem?.category;
      const categoryName =
        (typeof rawCategory === 'object' ? rawCategory?.name : rawCategory) ||
        'Uncategorized';
      const categoryKey = categoryName.trim().toUpperCase();
      const originalVolume =
        Number(item.priceAtOrder || 0) * Number(item.quantity || 1);

      // Apply same discount logic for production
      const itemDiscount = Number(item.discountAmount || 0);
      let discountedVolume = originalVolume - itemDiscount;

      if (itemDiscount === 0) {
        const tx = item.transaction;
        if (tx && Number(tx.discountAmount || 0) > 0) {
          const billTotal = Number(tx.billiardTotal || 0);
          const cafeTotal = Number(tx.cafeTotal || 0);
          const totalBeforeDisc = billTotal + cafeTotal;
          if (totalBeforeDisc > 0) {
            const discRatio = Number(tx.discountAmount) / totalBeforeDisc;
            discountedVolume = originalVolume * (1 - discRatio);
          }
        }
      }

      const percent =
        normalizedCommissionsMap[categoryKey] !== undefined
          ? normalizedCommissionsMap[categoryKey]
          : defaultPercent;

      const commission = (discountedVolume * percent) / 100;

      if (!prodDisplayNamesMap[categoryKey]) {
        prodDisplayNamesMap[categoryKey] = categoryName.trim();
      }
      const displayName = prodDisplayNamesMap[categoryKey];

      if (!productionBreakdown[displayName]) {
        productionBreakdown[displayName] = {
          volume: 0,
          commission: 0,
          percent,
        };
      }
      productionBreakdown[displayName].volume += originalVolume;
      productionBreakdown[displayName].commission += commission;
      totalProductionCommission += commission;
    });

    // 3. Penalties — broken down by type for clearer analysis
    const userViolations = await this.violationRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
        payrollReleaseId: includeReleased ? undefined : IsNull(),
      },
    });

    // Separate by violation type
    const penaltiesIdle = userViolations
      .filter(v => v.type === 'IDLE_TIMEOUT')
      .reduce((sum, v) => sum + +v.penaltyAmount, 0);
    const penaltiesLate = userViolations
      .filter(v => v.type === 'LATE_LOGIN')
      .reduce((sum, v) => sum + +v.penaltyAmount, 0);
    const penaltiesManual = userViolations
      .filter(v => v.type === 'MANUAL_PENALTY')
      .reduce((sum, v) => sum + +v.penaltyAmount, 0);
    const totalPenalties = penaltiesIdle + penaltiesLate + penaltiesManual;

    // Violation detail list for the ledger
    const penaltyBreakdown = userViolations.map(v => ({
      id: v.id,
      type: v.type,
      description: v.description,
      penaltyAmount: +v.penaltyAmount,
      durationMinutes: v.durationMinutes,
      createdAt: v.createdAt,
    }));

    // 3b. Overtime Pay
    const attendances = await this.attendanceRepository.find({
      where: {
        userId,
        date: Between(startDate as any, endDate as any),
        isApproved: true,
        payrollReleaseId: includeReleased ? undefined : IsNull(),
      },
    });
    const totalOvertimeMinutes = attendances.reduce(
      (sum, a) => sum + (a.overtimeMinutes || 0),
      0,
    );
    const totalOvertimePay = (totalOvertimeMinutes / 60) * +config.overtimeRate;

    // Late attendance stats
    const lateAttendanceCount = attendances.filter(a => a.status === 'LATE').length;
    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const alphaCount = attendances.filter(a => a.status === 'ALPHA').length;

    // 4. Counts & Stats
    const sessions = await this.transactionRepository.count({
      where: [
        { commissionUserId: userId, createdAt: Between(startDate, endDate) },
        {
          commissionUserId: IsNull(),
          createdByUserId: userId,
          createdAt: Between(startDate, endDate),
        },
      ],
    });

    const activeDaysResult = await this.statusLogRepository
      .createQueryBuilder('log')
      .select('DISTINCT(DATE(log.startedAt))', 'date')
      .where('log.userId = :userId', { userId })
      .andWhere('log.startedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('log.status = :status', { status: UserStatus.ACTIVE })
      .getRawMany();

    const totalItems = salesItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );
    const totalCompletedItems = productionItems.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );

    // basicSalary is already defined and calculated above
    const total =
      basicSalary +
      totalServiceCommission +
      totalSalesCommission +
      totalProductionCommission +
      totalOvertimePay -
      totalPenalties;

    return {
      basicSalary,
      commissionService: totalServiceCommission,
      commissionSales: totalSalesCommission,
      commissionProduction: totalProductionCommission,
      salesBreakdown: categoryBreakdown,
      productionBreakdown: productionBreakdown,
      // ── Penalties (broken down) ──────────────────────────────────────────────
      penalties: totalPenalties,
      penaltiesIdle,             // Denda meninggalkan halaman (IDLE_TIMEOUT)
      penaltiesLate,             // Denda keterlambatan absen (LATE_LOGIN)
      penaltiesManual,           // Denda manual admin (MANUAL_PENALTY)
      penaltyBreakdown,          // List detail semua pelanggaran
      // ── Overtime ─────────────────────────────────────────────────────────────
      overtimePay: totalOvertimePay,
      // ── Attendance Stats ──────────────────────────────────────────────────────
      attendancePresent: presentCount,
      attendanceLate: lateAttendanceCount,
      attendanceAlpha: alphaCount,
      // ── Config Rates ──────────────────────────────────────────────────────────
      basicSalaryRate: basicSalary,
      overtimeRate: +config.overtimeRate,
      commissionServiceRate: +config.commissionService,
      commissionSalesPercent: +config.commissionSalesPercent,
      penaltyIdle: +config.penaltyIdle,
      penaltyLateRate: +config.penaltyLate,
      idleThreshold: config.idleThreshold,
      categoryCommissions: config.categoryCommissions,
      // ── Counts ────────────────────────────────────────────────────────────────
      totalSessions: sessions,
      totalItems,
      activeDays: activeDaysResult.length,
      total:
        basicSalary +
        totalServiceCommission +
        totalSalesCommission +
        totalProductionCommission +
        totalOvertimePay -
        totalPenalties,
      month,
      year,
      pin: user.pin,
      rfid: user.rfid,
      phone: user.phone,
      id: user.id,
      name: user.name,
      role: user.role?.name || 'Employee',
      isReleased,
    };
  }

  async releaseSalary(
    userId: number,
    month: number,
    year: number,
    releasedByUserId: number,
  ) {
    // 0. Prevent duplicate release for the same period
    const existing = await this.payrollReleaseRepository.findOne({
      where: { userId, month, year },
    });
    if (existing) {
      throw new ConflictException(
        `Gaji untuk periode ${month}/${year} sudah pernah diselesaikan & diarsipkan.`,
      );
    }

    const summary = await this.calculateMonthlyPayroll(userId, month, year);
    if (!summary) throw new NotFoundException('Payroll summary not found');

    return this.userRepository.manager.transaction(async (manager) => {
      // 1. Create Release Record
      const release = manager.create(PayrollRelease, {
        userId,
        month,
        year,
        basicSalary: summary.basicSalary,
        commissionService: summary.commissionService,
        commissionSales: summary.commissionSales,
        commissionProduction: summary.commissionProduction,
        penalties: summary.penalties,
        totalPayout: summary.total,
        details: summary,
        releasedAt: new Date(),
        releasedByUserId,
      });
      const savedRelease = await manager.save(PayrollRelease, release);

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // 2. Tag Items as Released
      // OrderItems (Sales/Waiter share)
      await manager
        .createQueryBuilder()
        .update(OrderItem)
        .set({ payrollReleaseId: savedRelease.id })
        .where('payrollReleaseId IS NULL')
        .andWhere(
          '(commissionUserId = :userId OR (commissionUserId IS NULL AND createdByUserId = :userId))',
          { userId },
        )
        .execute();

      // OrderItems (Production share)
      await manager
        .createQueryBuilder()
        .update(OrderItem)
        .set({ payrollReleaseId: savedRelease.id })
        .where('payrollReleaseId IS NULL')
        .andWhere('completedByUserId = :userId', { userId })
        .execute();

      // Transactions (Billiard/Service share)
      await manager
        .createQueryBuilder()
        .update(Transaction)
        .set({ payrollReleaseId: savedRelease.id })
        .where('payrollReleaseId IS NULL')
        .andWhere(
          '(commissionUserId = :userId OR (commissionUserId IS NULL AND createdByUserId = :userId))',
          { userId },
        )
        .execute();

      // 4. Violations (Deductions reset)
      await manager
        .createQueryBuilder()
        .update(Violation)
        .set({ payrollReleaseId: savedRelease.id })
        .where('payrollReleaseId IS NULL')
        .andWhere('userId = :userId', { userId })
        .execute();

      // 5. Attendance (Overtime reset)
      await manager
        .createQueryBuilder()
        .update(Attendance)
        .set({ payrollReleaseId: savedRelease.id })
        .where('payrollReleaseId IS NULL')
        .andWhere('userId = :userId', { userId })
        .execute();

      // Notify real-time
      this.eventsGateway.server.emit('payrollReleased', {
        userId,
        month,
        year,
      });
      return savedRelease;
    });
  }

  async calculateBulkPayroll(
    month: number,
    year: number,
    start?: string,
    end?: string,
    includeReleased: boolean = false,
  ) {
    const users = await this.userRepository.find();
    const results: Record<number, any> = {};
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;

    await Promise.all(
      users.map(async (u) => {
        results[u.id] = await this.calculateMonthlyPayroll(
          u.id,
          month,
          year,
          startDate,
          endDate,
          includeReleased,
        );
      }),
    );
    return results;
  }

  async forceLogout(userId: number, message?: string) {
    this.eventsGateway.forceLogout(userId, message);
    return { message: 'Force logout signal sent' };
  }

  async findAllViolations() {
    return this.violationRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async findUserViolations(userId: number) {
    return this.violationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getDetailedPayrollReport(userId: number, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Status Logs
    const statusLogs = await this.statusLogRepository.find({
      where: {
        user: { id: userId } as any,
        startedAt: Between(startDate, endDate),
      },
      order: { startedAt: 'DESC' },
    });

    // 2. Sales Ledger (Include broader statuses for real-time view)
    const salesItems = await this.orderItemRepository
      .createQueryBuilder('oi')
      .leftJoinAndSelect('oi.menuItem', 'mi')
      .leftJoinAndSelect('mi.category', 'cat')
      .leftJoinAndSelect('oi.transaction', 't')
      .leftJoinAndSelect('t.table', 'table')
      .leftJoinAndSelect('t.cafeTable', 'ct')
      .where(
        '(oi.commissionUserId = :userId OR (oi.commissionUserId IS NULL AND oi.createdByUserId = :userId))',
        { userId },
      )
      .andWhere('oi.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('oi.status IN (:...statuses)', {
        statuses: [
          OrderItemStatus.DONE,
          OrderItemStatus.QUEUED,
          OrderItemStatus.PROCESSING,
        ],
      })
      .andWhere('(oi.isPaid = true OR t.status != :cancelledStatus)', {
        cancelledStatus: TransactionStatus.CANCELLED,
      })
      .orderBy('oi.createdAt', 'DESC')
      .getMany();

    // 3. Penalty Ledger
    const violations = await this.violationRepository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });

    // 4. Production Ledger (Completed Items)
    const productionItems = await this.orderItemRepository
      .createQueryBuilder('oi')
      .leftJoinAndSelect('oi.menuItem', 'mi')
      .leftJoinAndSelect('mi.category', 'cat')
      .leftJoinAndSelect('oi.transaction', 't')
      .leftJoinAndSelect('t.table', 'table')
      .leftJoinAndSelect('t.cafeTable', 'ct')
      .where('oi.completedByUserId = :userId', { userId })
      .andWhere('oi.completedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('oi.status = :status', { status: OrderItemStatus.DONE })
      .andWhere('(oi.isPaid = true OR t.status != :cancelledStatus)', {
        cancelledStatus: TransactionStatus.CANCELLED,
      })
      .orderBy('oi.completedAt', 'DESC')
      .getMany();

    // 5. Fetch Payroll Config for Percentage mapping
    const config = await this.payrollRepository.findOne({
      where: { user: { id: userId } } as any,
    });
    const commMap = config?.categoryCommissions || {};

    // Normalize commMap keys to Uppercase for matching
    const normalizedCommMap: Record<string, number> = {};
    Object.entries(commMap).forEach(([cat, val]) => {
      normalizedCommMap[cat.trim().toUpperCase()] = val;
    });

    const defaultPercent = config?.commissionSalesPercent || 0;

    // 6. Daily Summary Aggregation
    const dailySummary: Record<
      string,
      { active: number; away: number; offline: number }
    > = {};
    statusLogs.forEach((log) => {
      const date = new Date(log.startedAt).toISOString().split('T')[0];
      if (!dailySummary[date])
        dailySummary[date] = { active: 0, away: 0, offline: 0 };

      const duration = log.durationSeconds || 0;
      if (log.status === UserStatus.ACTIVE)
        dailySummary[date].active += duration;
      else if (log.status === UserStatus.AWAY)
        dailySummary[date].away += duration;
      else dailySummary[date].offline += duration;
    });

    return {
      statusLogs,
      dailySummary: Object.entries(dailySummary).map(([date, stats]) => ({
        date,
        ...stats,
      })),
      salesLedger: salesItems.map((item) => {
        const rawCat = item.menuItem?.category;
        const categoryName =
          (typeof rawCat === 'object' ? rawCat?.name : rawCat) ||
          'Uncategorized';
        const catKey = categoryName.trim().toUpperCase();
        const percent =
          normalizedCommMap[catKey] !== undefined
            ? normalizedCommMap[catKey]
            : defaultPercent;
        const originalVolume = +item.priceAtOrder * item.quantity;
        const itemDiscount = Number(item.discountAmount || 0);
        let discountedVolume = originalVolume - itemDiscount;

        if (itemDiscount === 0) {
          const tx = item.transaction;
          if (tx && Number(tx.discountAmount || 0) > 0) {
            const billTotal = Number(tx.billiardTotal || 0);
            const cafeTotal = Number(tx.cafeTotal || 0);
            const totalBeforeDisc = billTotal + cafeTotal;
            if (totalBeforeDisc > 0) {
              const discRatio = Number(tx.discountAmount) / totalBeforeDisc;
              discountedVolume = originalVolume * (1 - discRatio);
            }
          }
        }

        return {
          id: item.id,
          itemName: item.menuItem?.name || item.customName || 'Unknown',
          category: categoryName,
          quantity: item.quantity,
          price: +item.priceAtOrder,
          total: originalVolume,
          commissionPercent: percent,
          commissionAmount: (discountedVolume * percent) / 100,
          tableName:
            item.transaction?.table?.tableName ||
            item.transaction?.cafeTable?.tableName ||
            'Walk-in',
          invoiceNumber: item.transaction?.invoiceNumber,
          createdAt: item.createdAt,
          status: item.status,
        };
      }),
      productionLedger: productionItems.map((item) => {
        const rawCat = item.menuItem?.category;
        const categoryName =
          (typeof rawCat === 'object' ? rawCat?.name : rawCat) ||
          'Uncategorized';
        const catKey = categoryName.trim().toUpperCase();
        const percent =
          normalizedCommMap[catKey] !== undefined
            ? normalizedCommMap[catKey]
            : defaultPercent;
        return {
          id: item.id,
          itemName: item.menuItem?.name || item.customName || 'Unknown',
          category: categoryName,
          quantity: item.quantity,
          price: +item.priceAtOrder,
          total: +item.priceAtOrder * item.quantity,
          commissionPercent: percent,
          commissionAmount:
            (+item.priceAtOrder * item.quantity * percent) / 100,
          tableName:
            item.transaction?.table?.tableName ||
            item.transaction?.cafeTable?.tableName ||
            'Walk-in',
          invoiceNumber: item.transaction?.invoiceNumber,
          createdAt: item.completedAt,
        };
      }),
      penaltyLedger: violations.map(v => ({
        ...v,
        penaltyAmount: Number(v.penaltyAmount || 0)
      })),
    };
  }

  async getMonitoringSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    // OPTIMIZED: Use single aggregated query instead of N+1
    const users = await this.userRepository.find({ relations: ['role'] });

    // Batch fetch all status logs for all users in one query
    const logsData = await this.statusLogRepository
      .createQueryBuilder('log')
      .select('log.userId')
      .addSelect('SUM(log.durationSeconds)', 'totalDuration')
      .where('log.startedAt >= :today', { today })
      .andWhere('log.startedAt <= :tomorrow', { tomorrow })
      .andWhere('log.status = :status', { status: UserStatus.ACTIVE })
      .groupBy('log.userId')
      .getRawMany();

    // Build lookup map
    const durationMap = new Map<number, number>();
    logsData.forEach((d) => {
      durationMap.set(d.log_userId, Number(d.totalDuration || 0));
    });

    const summary = users.map((user) => {
      const activeSeconds = durationMap.get(user.id) || 0;
      return {
        userId: user.id,
        name: user.name,
        status: user.status,
        currentActivePage: user.currentActivePage,
        activeSeconds,
        activeHours: (activeSeconds / 3600).toFixed(2),
      };
    });

    return summary;
  }

  async hasActiveShift(userId: number): Promise<boolean> {
    const count = await this.userRepository.manager
      .createQueryBuilder()
      .select('id')
      .from('shifts', 's')
      .where('s.userId = :userId AND s.status = :status', {
        userId,
        status: 'OPEN',
      })
      .getCount();
    return count > 0;
  }

  async getPayrollHistory() {
    return this.payrollReleaseRepository.find({
      relations: ['user'],
      order: { releasedAt: 'DESC' },
    });
  }

  async getReleaseById(id: number) {
    return this.payrollReleaseRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  // ─────────────────────────────────────────────────────────
  // BULK IMPORT: Import Karyawan & Role Matrix dari Excel
  // ─────────────────────────────────────────────────────────
  async importFromExcel(buffer: Buffer): Promise<{ stats: { roles: number; employees: number } }> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const stats = { roles: 0, employees: 0 };

    try {
      // ── Sheet 1: Role Matrix ──────────────────────────────
      const roleSheetName = workbook.SheetNames.find((n) =>
        n.toLowerCase().includes('role'),
      ) || workbook.SheetNames[0];

      if (roleSheetName) {
        const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[roleSheetName]);
        for (const row of rows) {
          const name = (row['Nama Role'] || row['Nama'] || '').toString().trim().toUpperCase();
          if (!name) continue;

          const permissions = (row['Permissions'] || '')
            .toString()
            .split(',')
            .map((p: string) => p.trim())
            .filter(Boolean);

          const approvalLevel = Number(row['Level Approval']) || 1;
          const description = (row['Deskripsi'] || '').toString().trim();

          let role = await queryRunner.manager.findOne(Role, { where: { name } });
          if (!role) {
            role = queryRunner.manager.create(Role, {
              name,
              permissions,
              approvalLevel,
              description,
            });
          } else {
            role.permissions = permissions.length ? permissions : role.permissions;
            role.approvalLevel = approvalLevel || role.approvalLevel;
            role.description = description || role.description;
          }
          await queryRunner.manager.save(Role, role);
          stats.roles++;
        }
      }

      // ── Sheet 2: Karyawan ────────────────────────────────
      const empSheetName = workbook.SheetNames.find((n) =>
        n.toLowerCase().includes('karyawan') || n.toLowerCase().includes('emp'),
      ) || workbook.SheetNames[1];

      if (empSheetName) {
        const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[empSheetName]);
        for (const row of rows) {
          const username = (row['Username'] || '').toString().trim().toLowerCase();
          if (!username) continue;

          const name = (row['Nama Lengkap'] || row['Nama'] || username).toString().trim();
          const rawPassword = (row['Password'] || '').toString().trim();
          const roleName = (row['Role'] || 'KASIR').toString().trim().toUpperCase();
          const pin = (row['PIN'] || '').toString().trim();
          const rfid = (row['RFID'] || '').toString().trim() || null;
          const phone = (row['Telepon'] || '').toString().trim();
          const email = (row['Email'] || '').toString().trim() || null;
          const jobTitle = (row['Jabatan'] || '').toString().trim();
          const baseShift = (row['Shift'] || 'SHIFT 1').toString().trim().toUpperCase();
          const gender = (row['Jenis Kelamin'] || '').toString().trim();
          const address = (row['Alamat'] || '').toString().trim();
          const securityMode = (row['Mode Keamanan'] || 'HYBRID').toString().trim().toUpperCase() as any;
          const joinedAt = (row['Tanggal Bergabung'] || '').toString().trim();

          // Resolve role
          let role = await queryRunner.manager.findOne(Role, { where: { name: roleName } });
          if (!role) {
            // Create a basic role if not found
            role = queryRunner.manager.create(Role, {
              name: roleName,
              permissions: [],
              approvalLevel: 1,
            });
            await queryRunner.manager.save(Role, role);
          }

          let user = await queryRunner.manager.findOne(User, { where: { username } });
          if (!user) {
            // New employee — set password from Excel or default to username
            const passwordToHash = rawPassword || username;
            const hashedPassword = await bcrypt.hash(passwordToHash, 10);
            user = queryRunner.manager.create(User, {
              username,
              name,
              password: hashedPassword,
              pin: pin || null,
              rfid: rfid || null,
              phone: phone || null,
              email: email || null,
              jobTitle: jobTitle || null,
              baseShift: baseShift || 'SHIFT 1',
              gender: gender || null,
              address: address || null,
              securityMode,
              role,
              joinedAt: joinedAt || null,
              status: UserStatus.OFFLINE,
              isVerified: true,
            });
          } else {
            // Update existing
            if (rawPassword) {
              user.password = await bcrypt.hash(rawPassword, 10);
            }
            if (name) user.name = name;
            if (pin) user.pin = pin;
            if (rfid) user.rfid = rfid;
            if (phone) user.phone = phone;
            if (email) user.email = email;
            if (jobTitle) user.jobTitle = jobTitle;
            if (baseShift) user.baseShift = baseShift;
            if (gender) user.gender = gender;
            if (address) user.address = address;
            if (securityMode) user.securityMode = securityMode;
            if (joinedAt) user.joinedAt = joinedAt;
            user.role = role;
          }

          await queryRunner.manager.save(User, user);
          stats.employees++;
        }
      }

      await queryRunner.commitTransaction();
      return { stats };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('importFromExcel failed', err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
