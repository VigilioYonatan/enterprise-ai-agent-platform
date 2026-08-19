import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z
    .string()
    .regex(/^\d+$/)
    .default('3000')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),
  CORS_ORIGIN: z.string().default('http://localhost:8080'),
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_FILE: z.string().optional(),
  OIDC_JWKS_URL: z.string().url().default('http://127.0.0.1:8081/certs'),
  OIDC_ISSUER: z
    .string()
    .url()
    .default('http://localhost:8080/realms/agentops'),
  OIDC_AUDIENCE: z.string().min(1).default('agentops-api'),
  DOCS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
  OLLAMA_URL: z.string().url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2:3b'),
  KNOWLEDGE_EMBED_MODEL: z.string().default('nomic-embed-text'),
  CONNECTOR_OAUTH_REVOKE_URL: z.string().url().optional(),
  CONNECTOR_OAUTH_PROFILE_URL: z.string().url().optional(),
  OAUTH_ENCRYPTION_KEY_FILE: z.string().optional(),
  NATS_URL: z.string().optional(),
  NATS_TOKEN_FILE: z.string().optional(),
});

export type EnvironmentVariables = z.output<typeof environmentSchema>;

export function resolveDatabaseUrl(env: EnvironmentVariables): string {
  if (env.DATABASE_URL_FILE) {
    const value = readFileSync(env.DATABASE_URL_FILE, 'utf8').trim();
    if (!/^postgres(ql)?:\/\//.test(value)) {
      throw Error('Invalid DATABASE_URL_FILE content');
    }
    return value;
  }
  if (env.NODE_ENV === 'production') {
    throw Error('DATABASE_URL_FILE required in production');
  }
  const value = env.DATABASE_URL ?? process.env.DATABASE_URL;
  if (!value) {
    if (env.NODE_ENV === 'test') {
      return 'postgres://agentops:password@127.0.0.1:5432/agentops';
    }
    throw Error('DATABASE_URL required for local/test mode');
  }
  return value;
}

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): EnvironmentVariables {
  return environmentSchema.parse(source);
}
