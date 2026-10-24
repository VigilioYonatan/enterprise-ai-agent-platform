#!/usr/bin/env bash
set -euo pipefail
# Only accepts immutable digests and a verified GitHub Actions certificate identity.
IMAGE="${1:?Usage: verify-release-image.sh registry/image@sha256:<digest>}"
IDENTITY="${COSIGN_CERTIFICATE_IDENTITY:?Exact trusted CI workflow identity required}"
if [[ ! "$IMAGE" =~ ^[^[:space:]]+@sha256:[a-fA-F0-9]{64}$ ]];then
 echo 'FAIL: image must be pinned to immutable sha256 digest' >&2;exit 1
fi
command -v cosign >/dev/null || { echo 'BLOCKED: cosign required' >&2;exit 2; }
cosign verify --certificate-identity "$IDENTITY"  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' "$IMAGE"
echo 'PASS: OCI signature and workflow identity verified; run image scans before deployment.'
