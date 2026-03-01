const { DataSource } = require('typeorm');
const path = require('path');

const AppDataSource = new DataSource({
    type: 'postgres',
    host: '127.0.0.1',
    port: 4538,
    username: 'postgres',
    password: '1',
    database: 'billiard_db'
});

async function run() {
    try {
        console.log('Connecting to DB...');
        await AppDataSource.initialize();
        console.log('Connected.');

        await AppDataSource.query(`UPDATE tables SET status = 'AVAILABLE', active_transaction_id = NULL, start_time = NULL, end_time = NULL, duration = NULL`);
        console.log('Tables reset.');

        await AppDataSource.query(`UPDATE transactions SET status = 'COMPLETED', is_active = false WHERE status = 'ACTIVE' OR is_active = true`);
        console.log('Transactions reset.');

        console.log('Successfully restarted all tables.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
run();
