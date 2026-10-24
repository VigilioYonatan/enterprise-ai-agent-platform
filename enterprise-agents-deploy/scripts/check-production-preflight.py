#!/usr/bin/env python3
"""Fail-closed static preflight; not a substitute for Compose runtime or security scanning."""
from pathlib import Path
import os,re,sys,yaml
root=Path(__file__).resolve().parents[1]
config=yaml.safe_load((root/'compose/compose.yaml').read_text())
errors=[]
env_path=Path(sys.argv[1]) if len(sys.argv)>1 else root/'environments/production.env.example'
values={}
for line in env_path.read_text().splitlines():
    if line.strip() and not line.lstrip().startswith('#') and '=' in line:
        key,val=line.split('=',1);values[key.strip()]=val.strip()
origin=values.get('APP_ORIGIN','')
if not origin.startswith('https://') or '.invalid' in origin:errors.append('APP_ORIGIN must be an actual HTTPS origin')
if values.get('KEYCLOAK_START_MODE')!='production':errors.append('Keycloak must run in production mode')
if values.get('DOCS_ENABLED')!='false':errors.append('Scalar/OpenAPI public docs must be disabled in production')
if values.get('CADDY_HTTP_PORT')!='80' or values.get('CADDY_HTTPS_PORT')!='443':errors.append('Production Caddy must publish 80/443 with TLS')
if values.get('CADDY_BIND_IP') not in ('0.0.0.0','::'):errors.append('Public ingress bind must be explicit')
if config['services']['migration'].get('profiles')!=['tools']:errors.append('Migrations must be explicit tools profile')
for name,service in config['services'].items():
    image_var=(service.get('image') or '').split(':-')[0].replace('${','')
    if not image_var:continue
    actual=values.get(image_var,'')
    if not re.fullmatch(r'[^\s]+@sha256:[0-9a-fA-F]{64}',actual):errors.append(f'{name}: set immutable image digest {image_var}')
if not (root/'compose/secrets/postgres-password').is_file():errors.append('Missing protected postgres-password secret')
if not (root/'compose/secrets/database-url').is_file():errors.append('Missing protected database-url secret')
if (root/'compose/observability/alertmanager.yml').read_text().find('unconfigured-receiver')>=0:errors.append('Alertmanager receiver is not configured')
for p in ('apps/enterprise-agents-impl/package-lock.json','apps/enterprise-agents-web/package-lock.json'):
    if not (root.parent/p).exists(): errors.append(f'Missing authentic lockfile: {p}')
if errors:
    for e in errors:print('BLOCKED:',e,file=sys.stderr)
    raise SystemExit(2)
print('Static preflight PASS; still require runtime E2E, SAST, supply chain, PITR and telemetry fire drill')
