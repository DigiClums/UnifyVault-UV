#!/usr/bin/env bash

API_KEY="YI8JH3STSF6IU9E33BP4UI7IRT52U67NQH"
CHAIN_ID="8453"
ADMIN="0x441dbf8076d0b143EC17199baE94Daa884161454"
DIR_ADDR="0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5"

echo "=========================================================="
echo "  UnifyVault Base Mainnet Full Source Code Verification   "
echo "=========================================================="

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

ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN")

# 1. UVBEV2
verify_contract "0x051979deb1eb4823672e6274a55c44d7818ff523" "src/token/UVBEV2.sol:UVBEV2" "$ADMIN_ARG"

# 2. OracleManager
verify_contract "0xdbab63fe1d8accff6620214a5c616d4151a8fec7" "src/oracle/OracleManager.sol:OracleManager" "$ADMIN_ARG"

# 3. ChainlinkOracleProvider
verify_contract "0x39af66781d16ec8a72d2b1a4a1b7697a577626a2" "src/oracle/ChainlinkOracleProvider.sol:ChainlinkOracleProvider" "$ADMIN_ARG"

# 4. Treasury
verify_contract "0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9" "src/core/Treasury.sol:Treasury" "$ADMIN_ARG"

# 5. FeeManager
verify_contract "0x76c8a1ab608403cd974ec7598b01ec88b44320d3" "src/fee/FeeManager.sol:FeeManager" "$ADMIN_ARG"

# 6. CustodyVault
verify_contract "0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c" "src/core/CustodyVault.sol:CustodyVault" "$ADMIN_ARG"

# 7. LiquidityManager
verify_contract "0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919" "src/liquidity/LiquidityManager.sol:LiquidityManager" "$ADMIN_ARG"

# 8. StrategyManager
verify_contract "0x8c196a631531ac3a9754016db1d7b873ebbdb6e9" "src/strategy/StrategyManager.sol:StrategyManager" "$ADMIN_ARG"

# 9. CostBasisManagerV2
CBM_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "0x051979deb1eb4823672e6274a55c44d7818ff523")
verify_contract "0x3fcf09b4e1545926c1031d22a302a39e552b3469" "src/tax/CostBasisManagerV2.sol:CostBasisManagerV2" "$CBM_ARGS"

# 10. UVBEStakingVault
STAKE_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "0x051979deb1eb4823672e6274a55c44d7818ff523")
verify_contract "0x91744fa47837474c7e9d9d532c7fd8a2fe04c5ee" "src/staking/UVBEStakingVault.sol:UVBEStakingVault" "$STAKE_ARGS"

# 11. UVBEReferralRegistry
REG_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "$ADMIN")
verify_contract "0x6a94ee7b0a89ad1b9488b0d29bf99294f5e236d9" "src/staking/UVBEReferralRegistry.sol:UVBEReferralRegistry" "$REG_ARGS"

# 12. UVBERewardDistributor
DIST_ARGS=$(cast abi-encode "constructor(address,address,address,address)" "$ADMIN" "0x051979deb1eb4823672e6274a55c44d7818ff523" "0x91744fa47837474c7e9d9d532c7fd8a2fe04c5ee" "0x6a94ee7b0a89ad1b9488b0d29bf99294f5e236d9")
verify_contract "0xd3c7073f5a2d98e1f80590b84dd628fcfd6fdbc3" "src/staking/UVBERewardDistributor.sol:UVBERewardDistributor" "$DIST_ARGS"

# 13. P2PEscrowV2
ESCROW_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "$DIR_ADDR")
verify_contract "0x400916339033b88cda38b1d8a5fb0f82e4889f38" "src/p2p/P2PEscrowV2.sol:P2PEscrowV2" "$ESCROW_ARGS"

# 14. P2PReputation
REP_ARGS=$(cast abi-encode "constructor(address)" "$ADMIN")
verify_contract "0x7a4093316955baa5bcb8189c4522d9db31f42d41" "src/p2p/P2PReputation.sol:P2PReputation" "$REP_ARGS"

# 15. PerformanceManager
PERF_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "$DIR_ADDR")
verify_contract "0x3e13aae6c9befaaec11b2247e2af678ce871f338" "src/performance/PerformanceManager.sol:PerformanceManager" "$PERF_ARGS"

# 16. Marketplace
MKT_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "$DIR_ADDR")
verify_contract "0x6e3be632747e161a0b017cb35243d39eb90d0d8a" "src/marketplace/Marketplace.sol:Marketplace" "$MKT_ARGS"

# 17. StabilizerVault
STAB_ARGS=$(cast abi-encode "constructor(address,address)" "$ADMIN" "$DIR_ADDR")
verify_contract "0xc268709ebb4d3f0f473c6c5767f60e540d330c11" "src/stabilizer/StabilizerVault.sol:StabilizerVault" "$STAB_ARGS"

echo "Done verification batch!"
