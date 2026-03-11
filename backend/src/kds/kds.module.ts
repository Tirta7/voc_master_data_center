import { Module } from '@nestjs/common';
import { KdsGateway } from './kds/kds.gateway';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [MqttModule],
  providers: [KdsGateway],
  exports: [KdsGateway],
})
export class KdsModule {}
