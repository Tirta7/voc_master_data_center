import { Test, TestingModule } from '@nestjs/testing';
import { KdsGateway } from './kds.gateway';

describe('KdsGateway', () => {
  let gateway: KdsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KdsGateway],
    }).compile();

    gateway = module.get<KdsGateway>(KdsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
