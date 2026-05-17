const { Client } = require('pg');

async function fix() {
  const client = new Client({
    user: 'postgres',
    password: 'GantiDenganPasswordKuat123!',
    host: 'localhost',
    database: 'billiard_db',
    port: 5432,
  });

  await client.connect();

  try {
    // 1. Reset Meja 7
    console.log('Resetting Meja 7...');
    await client.query(`UPDATE cafe_tables SET status = 'available', "currentTransactionId" = NULL, "currentCustomer" = NULL WHERE id = 7`);
    console.log('Meja 7 reset to available.');

    // 2. Fetch targetTx (Meja 8) ID
    const res8 = await client.query(`SELECT "currentTransactionId" FROM cafe_tables WHERE id = 8`);
    if (res8.rows.length === 0 || !res8.rows[0].currentTransactionId) {
      console.log('No active transaction on Meja 8.');
      return;
    }
    const targetTxId = res8.rows[0].currentTransactionId;
    console.log('Meja 8 Target Transaction ID:', targetTxId);

    // 3. What happened to sourceTx? Meja 7's cancelled transaction?
    // Let's find the recently cancelled transaction for cafe table 7
    const res7Tx = await client.query(`SELECT id FROM transactions WHERE "cafeTableId" = 7 AND status = 'CANCELLED' ORDER BY "createdAt" DESC LIMIT 1`);
    if (res7Tx.rows.length > 0) {
      const sourceTxId = res7Tx.rows[0].id;
      console.log('Found source cancelled transaction ID:', sourceTxId);
      
      // Let's see if any items were left behind on sourceTxId
      const resItems = await client.query(`SELECT id, quantity, "priceAtOrder" FROM order_items WHERE "transactionId" = $1`, [sourceTxId]);
      if (resItems.rows.length > 0) {
        console.log(`Found ${resItems.rows.length} items stuck on sourceTx. Moving them to targetTx...`);
        for (const item of resItems.rows) {
          await client.query(`UPDATE order_items SET "transactionId" = $1 WHERE id = $2`, [targetTxId, item.id]);
        }
      } else {
        console.log('No items stuck on sourceTx. They must have already moved.');
      }
    }

    // 4. Recalculate Cafe Total for targetTx
    const resAllItems = await client.query(`SELECT quantity, "priceAtOrder", status FROM order_items WHERE "transactionId" = $1`, [targetTxId]);
    let cafeTotal = 0;
    for (const item of resAllItems.rows) {
      if (item.status !== 'CANCELLED') {
        cafeTotal += Number(item.quantity) * Number(item.priceAtOrder);
      }
    }
    console.log('Recalculated Cafe Total for Meja 8:', cafeTotal);

    // Update targetTx grandTotal
    // Assuming billiardTotal is 0 for cafe-only
    await client.query(`UPDATE transactions SET "cafeTotal" = $1, "grandTotal" = $1 WHERE id = $2`, [cafeTotal, targetTxId]);
    console.log('Target Transaction Updated!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fix();
