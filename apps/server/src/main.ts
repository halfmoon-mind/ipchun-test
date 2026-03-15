import { config } from 'dotenv';
import { resolve } from 'path';

const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(__dirname, '..', envFile) });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
