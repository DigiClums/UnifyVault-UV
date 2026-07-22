# UnifyVault Protocol Financial Model

## Fiscal Operations, Unit Economics, and Treasury Blueprint

**Version 1.0** — _July 2026_

---

## 1. Financial Philosophy

The financial model of UnifyVault is built on the principles of **sustainability, transparency, and risk minimization**.

- **Non-Speculative Sustainability:** The protocol rejects yield-farming, leverage, and synthetic credit structures. Revenues are generated strictly from explicit, on-chain minting and burning fees.
- **Asset-Liability Matching:** Custody reserves represent 100% of outstanding token liabilities. The Reserve Treasury is legally and technically ring-fenced from operational funds.
- **Operating Capital Buffers:** Year 1 operations are funded by an initial bootstrapping treasury buffer of **$500,000.00** (raised via seed/grant allocations) to maintain runway while Assets Under Management (AUM) grow to a sustainable level.

---

## 2. Revenue Streams

UnifyVault generates sustainable revenue from the following sources:

- **Minting (Creation) Fees:** A flat fee of $0.20\%$ is assessed on incoming deposits during the token creation process.
- **Redemption (Burning) Fees:** A flat fee of $0.30\%$ is assessed on withdrawals during token redemptions.
- **Future B2B API Licensing:** Subscription-based API access for institutional partners integrating index minting directly into their legacy portals (planned for Phase 5).

---

## 3. Treasury Structure & Segmentation

Protocol funds are separated into four distinct accounts to ensure solvency:

```
                              ┌────────────────────────┐
                              │  UnifyVault Treasury   │
                              └───────────┬────────────┘
                                          │
             ┌──────────────────┬─────────┴─────────┬──────────────────┐
             ▼                  ▼                   ▼                  ▼
     [Reserve Treasury]  [Fee Treasury]   [Operational Treasury][Protocol Treasury]
     • 100% Client Collateral • Collects transaction • Funds monthly OpEx  • Long-term safety
     • Locked on-chain   • Distributes fees • Capped budget allocations• Emergency buffer
```

1.  **Reserve Treasury (The Vaults):** Custodies 100% of underlying index assets (wBTC/wETH). Assets are held in non-custodial smart contracts and cannot be used for operational expenses.
2.  **Fee Treasury:** Serves as the central landing contract where mint and burn fees accumulate in real time.
3.  **Operational Treasury:** Receives 70% of funds from the Fee Treasury to cover ongoing operational costs, including network gas fees, server hosting, and security audits.
4.  **Protocol Treasury:** Receives 30% of funds from the Fee Treasury to maintain emergency reserves.

---

## 4. Reserve Accounting Standards

The protocol maintains a double-entry ledger format on-chain to ensure assets always match liabilities.

### 4.1. Solvency Balance Sheet Equation

$$\text{Total Reserves Value (USD)} = \text{Total Liabilities (Circulating Supply } \times \text{NAV)} + \text{Equity (Fee Treasury Balance)}$$

### 4.2. Sample Solvency Verification Ledger

- Outstanding Token Supply: $10,000,000.00\text{ UVBTCETH}$
- Calculated NAV per Token: $\$1.20$
- Total Liabilities (Outstanding Supply $\times$ NAV): $\$12,000,000.00$

| Vault Account      | Asset Type  | Balance Held           | Oracle Price (USD) | Total Valuation (USD) |
| :----------------- | :---------- | :--------------------- | :----------------- | :-------------------- |
| **`0xVaultwBTC`**  | Wrapped BTC | $100.00\text{ wBTC}$   | $\$60,000.00$      | $\$6,000,000.00$      |
| **`0xVaultwETH`**  | Wrapped ETH | $2,000.00\text{ wETH}$ | $\$3,000.00$       | $\$6,000,000.00$      |
| **Total Reserves** | —           | —                      | —                  | **$12,000,000.00**    |

$$\text{Solvency Ratio} = \frac{\text{Total Reserves Value}}{\text{Total Liabilities}} = \frac{\$12,000,000.00}{\$12,000,000.00} = 100.00\%$$

---

## 5. Operating Expenses (OpEx)

Ongoing operational costs are managed through a structured budget:

| Expense Category       | Monthly Cost (USD) | Annual Cost (USD) | Details                                                           |
| :--------------------- | :----------------- | :---------------- | :---------------------------------------------------------------- |
| **Infrastructure**     | $\$1,500.00$       | $\$18,000.00$     | RPC node endpoints, DB hosting, and server nodes.                 |
| **Security Auditing**  | $\$3,333.33$       | $\$40,000.00$     | Budget allocated for annual smart contract reviews.               |
| **Staff & Payroll**    | $\$15,000.00$      | $\$180,000.00$    | Core development team (CTO, backend, frontend, devops).           |
| **Marketing & Docs**   | $\$2,500.00$       | $\$30,000.00$     | Content development, documentation guides, and community support. |
| **Legal & Compliance** | $\$2,083.33$       | $\$25,000.00$     | Corporate registry and compliance fees.                           |
| **Total OpEx**         | **$24,416.66**     | **$293,000.00**   | Core operational cost to sustain development.                     |

