const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: '127.0.0.1',
    port: 4538,
    user: 'postgres',
    password: '1',
    database: 'billiard_db'
  });
  
  await client.connect();
  const res = await client.query('SELECT id, "tableId", "invoiceNumber", "customerName", "createdAt", status FROM transactions WHERE "tableId" = 1 ORDER BY "createdAt" DESC LIMIT 5');
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
