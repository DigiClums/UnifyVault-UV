#!/usr/bin/env bash

API_KEY="YI8JH3STSF6IU9E33BP4UI7IRT52U67NQH"
CHAIN_ID="8453"
ADMIN="0x441dbf8076d0b143EC17199baE94Daa884161454"
ADMIN_ARG=$(cast abi-encode "constructor(address)" "$ADMIN")

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

# 1. FeeManager
verify_contract "0x76c8a1ab608403cd974ec7598b01ec88b44320d3" "src/treasury/FeeManager.sol:FeeManager" "$ADMIN_ARG"

# 2. Treasury
verify_contract "0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9" "src/vault/Treasury.sol:Treasury" "$ADMIN_ARG"

# 3. CustodyVault
verify_contract "0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c" "src/vault/CustodyVault.sol:CustodyVault" "$ADMIN_ARG"

# 4. LiquidityManager
verify_contract "0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919" "src/vault/LiquidityManager.sol:LiquidityManager" "$ADMIN_ARG"

# 5. GasTreasury
verify_contract "0x166477b1eb662dd553287d32af958436cad20c17" "src/aa/GasTreasury.sol:GasTreasury" "$ADMIN_ARG"

# 6. Paymaster
PAYMASTER_ARGS=$(cast abi-encode "constructor(address,address,address)" "0x0000000071727De22E5E9d8BAf0edAc6f37da032" "$ADMIN" "0x6b83f3ad8d77a83696803738e4a9e5b0a34b2cf607e4d8e5ba138e65fae34581")
verify_contract "0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9" "src/aa/UnifyVaultPaymaster.sol:UnifyVaultPaymaster" "$PAYMASTER_ARGS"

