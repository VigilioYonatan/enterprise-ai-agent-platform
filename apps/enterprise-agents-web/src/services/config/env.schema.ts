import { z } from 'zod';

export const clientEnvSchema = z.object({
  VITE_OIDC_AUTHORITY: z.string().url(),
  VITE_OIDC_CLIENT_ID: z.string().min(1).default('agentops-web'),
});

export type ClientEnv = z.output<typeof clientEnvSchema>;

export function loadClientEnv(): ClientEnv {
  const default_authority =
    typeof location !== 'undefined'
      ? `${location.origin}/realms/agentops`
      : 'http://localhost:8080/realms/agentops';

  const raw_env = {
    VITE_OIDC_AUTHORITY:
      import.meta.env.VITE_OIDC_AUTHORITY || default_authority,
    VITE_OIDC_CLIENT_ID: import.meta.env.VITE_OIDC_CLIENT_ID || 'agentops-web',
  };

  return clientEnvSchema.parse(raw_env);
}

export const clientEnv = loadClientEnv();
