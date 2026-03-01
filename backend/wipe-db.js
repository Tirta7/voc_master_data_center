const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function wipeDatabase() {
    console.log('--- Database Wipe Starting ---');
    try {
        // Parse .env manually for DB credentials
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');

        const host = envContent.match(/DB_HOST=(.*)/)[1];
        const port = envContent.match(/DB_PORT=(.*)/)[1];
        const user = envContent.match(/DB_USERNAME=(.*)/)[1];
        const password = envContent.match(/DB_PASSWORD=(.*)/)[1];
        const database = envContent.match(/DB_DATABASE=(.*)/)[1];

        const client = new Client({
            host,
            port,
            user,
            password,
            database
        });

        await client.connect();
        console.log('Connected to PostgreSQL Database.');

        // This drops all tables and data, resetting all sequences (IDs)
        await client.query('DROP SCHEMA public CASCADE;');
        await client.query('CREATE SCHEMA public;');
        await client.query('GRANT ALL ON SCHEMA public TO postgres;');
        await client.query('GRANT ALL ON SCHEMA public TO public;');
        console.log('PostgreSQL public schema successfully dropped and recreated.');

        await client.end();
    } catch (e) {
        console.error('Failed wiping PostgreSQL DB:', e.message);
    }

    try {
        // Wipe generated member-cards
        const cardsDir = path.join(__dirname, 'public', 'member-cards');
        if (fs.existsSync(cardsDir)) {
            const files = fs.readdirSync(cardsDir);
            for (const file of files) {
                if (file.endsWith('.png') || file.endsWith('.jpg')) {
                    fs.unlinkSync(path.join(cardsDir, file));
                }
            }
            console.log(`Cleared ${files.length} files from public/member-cards.`);
        }
    } catch (e) {
        console.error('Failed wiping files:', e.message);
    }

    console.log('--- Wipe Complete ---');
    console.log('Restart the NestJS backend to automatically synchronize and recreate all tables and data from ID 1.');
}

wipeDatabase();
