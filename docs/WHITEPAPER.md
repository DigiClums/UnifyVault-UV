# UnifyVault V2 Technical Whitepaper

> **Abstract**: UnifyVault V2 is a non-custodial, non-proxy, trust-minimized multi-asset index vault protocol deployed on Base Mainnet. It introduces deterministic virtual share accounting, multi-feed Chainlink price aggregation, emergency circuit breakers, and a zero private key server architecture.

---

## 1. Introduction & Problem Statement

Traditional DeFi vaults often suffer from upgradeable proxy risks, centralization vectors, opaque off-chain keepers, and vulnerability to flash loan sandwich/donation attacks. UnifyVault V2 resolves these issues by eliminating proxy layers, implementing immutable smart contracts, enforcing on-chain timelocks, and utilizing multi-layer oracle staleness protection.

---

## 2. Core Architecture & Share Mechanics

UnifyVault represents user deposits through `UVBTCETHToken` index shares calculated as:

$$\text{Shares Minted} = \frac{\text{Net Asset Value Deposited}}{\text{Total Vault Value}} \times \text{Total Shares Outstanding}$$

### Inflation Attack Immunity

Virtual offset shares ($10^3$ dead shares minted to `address(0)` on deployment) and accounted balance tracking (`_accountedAssets[asset]`) ensure that direct un-accounted token transfers to the vault do not distort share pricing or allow first-depositor exploits.

---

## 3. Oracle Discovery & Staleness Guard

Price feeds are queried from Chainlink aggregators (`AggregatorV3Interface`). Inputs are validated against 4 strict criteria:

1. `updatedAt >= block.timestamp - 86,400s` (Staleness limit)
2. `price > 0` (Zero and negative price rejection)
3. `answeredInRound >= roundId` (Round completeness)
4. $\Delta P \le 5\%$ (Max price deviation check)

---

## 4. Governance & Role Hierarchy

- **Timelock**: 48-Hour mandatory delay (`TIMELOCK_DELAY = 172,800s`).
- **Safe Multisig**: 4-of-7 hardware wallet signers control timelock proposals and emergency pauses.
- **Access Control**: Role-based permissions (`DEFAULT_ADMIN_ROLE`, `GUARDIAN_ROLE`, `CONTROLLER_ROLE`, `STRATEGIST_ROLE`).

---

## 5. Security & Verification

Verified via static analysis (Slither, Aderyn, Mythril), invariant testing (Forge invariants), 30-day continuous simulation suites, and independent audit packages.
