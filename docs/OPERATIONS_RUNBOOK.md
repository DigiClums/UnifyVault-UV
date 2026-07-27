# UnifyVault V2 — Production Operations Runbook

> **Target Version**: UnifyVault V2 Engine  
> **Infrastructure Target**: Base Sepolia / Base Mainnet  
> **Last Updated**: July 27, 2026

---

## 1. Protocol Architecture & Module Overview

UnifyVault V2 operates as a stateless multi-asset index vault with separated module responsibilities:

- **`UnifyVaultController`**: Core entry point for user `deposit()` and `redeem()` calls.
- **`CustodyVault`**: Holds user collateral assets (`WBTC`, `WETH`, `USDC`). Stateless; transfers require Controller invocation.
- **`Treasury`**: Collects deposit/redemption protocol fee revenue. Release requires `GOVERNANCE_ROLE`.
- **`OracleManager`**: Price coordinator returning 18-decimal normalized USD prices from Chainlink aggregators.
- **`CostBasisManager`**: Tracks user invested capital and shares owned for cost-basis accounting.
- **`PortfolioManager`**: Portfolio valuation and NAV engine.
- **`UVBTCETHToken`**: Vault index ERC-20 token minted to depositors.

---

## 2. Emergency Pause & Incident Response Procedure

### Scenario: Anomalous DEX Slippage or Market Volatility

1. **Step 1 — Execute Emergency Pause**  
   Call `emergencyPause()` on `UnifyVaultController` using a key with `GUARDIAN_ROLE` or `DEFAULT_ADMIN_ROLE`:

   ```bash
   cast send 0x7EF5D93f83995228efFc63dbe513367a719f0633 "emergencyPause()" \
     --rpc-url https://sepolia.base.org \
     --private-key $GUARDIAN_PRIVATE_KEY
   ```

   _Effect_: All `deposit()` and `redeem()` calls immediately revert.

2. **Step 2 — Inspect System Logs & Oracle Health**  
   Check Oracle staleness in Admin Console (`/admin/oracle`) or query `isPriceFresh(asset)` directly.

3. **Step 3 — Resume Normal Operations**  
   After resolving the incident, call `resume()` on `UnifyVaultController`:
   ```bash
   cast send 0x7EF5D93f83995228efFc63dbe513367a719f0633 "resume()" \
     --rpc-url https://sepolia.base.org \
     --private-key $ADMIN_PRIVATE_KEY
   ```

---

## 3. Treasury Management & Revenue Release Guide

Fee revenue accumulates in `Treasury` (`0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D`).

### Releasing Fee Revenue

To withdraw USDC or collateral revenue from Treasury:

1. Navigate to `/admin/treasury` in the web application.
2. Ensure your wallet has `GOVERNANCE_ROLE` or `DEFAULT_ADMIN_ROLE`.
3. Select asset (e.g. `USDC`), enter recipient address and amount, then click **Execute Withdrawal**.
4. Or execute via CLI:
   ```bash
   cast send 0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D "withdraw(address,address,uint256)" \
     0x036CbD53842c5426634e7929541eC2318f3dCF7e $RECIPIENT_ADDRESS $AMOUNT_RAW \
     --rpc-url https://sepolia.base.org \
     --private-key $GOVERNANCE_PRIVATE_KEY
   ```

---

## 4. Oracle Keeper Service Operation

The Oracle Keeper runs under PM2 as process `unifyvault-oracle-keeper` (ID 32).

- **Script Location**: `scripts/oracleKeeper.js`
- **Loop Interval**: 15 seconds
- **Data Source**: Live Coinbase Spot Price API
- **Command Control**:
  ```bash
  pm2 status unifyvault-oracle-keeper
  pm2 logs unifyvault-oracle-keeper
  pm2 restart unifyvault-oracle-keeper
  ```

---

## 5. Event Indexer Daemon Operation

The Event Indexer runs under PM2 as process `unifyvault-indexer` (ID 33).

- **Script Location**: `scripts/indexerDaemon.js`
- **API Endpoint**: `http://localhost:3006/api/indexer/stats`
- **Command Control**:
  ```bash
  pm2 status unifyvault-indexer
  pm2 logs unifyvault-indexer
  pm2 restart unifyvault-indexer
  ```

---

## 6. Disaster Recovery Guide

In the event of complete RPC endpoint outage:

1. Update `RPC_URL` in `.env.local` to secondary provider (e.g. Alchemy, QuickNode).
2. Restart PM2 services:
   ```bash
   pm2 restart all
   ```
