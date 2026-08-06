# UnifyVault V2 — Deployment Guide & Verification Matrix

## 1. Network Artifacts

- **Base Mainnet (Chain ID 8453)**
  - Script: `script/DeployMainnet.s.sol`
  - Canonical USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  - Canonical cbBTC: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`
  - Canonical WETH: `0x4200000000000000000000000000000000000006`

- **Base Sepolia (Chain ID 84532)**
  - Script: `script/DeployV2.s.sol`
  - Testnet USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

---

## 2. Dry-Run & Broadcast Instructions

```bash
# Set environment
export BASE_MAINNET_RPC_URL="https://mainnet.base.org"
export PRIVATE_KEY="<DEPLOYER_PRIVATE_KEY>"

# Execute dry-run
forge script script/DeployMainnet.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --dry-run
```
