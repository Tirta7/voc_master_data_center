import { DataSource } from 'typeorm';
import { Locker } from './src/locker/entities/locker.entity';
import { LockerSession } from './src/locker/entities/locker-session.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [Locker, LockerSession],
    synchronize: false,
});

AppDataSource.initialize()
    .then(() => {
        console.log('DataSource initialized successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error during DataSource initialization:', error);
        process.exit(1);
    });
