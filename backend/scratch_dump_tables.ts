
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { BilliardService } from './src/billiard/billiard.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const billiardService = app.get(BilliardService);
  const tables = await billiardService.getAllTables();
  console.log(JSON.stringify(tables, null, 2));
  await app.close();
}
bootstrap();
