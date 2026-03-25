import { DataSource } from 'typeorm';
import { Table } from './src/billiard/entities/table.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [Table],
    synchronize: false,
  });

  try {
    await AppDataSource.initialize();
    const tables = await AppDataSource.getRepository(Table).find({
      where: { macAddress: '781C3CCC0744' },
      order: { id: 'ASC' }
    });
    
    tables.forEach(t => {
      console.log(`ID: ${t.id} | Name: ${t.tableName} | Pin: ${t.relayPin} | Light: ${t.isLightOn} | Status: ${t.status}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await AppDataSource.destroy();
  }
}

run();
