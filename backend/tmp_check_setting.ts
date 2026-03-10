
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
    
    const setRes = await client.query('SELECT value FROM settings WHERE key = \'royaltyPointsPerAmount\'');
    console.log('ROYALTY_SETTING:', setRes.rows[0]?.value);

    await client.end();
  } catch (err) {
    console.error(err);
  }
}

check();
