import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WaitingList,
  WaitingListStatus,
  WaitingListType,
} from './entities/waiting-list.entity';
import { Table } from '../billiard/entities/table.entity';
import { CafeTable } from '../cafe-table/entities/cafe-table.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { ReportService } from '../report/report.service';
import { MqttService } from '../mqtt/mqtt.service';

@Injectable()
export class WaitingListService {
  constructor(
    @InjectRepository(WaitingList)
    private readonly waitingListRepository: Repository<WaitingList>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(CafeTable)
    private readonly cafeTableRepository: Repository<CafeTable>,
    private readonly billiardGateway: BilliardGateway,
    private readonly reportService: ReportService,
    private readonly mqttService: MqttService,
  ) {}

  async findAll(type?: string) {
    const query: any = {
      where: { status: WaitingListStatus.PENDING },
      order: { createdAt: 'ASC' },
    };

    if (type) {
      query.where.type = type;
    }

    return this.waitingListRepository.find(query);
  }

  async create(data: Partial<WaitingList>) {
    const entry = this.waitingListRepository.create(data);
    const saved = await this.waitingListRepository.save(entry);

    if (saved.targetTableId) {
      // When created with a target table (e.g. specifically selecting a table from the start),
      // the creator/system can skip the handler check or we can assign handler here if user context is available.
      // For now, simple assign works.
      await this.assignToTable(saved.id, saved.targetTableId, 0, 'Sistem');
    }

    this.billiardGateway.broadcastWaitingListUpdate({
      ...saved,
      action: saved.targetTableId ? 'CREATE_ASSIGNED' : 'CREATE',
    });

    // LOGGING
    await this.reportService.logAction(
      'WAIT_LIST_CREATE',
      'Sistem',
      `Antrean [${saved.type}] dibuat untuk ${saved.customerName}`,
    );

    return saved;
  }

  async assignToTable(
    id: number,
    tableId: number,
    userId: number,
    userName: string,
  ) {
    const entry = await this.waitingListRepository.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Waiting list entry not found');

    // PERMISSION CHECK: If already handled by someone else
    if (entry.handledById && entry.handledById !== userId) {
      throw new BadRequestException(
        `Antrean ini sedang dihandle oleh ${entry.handledByName}.`,
      );
    }

    // If not handled yet, the assigner becomes the handler
    if (!entry.handledById) {
      entry.handledById = userId;
      entry.handledByName = userName;
    }

    // UNBOOK PREVIOUS TABLE IF EXISTS
    if (entry.targetTableId && entry.targetTableId !== tableId) {
      if (entry.type === WaitingListType.CAFE) {
        const oldTable = await this.cafeTableRepository.findOne({
          where: { id: entry.targetTableId },
        });
        if (oldTable && oldTable.bookedByWaitingId === entry.id) {
          oldTable.isBooked = false;
          oldTable.bookedByWaitingId = null as any;
          oldTable.bookedByName = null as any;
          await this.cafeTableRepository.save(oldTable);
          this.billiardGateway.broadcastTableUpdate({
            ...oldTable,
            type: 'cafe',
            status: 'available',
            activeTransaction: null,
          });
        }
      } else {
        const oldTable = await this.tableRepository.findOne({
          where: { id: entry.targetTableId },
        });
        if (oldTable && oldTable.bookedByWaitingId === entry.id) {
          oldTable.isBooked = false;
          oldTable.bookedByWaitingId = null as any;
          oldTable.bookedByName = null as any;
          await this.tableRepository.save(oldTable);
          this.billiardGateway.broadcastTableUpdate({
            ...oldTable,
            status: 'available',
            activeTransaction: null,
          });
        }
      }
    }

    let tableName = '';
    if (entry.type === WaitingListType.CAFE) {
      const table = await this.cafeTableRepository.findOne({
        where: { id: tableId },
      });
      if (!table) throw new NotFoundException('Cafe Table not found');
      tableName = table.tableName;

      // Update Table
      table.isBooked = true;
      table.bookedByWaitingId = entry.id;
      table.bookedByName = entry.customerName;
      await this.cafeTableRepository.save(table);
      this.billiardGateway.broadcastTableUpdate({
        ...table,
        type: 'cafe',
      });
    } else {
      const table = await this.tableRepository.findOne({
        where: { id: tableId },
      });
      if (!table) throw new NotFoundException('Table not found');
      tableName = table.tableName;

      // Update Table
      table.isBooked = true;
      table.bookedByWaitingId = entry.id;
      table.bookedByName = entry.customerName;
      await this.tableRepository.save(table);
      this.billiardGateway.broadcastTableUpdate(table);
    }

    // Update Waiting List
    entry.targetTableId = tableId;
    entry.targetTableName = tableName;
    await this.waitingListRepository.save(entry);

    // LOGGING
    await this.reportService.logAction(
      'WAIT_LIST_ASSIGN',
      userName,
      `Antrean [${entry.type}] ${entry.customerName} ditugaskan ke Meja ${tableName} oleh ${userName}`,
      tableId,
    );

    this.billiardGateway.broadcastWaitingListUpdate({
      ...entry,
      action: 'UPDATE',
    });

    return entry;
  }

