#!/usr/bin/env python3
"""Source-level wiring contract checks. Never claim this substitutes for compilation/E2E."""
import json
import sys
from pathlib import Path
import yaml

r = Path(__file__).resolve().parents[1]
b = r / 'apps/enterprise-agents-impl'
w = r / 'apps/enterprise-agents-web'
d = r / 'enterprise-agents-deploy/compose'
errors: list[str] = []


def require(cond: bool, message: str) -> None:
    if not cond:
        errors.append(message)


for path in [
    'README.md',
    'apps/enterprise-agents-impl/package.json',
    'apps/enterprise-agents-impl/package-lock.json',
    'apps/enterprise-agents-web/package.json',
    'apps/enterprise-agents-web/package-lock.json',
    'enterprise-agents-deploy/compose/compose.yaml',
    'platform-ops/README.md',
    'prod-local/README.md',
]:
    require((r / path).is_file(), f'Missing {path}')

compose = yaml.safe_load((d / 'compose.yaml').read_text(encoding='utf-8'))
for key, svc in compose['services'].items():
    build = svc.get('build')
    if build:
        rel = build if isinstance(build, str) else build.get('context', '.')
        require((d / rel).resolve().is_dir(), f'Compose service {key} build context missing: {rel}')
        dockerfile = 'Dockerfile' if isinstance(build, str) else build.get('dockerfile', 'Dockerfile')
        require(((d / rel).resolve() / dockerfile).is_file(), f'Compose service {key} missing Dockerfile')
    for volume in svc.get('volumes', []):
        bind = volume if isinstance(volume, str) else volume.get('source', '')
        if isinstance(bind, str) and bind.startswith('./'):
            loc = bind.split(':', 1)[0]
            require((d / loc).exists(), f'Compose service {key} missing bind source {loc}')

mod = (b / 'src/app.module.ts').read_text(encoding='utf-8')
for module in (
    'Knowledge',
    'Integrations',
    'Notifications',
    'Runs',
    'Agents',
    'Workflows',
    'Approvals',
    'Evaluations',
    'Organizations',
    'Memberships',
):
    require(module + 'Module' in mod, f'AppModule missing {module}Module')

for f in ['knowledge.main.ts', 'worker.main.ts', 'evaluation.main.ts', 'outbox.main.ts']:
    require((b / 'src' / f).exists(), f'Missing worker entrypoint {f}')

for file in [
    '0009_knowledge_hybrid_acl.sql',
    '0010_oauth_connections.sql',
    '0011_evaluation_pin.sql',
    '0012_run_lease_usage.sql',
    '0013_notifications.sql',
]:
    require((b / 'migrations' / file).is_file(), f'Missing migration {file}')

for module in ('knowledge', 'integrations', 'notifications'):
    require((b / 'src/modules' / module / 'application/service').is_dir(), f'{module} missing Application service layer')
    require((b / 'src/modules' / module / 'infrastructure/persistence').is_dir(), f'{module} missing infrastructure persistence')

routes = (w / 'src/app/routes.tsx').read_text(encoding='utf-8')
for page in (
    'knowledge',
    'integrations',
    'notifications',
    'approvals',
    'runs',
    'workflows',
    'agents',
    'usage',
    'audit',
    'evaluations',
):
    require(f'path="{page}"' in routes or f"path='{page}'" in routes, f'Frontend router missing path {page}')

for path in ['knowledge/knowledge.tsx', 'integrations/integrations.tsx', 'notifications/notifications.tsx']:
    require((w / 'src/features' / path).is_file(), f'Frontend missing {path}')

for file in [
    'src/modules/knowledge/application/ports/knowledge-repository.port.ts',
    'src/modules/integrations/application/ports/integration-repository.port.ts',
    'src/modules/notifications/application/ports/notification.repository.port.ts',
]:
    require((b / file).is_file(), f'Missing port {file}')

missing_lockfiles = [str(x.relative_to(r).as_posix()) for x in [b / 'package-lock.json', w / 'package-lock.json'] if not x.exists()]
if missing_lockfiles:
    errors.append(f'Missing lockfiles: {missing_lockfiles}')

print(
    json.dumps(
        {
            'source_wiring': 'PASS' if not errors else 'FAIL',
            'compose_services': len(compose['services']),
            'migrations': len(list((b / 'migrations').glob('*.sql'))),
            'backend_typescript_files': len(list((b / 'src').rglob('*.ts'))),
            'frontend_ts_tsx_files': len(list((w / 'src').rglob('*.ts'))) + len(list((w / 'src').rglob('*.tsx'))),
            'missing_lockfiles': missing_lockfiles,
            'errors': errors,
        },
        indent=2,
    )
)
sys.exit(1 if errors else 0)
