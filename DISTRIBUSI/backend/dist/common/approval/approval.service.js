"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ApprovalService", {
    enumerable: true,
    get: function() {
        return ApprovalService;
    }
});
const _common = require("@nestjs/common");
const _eventemitter = require("@nestjs/event-emitter");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _approvalentity = require("../entities/approval.entity");
const _userentity = require("../../user/entities/user.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let ApprovalService = class ApprovalService {
    async createRequest(data) {
        // Check for existing pending request for the same reference and module
        const existing = await this.approvalRepo.findOne({
            where: {
                moduleType: data.moduleType,
                referenceId: data.referenceId,
                status: _approvalentity.ApprovalStatus.PENDING
            }
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
            status: _approvalentity.ApprovalStatus.PENDING
        });
        const saved = await this.approvalRepo.save(request);
        this.eventEmitter.emit('approval.created', {
            ...saved,
            metadata: saved.metadata ? JSON.parse(saved.metadata) : undefined
        });
        return saved;
    }
    async processApproval(requestId, userId, action, note, isBypass) {
        return this.dataSource.manager.transaction(async (manager)=>{
            const request = await manager.findOne(_approvalentity.ApprovalRequest, {
                where: {
                    id: requestId
                },
                relations: [
                    'requestedBy'
                ]
            });
            if (!request) throw new _common.NotFoundException('Approval request not found');
            if (request.status !== _approvalentity.ApprovalStatus.PENDING) {
                throw new _common.ForbiddenException('Request is already finalized');
            }
            const user = await manager.findOne(_userentity.User, {
                where: {
                    id: userId
                },
                relations: [
                    'role'
                ]
            });
            if (!user) throw new _common.NotFoundException('User not found');
            const requiredLevel = request.requiredLevels[request.currentLevelIndex];
            const userLevel = user.role?.approvalLevel || 0;
            const userPermissions = user.role?.permissions || [];
            // 1. Get current system max level dynamically
            const maxRole = await manager.createQueryBuilder('roles', 'role').select('MAX(role.approvalLevel)', 'max').getRawOne();
            const maxLevel = parseInt(maxRole?.max || '0', 10);
            // Super is either the absolute highest level, has the explicit OVERRIDE permission, OR is the 'PENGAWAS' role
            const isSuper = userLevel === maxLevel && maxLevel > 0 || userPermissions.includes('APPROVAL_OVERRIDE') || user.role?.name?.toUpperCase() === 'PENGAWAS';
            // 2. Strict sequential check:
            // - If not super, userLevel MUST match requiredLevel
            // - If super, they can act as any level (hierarchical override)
            if (!isSuper && userLevel !== requiredLevel) {
                throw new _common.ForbiddenException(`Hanya Level ${requiredLevel} yang dapat menyetujui tahap ini. Level Anda (${userLevel}) harus menunggu giliran.`);
            }
            // 3. Finalization logic:
            // - IF isBypass is true (from Bypass endpoint), finalize immediately
            // - ELSE if it is the LAST step in requiredLevels, finalize
            const isFinalizer = action === 'APPROVE' && (isBypass || request.currentLevelIndex === request.requiredLevels.length - 1);
            // Record history
            const history = manager.create(_approvalentity.ApprovalHistory, {
                approvalRequestId: request.id,
                userId: user.id,
                level: requiredLevel,
                action: action === 'REJECT' ? 'REJECT' : isBypass ? 'BYPASS' : isFinalizer ? 'APPROVE' : 'VERIFY',
                note: isBypass ? `[BYPASS] ${note || ''}` : note
            });
            await manager.save(_approvalentity.ApprovalHistory, history);
            if (action === 'REJECT') {
                request.status = _approvalentity.ApprovalStatus.REJECTED;
            } else {
                if (isFinalizer) {
                    request.status = _approvalentity.ApprovalStatus.APPROVED;
                    request.currentLevelIndex = request.requiredLevels.length - 1;
                } else {
                    request.currentLevelIndex++;
                }
            }
            const updated = await manager.save(_approvalentity.ApprovalRequest, request);
            if (updated.status === _approvalentity.ApprovalStatus.APPROVED || updated.status === _approvalentity.ApprovalStatus.REJECTED) {
                this.eventEmitter.emit('approval.finalized', {
                    moduleType: updated.moduleType,
                    referenceId: updated.referenceId,
                    requestId: updated.id,
                    requestedByUserId: updated.requestedByUserId,
                    status: updated.status,
                    metadata: updated.metadata ? JSON.parse(updated.metadata) : undefined
                });
            }
            return updated;
        });
    }
    async syncPendingRequestsWithNewConfig(approvalConfig) {
        const pendingRequests = await this.approvalRepo.find({
            where: {
                status: _approvalentity.ApprovalStatus.PENDING
            },
            relations: [
                'history'
            ]
        });
        for (const request of pendingRequests){
            const newRequiredLevels = approvalConfig[request.moduleType] || [];
            const sortedNewLevels = [
                ...newRequiredLevels
            ].sort((a, b)=>a - b);
            // Get levels already approved/verified in history
            const approvedLevels = new Set(request.history.filter((h)=>[
                    'APPROVE',
                    'VERIFY',
                    'BYPASS'
                ].includes(h.action)).map((h)=>h.level));
            request.requiredLevels = sortedNewLevels;
            if (sortedNewLevels.length === 0) {
                // No approval required anymore
                request.status = _approvalentity.ApprovalStatus.APPROVED;
                request.currentLevelIndex = 0;
            } else {
                // Find first level in the new config that hasn't been approved
                const nextIndex = sortedNewLevels.findIndex((lvl)=>!approvedLevels.has(lvl));
                if (nextIndex === -1) {
                    // All required levels are already met
                    request.status = _approvalentity.ApprovalStatus.APPROVED;
                    request.currentLevelIndex = sortedNewLevels.length - 1;
                } else {
                    request.currentLevelIndex = nextIndex;
                    request.status = _approvalentity.ApprovalStatus.PENDING;
                }
            }
            const updated = await this.approvalRepo.save(request);
            if (updated.status === _approvalentity.ApprovalStatus.APPROVED) {
                this.eventEmitter.emit('approval.finalized', {
                    moduleType: updated.moduleType,
                    referenceId: updated.referenceId,
                    requestId: updated.id,
                    requestedByUserId: updated.requestedByUserId,
                    status: updated.status,
                    metadata: updated.metadata ? JSON.parse(updated.metadata) : undefined
                });
            }
        }
    }
    async countPending(userLevel) {
        const pending = await this.getPendingRequests(userLevel);
        return pending.length;
    }
    async getStats(userId, userLevel) {
        const [stats, allFinalized] = await Promise.all([
            this.approvalRepo.createQueryBuilder('request').select('request.status', 'status').addSelect('COUNT(*)', 'count').groupBy('request.status').getRawMany(),
            this.approvalRepo.find({
                where: [
                    {
                        status: _approvalentity.ApprovalStatus.APPROVED
                    },
                    {
                        status: _approvalentity.ApprovalStatus.REJECTED
                    }
                ],
                relations: [
                    'history'
                ]
            })
        ]);
        const result = {
            pending: 0,
            approved: 0,
            rejected: 0,
            myActions: 0
        };
        stats.forEach((s)=>{
            if (s.status === _approvalentity.ApprovalStatus.PENDING) result.pending = parseInt(s.count);
            if (s.status === _approvalentity.ApprovalStatus.APPROVED) result.approved = parseInt(s.count);
            if (s.status === _approvalentity.ApprovalStatus.REJECTED) result.rejected = parseInt(s.count);
        });
        // Count actions by specific user in history
        result.myActions = allFinalized.filter((req)=>req.history?.some((h)=>h.userId === userId)).length;
        // However, the "pending" count in the dashboard should only show what the user CAN actually approve
        const accessiblePending = await this.getPendingRequests(userLevel);
        result.pending = accessiblePending.length;
        // Add maxLevel to help UI determine if "Super User" override applies
        const maxRole = await this.approvalRepo.manager.createQueryBuilder('roles', 'role').select('MAX(role.approvalLevel)', 'max').getRawOne();
        result.maxLevel = parseInt(maxRole?.max || '0', 10);
        return result;
    }
    async getPendingRequests(userLevel) {
        // Find requests where the current required level <= userLevel
        const allPending = await this.approvalRepo.find({
            where: {
                status: _approvalentity.ApprovalStatus.PENDING
            },
            relations: [
                'requestedBy',
                'history',
                'history.user'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        return allPending.filter((req)=>{
            const neededLevel = req.requiredLevels[req.currentLevelIndex];
            return userLevel >= neededLevel;
        }).map((req)=>this.parseMetadata(req));
    }
    async getRequestsByStatus(status, userLevel, filters) {
        if (status === 'PENDING') {
            const pending = await this.getPendingRequests(userLevel);
            // Only apply module filters for PENDING status, ignore date filters
            // to ensure tasks from previous days are always visible for action
            return this.applyClientFilters(pending, {
                moduleType: filters?.moduleType
            });
        }
        const where = {
            status: status
        };
        if (filters?.moduleType) where.moduleType = filters.moduleType;
        const start = filters?.startDate ? new Date(filters.startDate) : null;
        const end = filters?.endDate ? new Date(filters.endDate) : null;
        if (start && end) where.updatedAt = (0, _typeorm1.Between)(start, end);
        else if (start) where.updatedAt = (0, _typeorm1.MoreThanOrEqual)(start);
        else if (end) where.updatedAt = (0, _typeorm1.LessThanOrEqual)(end);
        const requests = await this.approvalRepo.find({
            where,
            relations: [
                'requestedBy',
                'history',
                'history.user'
            ],
            order: {
                updatedAt: 'DESC'
            }
        });
        return requests.map((req)=>this.parseMetadata(req));
    }
    applyClientFilters(items, filters) {
        if (!filters) return items;
        let result = items;
        if (filters.moduleType) result = result.filter((r)=>r.moduleType === filters.moduleType);
        if (filters.startDate) result = result.filter((r)=>new Date(r.createdAt) >= new Date(filters.startDate));
        if (filters.endDate) result = result.filter((r)=>new Date(r.createdAt) <= new Date(filters.endDate));
        return result;
    }
    async getRequestById(id) {
        const req = await this.approvalRepo.findOne({
            where: {
                id
            },
            relations: [
                'requestedBy',
                'history',
                'history.user'
            ]
        });
        if (!req) throw new _common.NotFoundException('Request not found');
        return this.parseMetadata(req);
    }
    parseMetadata(req) {
        const rawReq = {
            ...req
        };
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
    constructor(approvalRepo, historyRepo, dataSource, eventEmitter){
        this.approvalRepo = approvalRepo;
        this.historyRepo = historyRepo;
        this.dataSource = dataSource;
        this.eventEmitter = eventEmitter;
    }
};
ApprovalService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_approvalentity.ApprovalRequest)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_approvalentity.ApprovalHistory)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource,
        typeof _eventemitter.EventEmitter2 === "undefined" ? Object : _eventemitter.EventEmitter2
    ])
], ApprovalService);

//# sourceMappingURL=approval.service.js.map