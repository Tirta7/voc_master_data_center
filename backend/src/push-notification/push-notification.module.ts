import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushNotificationController } from './push-notification.controller';
import { PushNotificationService } from './push-notification.service';
import { PushSubscriptionEntity } from './entities/push-subscription.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscriptionEntity]),
    forwardRef(() => SettingsModule),
  ],
  controllers: [PushNotificationController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}
