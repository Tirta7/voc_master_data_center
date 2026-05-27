const { Client } = require('pg');
const client = new Client({
  host: '127.0.0.1',
  port: 4538,
  user: 'postgres',
  password: '1',
  database: 'billiard_db'
});
async function run() {
  await client.connect();
  const res = await client.query(`SELECT id, "moduleType", "referenceId", metadata FROM approval_requests WHERE "moduleType" = 'DATA_EDIT' AND status = 'PENDING'`);
  console.log(JSON.stringify(res.rows, null, 2));
  
  let deletedCount = 0;
  for (const row of res.rows) {
     const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
     if (!meta.changes || Object.keys(meta.changes).length === 0) {
         console.log(`Deleting stuck empty request ${row.id} for item: ${meta.itemName}`);
         await client.query(`DELETE FROM approval_requests WHERE id = $1`, [row.id]);
         deletedCount++;
     }
  }
  console.log(`Deleted ${deletedCount} empty pending requests.`);
  await client.end();
}
run();