  async cancel(id: number, userId: number, userName: string) {
    const entry = await this.waitingListRepository.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Waiting list entry not found');

    // PERMISSION CHECK: Only handler can cancel if handled
    if (entry.handledById && entry.handledById !== userId) {
      throw new ForbiddenException(
        `Anda tidak dapat membatalkan antrean ini karena sedang dihandle oleh ${entry.handledByName}.`,
      );
    }

    entry.status = WaitingListStatus.CANCELLED;
    await this.waitingListRepository.save(entry);

    if (entry.targetTableId) {
      if (entry.type === WaitingListType.CAFE) {
        const table = await this.cafeTableRepository.findOne({
          where: { id: entry.targetTableId },
        });
        if (table && table.bookedByWaitingId === entry.id) {
          table.isBooked = false;
          table.bookedByWaitingId = null as any;
          table.bookedByName = null as any;
          await this.cafeTableRepository.save(table);
          this.billiardGateway.broadcastTableUpdate({
            ...table,
            type: 'cafe',
          });
        }
      } else {
        const table = await this.tableRepository.findOne({
          where: { id: entry.targetTableId },
        });
        if (table && table.bookedByWaitingId === entry.id) {
          table.isBooked = false;
          table.bookedByWaitingId = null as any;
          table.bookedByName = null as any;
          await this.tableRepository.save(table);
          this.billiardGateway.broadcastTableUpdate(table);
        }
      }
    }

    // LOGGING
    await this.reportService.logAction(
      'WAIT_LIST_CANCEL',
      userName,
      `Antrean [${entry.type}] ${entry.customerName} dibatalkan oleh ${userName}`,
      entry.targetTableId,
    );

    this.billiardGateway.broadcastWaitingListUpdate({
      ...entry,
      action: 'UPDATE',
    });

    return entry;
  }

  async findByTable(tableId: number) {
    return this.waitingListRepository.findOne({
      where: { targetTableId: tableId, status: WaitingListStatus.PENDING },
    });
  }

  async checkIn(id: number) {
    const entry = await this.waitingListRepository.findOne({ where: { id } });
    if (!entry) return;

    entry.status = WaitingListStatus.CHECKED_IN;
    await this.waitingListRepository.save(entry);

    if (entry.targetTableId) {
      if (entry.type === WaitingListType.CAFE) {
        const table = await this.cafeTableRepository.findOne({
          where: { id: entry.targetTableId },
        });
        if (table && table.bookedByWaitingId === entry.id) {
          table.isBooked = false;
          table.bookedByWaitingId = null as any;
          table.bookedByName = null as any;
          await this.cafeTableRepository.save(table);
          this.billiardGateway.broadcastTableUpdate({
            ...table,
            type: 'cafe',
          });
        }
      } else {
        const table = await this.tableRepository.findOne({
          where: { id: entry.targetTableId },
        });
        if (table && table.bookedByWaitingId === entry.id) {
          table.isBooked = false;
          table.bookedByWaitingId = null as any;
          table.bookedByName = null as any;
          await this.tableRepository.save(table);
          this.billiardGateway.broadcastTableUpdate(table);
        }
      }
    }
    this.billiardGateway.broadcastWaitingListUpdate({
      ...entry,
      action: 'UPDATE',
    });

    // LOGGING
    await this.reportService.logAction(
      'WAIT_LIST_CHECK_IN',
      'Sistem',
      `Antrean [${entry.type}] ${entry.customerName} check-in (Sesi Dimulai)`,
      entry.targetTableId,
    );
  }

