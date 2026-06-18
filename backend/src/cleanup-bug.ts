import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from './transaction/entities/transaction.entity';
import { Repository, Like } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const transactionRepo = app.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  
  // Find all UNPAID STANDALONE transactions created today
  const transactions = await transactionRepo.find({
    where: {
      status: 'UNPAID' as any,
      invoiceNumber: Like('STANDALONE-%')
    }
  });
  
  let count = 0;
  for (const tx of transactions) {
    console.log(`Cancelling transaction ${tx.invoiceNumber} (Billiard Total: ${tx.billiardTotal}, Cafe Total: ${tx.cafeTotal})`);
    tx.status = 'CANCELLED' as any;
    await transactionRepo.save(tx);
    count++;
  }
  
  console.log(`Successfully cancelled ${count} bugged STANDALONE transactions.`);
  await app.close();
}
bootstrap();
