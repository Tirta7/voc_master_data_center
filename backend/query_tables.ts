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
    const tableRepo = AppDataSource.getRepository(Table);
    const tables = await tableRepo.find({
      where: { macAddress: '781C3CCC0744' },
      order: { id: 'ASC' }
    });
    
    console.log(JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await AppDataSource.destroy();
  }
}

run();
