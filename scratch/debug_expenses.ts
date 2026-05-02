import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module';
import { FinanceService } from '../backend/src/finance/finance.service';
import { Expense } from '../backend/src/finance/entities/expense.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const expenseRepo = app.get<Repository<Expense>>(getRepositoryToken(Expense));

  const expenses = await expenseRepo.find({
    order: { id: 'DESC' },
    take: 10,
  });

  console.log('--- LATEST EXPENSES ---');
  expenses.forEach(e => {
    console.log(`ID: ${e.id}, Description: ${e.description}, Amount: ${e.amount}, Status: ${e.status}, ShiftID: ${e.shiftId}, BusinessDayID: ${e.businessDayId}, Date: ${e.date}`);
  });

  await app.close();
}

bootstrap();
