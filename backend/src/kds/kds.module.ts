import { Module } from '@nestjs/common';
import { KdsGateway } from './kds/kds.gateway';

@Module({
  providers: [KdsGateway],
  exports: [KdsGateway],
})
export class KdsModule { }
