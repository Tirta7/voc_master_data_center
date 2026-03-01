import { DataSource } from 'typeorm';
import * as path from 'path';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: '127.0.0.1',
    port: 4538,
    username: 'postgres',
    password: '1',
    database: 'billiard_db',
    entities: [path.join(__dirname, 'src/**/*.entity.ts')]
});

async function run() {
    try {
        console.log('Connecting to DB...');
        await AppDataSource.initialize();
        console.log('Connected.');

        // We must query the entities to avoid raw ENUM casting errors
        const tables = await AppDataSource.query(`SELECT id FROM tables WHERE status = 'IN_USE'`);
        for (const t of tables) {
            await AppDataSource.query(`UPDATE tables SET status = 'AVAILABLE'::"public"."table_status_enum", active_transaction_id = NULL, start_time = NULL, end_time = NULL, duration = NULL, order_id = NULL WHERE id = $1`, [t.id]);
        }

        const txs = await AppDataSource.query(`SELECT id FROM transactions WHERE status = 'ACTIVE' OR is_active = true`);
        for (const tx of txs) {
            await AppDataSource.query(`UPDATE transactions SET status = 'COMPLETED'::"public"."transactions_status_enum", is_active = false WHERE id = $1`, [tx.id]);
        }

        console.log(`Successfully reset ${tables.length} tables and ${txs.length} transactions.`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
run();
