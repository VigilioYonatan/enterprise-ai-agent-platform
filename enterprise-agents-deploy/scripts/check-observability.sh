#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
command -v promtool >/dev/null || { echo 'BLOCKED: promtool not installed' >&2;exit 2; }
command -v amtool >/dev/null || { echo 'BLOCKED: amtool not installed' >&2;exit 2; }
promtool check config "$here/compose/observability/prometheus.yml"
promtool check rules "$here/compose/observability/rules/agentops.yml"
(cd "$here/compose/observability/rules" && promtool test rules agentops.test.yml)
amtool check-config "$here/compose/observability/alertmanager.yml"
python3 - "$here" <<'PYTHON'
import pathlib,sys,yaml
root=pathlib.Path(sys.argv[1]);alert=yaml.safe_load((root/'compose/observability/alertmanager.yml').read_text())
if alert['route']['receiver']=='unconfigured-receiver':
 raise SystemExit('BLOCKED: configure and test a real Alertmanager receiver before production')
print('Alertmanager receiver configured; delivery still requires a runtime fire drill')
PYTHON
