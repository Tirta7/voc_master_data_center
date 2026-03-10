const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:1@127.0.0.1:4538/billiard_db' });
pool.query(`
    UPDATE categories SET "productionTarget" = 'BDS' WHERE name ILIKE '%minum%';
    UPDATE categories SET "productionTarget" = 'BDS' WHERE name ILIKE '%drink%';
    UPDATE categories SET "productionTarget" = 'KDS' WHERE name ILIKE '%makan%';
    UPDATE categories SET "productionTarget" = 'KDS' WHERE name ILIKE '%snack%';
    UPDATE categories SET "productionTarget" = 'NONE' WHERE name ILIKE '%store%';
    UPDATE categories SET "productionTarget" = 'NONE' WHERE name ILIKE '%rokok%';
`)
    .then(() => { console.log("DB Updated"); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
