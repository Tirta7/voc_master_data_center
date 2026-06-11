import { Module, forwardRef } from '@nestjs/common';
import { SeederController } from './seeder.controller';
import { SeederService } from './seeder.service';
import { BilliardModule } from '../billiard/billiard.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CafeModule } from '../cafe/cafe.module';
import { SettingsModule } from '../settings/settings.module';
import { MemberModule } from '../member/member.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    BilliardModule,
    InventoryModule,
    CafeModule,
    forwardRef(() => SettingsModule),
    MemberModule,
    UserModule,
  ],
  controllers: [SeederController],
  providers: [SeederService],
})
export class SeederModule {}
