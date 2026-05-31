const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  host: '127.0.0.1',
  port: 4538,
  username: 'postgres',
  password: '1',
  database: 'billiard_db',
});
ds.initialize().then(async () => {
  const result = await ds.query(`
    UPDATE tables t
    SET "lastSessionData" = null
    WHERE "lastSessionData" IS NOT NULL
      AND (
        status = 'available'
        OR (
          status != 'available'
          AND NOT EXISTS (
            SELECT 1 FROM transactions tx 
            WHERE tx."tableId" = t.id 
              AND tx.status = 'UNPAID' 
              AND tx."voucherCode" IS NOT NULL
          )
        )
      )
  `);
  console.log('Cleaned tables:', result[1]);
  process.exit(0);
}).catch(console.error);
