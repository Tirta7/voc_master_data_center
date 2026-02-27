import { Test, TestingModule } from '@nestjs/testing';
import { BilliardService } from './billiard.service';

describe('BilliardService', () => {
  let service: BilliardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BilliardService],
    }).compile();

    service = module.get<BilliardService>(BilliardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
