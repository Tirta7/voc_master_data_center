const { Client } = require('pg');
const client = new Client({ host: '127.0.0.1', port: 4538, user: 'postgres', password: '1', database: 'billiard_db' });
client.connect().then(async () => {
    // 1. Update the ADMIN role to approvalLevel 4
    await client.query('UPDATE roles SET "approvalLevel" = 4 WHERE id = 1');
    console.log('Role ADMIN updated to approvalLevel 4.');
    client.end();
}).catch(console.error);
