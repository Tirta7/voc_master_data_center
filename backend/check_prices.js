
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
    const res = await client.query('SELECT id, name, price, "minutePrice", type, "isActive" FROM billiard_packages');
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
