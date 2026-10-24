#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
for project in "$ROOT/apps/enterprise-agents-impl" "$ROOT/apps/enterprise-agents-web"; do
  test -s "$project/package-lock.json" || { echo "BLOCKED: authentic $project/package-lock.json missing" >&2; exit 2; }
  grep -q '"lockfileVersion"' "$project/package-lock.json" || { echo "FAIL: invalid npm lockfile $project" >&2; exit 1; }
done
# A hand-written '*.PASS' is not evidence. Require a signed, reviewed evidence manifest.
manifest="${RELEASE_EVIDENCE_MANIFEST:-$ROOT/audit/release-evidence/manifest.json}"
signature="${RELEASE_EVIDENCE_SIGNATURE:-$manifest.sig}"
public_key="${RELEASE_EVIDENCE_PUBLIC_KEY:-}"
[[ -s "$manifest" && -s "$signature" && -s "$public_key" ]] || {
  echo 'BLOCKED: reviewed signed release evidence manifest, detached signature, public key required' >&2; exit 2;
}
command -v cosign >/dev/null || { echo 'BLOCKED: cosign required to verify signed evidence' >&2; exit 2; }
cosign verify-blob --key "$public_key" --signature "$signature" "$manifest" >/dev/null || { echo 'FAIL: evidence signature invalid' >&2; exit 1; }
python3 - "$manifest" <<'PYTHON'
import json,sys
from pathlib import Path
j=json.loads(Path(sys.argv[1]).read_text())
expected={'backend-unit','backend-integration','backend-bdd','api-e2e','frontend-unit','frontend-e2e','frontend-a11y','compose-runtime','supply-chain-scan','oci-signature','restore-pitr','observability-fire-drill'}
checks=j.get('checks',{})
missing=[name for name in sorted(expected) if checks.get(name,{}).get('status')!='PASS' or not checks.get(name,{}).get('evidence_sha256')]
if missing or not j.get('commit_sha') or not j.get('environment'):
  print('BLOCKED: invalid or incomplete signed release manifest',missing,file=sys.stderr);sys.exit(2)
print('PASS: signed evidence matrix verified; actual provenance and job origin must be reviewed by release approver')
PYTHON
