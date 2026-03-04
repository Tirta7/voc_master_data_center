
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function checkTableOne() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    });

    try {
        await client.connect();

        // Check Table 1
        const tableRes = await client.query('SELECT * FROM tables WHERE id = 1 OR "tableName" ILIKE \'%Meja 1%\'');
        console.log('--- Table 1 Data ---');
        console.log(JSON.stringify(tableRes.rows, null, 2));

        if (tableRes.rows.length > 0) {
            const tableId = tableRes.rows[0].id;
            // Check active transaction for this table
            const transRes = await client.query('SELECT * FROM transactions WHERE "tableId" = $1 AND status != \'paid\'', [tableId]);
            console.log('\n--- Active Transactions for Table 1 ---');
            console.log(JSON.stringify(transRes.rows, null, 2));

            if (transRes.rows.length > 0) {
                const transId = transRes.rows[0].id;
                // Check order items
                const itemsRes = await client.query('SELECT * FROM order_items WHERE "transactionId" = $1', [transId]);
                console.log('\n--- Order Items for Transaction ---');
                console.log(JSON.stringify(itemsRes.rows, null, 2));

                // Check payments
                const paymentsRes = await client.query('SELECT * FROM transaction_payments WHERE "transactionId" = $1', [transId]);
                console.log('\n--- Payments for Transaction ---');
                console.log(JSON.stringify(paymentsRes.rows, null, 2));
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkTableOne();
