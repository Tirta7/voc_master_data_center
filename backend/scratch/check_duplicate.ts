import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  console.log('Checking constraint: UQ_4b9cc327e955d8b666da99cd0c2');
  
  try {
    const result = await dataSource.query(`
      SELECT
          t.relname as table_name,
          i.relname as index_name,
          a.attname as column_name
      FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
      WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND i.relname = 'UQ_4b9cc327e955d8b666da99cd0c2'
    `);
    
    console.log('Constraint Details:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
