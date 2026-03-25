import { DataSource } from 'typeorm';
import { Table } from './src/billiard/entities/table.entity';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function run() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '4538'),
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
    
    let output = '';
    tables.forEach(t => {
      output += `ID: ${t.id} | Name: ${t.tableName} | Pin: ${t.relayPin} | Light: ${t.isLightOn} | DeletedAt: ${t.deletedAt}\n`;
    });
    fs.writeFileSync('table_output_deleted.txt', output);
    console.log('Output written to table_output_deleted.txt');
  } catch (err) {
    console.error(err);
  } finally {
    await AppDataSource.destroy();
  }
}

run();
