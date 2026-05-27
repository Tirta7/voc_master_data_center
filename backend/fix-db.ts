// @ts-ignore
import { Client } from 'pg';

async function fix() {
    const client = new Client({
        host: '127.0.0.1',
        port: 4538,
        user: 'postgres',
        password: '1',
        database: 'billiard_db'
    });

    try {
        await client.connect();
        console.log("Connected to DB");
        
        // Find orphaned items (menu item deleted so menuItemId is null, no customName)
        const updateQuery = `
            UPDATE order_items
            SET status = 'CANCELLED'
            WHERE status NOT IN ('DONE', 'CANCELLED', 'CANCEL_REQUESTED', 'CANCEL_REJECTED')
              AND "menuItemId" IN (
                  SELECT id FROM menu_items WHERE name LIKE '%(DELETED-%'
              )
        `;
        const res = await client.query(updateQuery);
        console.log("Cancelled items count:", res.rowCount);
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        await client.end();
    }
}

fix();
