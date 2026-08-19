import { loadEnvironment, resolveDatabaseUrl } from './environment.schema';

/** Runtime-only secret resolution. The file variant is mandatory in production. */
export function databaseUrl(): string {
  const env = loadEnvironment();
  return resolveDatabaseUrl(env);
}
