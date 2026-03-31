
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 4538,
  user: 'postgres',
  password: '1',
  database: 'billiard_db',
});

async function checkCashflowSpam() {
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT count(*) as count 
      FROM cashflow 
      WHERE "timestamp"::date = '2026-03-26'
    `);
    
    console.log(res.rows[0]);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCashflowSpam();
