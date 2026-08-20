import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ShiftService } from './src/finance/shift.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const shiftService = app.get(ShiftService);
  try {
    const res = await shiftService.getOrCreateActiveBusinessDay();
    console.log('Success:', res);
  } catch (err) {
    console.error('Error running getOrCreateActiveBusinessDay:');
    console.error(err);
  }
  await app.close();
}

test();
