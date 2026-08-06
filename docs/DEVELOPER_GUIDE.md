# UnifyVault V2 Developer Guide

## Repository Structure

- `packages/protocol`: Foundry smart contract project (Solidity `0.8.24`).
- `packages/protocol/src`: Production smart contract code.
- `packages/protocol/test`: Unit, integration, invariant, stress, and simulation tests.
- `packages/protocol/script`: Deployment scripts (`DeployMainnet.s.sol`, `DeployV2.s.sol`).
- `audit-package`: Complete audit submission package.

## Building & Testing

```bash
cd packages/protocol
forge build
forge test
```

## Core Entrypoints & Interfaces

- [`UnifyVaultController`](file:///var/www/UnifyVault-UV/packages/protocol/src/controller/UnifyVaultController.sol): Main user interactions (`deposit`, `redeem`).
- [`CustodyVault`](file:///var/www/UnifyVault-UV/packages/protocol/src/vault/CustodyVault.sol): Collateral accounting (`totalAssets`, `getAccountedBalance`).
- [`OracleManager`](file:///var/www/UnifyVault-UV/packages/protocol/src/oracle/OracleManager.sol): Valuation engine (`getAssetPrice`).
