require('dotenv').config();
const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/voc_master_data_center',
  synchronize: false,
});
ds.initialize().then(async () => {
  const res = await ds.query(`SELECT name, "stockQuantity" FROM ingredient WHERE name LIKE '%SURYA%'`);
  console.log(res);
  await ds.destroy();
}).catch(console.error);