---

## 6. Infrastructure Costs Detail

- **Blockchain RPC Nodes:** Dedicated Base L2 RPC endpoints (e.g., Alchemy or QuickNode) to ensure reliable transaction processing ($500/month).
- **Database & Servers:** AWS/GCP multi-region setups hosting NestJS applications, PostgreSQL databases, and Redis caching instances ($800/month).
- **Monitoring Tools:** Performance and error monitoring suites (like Sentry and Datadog) to track system health ($200/month).

---

## 7. Security and Audit Budget

- **Smart Contract Auditing:** Fixed budget of $30,000.00 annually allocated for independent smart contract audits.
- **Bug Bounty Program:** Ongoing allocation of $10,000.00 annually to fund bug bounties for community security researchers.

---

## 8. Marketing and Community Budget

- **Content Development:** Creating documentation updates, system roadmaps, and educational tutorials ($1,500/month).
- **Community Support:** Moderating community channels (like Discord and Telegram) and managing developer support requests ($1,000/month).

---

## 9. Team & Payroll Projections (Year 1)

- **CTO & Founder:** $5,000/month.
- **Solidity / Backend Engineer:** $4,500/month.
- **Frontend Engineer:** $3,500/month.
- **Operations & Support:** $2,000/month.
- _Total Monthly Payroll:_ **$15,000.00**

---

## 10. Unit Economics (Per Transaction)

The unit economics of a standard deposit transaction are defined below:

| Metric                          | Value (USD)  | Notes                                                |
| :------------------------------ | :----------: | :--------------------------------------------------- |
| **Average Mint Size ($V$)**     | $\$5,000.00$ | Target average deposit transaction.                  |
| **Protocol Mint Fee ($0.2\%$)** |  $\$10.00$   | Gross revenue generated per transaction.             |
| **Marginal Network Gas Cost**   |  $-\$0.05$   | Base L2 gas fee to execute swaps and mint tokens.    |
| **On-Ramp Gateway Fees**        |  $-\$5.00$   | Estimated cost of fiat gateway conversion ($0.1\%$). |
| **Net Transaction Profit**      |  **$4.95**   | Net profit margin of $49.50\%$.                      |

---

## 11. Fee Sensitivity Scale

The table below maps projected monthly fee revenues based on average transaction volumes and fee settings:

| Monthly Volume (USD) | at 0.10% Mint/Burn | at 0.20% Mint/Burn | at 0.30% Mint/Burn | at 0.50% Mint/Burn |
| :------------------- | :----------------- | :----------------- | :----------------- | :----------------- |
| **$1,000,000**       | $\$1,000$          | $\$2,000$          | $\$3,000$          | $\$5,000$          |
| **$5,000,000**       | $\$5,000$          | $\$10,000$         | $\$15,000$         | $\$25,000$         |
| **$10,000,000**      | $\$10,000$         | $\$20,000$         | $\$30,000$         | $\$50,000$         |
| **$50,000,000**      | $\$50,000$         | $\$100,000$        | $\$150,000$        | $\$250,000$        |

---

## 12. Monthly Cash Flow Projections (Year 1)

These projections assume an initial bootstrapping treasury buffer of **$500,000.00** to fund operations while volume grows:

| Month  | Projected AUM (USD) | Projected Volume (USD) | Fee Revenue (USD) | Total OpEx (USD) | Net Cash Flow (USD) | Ending Buffer (USD) |
| :----- | :------------------ | :--------------------- | :---------------- | :--------------- | :------------------ | :------------------ |
| **M0** | $\$0$               | $\$0$                  | $\$0$             | $\$0$            | $\$0$               | $\$500,000.00$      |
| **M1** | $\$1,000,000$       | $\$1,000,000$          | $\$2,500$         | $\$24,416$       | $-\$21,916$         | $\$478,084.00$      |
| **M2** | $\$2,500,000$       | $\$2,000,000$          | $\$5,000$         | $\$24,416$       | $-\$19,416$         | $\$458,668.00$      |
| **M3** | $\$5,000,000$       | $\$3,500,000$          | $\$8,750$         | $\$24,416$       | $-\$15,666$         | $\$443,002.00$      |
| **M4** | $\$8,000,000$       | $\$5,000,000$          | $\$12,500$        | $\$24,416$       | $-\$11,916$         | $\$431,086.00$      |
| **M5** | $\$12,000,000$      | $\$7,500,000$          | $\$18,750$        | $\$24,416$       | $-\$5,666$          | $\$425,420.00$      |
| **M6** | $\$18,000,000$      | $\$10,000,000$         | $\$25,000$        | $\$24,416$       | **+$584**           | **$426,004.00**     |

