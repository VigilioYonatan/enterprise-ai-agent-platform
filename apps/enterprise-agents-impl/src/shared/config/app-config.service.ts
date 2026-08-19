import { Injectable } from '@nestjs/common';
import {
  type EnvironmentVariables,
  loadEnvironment,
  resolveDatabaseUrl,
} from './environment.schema';

@Injectable()
export class AppConfigService {
  private readonly env: EnvironmentVariables;

  constructor() {
    this.env = loadEnvironment();
  }

  get node_env(): EnvironmentVariables['NODE_ENV'] {
    return this.env.NODE_ENV;
  }

  get port(): EnvironmentVariables['PORT'] {
    return this.env.PORT;
  }

  get cors_origin(): EnvironmentVariables['CORS_ORIGIN'] {
    return this.env.CORS_ORIGIN;
  }

  get database_url(): string {
    return resolveDatabaseUrl(this.env);
  }

  get oidc_jwks_url(): EnvironmentVariables['OIDC_JWKS_URL'] {
    return this.env.OIDC_JWKS_URL;
  }

  get oidc_issuer(): EnvironmentVariables['OIDC_ISSUER'] {
    return this.env.OIDC_ISSUER;
  }

  get oidc_audience(): EnvironmentVariables['OIDC_AUDIENCE'] {
    return this.env.OIDC_AUDIENCE;
  }

  get docs_enabled(): EnvironmentVariables['DOCS_ENABLED'] {
    return this.env.DOCS_ENABLED;
  }

  get ollama_url(): EnvironmentVariables['OLLAMA_URL'] {
    return this.env.OLLAMA_URL;
  }

  get ollama_model(): EnvironmentVariables['OLLAMA_MODEL'] {
    return this.env.OLLAMA_MODEL;
  }

  get knowledge_embed_model(): EnvironmentVariables['KNOWLEDGE_EMBED_MODEL'] {
    return this.env.KNOWLEDGE_EMBED_MODEL;
  }

  get connector_oauth_revoke_url(): EnvironmentVariables['CONNECTOR_OAUTH_REVOKE_URL'] {
    return this.env.CONNECTOR_OAUTH_REVOKE_URL;
  }

  get connector_oauth_profile_url(): EnvironmentVariables['CONNECTOR_OAUTH_PROFILE_URL'] {
    return this.env.CONNECTOR_OAUTH_PROFILE_URL;
  }

  get oauth_encryption_key_file(): EnvironmentVariables['OAUTH_ENCRYPTION_KEY_FILE'] {
    return this.env.OAUTH_ENCRYPTION_KEY_FILE;
  }

  get nats_url(): EnvironmentVariables['NATS_URL'] {
    return this.env.NATS_URL;
  }

  get nats_token_file(): EnvironmentVariables['NATS_TOKEN_FILE'] {
    return this.env.NATS_TOKEN_FILE;
  }

  get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.env[key];
  }
}
