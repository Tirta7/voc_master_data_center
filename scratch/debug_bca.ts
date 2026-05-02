
import { createConnection } from 'typeorm';
import { Cashflow } from './backend/src/finance/entities/cashflow.entity';
import { Transaction } from './backend/src/transaction/entities/transaction.entity';
import { Shift } from './backend/src/finance/entities/shift.entity';
import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function debug() {
    const connection = await createConnection({
        type: 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '4538'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '123456',
        database: process.env.DB_NAME || 'billiard_db',
        entities: [Cashflow, Transaction, Shift],
        synchronize: false,
    });

    console.log('--- Shift info ---');
    const shifts = await connection.getRepository(Shift).find({ order: { startTime: 'DESC' }, take: 1 });
    if (shifts.length > 0) {
        console.log(`Shift ID: ${shifts[0].id} | Start: ${shifts[0].startTime} | End: ${shifts[0].endTime}`);
    }

    console.log('\n--- BCA Transactions/Cashflows ---');
    const cashflows = await connection.getRepository(Cashflow).find({
        where: { paymentMethod: 'BCA' }
    });
    
    cashflows.forEach(c => {
        console.log(`[Cashflow] Amt: ${c.amount} | Time: ${c.timestamp} | ShiftId: ${c.shiftId}`);
    });

    const txs = await connection.getRepository(Transaction).find({
        where: { paymentDetails: (await import('typeorm')).Like('%BCA%') as any }
    });
    txs.forEach(t => {
        console.log(`[Transaction] Invoice: ${t.invoiceNumber} | Time: ${t.createdAt} | ShiftId: ${t.shiftId}`);
    });

    await connection.close();
}

debug().catch(console.error);
