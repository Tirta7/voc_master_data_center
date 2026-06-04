const { Client } = require('pg'); 
const c = new Client({ connectionString: 'postgresql://postgres:1@127.0.0.1:4538/billiard_db' }); 
c.connect().then(() => c.query('TRUNCATE TABLE push_subscriptions'))
.then(res => { console.log(JSON.stringify(res.rows, null, 2)); c.end(); })
.catch(err => { console.error(err); c.end(); });
