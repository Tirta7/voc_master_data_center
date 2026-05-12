const { Client } = require('pg');

async function unfixOldData() {
  const client = new Client({
    host: '127.0.0.1',
    port: 4538,
    user: 'postgres',
    password: '1',
    database: 'billiard_db',
  });

  try {
    await client.connect();
    
    // Set businessDayId = NULL for transactions in BD 487 that were created before 2026-05-12
    const res = await client.query(`
      UPDATE transactions 
      SET "businessDayId" = NULL
      WHERE "businessDayId" = 487 
      AND "createdAt" < '2026-05-12T00:00:00Z'
    `);
    console.log('Unfixed Transactions:', res.rowCount);

    // Also unfix cashflow entries
    const resCF = await client.query(`
      UPDATE cashflow
      SET "businessDayId" = NULL
      WHERE "businessDayId" = 487
      AND timestamp < '2026-05-12T00:00:00Z'
    `);
    console.log('Unfixed Cashflow entries:', resCF.rowCount);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

unfixOldData();