  async unassignTable(id: number, userId: number, userName: string) {
    const entry = await this.waitingListRepository.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Waiting list entry not found');

    // PERMISSION CHECK: Only handler can unassign
    if (entry.handledById && entry.handledById !== userId) {
      throw new ForbiddenException(
        `Anda tidak dapat merubah antrean ini karena sedang dihandle oleh ${entry.handledByName}.`,
      );
    }

    const tableId = entry.targetTableId;
    const type = entry.type;

    // Update Waiting List
    entry.targetTableId = null as any;
    entry.targetTableName = null as any;
    // Optionally: if unassigned, should it stay "kept"?
    // Usually, unassigning means the waiter is giving up on this specific table arrangement.
    // If we want it to be fully available again for others to keep, we could nullify handledById here.
    // But the requirement says "unkeep" is separate. Let's keep the handler for now.

    await this.waitingListRepository.save(entry);

    if (tableId) {
      if (type === WaitingListType.CAFE) {
        const table = await this.cafeTableRepository.findOne({
          where: { id: tableId },
        });
        if (table && table.bookedByWaitingId === entry.id) {
          table.isBooked = false;
          table.bookedByWaitingId = null as any;
          table.bookedByName = null as any;
          await this.cafeTableRepository.save(table);
          this.billiardGateway.broadcastTableUpdate({
            ...table,
            type: 'cafe',
          });
        }
      } else {
        const table = await this.tableRepository.findOne({
          where: { id: tableId },
        });
        if (table && table.bookedByWaitingId === entry.id) {
          table.isBooked = false;
          table.bookedByWaitingId = null as any;
          table.bookedByName = null as any;
          await this.tableRepository.save(table);
          this.billiardGateway.broadcastTableUpdate(table);
        }
      }
    }

    this.billiardGateway.broadcastWaitingListUpdate({
      ...entry,
      action: 'RELEASE',
    });

    // LOGGING
    await this.reportService.logAction(
      'WAIT_LIST_UNASSIGN',
      userName,
      `Antrean [${entry.type}] ${entry.customerName} dilepas dari meja oleh ${userName}`,
      tableId,
    );

    return entry;
  }

  async findAlternativeTable(excludeTableId: number) {
    // Find tables that are NOT booked and sort by lowest remainingMinutes (prepaid) or available tables
    const allTables = await this.tableRepository.find({
      where: { isBooked: false },
    });

    // Filter out the current table
    const candidates = allTables.filter((t) => t.id !== excludeTableId);

    // Sort: AVAILABLE tables first, then WAITING_PAYMENT, then tables with lowest remainingMinutes
    return candidates.sort((a, b) => {
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

  async handle(id: number, userId: number, userName: string) {
    const entry = await this.waitingListRepository.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Waiting list entry not found');

    // Cannot keep if already assigned to a table
    if (entry.targetTableId) {
      throw new BadRequestException(
        'Antrean sudah ditugaskan ke meja dan tidak dapat dikeep.',
      );
    }

    // Check if already kept by someone else
    if (entry.handledById && entry.handledById !== userId) {
      throw new BadRequestException(
        `Antrean sudah dikeep oleh ${entry.handledByName}`,
      );
    }

    entry.handledById = userId;
    entry.handledByName = userName;
    await this.waitingListRepository.save(entry);

    this.billiardGateway.broadcastWaitingListUpdate({
      ...entry,
      action: 'CLAIM',
    });

    // LOGGING
    await this.reportService.logAction(
      'WAIT_LIST_KEEP',
      userName,
      `Antrean [${entry.type}] ${entry.customerName} dikeep oleh ${userName}`,
    );

    return entry;
  }

  async unhandle(id: number, userId: number, userName: string) {
    const entry = await this.waitingListRepository.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Waiting list entry not found');

    // Can only unkeep if kept by the same user
    if (entry.handledById !== userId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk melepas antrean ini.',
      );
    }

    entry.handledById = null as any;
    entry.handledByName = null as any;
    await this.waitingListRepository.save(entry);

    this.billiardGateway.broadcastWaitingListUpdate({
      ...entry,
      action: 'RELEASE',
    });

    // LOGGING
    await this.reportService.logAction(
      'WAIT_LIST_UNKEEP',
      userName,
      `Antrean [${entry.type}] ${entry.customerName} dilepas (unkeep) oleh ${userName}`,
    );

    return entry;
  }
}
