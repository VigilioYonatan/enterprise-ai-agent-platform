#!/usr/bin/env python3
"""Static fail-closed posture checks for the ONE docker-compose file. Not a Docker runtime test."""
import sys
from pathlib import Path
import yaml


class UniqueLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node):
    output = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if key in output:
            raise ValueError(f'Duplicate YAML key: {key!r}')
        output[key] = loader.construct_object(value_node)
    return output


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)
root = Path(__file__).resolve().parents[1]
compose = yaml.load((root / 'compose/compose.yaml').read_text(encoding='utf-8'), Loader=UniqueLoader)
services = compose['services']
failures: list[str] = []

required = [
    'api', 'worker', 'knowledge-indexer', 'outbox', 'migration',
    'postgres', 'keycloak', 'web', 'caddy', 'nats', 'valkey', 'object-storage',
]
for s in required:
    if s not in services:
        failures.append(f'Missing {s}')

for s in ['postgres', 'nats', 'valkey', 'object-storage']:
    if 'ports' in services[s]:
        failures.append(f'{s}: must not publish ports')
    if services[s].get('network_mode') == 'host':
        failures.append(f'{s}: host network')

for s in ['api', 'worker', 'knowledge-indexer', 'outbox', 'evaluator', 'web']:
    service = services[s]
    if not service.get('read_only'):
        failures.append(f'{s}: missing read_only')
    if 'ALL' not in service.get('cap_drop', []):
        failures.append(f'{s}: no cap_drop ALL')
    if 'no-new-privileges:true' not in [str(x) for x in service.get('security_opt', [])]:
        failures.append(f'{s}: no no-new-privileges')
    if '/tmp' not in service.get('tmpfs', []):
        failures.append(f'{s}: missing /tmp tmpfs for read_only rootfs')

if 'backend' in services['web'].get('networks', []):
    failures.append('web: static SPA must only attach to edge network, not backend')

for s in services:
    image = services[s].get('image', '')
    if image.endswith(':latest') or image == 'latest':
        failures.append(f'{s}: mutable latest tag')

for s in ['api', 'worker']:
    env = services[s].get('environment', {})
    if s == 'api' and 'OAUTH_ENCRYPTION_KEY_FILE' not in env:
        failures.append('API: missing encryption file path')
    for vol in services[s].get('volumes', []):
        if isinstance(vol, str) and vol.startswith('./secrets:'):
            failures.append(f'{s}: must not bind-mount full ./secrets folder; use ./connector-secrets')

if failures:
    for f in failures:
        print('FAIL:', f, file=sys.stderr)
    sys.exit(1)

print(f'STATIC PASS: {len(services)} Compose services; internal ports, network segmentation and service hardening checked')
