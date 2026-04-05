const { Client } = require('pg');
const client = new Client({ host: '127.0.0.1', port: 4538, user: 'postgres', password: '1', database: 'billiard_db' });
client.connect().then(async () => {
    const res = await client.query('SELECT roles.id, roles.name, roles."approvalLevel" FROM roles');
    console.log('ALL ROLES:', res.rows);
    client.end();
}).catch(console.error);
