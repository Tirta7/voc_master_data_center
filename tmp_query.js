const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'billiard_db',
  password: 'tirta',
  port: 4538,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, "tableName", "macAddress", "lastHeartbeat" FROM tables WHERE "deletedAt" IS NULL;');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
