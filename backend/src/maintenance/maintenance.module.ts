import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';

import { Transaction } from '../transaction/entities/transaction.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { Cashflow } from '../finance/entities/cashflow.entity';
import { AuditLog } from '../report/entities/audit-log.entity';
import { Session } from '../billiard/entities/session.entity';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([
            Transaction,
            OrderItem,
            Cashflow,
            AuditLog,
            Session,
        ]),
    ],
    controllers: [MaintenanceController],
    providers: [MaintenanceService],
    exports: [MaintenanceService],
})
export class MaintenanceModule { }
