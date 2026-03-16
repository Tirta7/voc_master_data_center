import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { PayrollConfig } from './entities/payroll-config.entity';
import { Violation } from './entities/violation.entity';
import { UserStatusLog } from './entities/user-status-log.entity';
import { PayrollRelease } from './entities/payroll-release.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SocketModule } from '../socket/socket.module';
import { Transaction } from '../transaction/entities/transaction.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      PayrollConfig,
      Violation,
      Transaction,
      OrderItem,
      UserStatusLog,
      PayrollRelease,
    ]),
    forwardRef(() => SocketModule),
    forwardRef(() => FinanceModule),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
