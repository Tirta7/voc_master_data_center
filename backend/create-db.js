
const { Client } = require('pg');

async function createDatabase() {
    const client = new Client({
        host: '127.0.0.1',
        port: 4538,
        user: 'postgres',
        password: '1',
        database: 'postgres' // Connect to maintenance db
    });

    try {
        await client.connect();
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'billiard_db'");
        if (res.rowCount === 0) {
            console.log("Creating database 'billiard_db'...");
            await client.query("CREATE DATABASE billiard_db");
            console.log("Database 'billiard_db' created successfully.");
        } else {
            console.log("Database 'billiard_db' already exists.");
        }
    } catch (err) {
        console.error("Error creating database:", err.message);
    } finally {
        await client.end();
    }
}

createDatabase();
