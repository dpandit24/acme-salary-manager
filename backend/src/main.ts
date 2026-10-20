import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configure_app } from './configure_app';
import { require_env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register());
  configure_app(app, { session_secret: require_env('SESSION_SECRET'), frontend_origin: process.env.FRONTEND_ORIGIN });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
