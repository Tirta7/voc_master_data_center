
const { DataSource } = require('typeorm');

async function check() {
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

    const now = new Date();
    const businessDayStart = new Date(now);
    if (now.getHours() < 4) {
        businessDayStart.setDate(businessDayStart.getDate() - 1);
    }
    businessDayStart.setHours(4, 0, 0, 0);

    console.log('Now:', now.toISOString());
    console.log('Business Day Start:', businessDayStart.toISOString());

    const txs = await ds.query('SELECT id, "invoiceNumber", "createdAt", status FROM transactions WHERE "createdAt" >= $1', [businessDayStart]);
    console.log(`Transactions in current business day: ${txs.length}`);
    txs.forEach(tx => console.log(` - ${tx.invoiceNumber} (ID: ${tx.id}), CreatedAt: ${tx.createdAt}, Status: ${tx.status}`));

    await ds.destroy();
}

check().catch(console.error);
