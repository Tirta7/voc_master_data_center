
const { DataSource } = require('typeorm');

async function testTimezone() {
    const ds = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 4538,
        username: 'postgres',
        password: '1',
        database: 'billiard_db',
        synchronize: false,
        logging: true,
    });

    await ds.initialize();
    console.log('DB Connected');

    const startStr = '2026-03-05T00:00';
    const endStr = '2026-03-05T23:59';

    const start = new Date(startStr);
    const end = new Date(endStr);

    console.log('Parsed Start (Local):', start.toString());
    console.log('Parsed Start (ISO):', start.toISOString());
    console.log('Parsed End (Local):', end.toString());
    console.log('Parsed End (ISO):', end.toISOString());

    // Check recent transactions
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600000);

    console.log('\n--- Transactions in the last 2 hours ---');
    const recent = await ds.query('SELECT id, "createdAt", status, "grandTotal" FROM transactions WHERE "createdAt" >= $1', [twoHoursAgo]);
    console.log(`Transactions found: ${recent.length}`);
    recent.forEach(tx => console.log(` - ID: ${tx.id}, CreatedAt: ${tx.createdAt}, Total: ${tx.grandTotal}`));

    console.log('\n--- Dashboard Query Simulation ---');
    const dbTxs = await ds.query('SELECT id, "createdAt" FROM transactions WHERE "createdAt" BETWEEN $1 AND $2', [start, end]);
    console.log(`Range: ${start.toISOString()} to ${end.toISOString()}`);
    console.log(`Transactions found: ${dbTxs.length}`);
    if (dbTxs.length === 0) {
        // If 0 found, let's see what IS in the database for "today" in local terms
        console.log('\n--- Checking for anything in "today" local terms (offset approach) ---');
        // If WIB is +7, then 00:00 WIB is 17:00 UTC previous day.
        const startLocal = new Date(start.getTime());
        const transactionsAny = await ds.query('SELECT id, "createdAt" FROM transactions ORDER BY "createdAt" DESC LIMIT 10');
        console.log('Last 10 transactions in DB:');
        transactionsAny.forEach(tx => console.log(` - ID: ${tx.id}, CreatedAt: ${tx.createdAt}`));
    }

    await ds.destroy();
}

testTimezone().catch(console.error);
