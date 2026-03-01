const { Client } = require('pg');

async function checkSessions() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'billiard_db',
        password: 'admin', // assuming default or common password from earlier logs
        port: 5432,
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT t.id, t."tableName", t."sessionType", tr."billingDetails", tr."fareName"
            FROM "table" t 
            JOIN "transaction" tr ON t.id = tr."tableId" 
            WHERE t.status = 'IN_USE';
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Database connection error:', err.message);
    } finally {
        await client.end();
    }
}

checkSessions();
