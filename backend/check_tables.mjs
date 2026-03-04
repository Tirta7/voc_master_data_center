import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    host: '127.0.0.1',
    port: 4538,
    user: 'postgres',
    password: '1',
    database: 'billiard_db',
});

await client.connect();

// Full detail of MEJA 1
const res1 = await client.query('SELECT * FROM tables WHERE id = 1');
console.log('=== MEJA 1 FULL DATA ===');
for (const [key, val] of Object.entries(res1.rows[0] || {})) {
    console.log(`  ${key}: ${JSON.stringify(val)}`);
}

// Full detail of MEJA 4
const res2 = await client.query('SELECT * FROM tables WHERE id = 3');
console.log('=== MEJA 4 FULL DATA ===');
for (const [key, val] of Object.entries(res2.rows[0] || {})) {
    console.log(`  ${key}: ${JSON.stringify(val)}`);
}

await client.end();
