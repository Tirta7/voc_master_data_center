const { Client } = require('pg');

async function fixData() {
  const client = new Client({
    host: '127.0.0.1',
    port: 4538,
    user: 'postgres',
    password: '1',
    database: 'billiard_db',
  });

  try {
    await client.connect();
    
    // 1. Link transaction 327 to Business Day 487 (12 Mei)
    // Also change type to CAFE if it's currently BILLIARD
    const res1 = await client.query(`
      UPDATE transactions 
      SET "businessDayId" = 487, type = 'CAFE'
      WHERE id = 327
    `);
    console.log('Fixed Transaction 327:', res1.rowCount);

    // 2. Link the cashflow entry for this transaction too
    const res2 = await client.query(`
      UPDATE cashflow
      SET "businessDayId" = 487
      WHERE "referenceId" = 'CAFE-20260513-0001-755'
    `);
    console.log('Fixed Cashflow Entry:', res2.rowCount);

    // 3. Optional: Fix ANY other cafe transactions that might be missing BD linkage
    const res3 = await client.query(`
      UPDATE transactions
      SET "businessDayId" = 487
      WHERE "businessDayId" IS NULL AND "invoiceNumber" LIKE 'CAFE-%'
    `);
    console.log('Fixed other Cafe Transactions:', res3.rowCount);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fixData();
