# UnifyVault V2 — Economic Attack Vector Analysis & Immunity Matrix

## 1. Flash Loan Sandwich Attack Immunity

- **Vector**: Attacker uses a flash loan to pump underlying asset price before depositing or redeeming.
- **Mitigation**: UnifyVault uses Chainlink decentralized oracle aggregators with staleness checks, NOT spot DEX reserve ratios. Spot DEX price manipulation does not affect vault share pricing.

## 2. Inflation Attack / First Deposit Exploit Immunity

- **Vector**: First depositor deposits 1 wei of collateral and transfers a huge amount directly to inflate share price to steal subsequent user deposits.
- **Mitigation**: UnifyVault initializes virtual offset shares ($10^3$ dead shares minted on initialization) and tracks accounted balances (`_accountedAssets[asset]`), completely ignoring un-accounted direct token transfers (donations).

## 3. Arbitrage & MEV Protection

- **Vector**: Front-running oracle update transactions to extract value.
- **Mitigation**: Max oracle price deviation checks (5%) and fee routing prevent profitable sandwich arbitrage across price updates.
