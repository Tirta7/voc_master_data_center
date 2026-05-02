
import { createConnection } from 'typeorm';
import { Cashflow } from './backend/src/finance/entities/cashflow.entity';
import { Expense } from './backend/src/finance/entities/expense.entity';
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
        entities: [Cashflow, Expense],
        synchronize: false,
    });

    console.log('--- Cashflow Entries (Today) ---');
    const cashflows = await connection.getRepository(Cashflow).find({
        where: { createdAt: (await import('typeorm')).MoreThan(new Date('2026-05-02T00:00:00Z')) },
        order: { createdAt: 'ASC' }
    });
    
    cashflows.forEach(c => {
        console.log(`[${c.type}] ${c.description} | Amt: ${c.amount} | Shift: ${c.shiftId} | BDay: ${c.businessDayId}`);
    });

    console.log('\n--- Expense Entries (Today) ---');
    const expenses = await connection.getRepository(Expense).find({
        where: { date: (await import('typeorm')).MoreThan(new Date('2026-05-02T00:00:00Z')) as any },
        order: { date: 'ASC' }
    });
    
    expenses.forEach(e => {
        console.log(`[${e.status}] ${e.description} | Amt: ${e.amount} | Shift: ${e.shiftId} | BDay: ${e.businessDayId}`);
    });

    await connection.close();
}

debug().catch(console.error);
