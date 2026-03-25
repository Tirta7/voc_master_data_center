const { DataSource } = require('typeorm');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'voc_billiard_db',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('--- TABLES (Billiard) ---');
    const tables = await dataSource.query('SELECT id, tableName, status FROM tables');
    for (const t of tables) {
      const sessions = await dataSource.query('SELECT COUNT(*) as count FROM sessions WHERE tableId = ?', [t.id]);
      const transactions = await dataSource.query('SELECT COUNT(*) as count FROM transactions WHERE tableId = ?', [t.id]);
      console.log(`ID: ${t.id}, Name: ${t.tableName}, Status: ${t.status}, Sessions: ${sessions[0].count}, Transactions: ${transactions[0].count}`);
    }

    console.log('\n--- CAFE TABLES ---');
    const cafeTables = await dataSource.query('SELECT id, tableName, status FROM cafe_tables');
    for (const t of cafeTables) {
      const transactions = await dataSource.query('SELECT COUNT(*) as count FROM transactions WHERE cafeTableId = ?', [t.id]);
      console.log(`ID: ${t.id}, Name: ${t.tableName}, Status: ${t.status}, Transactions: ${transactions[0].count}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dataSource.destroy();
  }
}

check();
