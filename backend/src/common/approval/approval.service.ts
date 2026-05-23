import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import {
  ApprovalRequest,
  ApprovalHistory,
  ApprovalModuleType,
  ApprovalStatus,
} from '../entities/approval.entity';
import { User } from '../../user/entities/user.entity';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepo: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalHistory)
    private readonly historyRepo: Repository<ApprovalHistory>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRequest(data: {
    moduleType: ApprovalModuleType;
    referenceId: number;
    requestedByUserId: number;
    requiredLevels: number[];
    metadata?: any;
  }): Promise<ApprovalRequest> {
    const allExisting = await this.approvalRepo.find({
      where: {
        moduleType: data.moduleType,
        referenceId: data.referenceId,
        status: ApprovalStatus.PENDING,
      },
    });

    const existing = allExisting.find((req) => {
      if (req.metadata && data.metadata && data.metadata.entityType) {
        try {
          const parsed = typeof req.metadata === 'string' ? JSON.parse(req.metadata) : req.metadata;
          return parsed.entityType === data.metadata.entityType;
        } catch(e) {
          return false;
        }
      }
      return true;
    });

    if (existing) {
      // If it's a DATA_EDIT, we might want to update the metadata/changes instead of blocking,
      // but for now, to stop the spam, we just return the existing one.
      return existing;
    }

    const request = this.approvalRepo.create({
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      currentLevelIndex: 0,
      status: ApprovalStatus.PENDING,
    });

    const saved = await this.approvalRepo.save(request);
    
    this.eventEmitter.emit('approval.created', {
      ...saved,
      metadata: saved.metadata ? JSON.parse(saved.metadata) : undefined,
    });

    return saved;
  }

  async processApproval(
    requestId: number,
    userId: number,
    action: 'APPROVE' | 'REJECT',
    note?: string,
    isBypass?: boolean,
  ): Promise<ApprovalRequest> {
    return this.dataSource.manager.transaction(async (manager) => {
      const request = await manager.findOne(ApprovalRequest, {
        where: { id: requestId },
        relations: ['requestedBy'],
      });

      if (!request) throw new NotFoundException('Approval request not found');
      if (request.status !== ApprovalStatus.PENDING) {
        throw new ForbiddenException('Request is already finalized');
      }

      const user = await manager.findOne(User, {
        where: { id: userId },
        relations: ['role'],
      });

      if (!user) throw new NotFoundException('User not found');

      const requiredLevel = request.requiredLevels[request.currentLevelIndex];
      const userLevel = user.role?.approvalLevel || 0;
      const userPermissions = user.role?.permissions || [];

      // 1. Get current system max level dynamically
      const maxRole = await manager.createQueryBuilder('roles', 'role')
        .select('MAX(role.approvalLevel)', 'max')
        .getRawOne();
      const maxLevel = parseInt(maxRole?.max || '0', 10);

      // Super is either the absolute highest level, has the explicit OVERRIDE permission, OR is the 'PENGAWAS' role
      const isSuper = (userLevel === maxLevel && maxLevel > 0) || 
                      userPermissions.includes('APPROVAL_OVERRIDE') ||
                      user.role?.name?.toUpperCase() === 'PENGAWAS';

      // 2. Strict sequential check:
      // - If not super, userLevel MUST match requiredLevel
      // - If super, they can act as any level (hierarchical override)
      if (!isSuper && userLevel !== requiredLevel) {
        throw new ForbiddenException(
          `Hanya Level ${requiredLevel} yang dapat menyetujui tahap ini. Level Anda (${userLevel}) harus menunggu giliran.`,
        );
      }

      // 3. Finalization logic:
      // - IF isBypass is true (from Bypass endpoint), finalize immediately
      // - ELSE if it is the LAST step in requiredLevels, finalize
      const isFinalizer = action === 'APPROVE' && (isBypass || request.currentLevelIndex === request.requiredLevels.length - 1);

      // Record history
      const history = manager.create(ApprovalHistory, {
        approvalRequestId: request.id,
        userId: user.id,
        level: requiredLevel,
        action: action === 'REJECT' ? 'REJECT' : (isBypass ? 'BYPASS' : (isFinalizer ? 'APPROVE' : 'VERIFY')),
        note: isBypass ? `[BYPASS] ${note || ''}` : note,
      });
      await manager.save(ApprovalHistory, history);

      if (action === 'REJECT') {
        request.status = ApprovalStatus.REJECTED;
      } else {
        if (isFinalizer) {
          request.status = ApprovalStatus.APPROVED;
          request.currentLevelIndex = request.requiredLevels.length - 1;
        } else {
          request.currentLevelIndex++;
        }
      }

      const updated = await manager.save(ApprovalRequest, request);

      if (updated.status === ApprovalStatus.APPROVED || updated.status === ApprovalStatus.REJECTED) {
        this.eventEmitter.emit('approval.finalized', {
          moduleType: updated.moduleType,
          referenceId: updated.referenceId,
          requestId: updated.id,
          requestedByUserId: updated.requestedByUserId,
          status: updated.status,
          metadata: updated.metadata ? JSON.parse(updated.metadata) : undefined,
        });
      }

      return updated;
    });
  }

  async syncPendingRequestsWithNewConfig(approvalConfig: Record<string, number[]>): Promise<void> {
    const pendingRequests = await this.approvalRepo.find({
      where: { status: ApprovalStatus.PENDING },
      relations: ['history'],
    });

    for (const request of pendingRequests) {
      const newRequiredLevels = approvalConfig[request.moduleType] || [];
      const sortedNewLevels = [...newRequiredLevels].sort((a, b) => a - b);
      
      // Get levels already approved/verified in history
      const approvedLevels = new Set(
        request.history
          .filter(h => ['APPROVE', 'VERIFY', 'BYPASS'].includes(h.action))
          .map(h => h.level)
      );

      request.requiredLevels = sortedNewLevels;

      if (sortedNewLevels.length === 0) {
        // No approval required anymore
        request.status = ApprovalStatus.APPROVED;
        request.currentLevelIndex = 0;
      } else {
        // Find first level in the new config that hasn't been approved
        const nextIndex = sortedNewLevels.findIndex(lvl => !approvedLevels.has(lvl));
        
        if (nextIndex === -1) {
          // All required levels are already met
          request.status = ApprovalStatus.APPROVED;
          request.currentLevelIndex = sortedNewLevels.length - 1;
        } else {
          request.currentLevelIndex = nextIndex;
          request.status = ApprovalStatus.PENDING;
        }
      }

      const updated = await this.approvalRepo.save(request);

      if (updated.status === ApprovalStatus.APPROVED) {
        this.eventEmitter.emit('approval.finalized', {
          moduleType: updated.moduleType,
          referenceId: updated.referenceId,
          requestId: updated.id,
          requestedByUserId: updated.requestedByUserId,
          status: updated.status,
          metadata: updated.metadata ? JSON.parse(updated.metadata) : undefined,
        });
      }
    }
  }

  async countPending(userLevel: number): Promise<number> {
    const pending = await this.getPendingRequests(userLevel);
    return pending.length;
  }

  async getStats(userId: number, userLevel: number): Promise<any> {
    const [stats, allFinalized] = await Promise.all([
      this.approvalRepo
        .createQueryBuilder('request')
        .select('request.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('request.status')
        .getRawMany(),
      this.approvalRepo.find({
        where: [
          { status: ApprovalStatus.APPROVED },
          { status: ApprovalStatus.REJECTED },
        ],
        relations: ['history'],
      }),
    ]);

    const result: any = {
      pending: 0,
      approved: 0,
      rejected: 0,
      myActions: 0,
    };

    stats.forEach((s) => {
      if (s.status === ApprovalStatus.PENDING) result.pending = parseInt(s.count);
      if (s.status === ApprovalStatus.APPROVED) result.approved = parseInt(s.count);
      if (s.status === ApprovalStatus.REJECTED) result.rejected = parseInt(s.count);
    });

    // Count actions by specific user in history
    result.myActions = allFinalized.filter((req) =>
      req.history?.some((h) => h.userId === userId),
    ).length;

    // However, the "pending" count in the dashboard should only show what the user CAN actually approve
    const accessiblePending = await this.getPendingRequests(userLevel);
    result.pending = accessiblePending.length;

    // Add maxLevel to help UI determine if "Super User" override applies
    const maxRole = await this.approvalRepo.manager.createQueryBuilder('roles', 'role')
      .select('MAX(role.approvalLevel)', 'max')
      .getRawOne();
    result.maxLevel = parseInt(maxRole?.max || '0', 10);

    return result;
  }

  async getPendingRequests(userLevel: number): Promise<ApprovalRequest[]> {
    // Find requests where the current required level <= userLevel
    const allPending = await this.approvalRepo.find({
      where: { status: ApprovalStatus.PENDING },
      relations: ['requestedBy', 'history', 'history.user'],
      order: { createdAt: 'DESC' },
    });

    return allPending
      .filter((req) => {
        const neededLevel = req.requiredLevels[req.currentLevelIndex];
        return userLevel >= neededLevel;
      })
      .map((req) => this.parseMetadata(req));
  }

  async getAllPendingRequests(): Promise<ApprovalRequest[]> {
    const allPending = await this.approvalRepo.find({
      where: { status: ApprovalStatus.PENDING },
      relations: ['requestedBy'],
      order: { createdAt: 'DESC' },
    });
    return allPending.map(req => this.parseMetadata(req));
  }

  async getRequestsByStatus(
    status: string,
    userLevel: number,
    filters?: { moduleType?: string; startDate?: string; endDate?: string },
  ): Promise<ApprovalRequest[]> {
    if (status === 'PENDING') {
      const pending = await this.getPendingRequests(userLevel);
      // Only apply module filters for PENDING status, ignore date filters
      // to ensure tasks from previous days are always visible for action
      return this.applyClientFilters(pending, { moduleType: filters?.moduleType });
    }

    const where: any = { status: status as ApprovalStatus };
    if (filters?.moduleType) where.moduleType = filters.moduleType;

    const start = filters?.startDate ? new Date(filters.startDate) : null;
    const end = filters?.endDate ? new Date(filters.endDate) : null;
    if (start && end) where.updatedAt = Between(start, end);
    else if (start) where.updatedAt = MoreThanOrEqual(start);
    else if (end) where.updatedAt = LessThanOrEqual(end);

    const requests = await this.approvalRepo.find({
      where,
      relations: ['requestedBy', 'history', 'history.user'],
      order: { updatedAt: 'DESC' },
    });

    return requests.map((req) => this.parseMetadata(req));
  }

  private applyClientFilters(items: any[], filters?: { moduleType?: string; startDate?: string; endDate?: string }) {
    if (!filters) return items;
    let result = items;
    if (filters.moduleType) result = result.filter(r => r.moduleType === filters.moduleType);
    if (filters.startDate) result = result.filter(r => new Date(r.createdAt) >= new Date(filters.startDate!));
    if (filters.endDate) result = result.filter(r => new Date(r.createdAt) <= new Date(filters.endDate!));
    return result;
  }

  async getRequestById(id: number): Promise<ApprovalRequest> {
    const req = await this.approvalRepo.findOne({
      where: { id },
      relations: ['requestedBy', 'history', 'history.user'],
    });
    if (!req) throw new NotFoundException('Request not found');
    return this.parseMetadata(req);
  }

  private parseMetadata(req: ApprovalRequest): any {
    const rawReq = { ...req } as any;
    if (rawReq.metadata && typeof rawReq.metadata === 'string') {
      try {
        rawReq.metadata = JSON.parse(rawReq.metadata);
      } catch (e) {
        // ignore
      }
    }
    rawReq.currentLevel = req.requiredLevels?.[req.currentLevelIndex] || 0;
    rawReq.nextRequiredLevel = rawReq.currentLevel;
    return rawReq;
  }
}
