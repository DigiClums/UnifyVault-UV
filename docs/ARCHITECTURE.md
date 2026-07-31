# UnifyVault V2 — System Architecture Specification

> **Version**: 2.0.0-RC2  
> **Status**: Code Freeze / Audit Readiness

---

## 1. System Overview

UnifyVault is an EVM-native, non-custodial multi-asset index vault protocol. The system consists of modular smart contracts orchestrated through an on-chain directory (`ProtocolDirectory.sol`).

```
+-----------------------------------------------------------------------+
|                             USER / FRONTEND                           |
+-----------------------------------------------------------------------+
       |                                              |
    Deposit                                         Redeem
       v                                              v
+-----------------------------------------------------------------------+
|                         UnifyVaultController                          |
|  - Validates oracle freshness                                         |
|  - Enforces pause guards (Pausable)                                   |
|  - Calculates share minting / burning                                 |
+-----------------------------------------------------------------------+
    |                      |                          |
    | Transfers Collateral | Mints / Burns            | Price Query
    v                      v                          v
+--------------+   +---------------+   +--------------------------------+
| CustodyVault |   | UVBTCETHToken |   |         OracleManager          |
| (Warehouse)  |   | ($uvBTCETH)   |   | - Primary / Fallback Routing   |
+--------------+   +---------------+   | - Staleness Heartbeat Check    |
                                       | - 18-Decimal Normalization     |
                                       +--------------------------------+
                                                      ^
                                                      | Price Telemetry
                                       +--------------------------------+
                                       |        StrategyManager         |
                                       | - Target Weight Registry       |
                                       | - Drift Calculation Engine     |
                                       | - Keeper Rebalance Trigger     |
                                       +--------------------------------+
```

---

## 2. Core Modules

### 2.1 UnifyVaultController

- **Role**: Primary user-facing contract interface.
- **Key Functions**: `deposit()`, `redeem()`, `emergencyPause()`, `resume()`.
- **Security Controls**: Inherits `ReentrancyGuard` and OpenZeppelin `Pausable`.

### 2.2 CustodyVault

- **Role**: Non-custodial warehouse holding raw collateral assets (WBTC, WETH, USDC).
- **Security Controls**: Withdrawal access strictly gated to `CONTROLLER_ROLE`.

### 2.3 OracleManager

- **Role**: Pricing coordinator normalizing all asset prices to 18-decimal fixed point format.
- **Security Controls**: Enforces freshness heartbeat checks (`block.timestamp - updatedAt <= heartbeat`) and automatic fallback routing.

### 2.4 StrategyManager

- **Role**: Maintains target portfolio allocation weights (e.g. 50% BTC / 50% ETH).
- **Security Controls**: Enforces a 500 BPS (5.0%) drift threshold before authorizing keeper rebalancing.

---

## 3. Mathematical & Accounting Invariants

1. **Total Value Locked (TVL)**:
   $$\text{TVL} = \sum_{i} \left( \text{CustodyVault.totalAssets}(\text{Asset}_i) \times \text{OraclePrice}(\text{Asset}_i) \right)$$

2. **Share Price (NAV per Share)**:
   $$\text{Share Price} = \frac{\text{TVL}}{\text{totalSupply}()}$$

3. **User Pro-Rata Claim**:
   $$\text{User Asset Claim}_i = \left( \frac{\text{User Shares}}{\text{totalSupply}()} \right) \times \text{CustodyVault.totalAssets}(\text{Asset}_i)$$

4. **Share Conservation**:
   $$\sum \text{balanceOf}(\text{User}_k) = \text{totalSupply}()$$
