import { Test, TestingModule } from '@nestjs/testing';
import { BilliardController } from './billiard.controller';

describe('BilliardController', () => {
  let controller: BilliardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BilliardController],
    }).compile();

    controller = module.get<BilliardController>(BilliardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
