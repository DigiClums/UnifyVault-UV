# 🛡️ UnifyVault V2 — Responsible Disclosure & Bug Bounty Program

> **Target Contracts**: All smart contracts deployed on Base Mainnet under `ProtocolDirectory`  
> **Maximum Reward**: Up to $100,000 USDC for Critical Vulnerabilities

---

## 1. Scope & Eligible Targets

### Smart Contracts (In-Scope)

- `ProtocolDirectory.sol`
- `UnifyVaultController.sol`
- `CustodyVault.sol`
- `Treasury.sol`
- `OracleManager.sol`
- `UVBTCETHToken.sol`
- `CostBasisManager.sol`
- `LiquidityManager.sol`
- `StrategyManager.sol`
- `PortfolioManager.sol`
- `SwapAdapter.sol`

---

## 2. Severity Classification & Rewards

| Severity Level | Vulnerability Impact                                                                      | Maximum Payout      |
| :------------- | :---------------------------------------------------------------------------------------- | :------------------ |
| **Critical**   | Direct loss of TVL / funds, permanent lock of funds, unauthorized share minting           | Up to $100,000 USDC |
| **High**       | Temporary locking of funds, manipulation of oracle prices, sandwich/slippage exploitation | Up to $25,000 USDC  |
| **Medium**     | Unauthorized state modification without fund loss, denial of service                      | Up to $5,000 USDC   |
| **Low**        | Gas optimization, minor events mismatch, non-critical parameter validation                | Up to $1,000 USDC   |

---

## 3. Submission Guidelines

Send detailed vulnerability reports to: **`security@unifyvault.io`**

Include:

1. Proof of Concept (PoC) using Foundry test (`.t.sol`).
2. Impact analysis and step-by-step reproduction steps.
3. Suggested mitigation / patch.
