import { DataSource } from 'typeorm';
import * as path from 'path';

// Define the absolute path to entities to ensure they are picked up
const AppDataSource = new DataSource({
    type: 'postgres',
    host: '127.0.0.1',
    port: 4538,
    username: 'postgres',
    password: '1',
    database: 'billiard_db',
    entities: [path.join(__dirname, 'src/**/*.entity.ts')],
    synchronize: true, // This will help rebuild, but we will force drop first
    dropSchema: true // DANGER: This will drop EVERYTHING
});

async function factoryReset() {
    try {
        console.log('--- FACTORY RESET INITIATED ---');
        console.log('Connecting to database and dropping all schemas...');

        await AppDataSource.initialize();

        console.log('Database schemas dropped and synchronized successfully (Empty state).');
        console.log('Please restart your backend server to allow NestJS to run the default Seeders (Admin, etc).');

        process.exit(0);
    } catch (err) {
        console.error('Factory Reset Failed:', err);
        process.exit(1);
    }
}

factoryReset();
