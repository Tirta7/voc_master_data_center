
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BilliardPackage } from './src/billiard/entities/billiard-package.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get(getRepositoryToken(BilliardPackage));

  const packages = await repo.find();
  console.log('--- BILLIARD PACKAGES ---');
  packages.forEach((p: any) => {
    console.log(`ID: ${p.id}, Name: ${p.name}, Type: ${p.type}, Price: ${p.price}, MinutePrice: ${p.minutePrice}`);
  });

  await app.close();
}

bootstrap();
