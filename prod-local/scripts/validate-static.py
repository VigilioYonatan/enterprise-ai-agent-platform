from pathlib import Path
import json
import yaml

root = Path(__file__).resolve().parents[2]
compose = yaml.safe_load((root / 'enterprise-agents-deploy/compose/compose.yaml').read_text(encoding='utf-8'))
services = compose['services']
for service in ('postgres', 'keycloak', 'mailpit', 'migration', 'api', 'web', 'caddy', 'valkey', 'nats'):
    assert service in services, service
for name in ('postgres', 'nats', 'valkey'):
    assert 'ports' not in services[name], f'Exposed internal {name}'
assert 'version' not in compose
realm = json.loads((root / 'enterprise-agents-deploy/compose/keycloak/agentops-realm.json').read_text(encoding='utf-8'))
assert realm['resetPasswordAllowed'] and realm['verifyEmail']
assert not realm.get('identityProviders'), 'No social secrets in example'
assert realm['clients'][0]['attributes']['pkce.code.challenge.method'] == 'S256'
assert (root / 'apps/enterprise-agents-impl/src/shared/auth/auth.guard.ts').exists()
assert (root / 'apps/enterprise-agents-web/src/app/routes.tsx').exists()
print('STATIC PASS: Compose, isolation, Keycloak reset/PKCE, core files')