_Note: These projections are illustrative. Actual performance will vary based on market conditions and user adoption._

---

## 13. Break-Even Requirements

The protocol achieves operational break-even when monthly fee revenues cover ongoing operational costs ($24,416.66/month):

- **Required Monthly Transaction Volume:** **$9,766,664.00** (assuming an average combined mint/burn fee of $0.25\%$).
- **Average Daily Volume Target:** **$325,555.00**.
- **Required AUM (at 2% weekly volume turnover):** **$122,083,300.00**.

---

## 14. AUM Growth Scenarios

The table below maps potential growth scenarios for Year 1:

| Metric                  | Bear Case                 | Base Case                 | Bull Case                    |
| :---------------------- | :------------------------ | :------------------------ | :--------------------------- |
| **Year 1 AUM**          | $\$2,000,000$             | $\$15,000,000$            | $\$100,000,000$              |
| **Monthly Volume**      | $\$1,000,000$             | $\$7,500,000$             | $\$50,000,000$               |
| **Monthly Fee Revenue** | $\$2,500$                 | $\$18,750$                | $\$125,000$                  |
| **Monthly OpEx**        | $\$8,000$ (Reduced)       | $\$24,416$                | $\$35,000$ (Expanded)        |
| **Net Cash Flow**       | $-\$5,500 / \text{month}$ | $-\$5,666 / \text{month}$ | **+$90,000 / \text{month}$** |
| **Projected Runway**    | 36 Months                 | 18 Months (to Break-Even) | Infinite (Self-sustaining)   |

---

## 15. Runway & Treasury Sustainability

With a $500,000.00 bootstrapping buffer, the protocol's runway is projected under different scenario conditions:

- **Zero Growth Runway:** 20 Months (assuming $0 in volume and a constant $24,416.66 monthly OpEx burn rate).
- **Bear Case Runway:** 36 Months (assuming team downsizing and lower marketing spend).
- **Base Case Runway:** 18 Months (projected time to reach operational break-even and self-sustainability).

---

## 16. Risk Analysis & Contingency Planning

We identify and plan for potential financial risks:

- **Market Crash (Low AUM Values):** A drop in cryptocurrency prices reduces the USD value of AUM. **Mitigation:** The protocol holds operational reserves in USD stablecoins to shield the operating budget from market volatility.
- **Regulatory Changes:** Changes in tax policies or compliance rules may require legal review. **Mitigation:** A legal contingency budget of $25,000.00 is maintained to cover compliance costs.
- **Security Incident:** Smart contract exploits can lead to loss of capital. **Mitigation:** We use audited contracts, timelocks, and keep a portion of collected fees in the Protocol Treasury to serve as an emergency safety buffer.

---

## 17. Financial Key Performance Indicators (KPIs)

- **Total Value Locked (TVL):** The total value of reserve assets in custody.
- **Monthly Active Volume:** The sum of all mint and burn transactions.
- **Net Revenue Margin:** Transaction fee revenues minus operational expenses.
- **Runway Duration:** The estimated number of months the treasury buffer can sustain operations.

---

## 18. Financial Dashboard Design

The administrative interface includes a dashboard displaying key financial metrics:

```
+-----------------------------------------------------------------------------+
| Financial Metrics                                      [Operational: Normal]|
+-----------------------------------------------------------------------------+
| TVL: $42,085,900.00 USD | Monthly Volume: $10,500,000.00 USD                |
| Net Monthly Revenue: +$584.00 USD | Runway: 18 Months                       |
+-----------------------------------------------------------------------------+
| Fee Revenue Trend                                                           |
| [ Chart: Monthly Mint & Burn Fee Collections (Apache ECharts) ]             |
+-----------------------------------------------------------------------------+
| Treasury Balances:                                                          |
| - Reserve Treasury: $42,085,900.00 USD (Client Collateral)                  |
| - Fee Treasury: $25,450.00 USD (Accumulated Fees)                           |
| - Operational Treasury: $18,500.00 USD (Gas / Hosting Buffer)               |
+-----------------------------------------------------------------------------+
```

---

## 19. Financial Reporting Standards

- **Quarterly Solvency Reports:** The protocol publishes reports detailing verified vault holdings, total liabilities, and solvency ratios.
- **On-Chain Auditing:** Automated dashboards display real-time reserve balances, allowing users to audit the protocol's backing status.

---

## 20. Future Monetization Opportunities

- **Asset Staking Yields:** Governance may explore staking a portion of the vault's Ethereum holdings (via Lido or RocketPool) to generate yield for the protocol (planned for Phase 5, subject to security review).
- **Institutional Custom Baskets:** Custom index creation and management features designed for institutional partners.
