import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { buildOpenApi } from './openapi.bootstrap';

async function main() {
  process.env.DATABASE_URL ??=
    'postgresql://openapi:openapi@127.0.0.1:5432/agentops_openapi';
  process.env.OIDC_JWKS_URL ??=
    'http://localhost:8080/realms/agentops/protocol/openid-connect/certs';
  process.env.OIDC_ISSUER ??= 'http://localhost:8080/realms/agentops';
  process.env.OIDC_AUDIENCE ??= 'agentops-api';
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    await app.init();
    const target = resolve('docs/api/openapi.json');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(buildOpenApi(app), null, 2)}\n`);
    console.log('Exported', target);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(
    'OpenAPI export failed:',
    error instanceof Error ? error.message : 'unknown',
  );
  process.exitCode = 1;
});
