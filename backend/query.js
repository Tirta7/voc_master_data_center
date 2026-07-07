const { Client } = require('pg');
const client = new Client({ host: '127.0.0.1', port: 4538, user: 'postgres', password: '1', database: 'billiard_db' });
client.connect().then(() => {
  return client.query("SELECT source, SUM(amount) FROM cashflow WHERE type='in' AND timestamp >= '2026-06-01' GROUP BY source;");
}).then(res => {
  console.log("JUNE REVENUE");
  console.table(res.rows);
  return client.query("SELECT source, SUM(amount) FROM cashflow WHERE type='in' AND timestamp >= '2026-05-01' AND timestamp < '2026-06-01' GROUP BY source;");
}).then(res => {
  console.log("MAY REVENUE");
  console.table(res.rows);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
