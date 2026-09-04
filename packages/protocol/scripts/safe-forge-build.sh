#!/usr/bin/env bash
set -euo pipefail

# Permanent Safe Forge Build Wrapper with 8 GiB memory ceiling
if ! command -v systemd-run >/dev/null 2>&1; then
  echo "Error: systemd-run is required for safe memory-limited build but was not found." >&2
  exit 1
fi

echo "[safe-forge-build] Executing 'forge build --via-ir' under 8 GiB systemd memory ceiling (MemoryMax=8G, MemorySwapMax=2G)..."

exec systemd-run --scope \
  -p MemoryMax=8G \
  -p MemorySwapMax=2G \
  forge build --via-ir "$@"
