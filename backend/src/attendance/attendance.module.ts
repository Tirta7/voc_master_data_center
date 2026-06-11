import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity';
import { EmployeeShiftSchedule } from './entities/employee-shift-schedule.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { User } from '../user/entities/user.entity';
import { BusinessClosure } from '../settings/entities/holiday.entity';
import { Violation } from '../user/entities/violation.entity';
import { PayrollConfig } from '../user/entities/payroll-config.entity';
import { SettingsModule } from '../settings/settings.module';
import { SocketModule } from '../socket/socket.module';
import { forwardRef } from '@nestjs/common';
import { MqttModule } from '../mqtt/mqtt.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      EmployeeShiftSchedule,
      User,
      BusinessClosure,
      Violation,
      PayrollConfig,
    ]),
    forwardRef(() => SettingsModule),
    forwardRef(() => SocketModule),
    forwardRef(() => MqttModule),
    forwardRef(() => UserModule),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
