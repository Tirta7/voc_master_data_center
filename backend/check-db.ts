
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        console.log('CONNECTING TO:', process.env.DB_DATABASE);
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
        });

        const [rows]: any = await connection.execute('SELECT COUNT(*) as count FROM transactions');
        console.log(`TOTAL TRANSACTIONS: ${rows[0].count}`);

        const [latest]: any = await connection.execute('SELECT id, invoiceNumber, status, grandTotal, createdAt FROM transactions ORDER BY createdAt DESC LIMIT 5');
        console.log('LATEST TRANSACTIONS:');
        latest.forEach((tx: any) => console.log(`- ID: ${tx.id} | ${tx.invoiceNumber} | status: ${tx.status} | total: ${tx.grandTotal} | date: ${tx.createdAt}`));

        await connection.end();
    } catch (error) {
        console.error('DB CHECK ERROR:', error.message);
    }
}

check();
