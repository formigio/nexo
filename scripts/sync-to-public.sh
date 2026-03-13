#!/bin/bash
set -euo pipefail

# sync-to-public.sh — Sync private nexo repo to the public nexo-public repo
#
# Copies all source, docs, config, and web-console files while excluding
# private infrastructure, deployment configs, secrets, and build artifacts.
#
# Usage: bash scripts/sync-to-public.sh [--dry-run]

PRIVATE_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_REPO="${PRIVATE_REPO}/../nexo-public"

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=true
  echo "=== DRY RUN — no files will be changed ==="
fi

if [ ! -d "$PUBLIC_REPO/.git" ]; then
  echo "ERROR: Public repo not found at $PUBLIC_REPO"
  exit 1
fi

echo "=== Syncing nexo (private) → nexo-public ==="
echo "  From: $PRIVATE_REPO"
echo "  To:   $PUBLIC_REPO"
echo ""

# ---------------------------------------------------------------------------
# Exclusions — private/sensitive content that should NOT go public
# ---------------------------------------------------------------------------
EXCLUDES=(
  # Infrastructure & deployment (contains AWS account IDs, domains, SSM paths)
  "infra/"
  "src/lambda/"
  "scripts/deploy-console.sh"
  "scripts/ingest-remote.sh"

  # Docker compose (may contain env vars, volume paths)
  "docker-compose.yml"

  # IDE / editor config (private workspace settings)
  ".idea/"
  ".vscode/"
  "*.swp"
  "*.swo"
  "*~"

  # Claude Code config (agent memory, local settings)
  ".claude/"

  # Nexo project config (may contain credentials)
  ".nexo/"

  # Warden / local dev environment
  ".warden/"

  # Local working files & build artifacts
  "local/"
  "surreal-data/"
  "dist/"
  "node_modules/"
  ".DS_Store"

  # Web console build artifacts
  "web-console/dist/"
  "web-console/node_modules/"

  # SAM build artifacts
  ".aws-sam/"

  # Environment files
  ".env"
  ".env.*"

  # Git directory
  ".git/"

  # Private CLAUDE.md (may reference internal systems)
  "CLAUDE.md"
)

# Build rsync exclude flags
EXCLUDE_FLAGS=()
for pattern in "${EXCLUDES[@]}"; do
  EXCLUDE_FLAGS+=("--exclude=$pattern")
done

# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

RSYNC_FLAGS=(
  -av
  --delete              # Remove files in public that no longer exist in private
  --checksum            # Compare by content, not just timestamps
  "${EXCLUDE_FLAGS[@]}"
)

if [ "$DRY_RUN" = "true" ]; then
  RSYNC_FLAGS+=("--dry-run")
fi

rsync "${RSYNC_FLAGS[@]}" "$PRIVATE_REPO/" "$PUBLIC_REPO/"

echo ""

if [ "$DRY_RUN" = "true" ]; then
  echo "=== Dry run complete. Review changes above, then run without --dry-run ==="
else
  echo "=== Sync complete ==="
  echo ""
  echo "Next steps:"
  echo "  cd $PUBLIC_REPO"
  echo "  git diff --stat            # Review changes"
  echo "  git add -A"
  echo "  git commit -m 'sync: ...'  # Commit"
  echo "  npm version patch          # Bump version"
  echo "  npm publish --access public"
fi
