#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[[ "${ALLOW_PRODUCTION_DEPLOY:-}" == 'YES' ]] || { echo 'BLOCKED: require ALLOW_PRODUCTION_DEPLOY=YES after change approval' >&2; exit 2; }
ENV_FILE="${1:?Usage: deploy-production.sh <protected-env-file>}"
python3 scripts/check-production-preflight.py "$ENV_FILE"
scripts/check-release-gates.sh
scripts/check-observability.sh
command -v docker >/dev/null || { echo 'BLOCKED: docker not installed' >&2; exit 2; }
DC=(docker compose --env-file "$ENV_FILE" -f compose/compose.yaml)
"${DC[@]}" config --quiet
# Image signatures MUST be verified for all imported digests by a configured Cosign identity.
# This delivery job intentionally fails until the operator supplies the verifiable image matrix.
if [[ -z "${PRODUCTION_SIGNED_IMAGE_MATRIX:-}" || ! -f "$PRODUCTION_SIGNED_IMAGE_MATRIX" ]];then
  echo 'BLOCKED: provide signed image matrix, do not auto-deploy tags' >&2;exit 2
fi
while IFS= read -r image; do [[ -n "$image" ]] && scripts/verify-release-image.sh "$image"; done < "$PRODUCTION_SIGNED_IMAGE_MATRIX"
"${DC[@]}" pull
"${DC[@]}" --profile tools run --rm --no-deps migration
"${DC[@]}" up --no-build -d
scripts/smoke-test.sh
