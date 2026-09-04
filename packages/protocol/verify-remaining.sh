#!/usr/bin/env bash

API_KEY="YI8JH3STSF6IU9E33BP4UI7IRT52U67NQH"
CHAIN_ID="8453"
ADMIN="0x441dbf8076d0b143EC17199baE94Daa884161454"
DIR_ADDR="0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5"

verify_contract() {
  local addr=$1
  local target=$2
  local cargs=$3

  echo ""
  echo ">>> Verifying $target at $addr..."
  if [ -n "$cargs" ]; then
    forge verify-contract "$addr" "$target" --chain "$CHAIN_ID" --etherscan-api-key "$API_KEY" --constructor-args "$cargs" --watch || true
  else
    forge verify-contract "$addr" "$target" --chain "$CHAIN_ID" --etherscan-api-key "$API_KEY" --watch || true
  fi
}

# 1. CostBasisManagerV2
CBM_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "0x051979deb1eb4823672e6274a55c44d7818ff523")
verify_contract "0x3fcf09b4e1545926c1031d22a302a39e552b3469" "src/treasury/CostBasisManagerV2.sol:CostBasisManagerV2" "$CBM_ARGS"

# 2. P2PEscrowV2
ESCROW_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "$DIR_ADDR")
verify_contract "0x400916339033b88cda38b1d8a5fb0f82e4889f38" "src/escrow/P2PEscrowV2.sol:P2PEscrowV2" "$ESCROW_ARGS"

# 3. P2PReputation
REP_ARGS=$(cast abi-encode "constructor(address)" "$ADMIN")
verify_contract "0x7a4093316955baa5bcb8189c4522d9db31f42d41" "src/reputation/P2PReputation.sol:P2PReputation" "$REP_ARGS"

# 4. PerformanceManager
PERF_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "$DIR_ADDR")
verify_contract "0x3e13aae6c9befaaec11b2247e2af678ce871f338" "src/treasury/PerformanceManager.sol:PerformanceManager" "$PERF_ARGS"

# 5. SwapAdapter
SWAP_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "0x2626664c2603336E57B271c5C0b26F421741e481")
verify_contract "0x9560361d964ebfeea402e75ad3b74fad4d8057be" "src/swap/SwapAdapter.sol:SwapAdapter" "$SWAP_ARGS"

# 6. PortfolioManager
PM_ARGS=$(cast abi-encode "constructor(address,address,address,address,address,address)" "$ADMIN" "$DIR_ADDR" "0x8c196a631531ac3a9754016db1d7b873ebbdb6e9" "0xdbab63fe1d8accff6620214a5c616d4151a8fec7" "0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c" "0x051979deb1eb4823672e6274a55c44d7818ff523")
verify_contract "0xce97c16a1c544f1df87e46695f86c7cc61ea486a" "src/strategy/PortfolioManager.sol:PortfolioManager" "$PM_ARGS"

# 7. UnifyVaultController
verify_contract "0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c" "src/controller/UnifyVaultControllerUpgradeable.sol:UnifyVaultControllerUpgradeable"

echo "Done remaining batch!"
