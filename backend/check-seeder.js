
const { Client } = require('pg');

async function checkUser() {
    const client = new Client({
        host: '127.0.0.1',
        port: 4538,
        user: 'postgres',
        password: '1',
        database: 'billiard_db'
    });

    try {
        await client.connect();
        const res = await client.query("SELECT username, name FROM users");
        console.log("Found users:", res.rows);
    } catch (err) {
        console.error("Error checking users:", err.message);
    } finally {
        await client.end();
    }
}

checkUser();
