
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('--- BILLIARD PACKAGE DIAGNOSTICS ---');

  const packages = await dataSource.query('SELECT id, name, price, "minutePrice", type FROM billiard_packages WHERE "isActive" = true');
  console.log('Active Billiard Packages:');
  packages.forEach((pkg: any) => {
    console.log(`ID: ${pkg.id}, Name: ${pkg.name}, Price: ${pkg.price}, MinutePrice: ${pkg.minutePrice}, Type: ${pkg.type}`);
  });

  await app.close();
}

bootstrap();
