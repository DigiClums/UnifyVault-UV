# UnifyVault V2 Litepaper

## Executive Summary

UnifyVault V2 provides decentralized, automated, zero-backend exposure to a curated basket of crypto assets (USDC, cbBTC, WETH) on Base.

## Key Features

- **Zero Proxy Risk**: Non-upgradeable contracts protect against malicious admin upgrades.
- **Autonomous Operations**: 100% on-chain logic; zero backend servers or private keys.
- **Protection Against Exploits**: Immune to flash loan attacks, sandwich attacks, and first-depositor inflation exploits.
- **Institutional Governance**: 4-of-7 Safe Multisig + 48-Hour Timelock.

## How to Interact

1. **Deposit**: Approve collateral (e.g. USDC) and call `deposit()`. Receive `UVBTCETHToken` index shares.
2. **Hold**: Index shares represent proportional ownership of the vault's growing portfolio.
3. **Redeem**: Burn `UVBTCETHToken` shares anytime via `redeem()` to receive underlying collateral.
