#!/usr/bin/env bash
set -euo pipefail

# Minimal, fast local security check before pushing.
# Usage: ./scripts/security_check.sh

cd "$(dirname "$0")/.."

echo "[security_check] repo: $(git rev-parse --show-toplevel)"

echo "[security_check] 1) ensure no .env is tracked"
# Block only real .env files, allow .env.example
if git ls-files | rg -q '(^|/)\.env$'; then
  echo "ERROR: .env file is tracked in git. Remove it and add to .gitignore." >&2
  git ls-files | rg '(^|/)\.env$' >&2
  exit 1
fi

echo "[security_check] 2) scan tracked files for secret patterns"
# Scan tracked files only (avoids node_modules noise)
# Add patterns here as you learn new failure modes.
# We flag *actual secret-like values*, not generic strings like 'Authorization: Bearer'.
# Also exclude huge vendored trees even if tracked.
PATTERN='ntn_[A-Za-z0-9]{10,}|secret_[A-Za-z0-9]{10,}|0x[0-9a-fA-F]{64}|-----BEGIN (RSA|OPENSSH) PRIVATE KEY-----|AWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)\s*=|SLACK_(BOT|APP)_TOKEN\s*=|DISCORD_TOKEN\s*=|TELEGRAM_BOT_TOKEN\s*='
if git ls-files -z | xargs -0 rg -n --no-heading -S --glob '!node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' "$PATTERN" .; then
  echo "ERROR: Potential secret detected in tracked files. Fix before push." >&2
  exit 1
fi

echo "[security_check] OK"
