
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AIService } from './src/ai/ai.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const aiService = app.get(AIService);

  console.log('--- AI BILLIARD PACKAGE PRICING VERIFICATION ---');

  const result = await aiService.calculateTargetMix(2000000);
  
  const billiardItems = result.items?.filter((it: any) => it.type === 'BILLIARD') || [];
  
  console.log(`\nFound ${billiardItems.length} Billiard Packages in recommendation:`);
  billiardItems.forEach((it: any) => {
      console.log(`- ${it.name}: Price Rp ${it.price}, Target Qty: ${it.targetQuantity}`);
  });

  const zeroPriceItems = billiardItems.filter((it: any) => it.price === 0);
  if (zeroPriceItems.length === 0 && billiardItems.length > 0) {
      console.log('✅ PASS: All recommended billiard packages have non-zero prices.');
  } else if (billiardItems.length === 0) {
      console.log('⚠️ Warning: No billiard packages recommended. Target revenue might be too low or demand history is missing.');
  } else {
      console.log('❌ FAIL: Found recommended billiard packages with Rp 0 price.');
  }

  await app.close();
}

bootstrap();
