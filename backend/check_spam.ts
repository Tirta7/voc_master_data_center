
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusinessDay } from './src/finance/entities/business-day.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<BusinessDay>>(getRepositoryToken(BusinessDay));

  const spamDays = await repo.find({
    where: {
      date: '2026-03-26',
      totalRevenue: 0,
      isClosed: true
    },
    order: { id: 'ASC' }
  });

  console.log(`Found ${spamDays.length} potentially spam business days for 2026-03-26.`);
  
  // Detail a few
  spamDays.slice(0, 5).forEach(d => {
    console.log(`ID: ${d.id}, Start: ${d.startTime}, End: ${d.endTime}`);
  });

  if (spamDays.length > 1) {
    // Keep the first one (the legitimate one if any) or the most "complete" one.
    // In this case, if all have 0 revenue, we might want to delete all but the oldest/newest.
    // The user saw spam "every minute".
  }

  await app.close();
}

bootstrap();
