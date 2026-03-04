import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Locker } from './entities/locker.entity';
import { LockerSession } from './entities/locker-session.entity';
import { LockerService } from './locker.service';
import { LockerController } from './locker.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Locker, LockerSession]),
    ],
    controllers: [LockerController],
    providers: [LockerService],
    exports: [LockerService],
})
export class LockerModule { }
