
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
        });

        const [rows]: any = await connection.execute('DESCRIBE order_items');
        console.log('COLUMNS IN order_items:');
        rows.forEach((col: any) => console.log(`- ${col.Field}: ${col.Type} (Default: ${col.Default})`));

        await connection.end();
    } catch (error) {
        console.error('DB CHECK ERROR:', error.message);
    }
}

check();
