#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
command -v npm >/dev/null || { echo 'Node.js 24 and npm are required' >&2;exit 2; }
node --version | grep -Eq '^v24\.' || { echo 'BLOCKED: use Node.js 24 LTS to resolve lockfiles' >&2;exit 2; }
for repo in "$ROOT/apps/enterprise-agents-impl" "$ROOT/apps/enterprise-agents-web"; do
  ( cd "$repo"
    npm install --package-lock-only --no-audit --no-fund
    test -s package-lock.json
    npm ci --no-audit --no-fund
    npm run typecheck
  )
done
echo 'Authentic locks resolved. Review version diff, run full suites and commit lockfiles.'
