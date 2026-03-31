
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 4538,
  user: 'postgres',
  password: '1',
  database: 'billiard_db',
});

async function checkAuditSpam() {
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT action, count(*) as count 
      FROM audit_logs 
      WHERE "createdAt" >= '2026-03-26 00:00:00' 
        AND "createdAt" < '2026-03-27 00:00:00'
      GROUP BY action
      ORDER BY count DESC
    `);
    
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkAuditSpam();
