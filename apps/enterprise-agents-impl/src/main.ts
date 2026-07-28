import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { installOpenApi } from './bootstrap/openapi.bootstrap';
import { AppConfigService } from './shared/config/app-config.service';

async function main() {
  const app = await NestFactory.create(AppModule, { rawBody: false });
  const config = app.get(AppConfigService);

  app.enableShutdownHooks();
  app.enableCors({
    origin: config.cors_origin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'If-Match',
      'Idempotency-Key',
      'Last-Event-ID',
    ],
  });

  if (config.docs_enabled) installOpenApi(app);
  await app.listen(config.port, '0.0.0.0');
}
main().catch((e) => {
  console.error('API boot failed:', e instanceof Error ? e.message : 'unknown');
  process.exitCode = 1;
});
