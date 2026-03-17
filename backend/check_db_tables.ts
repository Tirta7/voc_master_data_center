
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('--- TABLE COUNT DIAGNOSTICS ---');

  const tables = await dataSource.query('SELECT count(*) as count FROM tables');
  console.log(`Tables (Billiard): ${tables[0].count}`);

  const cafeTables = await dataSource.query('SELECT count(*) as count FROM cafe_tables');
  console.log(`Cafe Tables: ${cafeTables[0].count}`);

  const tableNames = await dataSource.query('SELECT tableName FROM tables');
  console.log('Billiard Table Names:', tableNames.map((t: any) => t.tableName).join(', '));

  const cafeTableNames = await dataSource.query('SELECT tableName FROM cafe_tables');
  console.log('Cafe Table Names:', cafeTableNames.map((t: any) => t.tableName).join(', '));

  await app.close();
}

bootstrap();
