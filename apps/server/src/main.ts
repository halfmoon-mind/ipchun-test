import { config } from 'dotenv';
import { resolve } from 'path';

const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(__dirname, '..', envFile) });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IPCHUN API')
    .setDescription('인디 밴드/아티스트 팬 플랫폼 API')
    .setVersion('1.0')
    .addGlobalParameters({
      name: 'x-user-id',
      in: 'header',
      required: false,
      description: '사용자 식별자 (attendance, bookmark 엔드포인트에서 필수)',
      schema: { type: 'string', format: 'uuid' },
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
