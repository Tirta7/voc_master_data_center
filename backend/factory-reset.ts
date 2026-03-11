import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

// Define the absolute path to entities to ensure they are picked up
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '4538'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1',
    database: process.env.DB_DATABASE || 'billiard_db',
    entities: [path.join(__dirname, 'src/**/*.entity.ts')],
    synchronize: true,
    dropSchema: true
});

function deleteFolderRecursive(directoryPath: string) {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach((file) => {
            const curPath = path.join(directoryPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        // Non-recursive folder keep (logos, promos, rewards)
        // console.log(`Cleared directory: ${directoryPath}`);
    }
}

async function factoryReset() {
    try {
        console.log('--- VOC SYSTEM: DEEP FACTORY RESET ---');
        
        // 1. Wipe Uploaded Media
        console.log('[1/2] Removing uploaded media files (logos, promos, rewards)...');
        const uploadDirs = ['logos', 'promos', 'rewards'];
        uploadDirs.forEach(dir => {
            const fullPath = path.join(__dirname, 'public', 'uploads', dir);
            deleteFolderRecursive(fullPath);
        });
        console.log('   -> Media files cleared.');

        // 2. Wipe Database
        console.log('[2/2] Connecting to database and dropping all schemas...');
        await AppDataSource.initialize();
        console.log('   -> Database dropped and synchronized (Empty state).');

        console.log('\nSUCCESS: System has been reset to factory defaults.');
        console.log('The next time you start the app, the Default Admin (admin/123) will be recreated.');

        process.exit(0);
    } catch (err) {
        console.error('Factory Reset Failed:', err);
        process.exit(1);
    }
}

factoryReset();
