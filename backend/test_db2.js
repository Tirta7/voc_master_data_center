const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:1@127.0.0.1:4538/billiard_db' });
pool.query('SELECT m.id, m.name as m_name, c.name as category_name, m."productionTarget" as m_pt, c."productionTarget" as c_pt FROM menu_items m LEFT JOIN categories c ON m."categoryId" = c.id LIMIT 40')
    .then(res => { console.table(res.rows); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
