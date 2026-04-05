import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalRequest, ApprovalHistory } from '../entities/approval.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { ApprovalListener } from './approval.listener';

import { UserModule } from '../../user/user.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalRequest, ApprovalHistory]),
    UserModule,
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalListener],
  exports: [ApprovalService],
})
export class ApprovalModule {}
