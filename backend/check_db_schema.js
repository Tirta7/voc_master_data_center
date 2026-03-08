const { DataSource } = require('typeorm');
const path = require('path');

const dataSource = new DataSource({
  type: 'sqlite',
  database: 'd:/Billiard_APPS/database.sqlite', // Adjust if name differs
  synchronize: false,
});

async function check() {
  try {
    await dataSource.initialize();
    console.log('DB Initialized');
    const tableInfo = await dataSource.query(`PRAGMA table_info(transactions);`);
    const hasAppliedPromos = tableInfo.some(col => col.name === 'appliedPromos');
    console.log('Columns in transactions:', tableInfo.map(c => c.name).join(', '));
    console.log('Has appliedPromos column:', hasAppliedPromos);
    await dataSource.destroy();
  } catch (err) {
    console.error('Check failed:', err);
  }
}

check();
