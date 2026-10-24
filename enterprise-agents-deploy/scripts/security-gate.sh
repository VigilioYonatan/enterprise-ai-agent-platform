#!/usr/bin/env bash
set -euo pipefail
# Fail closed: no security assertions without the actual scanners, results and real lockfiles.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
for tool in npm node syft trivy gitleaks; do
  command -v "$tool" >/dev/null || { echo "BLOCKED: $tool is not installed" >&2; exit 2; }
done
mkdir -p "$ROOT/audit/security"
for project in "$ROOT/apps/enterprise-agents-impl" "$ROOT/apps/enterprise-agents-web"; do
  [[ -s "$project/package-lock.json" ]] || { echo "BLOCKED: missing $project/package-lock.json" >&2; exit 2; }
  (cd "$project" && npm ci --ignore-scripts && npm run lint && npm run typecheck && npm run build && npm run test:unit && npm run test:coverage && npm audit --audit-level=high)
done
# Backend behavior must be compiled and tested; integration/e2e gates run against actual services.
(cd "$ROOT/apps/enterprise-agents-impl" && npm run test:bdd)
gitleaks dir --source "$ROOT" --report-format json --report-path "$ROOT/audit/security/gitleaks.json" --exit-code 1
for project in "$ROOT/apps/enterprise-agents-impl" "$ROOT/apps/enterprise-agents-web"; do
  name="$(basename "$project")"
  syft "dir:$project" -o "cyclonedx-json=$ROOT/audit/security/$name.sbom.json"
  trivy fs --exit-code 1 --severity HIGH,CRITICAL --scanners vuln,secret "$project"
done
echo 'STATIC SUPPLY CHAIN GATE PASSED; OCI signature, E2E, restore and deployment gates remain separate.'
