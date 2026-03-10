const { DataSource } = require('typeorm');
const ds = new DataSource({ type: 'postgres', url: 'postgresql://postgres:root@localhost:5432/billiard_db' });
ds.initialize().then(async () => {
    const res = await ds.query('SELECT m.id, m.name as m_name, c.name as category_name, m."productionTarget" as m_pt, c."productionTarget" as c_pt FROM menu_items m LEFT JOIN categories c ON m."categoryId" = c.id');
    console.table(res);
    process.exit();
}).catch(console.error);
