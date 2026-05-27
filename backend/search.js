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
  const res = await client.query(`SELECT id, name, sku FROM menu_items WHERE name ILIKE '%Bir Bintang%'`);
  console.log("Menu Items:", res.rows);
  const res2 = await client.query(`SELECT id, name, sku FROM ingredients WHERE name ILIKE '%Bir Bintang%'`);
  console.log("Ingredients:", res2.rows);
  await client.end();
}
run();
