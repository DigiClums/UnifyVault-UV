#!/usr/bin/env bash
set -euo pipefail

# Permanent Safe Forge Test Runner with 8 GiB memory ceiling
if ! command -v systemd-run >/dev/null 2>&1; then
  echo "Error: systemd-run is required for safe memory-limited test execution but was not found." >&2
  exit 1
fi

echo "[safe-forge-test] Executing 'forge test' under 8 GiB systemd memory ceiling (MemoryMax=8G, MemorySwapMax=2G)..."

exec systemd-run --scope \
  -p MemoryMax=8G \
  -p MemorySwapMax=2G \
  forge test "$@"
