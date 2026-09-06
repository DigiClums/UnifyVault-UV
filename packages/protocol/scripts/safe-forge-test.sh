#!/usr/bin/env bash
set -euo pipefail

# Permanent Safe Forge Test Runner
# On GitHub Actions runners (GITHUB_ACTIONS=true), systemd-run cannot be used
# due to lack of interactive authentication / polkit transient scope support.
# In CI environments, execute forge test directly while preserving all CLI arguments.
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  echo "[safe-forge-test] GitHub Actions environment detected: executing 'forge test' directly..."
  exec forge test "$@"
fi

# On VPS / bare-metal environments, enforce the 8 GiB memory ceiling via systemd-run
if ! command -v systemd-run >/dev/null 2>&1; then
  echo "Error: systemd-run is required for safe memory-limited test execution but was not found." >&2
  exit 1
fi

echo "[safe-forge-test] Executing 'forge test' under 8 GiB systemd memory ceiling (MemoryMax=8G, MemorySwapMax=2G)..."

exec systemd-run --scope \
  -p MemoryMax=8G \
  -p MemorySwapMax=2G \
  forge test "$@"
