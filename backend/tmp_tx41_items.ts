
const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: '127.0.0.1',
    port: 4538,
    user: 'postgres',
    password: '1',
    database: 'billiard_db',
  });

  try {
    await client.connect();
    
    const items = await client.query('SELECT * FROM order_items WHERE "transactionId" = 41');
    console.log('--- ITEMS FOR TX 41 ---');
    console.log(JSON.stringify(items.rows, null, 2));

    await client.end();
  } catch (err) {
    console.error(err);
  }
}

check();
