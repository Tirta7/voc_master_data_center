import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from './transaction/entities/transaction.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const transactionRepo = app.get<Repository<Transaction>>(getRepositoryToken(Transaction));
  
  // Get the last 5 transactions
  const transactions = await transactionRepo.find({
    order: { createdAt: 'DESC' },
    take: 5,
    relations: ['orderItems', 'table']
  });
  
  console.log("=== 5 TRANSAKSI TERAKHIR ===");
  for (const tx of transactions) {
    console.log(`\nID: ${tx.invoiceNumber} | Customer: ${tx.customerName} | Status: ${tx.status} | Meja: ${tx.table?.tableName || 'N/A'}`);
    console.log(`Grand Total: Rp ${tx.grandTotal} | Paid Amount: Rp ${tx.paidAmount}`);
    if (tx.orderItems && tx.orderItems.length > 0) {
      console.log(`Pesanan (${tx.orderItems.length} items):`);
      for (const item of tx.orderItems) {
        console.log(`  - ${item.quantity}x ${item.customName || 'Menu'} (Rp ${item.priceAtOrder})`);
      }
    } else {
      console.log(`Pesanan: Kosong`);
    }
  }
  
  await app.close();
}
bootstrap();
