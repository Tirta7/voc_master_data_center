const { Client } = require('pg');
const client = new Client({ host: '127.0.0.1', port: 4538, user: 'postgres', password: '1', database: 'billiard_db' });
client.connect().then(async () => {
    const res = await client.query('SELECT roles.name, roles."approvalLevel" FROM users JOIN roles ON users."roleId" = roles.id');
    console.log('USER ROLES:', res.rows);
    client.end();
}).catch(console.error);
