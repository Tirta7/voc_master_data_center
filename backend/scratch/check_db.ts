
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BilliardService } from '../src/billiard/billiard.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(BilliardService);
  
  const tables = await service['tableRepository'].find(); 
  console.log('--- DB TABLE LIST ---');
  tables.forEach((t: any) => {
    console.log(`ID: ${t.id} | Name: ${t.tableName} | MAC: ${t.macAddress} | RelayPin: ${t.relayPin} | Hardware: ${t.hardwareType}`);
  });
  
  await app.close();
}

bootstrap();
