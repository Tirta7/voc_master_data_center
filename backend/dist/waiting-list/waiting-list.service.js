"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WaitingListService", {
    enumerable: true,
    get: function() {
        return WaitingListService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _waitinglistentity = require("./entities/waiting-list.entity");
const _tableentity = require("../billiard/entities/table.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
const _billiardgateway = require("../socket/billiard.gateway");
const _reportservice = require("../report/report.service");
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
let WaitingListService = class WaitingListService {
    async findAll(type) {
        const query = {
            where: {
                status: _waitinglistentity.WaitingListStatus.PENDING
            },
            order: {
                createdAt: 'ASC'
            }
        };
        if (type) {
            query.where.type = type;
        }
        return this.waitingListRepository.find(query);
    }
    async create(data) {
        const entry = this.waitingListRepository.create(data);
        const saved = await this.waitingListRepository.save(entry);
        if (saved.targetTableId) {
            // When created with a target table (e.g. specifically selecting a table from the start), 
            // the creator/system can skip the handler check or we can assign handler here if user context is available.
            // For now, simple assign works.
            await this.assignToTable(saved.id, saved.targetTableId, 0, 'Sistem');
        }
        this.billiardGateway.server.emit('waitingListUpdate', {
            ...saved,
            action: saved.targetTableId ? 'CREATE_ASSIGNED' : 'CREATE'
        });
        // LOGGING
        await this.reportService.logAction('WAIT_LIST_CREATE', 'Sistem', `Antrean [${saved.type}] dibuat untuk ${saved.customerName}`);
        return saved;
    }
    async assignToTable(id, tableId, userId, userName) {
        const entry = await this.waitingListRepository.findOne({
            where: {
                id
            }
        });
        if (!entry) throw new _common.NotFoundException('Waiting list entry not found');
        // PERMISSION CHECK: If already handled by someone else
        if (entry.handledById && entry.handledById !== userId) {
            throw new _common.BadRequestException(`Antrean ini sedang dihandle oleh ${entry.handledByName}.`);
        }
        // If not handled yet, the assigner becomes the handler
        if (!entry.handledById) {
            entry.handledById = userId;
            entry.handledByName = userName;
        }
        // UNBOOK PREVIOUS TABLE IF EXISTS
        if (entry.targetTableId && entry.targetTableId !== tableId) {
            if (entry.type === _waitinglistentity.WaitingListType.CAFE) {
                const oldTable = await this.cafeTableRepository.findOne({
                    where: {
                        id: entry.targetTableId
                    }
                });
                if (oldTable && oldTable.bookedByWaitingId === entry.id) {
                    oldTable.isBooked = false;
                    oldTable.bookedByWaitingId = null;
                    oldTable.bookedByName = null;
                    await this.cafeTableRepository.save(oldTable);
                    this.billiardGateway.server.emit('tableUpdate', {
                        ...oldTable,
                        type: 'cafe'
                    });
                }
            } else {
                const oldTable = await this.tableRepository.findOne({
                    where: {
                        id: entry.targetTableId
                    }
                });
                if (oldTable && oldTable.bookedByWaitingId === entry.id) {
                    oldTable.isBooked = false;
                    oldTable.bookedByWaitingId = null;
                    oldTable.bookedByName = null;
                    await this.tableRepository.save(oldTable);
                    this.billiardGateway.server.emit('tableUpdate', oldTable);
                }
            }
        }
        let tableName = '';
        if (entry.type === _waitinglistentity.WaitingListType.CAFE) {
            const table = await this.cafeTableRepository.findOne({
                where: {
                    id: tableId
                }
            });
            if (!table) throw new _common.NotFoundException('Cafe Table not found');
            tableName = table.tableName;
            // Update Table
            table.isBooked = true;
            table.bookedByWaitingId = entry.id;
            table.bookedByName = entry.customerName;
            await this.cafeTableRepository.save(table);
            this.billiardGateway.server.emit('tableUpdate', {
                ...table,
                type: 'cafe'
            });
        } else {
            const table = await this.tableRepository.findOne({
                where: {
                    id: tableId
                }
            });
            if (!table) throw new _common.NotFoundException('Table not found');
            tableName = table.tableName;
            // Update Table
            table.isBooked = true;
            table.bookedByWaitingId = entry.id;
            table.bookedByName = entry.customerName;
            await this.tableRepository.save(table);
            this.billiardGateway.server.emit('tableUpdate', table);
        }
        // Update Waiting List
        entry.targetTableId = tableId;
        entry.targetTableName = tableName;
        await this.waitingListRepository.save(entry);
        // LOGGING
        await this.reportService.logAction('WAIT_LIST_ASSIGN', userName, `Antrean [${entry.type}] ${entry.customerName} ditugaskan ke Meja ${tableName} oleh ${userName}`, tableId);
        this.billiardGateway.server.emit('waitingListUpdate', {
            ...entry,
            action: 'UPDATE'
        });
        return entry;
    }
    async cancel(id, userId, userName) {
        const entry = await this.waitingListRepository.findOne({
            where: {
                id
            }
        });
        if (!entry) throw new _common.NotFoundException('Waiting list entry not found');
        // PERMISSION CHECK: Only handler can cancel if handled
        if (entry.handledById && entry.handledById !== userId) {
            throw new _common.ForbiddenException(`Anda tidak dapat membatalkan antrean ini karena sedang dihandle oleh ${entry.handledByName}.`);
        }
        entry.status = _waitinglistentity.WaitingListStatus.CANCELLED;
        await this.waitingListRepository.save(entry);
        if (entry.targetTableId) {
            if (entry.type === _waitinglistentity.WaitingListType.CAFE) {
                const table = await this.cafeTableRepository.findOne({
                    where: {
                        id: entry.targetTableId
                    }
                });
                if (table && table.bookedByWaitingId === entry.id) {
                    table.isBooked = false;
                    table.bookedByWaitingId = null;
                    table.bookedByName = null;
                    await this.cafeTableRepository.save(table);
                    this.billiardGateway.server.emit('tableUpdate', {
                        ...table,
                        type: 'cafe'
                    });
                }
            } else {
                const table = await this.tableRepository.findOne({
                    where: {
                        id: entry.targetTableId
                    }
                });
                if (table && table.bookedByWaitingId === entry.id) {
                    table.isBooked = false;
                    table.bookedByWaitingId = null;
                    table.bookedByName = null;
                    await this.tableRepository.save(table);
                    this.billiardGateway.server.emit('tableUpdate', table);
                }
            }
        }
        // LOGGING
        await this.reportService.logAction('WAIT_LIST_CANCEL', userName, `Antrean [${entry.type}] ${entry.customerName} dibatalkan oleh ${userName}`, entry.targetTableId);
        this.billiardGateway.server.emit('waitingListUpdate', {
            ...entry,
            action: 'UPDATE'
        });
        return entry;
    }
    async findByTable(tableId) {
        return this.waitingListRepository.findOne({
            where: {
                targetTableId: tableId,
                status: _waitinglistentity.WaitingListStatus.PENDING
            }
        });
    }
    async checkIn(id) {
        const entry = await this.waitingListRepository.findOne({
            where: {
                id
            }
        });
        if (!entry) return;
        entry.status = _waitinglistentity.WaitingListStatus.CHECKED_IN;
        await this.waitingListRepository.save(entry);
        if (entry.targetTableId) {
            if (entry.type === _waitinglistentity.WaitingListType.CAFE) {
                const table = await this.cafeTableRepository.findOne({
                    where: {
                        id: entry.targetTableId
                    }
                });
                if (table && table.bookedByWaitingId === entry.id) {
                    table.isBooked = false;
                    table.bookedByWaitingId = null;
                    table.bookedByName = null;
                    await this.cafeTableRepository.save(table);
                    this.billiardGateway.server.emit('tableUpdate', {
                        ...table,
                        type: 'cafe'
                    });
                }
            } else {
                const table = await this.tableRepository.findOne({
                    where: {
                        id: entry.targetTableId
                    }
                });
                if (table && table.bookedByWaitingId === entry.id) {
                    table.isBooked = false;
                    table.bookedByWaitingId = null;
                    table.bookedByName = null;
                    await this.tableRepository.save(table);
                    this.billiardGateway.server.emit('tableUpdate', table);
                }
            }
        }
        this.billiardGateway.server.emit('waitingListUpdate', {
            ...entry,
            action: 'UPDATE'
        });
        // LOGGING
        await this.reportService.logAction('WAIT_LIST_CHECK_IN', 'Sistem', `Antrean [${entry.type}] ${entry.customerName} check-in (Sesi Dimulai)`, entry.targetTableId);
    }
    async unassignTable(id, userId, userName) {
        const entry = await this.waitingListRepository.findOne({
            where: {
                id
            }
        });
        if (!entry) throw new _common.NotFoundException('Waiting list entry not found');
        // PERMISSION CHECK: Only handler can unassign
        if (entry.handledById && entry.handledById !== userId) {
            throw new _common.ForbiddenException(`Anda tidak dapat merubah antrean ini karena sedang dihandle oleh ${entry.handledByName}.`);
        }
        const tableId = entry.targetTableId;
        const type = entry.type;
        // Update Waiting List
        entry.targetTableId = null;
        entry.targetTableName = null;
        // Optionally: if unassigned, should it stay "kept"?
        // Usually, unassigning means the waiter is giving up on this specific table arrangement.
        // If we want it to be fully available again for others to keep, we could nullify handledById here.
        // But the requirement says "unkeep" is separate. Let's keep the handler for now.
        await this.waitingListRepository.save(entry);
        if (tableId) {
            if (type === _waitinglistentity.WaitingListType.CAFE) {
                const table = await this.cafeTableRepository.findOne({
                    where: {
                        id: tableId
                    }
                });
                if (table && table.bookedByWaitingId === entry.id) {
                    table.isBooked = false;
                    table.bookedByWaitingId = null;
                    table.bookedByName = null;
                    await this.cafeTableRepository.save(table);
                    this.billiardGateway.server.emit('tableUpdate', {
                        ...table,
                        type: 'cafe'
                    });
                }
            } else {
                const table = await this.tableRepository.findOne({
                    where: {
                        id: tableId
                    }
                });
                if (table && table.bookedByWaitingId === entry.id) {
                    table.isBooked = false;
                    table.bookedByWaitingId = null;
                    table.bookedByName = null;
                    await this.tableRepository.save(table);
                    this.billiardGateway.server.emit('tableUpdate', table);
                }
            }
        }
        this.billiardGateway.server.emit('waitingListUpdate', {
            ...entry,
            action: 'RELEASE'
        });
        // LOGGING
        await this.reportService.logAction('WAIT_LIST_UNASSIGN', userName, `Antrean [${entry.type}] ${entry.customerName} dilepas dari meja oleh ${userName}`, tableId);
        return entry;
    }
    async findAlternativeTable(excludeTableId) {
        // Find tables that are NOT booked and sort by lowest remainingMinutes (prepaid) or available tables
        const allTables = await this.tableRepository.find({
            where: {
                isBooked: false
            }
        });
        // Filter out the current table
        const candidates = allTables.filter((t)=>t.id !== excludeTableId);
        // Sort: AVAILABLE tables first, then WAITING_PAYMENT, then tables with lowest remainingMinutes
        return candidates.sort((a, b)=>{
            if (a.status === 'available' && b.status !== 'available') return -1;
            if (a.status !== 'available' && b.status === 'available') return 1;
            const aIsWp = a.status === 'waiting_payment';
            const bIsWp = b.status === 'waiting_payment';
            if (aIsWp && !bIsWp) return -1;
            if (bIsWp && !aIsWp) return 1;
            const aMin = a.remainingMinutes !== null ? a.remainingMinutes : 999;
            const bMin = b.remainingMinutes !== null ? b.remainingMinutes : 999;
            return aMin - bMin;
        });
    }
    async handle(id, userId, userName) {
        const entry = await this.waitingListRepository.findOne({
            where: {
                id
            }
        });
        if (!entry) throw new _common.NotFoundException('Waiting list entry not found');
        // Cannot keep if already assigned to a table
        if (entry.targetTableId) {
            throw new _common.BadRequestException('Antrean sudah ditugaskan ke meja dan tidak dapat dikeep.');
        }
        // Check if already kept by someone else
        if (entry.handledById && entry.handledById !== userId) {
            throw new _common.BadRequestException(`Antrean sudah dikeep oleh ${entry.handledByName}`);
        }
        entry.handledById = userId;
        entry.handledByName = userName;
        await this.waitingListRepository.save(entry);
        this.billiardGateway.server.emit('waitingListUpdate', {
            ...entry,
            action: 'CLAIM'
        });
        // LOGGING
        await this.reportService.logAction('WAIT_LIST_KEEP', userName, `Antrean [${entry.type}] ${entry.customerName} dikeep oleh ${userName}`);
        return entry;
    }
    async unhandle(id, userId, userName) {
        const entry = await this.waitingListRepository.findOne({
            where: {
                id
            }
        });
        if (!entry) throw new _common.NotFoundException('Waiting list entry not found');
        // Can only unkeep if kept by the same user
        if (entry.handledById !== userId) {
            throw new _common.ForbiddenException('Anda tidak memiliki akses untuk melepas antrean ini.');
        }
        entry.handledById = null;
        entry.handledByName = null;
        await this.waitingListRepository.save(entry);
        this.billiardGateway.server.emit('waitingListUpdate', {
            ...entry,
            action: 'RELEASE'
        });
        // LOGGING
        await this.reportService.logAction('WAIT_LIST_UNKEEP', userName, `Antrean [${entry.type}] ${entry.customerName} dilepas (unkeep) oleh ${userName}`);
        return entry;
    }
    constructor(waitingListRepository, tableRepository, cafeTableRepository, billiardGateway, reportService){
        this.waitingListRepository = waitingListRepository;
        this.tableRepository = tableRepository;
        this.cafeTableRepository = cafeTableRepository;
        this.billiardGateway = billiardGateway;
        this.reportService = reportService;
    }
};
WaitingListService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_waitinglistentity.WaitingList)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_tableentity.Table)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_cafetableentity.CafeTable)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService
    ])
], WaitingListService);

//# sourceMappingURL=waiting-list.service.js.map