const { Client } = require('pg');
require('dotenv').config();

async function fix() {
    console.log("Connecting to postgres database...");
    
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    });

    await client.connect();
    
    try {
        await client.query("BEGIN");
        
        let res = await client.query("UPDATE categories SET \"productionTarget\" = 'BDS' WHERE \"productionTarget\" IN ('80', '200')");
        console.log(`Fixed ${res.rowCount} categories to BDS`);

        res = await client.query("UPDATE categories SET \"productionTarget\" = 'KDS' WHERE \"productionTarget\" IN ('150', '100')");
        console.log(`Fixed ${res.rowCount} categories to KDS`);

        res = await client.query("UPDATE order_items SET station = 'BDS' WHERE station IN ('80', '200')");
        console.log(`Fixed ${res.rowCount} order items to BDS`);

        res = await client.query("UPDATE order_items SET station = 'KDS' WHERE station IN ('150', '100')");
        console.log(`Fixed ${res.rowCount} order items to KDS`);

        await client.query("COMMIT");
        console.log("Database fixed successfully! Please refresh your KDS / BDS page.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error fixing database:", err);
    } finally {
        await client.end();
    }
}

fix();
