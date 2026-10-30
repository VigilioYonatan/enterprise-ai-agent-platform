#!/usr/bin/env python3
"""Offline source-package structural audit; does not claim runtime correctness."""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent).resolve()
errors: list[str] = []
warnings: list[str] = []
ignored_dirs = {
    'node_modules',
    '.git',
    '__pycache__',
    'dist',
    'coverage',
    '.pytest_cache',
    'playwright-report',
    'test-results',
}

required = [
    'README.md',
    'QUALITY_REPORT.md',
    'ARCHITECTURE_INDEX.md',
    'FUNCTIONAL_COVERAGE.md',
    'QA_RUNBOOK.md',
    'apps/enterprise-agents-impl/package.json',
    'apps/enterprise-agents-impl/package-lock.json',
    'apps/enterprise-agents-impl/Dockerfile',
    'apps/enterprise-agents-impl/src/app.module.ts',
    'apps/enterprise-agents-impl/src/main.ts',
    'apps/enterprise-agents-impl/src/worker.main.ts',
    'apps/enterprise-agents-impl/src/outbox.main.ts',
    'apps/enterprise-agents-impl/src/evaluation.main.ts',
    'apps/enterprise-agents-impl/src/bootstrap/openapi.bootstrap.ts',
    'apps/enterprise-agents-impl/migrations/0001_initial.sql',
    'apps/enterprise-agents-impl/migrations/0008_eval_lease.sql',
    'apps/enterprise-agents-web/package.json',
    'apps/enterprise-agents-web/package-lock.json',
    'apps/enterprise-agents-web/src/app/routes.tsx',
    'apps/enterprise-agents-web/src/features/workflows/workflow-canvas.tsx',
    'apps/enterprise-agents-web/src/styles/globals.css',
    'enterprise-agents-deploy/compose/compose.yaml',
    'enterprise-agents-deploy/compose/keycloak/agentops-realm.json',
    'enterprise-agents-deploy/environments/local.env.example',
    'platform-ops/scripts/backup-postgres.sh',
    'prod-local/scripts/validate-static.py',
    'skills/enterprise-ai-platform-senior/SKILL.md',
    'skills/auditoria-total-zero-omissions/SKILL.md',
    'skills/.vigilio-docs/technology/versions.md',
]

for rel in required:
    if not (root / rel).is_file():
        errors.append('required missing: ' + rel)

files = [
    p
    for p in root.rglob('*')
    if p.is_file() and not any(part in ignored_dirs for part in p.relative_to(root).parts)
]
if len(files) < 500:
    errors.append('unexpectedly few files: ' + str(len(files)))

for p in files:
    rel = p.relative_to(root)
    if p.is_symlink():
        errors.append('unexpected symlink: ' + str(rel))
    if p.name == '.env' or p.name.endswith('.pem') or p.name.endswith('.key'):
        errors.append('possible private file: ' + str(rel))
    if str(rel).startswith('/') or '..' in rel.parts:
        errors.append('unsafe path ' + str(rel))

for rel in [
    'apps/enterprise-agents-impl/package.json',
    'apps/enterprise-agents-web/package.json',
    'enterprise-agents-deploy/compose/keycloak/agentops-realm.json',
]:
    try:
        json.loads((root / rel).read_text(encoding='utf-8'))
    except Exception as e:
        errors.append(f'JSON {rel}: {e}')

try:
    import yaml

    yaml_path = root / 'enterprise-agents-deploy/compose/compose.yaml'

    class StrictLoader(yaml.SafeLoader):
        pass

    def unique_mapping(loader, node):
        result = {}
        for key_node, value_node in node.value:
            key = loader.construct_object(key_node)
            if key in result:
                raise ValueError(f'Duplicate YAML key {key} at line {key_node.start_mark.line + 1}')
            result[key] = loader.construct_object(value_node)
        return result

    StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)
    c = yaml.load(yaml_path.read_text(encoding='utf-8'), Loader=StrictLoader)
    expected = {'api', 'web', 'worker', 'outbox', 'evaluator', 'postgres', 'nats', 'valkey', 'keycloak', 'migration', 'caddy'}
    if not expected.issubset(c.get('services', {})):
        errors.append('Missing Compose core services')
    for n in ('postgres', 'nats', 'valkey', 'object-storage'):
        for port in c['services'][n].get('ports', []):
            if isinstance(port, str) and '127.0.0.1:' not in port:
                errors.append(f'{n} public host port: {port}')
    print('Compose YAML: PASS; services=', len(c['services']))
except ImportError:
    warnings.append('PyYAML unavailable; Compose duplicate/YAML check NOT_RUN')
except Exception as e:
    errors.append('Compose YAML: ' + str(e))

imports = 0
for p in files:
    if p.suffix not in ['.ts', '.tsx'] or 'skills' in p.relative_to(root).parts:
        continue
    s = p.read_text(encoding='utf-8')
    for rel in re.findall(r'\bfrom\s*[\'\"](\.{1,2}/[^\'\"]+)[\'\"]', s):
        imports += 1
        stripped = re.sub(r'\.(js|jsx)$', '', rel)
        q = p.parent / rel
        qs = p.parent / stripped
        candidates = (
            [Path(str(q) + ext) for ext in ('.ts', '.tsx', '.js', '.jsx', '.json', '.css')]
            + [Path(str(qs) + ext) for ext in ('.ts', '.tsx')]
            + [q / 'index.ts', q / 'index.tsx', q / 'index.js']
        )
        if not any(x.exists() for x in candidates):
            errors.append(f'unresolved relative import: {p.relative_to(root).as_posix()} => {rel}')

backend = root / 'apps/enterprise-agents-impl'
frontend = root / 'apps/enterprise-agents-web'
for app in (backend, frontend):
    if not (app / 'package-lock.json').exists() and not (app / 'pnpm-lock.yaml').exists():
        warnings.append(str(app.relative_to(root)) + ': dependency lockfile absent (build not reproducible)')

print('Files:', len(files), 'relative imports inspected:', imports, 'errors:', len(errors), 'warnings:', len(warnings))
for e in errors:
    print('ERROR:', e)
for w in warnings:
    print('WARNING:', w)
if errors:
    raise SystemExit(1)
print('Static bundle verification PASS.')
