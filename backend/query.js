const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: '127.0.0.1', database: 'billiard_db', password: '1', port: 4538 });
client.connect().then(() => {
    return client.query('SELECT type, description, amount, "referenceId" FROM point_ledgers WHERE "referenceId" = \'GAME-ulx4g\'');
}).then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
}).catch(console.error);
