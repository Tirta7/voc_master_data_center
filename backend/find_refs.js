
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 4538,
  user: 'postgres',
  password: '1',
  database: 'billiard_db',
});

async function findReferencingTables() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'businessDayId' 
        AND table_schema = 'public'
    `);
    console.log(res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

findReferencingTables();
