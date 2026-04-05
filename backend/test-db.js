const { Client } = require('pg');
const client = new Client({ host: '127.0.0.1', port: 4538, user: 'postgres', password: '1', database: 'billiard_db' });
client.connect().then(async () => {
    const res = await client.query('SELECT id, "moduleType", "referenceId", status, "currentLevelIndex", "requiredLevels" FROM approval_requests ORDER BY id DESC LIMIT 5');
    console.log('APPROVAL REQUESTS:', res.rows);
    const waste = await client.query('SELECT id, status, quantity, valuation FROM wastes ORDER BY id DESC LIMIT 5');
    console.log('WASTES:', waste.rows);
    client.end();
}).catch(console.error);
