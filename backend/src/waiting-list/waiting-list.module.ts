import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitingList } from './entities/waiting-list.entity';
import { WaitingListService } from './waiting-list.service';
import { WaitingListController } from './waiting-list.controller';
import { Table } from '../billiard/entities/table.entity';
import { CafeTable } from '../cafe-table/entities/cafe-table.entity';
import { SocketModule } from '../socket/socket.module';
import { ReportModule } from '../report/report.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([WaitingList, Table, CafeTable]),
        SocketModule,
        ReportModule,
    ],
    controllers: [WaitingListController],
    providers: [WaitingListService],
    exports: [WaitingListService],
})
export class WaitingListModule { }
