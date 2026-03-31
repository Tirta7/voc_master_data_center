
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 4538,
  user: 'postgres',
  password: '1',
  database: 'billiard_db',
});

async function checkGlobalSpam() {
  try {
    await client.connect();
    
    // Find records with 0 revenue and duration < 5 minutes across all dates
    const res = await client.query(`
      SELECT date, COUNT(*) as count
      FROM business_days 
      WHERE "totalRevenue" = 0 
        AND "isClosed" = true
        AND (("endTime" - "startTime") < interval '5 minutes' OR "endTime" IS NULL)
      GROUP BY date
      HAVING COUNT(*) > 1
      ORDER BY date DESC
    `);
    
    console.log("Potential spam groups found:");
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkGlobalSpam();
