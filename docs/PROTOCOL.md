# UnifyVault v2.2.0 — Protocol Specifications & NAV Mathematics

## 1. Core Mechanics

### 1.1 Deposits & Share Minting

When a user deposits collateral asset $A$, protocol fees are deducted first:
$$\text{Net Deposit} = \text{Amount} \times (1 - \text{DepositFeeBps} / 10000)$$

The gross shares issued to the depositor are calculated based on the current NAV:
$$\text{Shares} = \frac{\text{Net Deposit} \times \text{Total Shares}}{\text{Total NAV}}$$

Cost basis accounting records the user's weighted average cost basis:
$$\text{New Basis} = \text{Previous Basis} + \text{Net Deposit}$$

---

### 1.2 Redemptions & Performance Fee Settlement

Upon redeeming $S$ shares:

1. Gross collateral value $V_{\text{gross}}$ is derived from share ratio.
2. Protocol redemption fee ($2\%$) is deducted:
   $$V_{\text{net}} = V_{\text{gross}} \times (1 - \text{RedeemFeeBps} / 10000)$$
3. Cost basis ratio is evaluated:
   $$\text{Allocated Basis} = \text{User Total Basis} \times \frac{S}{\text{User Total Shares}}$$
4. Realized profit and high-water mark are derived:
   $$\text{Gross Profit} = \max(0, V_{\text{net}} - \text{Allocated Basis})$$
   $$\text{Chargeable Profit} = \max(0, V_{\text{net}} - \max(\text{Allocated Basis}, \text{HWM}))$$
5. $5\%$ Performance fee is assessed strictly on $\text{Chargeable Profit}$:
   $$\text{Performance Fee} = \text{Chargeable Profit} \times 500 / 10000$$
6. Net collateral returned to user:
   $$\text{Payout} = V_{\text{net}} - \text{Performance Fee}$$

---

## 2. Dynamic NAV Calculation

$$\text{Total NAV} = \sum_{i=1}^{n} \text{Balance}(A_i) \times \text{Price}(A_i)$$

Prices are supplied by `OracleManager` enforcing strict heartbeat and staleness bounds.
