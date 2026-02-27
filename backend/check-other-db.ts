
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        const dbName = 'billiard_cafe_management';
        console.log('CONNECTING TO:', dbName);
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: dbName,
        });

        const [rows]: any = await connection.execute('SELECT COUNT(*) as count FROM transactions');
        console.log(`TOTAL TRANSACTIONS IN ${dbName}: ${rows[0].count}`);

        await connection.end();
    } catch (error) {
        console.error('DB CHECK ERROR:', error.message);
    }
}

check();
