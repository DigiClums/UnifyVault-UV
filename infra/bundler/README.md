# UnifyVault Account Abstraction Bundler Infrastructure

## Overview

This directory contains turnkey infrastructure definitions for running UnifyVault's self-hosted **ERC-4337 v0.7 Bundler** (Alto OSS) without third-party vendor lock-in, credit cards, or external API billing.

## Architecture

```
User (0 native ETH)
   ↓
UnifyVault Smart Account (ERC-4337 v0.7)
   ↓ UserOperation
UnifyVault Self-Hosted Bundler (Alto Container :4337)
   ↓ Bundle (handleOps)
Canonical EntryPoint v0.7 (0x0000000071727De22E5E9d8BAf0edAc6f37da032)
   ↑ validatePaymasterUserOp
UnifyVaultPaymaster (On-Chain Policy Verification)
   ↑ EntryPoint Gas Deposit
UnifyVault GasTreasury (ETH Reserve)
```

## Quick Start Deployment

1. **Configure Environment Variables**:
   Create or edit `.env` in `infra/bundler/`:

   ```bash
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   BUNDLER_SIGNER_PRIVATE_KEY=0x... # EOA key with small ETH balance to submit bundles
   ```

2. **Launch Services**:

   ```bash
   cd infra/bundler
   docker compose up -d
   ```

3. **Verify Health**:

   ```bash
   curl -X POST http://127.0.0.1:4337 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"eth_supportedEntryPoints","params":[]}'
   ```

   Expected response:

   ```json
   { "jsonrpc": "2.0", "id": 1, "result": ["0x0000000071727De22E5E9d8BAf0edAc6f37da032"] }
   ```

4. **Prometheus Metrics**:
   Prometheus metrics are available at `http://127.0.0.1:9090/metrics`.

## Operational Maintenance

### 1. Relayer Signer Funding

The bundler submits bundled transactions to Base Sepolia using `SIGNER_PRIVATE_KEY`.
Maintain a minimum balance of 0.05 ETH on this address to ensure continuous bundle submission.

### 2. Paymaster EntryPoint Deposit

The Paymaster sponsors gas by drawing from its deposit on EntryPoint v0.7.
Top up the Paymaster via the GasTreasury:

```solidity
gasTreasury.refillPaymaster(0.2 ether);
```

### 3. Monitoring & Alerts

Set alerts for:

- Bundler relayer balance < 0.01 ETH
- Paymaster EntryPoint deposit < 0.05 ETH
- UserOperation failure rate > 2%
