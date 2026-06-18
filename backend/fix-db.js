const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: '127.0.0.1',
    port: 4538,
    user: 'postgres',
    password: '1',
    database: 'billiard_db',
  });
  
  await client.connect();

  // Fix transactions 640, 641, 642, 643 by setting businessDayId to 527
  await client.query(`UPDATE transactions SET "businessDayId" = 527 WHERE id IN (640, 641, 642, 643)`);
  
  // Close the old shift 36 so it doesn't corrupt future transactions
  await client.query(`UPDATE shifts SET "endTime" = NOW() WHERE id = 36 AND "endTime" IS NULL`);
  
  console.log('Fixed Database Data!');
  await client.end();
}

run();
