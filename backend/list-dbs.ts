
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
        });

        const [rows]: any = await connection.execute('SHOW DATABASES');
        console.log('DATABASES FOUND:');
        rows.forEach((db: any) => console.log(`- ${db.Database}`));

        await connection.end();
    } catch (error) {
        console.error('DB LIST ERROR:', error.message);
    }
}

check();
