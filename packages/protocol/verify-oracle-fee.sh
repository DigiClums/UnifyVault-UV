#!/usr/bin/env bash

API_KEY="YI8JH3STSF6IU9E33BP4UI7IRT52U67NQH"
CHAIN_ID="8453"
ADMIN="0x441dbf8076d0b143EC17199baE94Daa884161454"
DIR_ADDR="0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5"

verify_contract() {
  local addr=$1
  local target=$2
  local cargs=$3

  echo ">>> Verifying $target at $addr..."
  if [ -n "$cargs" ]; then
    forge verify-contract "$addr" "$target" --chain "$CHAIN_ID" --etherscan-api-key "$API_KEY" --constructor-args "$cargs" --watch || true
  else
    forge verify-contract "$addr" "$target" --chain "$CHAIN_ID" --etherscan-api-key "$API_KEY" --watch || true
  fi
}

ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN")

# 1. OracleManager
verify_contract "0xdbab63fe1d8accff6620214a5c616d4151a8fec7" "src/oracle/OracleManager.sol:OracleManager" "$ADMIN_ARG"

# 2. ChainlinkOracleProvider
verify_contract "0x39af66781d16ec8a72d2b1a4a1b7697a577626a2" "src/oracle/ChainlinkOracleProvider.sol:ChainlinkOracleProvider" "$ADMIN_ARG"

# 3. FeeManager
verify_contract "0x76c8a1ab608403cd974ec7598b01ec88b44320d3" "src/fee/FeeManager.sol:FeeManager" "$ADMIN_ARG"

# 4. Treasury
verify_contract "0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9" "src/core/Treasury.sol:Treasury" "$ADMIN_ARG"

# 5. CustodyVault
verify_contract "0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c" "src/core/CustodyVault.sol:CustodyVault" "$ADMIN_ARG"

# 6. LiquidityManager
verify_contract "0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919" "src/liquidity/LiquidityManager.sol:LiquidityManager" "$ADMIN_ARG"

