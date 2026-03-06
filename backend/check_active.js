
const { DataSource } = require('typeorm');

async function checkActive() {
    const ds = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 4538,
        username: 'postgres',
        password: '1',
        database: 'billiard_db',
        synchronize: false,
    });

    await ds.initialize();

    console.log('--- Active Tables ---');
    const tables = await ds.query('SELECT id, "tableName", status, "active_transaction_id" FROM tables WHERE status != \'available\'');
    console.log(`Active tables: ${tables.length}`);
    tables.forEach(t => console.log(` - Meja ${t.tableName} (ID: ${t.id}), Status: ${t.status}, TxID: ${t.active_transaction_id}`));

    console.log('\n--- Unpaid / Active Transactions ---');
    const activeTxs = await ds.query('SELECT id, "invoiceNumber", status, type, "grandTotal", "createdAt" FROM transactions WHERE status != \'PAID\' AND status != \'CANCELLED\'');
    console.log(`Active/Unpaid transactions: ${activeTxs.length}`);
    activeTxs.forEach(tx => console.log(` - Invoice: ${tx.invoiceNumber} (ID: ${tx.id}), Status: ${tx.status}, Type: ${tx.type}, Total: ${tx.grandTotal}, CreatedAt: ${tx.createdAt}`));

    await ds.destroy();
}

checkActive().catch(console.error);
