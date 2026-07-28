# ⚠️ UnifyVault V2 — Protocol Risk Disclosure Statement

> **Network**: Base Mainnet (Chain ID `8453`)

---

## 1. Overview of Protocol Risks

Interacting with UnifyVault V2 involves exposure to decentralized smart contract technology, automated portfolio strategies, and third-party oracle integrations. Users and liquidity providers should evaluate the following risks:

---

## 2. Risk Categories

### 1. Smart Contract & Upgrade Risk

While UnifyVault V2 code is frozen, audited, and verified with 100% test coverage, smart contracts carry inherent risk of software defects or unexpected execution paths under extreme market conditions.

### 2. Chainlink Oracle & Market Price Risk

UnifyVault relies on canonical Base Mainnet Chainlink price feeds (`USDC/USD`, `cbBTC/USD`, `ETH/USD`). If Chainlink feeds experience market latency, network congestion, or flash-crash volatility, portfolio NAV valuation and share pricing may reflect temporary deviations.

### 3. Impermanent Loss & Strategy Rebalancing Risk

The UnifyVault index tracks a target weight of 50% cbBTC and 50% WETH. Rebalancing transactions across DEX pools (Uniswap V3 via SwapAdapter) incur swap fees, slippage, and price impact during rebalances.

### 4. Governance & Role Delegation Risk

Administrative and emergency parameters are controlled by an institutional 3-of-5 Safe Multisig (`0xd905920c91853039060246Ed5724AA72B91a96DA`) and a 48-hour Timelock Controller.

---

## 3. Disclaimers

- UnifyVault V2 is a non-custodial decentralized protocol. Users retain control of their wallet private keys.
- Past yield and portfolio performance are not guarantees of future returns.
