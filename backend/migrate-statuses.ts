
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
        });

        console.log('Migrating statuses to uppercase...');
        await connection.execute("UPDATE transactions SET status = 'UNPAID' WHERE status = 'unpaid'");
        await connection.execute("UPDATE transactions SET status = 'PAID' WHERE status = 'paid'");
        await connection.execute("UPDATE transactions SET status = 'PARTIAL' WHERE status = 'partial'");
        await connection.execute("UPDATE transactions SET status = 'DEBT' WHERE status = 'debt'");
        await connection.execute("UPDATE transactions SET status = 'CANCELLED' WHERE status = 'cancelled'");

        console.log('Migration completed.');
        await connection.end();
    } catch (error) {
        console.error('MIGRATION ERROR:', error.message);
    }
}

migrate();
