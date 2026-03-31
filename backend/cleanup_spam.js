
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 4538,
  user: 'postgres',
  password: '1',
  database: 'billiard_db',
});

const tablesToCheck = [
  'shifts',
  'transaction_payments_archive',
  'cashflow_archive',
  'transactions_archive',
  'battle_plans',
  'transactions',
  'transaction_payments',
  'expenses',
  'violations',
  'cashflow',
  'ai_upsell_prompts'
];

async function cleanup() {
  try {
    await client.connect();
    
    // Construct the NOT EXISTS clauses
    const notExistsClauses = tablesToCheck.map(t => 
      `NOT EXISTS (SELECT 1 FROM "${t}" WHERE "${t}"."businessDayId" = bd.id)`
    ).join(' AND ');

    const query = `
      SELECT bd.id 
      FROM business_days bd
      WHERE bd.date = '2026-03-26' 
        AND bd."totalRevenue" = 0 
        AND bd."isClosed" = true
        AND ${notExistsClauses}
      ORDER BY bd.id ASC
    `;

    const res = await client.query(query);
    console.log(`Found ${res.rows.length} completely isolated spam records.`);
    
    if (res.rows.length > 0) {
      const idsToDelete = res.rows.map(r => r.id);
      console.log(`Deleting ${idsToDelete.length} records...`);
      
      const delRes = await client.query(`
        DELETE FROM business_days 
        WHERE id = ANY($1::int[])
      `, [idsToDelete]);
      
      console.log(`Deleted ${delRes.rowCount} records.`);
    } else {
      console.log("No empty records to delete.");
    }

  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await client.end();
  }
}

cleanup();
