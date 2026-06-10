const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 4538,
  user: 'postgres',
  password: '1',
  database: 'billiard_db'
});

async function run() {
  try {
    await client.connect();
    await client.query(`ALTER TABLE "order_items" ALTER COLUMN "quantity" TYPE numeric(10,3) USING "quantity"::numeric(10,3)`);
    console.log('Successfully altered quantity column type to numeric(10,3)');
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}
run();
