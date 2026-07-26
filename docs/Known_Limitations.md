# UnifyVault v2.2.0 — Known Architectural Limitations

## 1. System Scale Limits

1. **Maximum Portfolio Assets**: `PortfolioManager` bounds active portfolio strategy assets to a maximum of **20 tokens** to ensure loop gas costs during NAV calculations remain safely under the block gas limit (30M gas limit).
2. **Oracle Heartbeats**: External Chainlink feeds must be active on the target deployment network with heartbeats updated within `maxStaleness` (default: 24 hours).
3. **Asset Decimals**: Collateral and strategy asset decimals are assumed to be $\le 18$. Precision normalization handles 6-decimal assets (e.g. USDC) and 8-decimal assets (e.g. cbBTC).

---

## 2. Fee Boundaries

- `depositFeeBps`: Maximum capped at 500 BPS (5.00%).
- `redeemFeeBps`: Maximum capped at 500 BPS (5.00%).
- `performanceFeeBps`: Maximum capped at 2000 BPS (20.00%).
