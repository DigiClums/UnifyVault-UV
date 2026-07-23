# UnifyVault V2 Frontend Integration Report

**Sprint**: Frontend Sprint F1 – Core User Experience  
**Status**: Implemented & Integrated with Contract Abstraction Layer  
**Network Target**: Base Mainnet / Localhost Foundry Testnet  
**Date**: July 23, 2026

---

## 1. Executive Summary

Frontend Sprint F1 successfully implements the launch-critical Web3 frontend for UnifyVault V2. The application adheres strictly to the decoupled architecture defined in **Sprint F0**.

**Key Rule Compliance**:

- **Zero Raw Contract Calls in UI**: UI components consume custom hooks (`useDeposit`, `useRedeem`, `usePortfolio`, `useVaultMetrics`, `useTokenBalance`, `useAllowance`) that route exclusively through the `contracts/` abstraction layer (`Controller.ts`, `Portfolio.ts`, `Liquidity.ts`, `Token.ts`).
- **Real Contract Integration**: All contract interactions execute real Viem / Wagmi RPC actions matching protocol ABI contracts.

---

## 2. Implemented Pages & Features

| Route        | Implementation File      | Key Features & Interactions                                                                                                                                                                          |
| :----------- | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`          | `app/page.tsx`           | Landing Page with Hero, Overview, Features, Architecture, Security Highlights, CTA, and Footer.                                                                                                      |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard displaying wallet address, USDC balance, `UVBTCETH` share balance, TVL, NAV per share, BTC/ETH target strategy weights (60%/40%), and operational health status.                           |
| `/deposit`   | `app/deposit/page.tsx`   | Complete 8-step collateral deposit flow: USDC input -> Validation -> Allowance check -> Approval trigger -> Deposit execution -> Transaction wait -> Query cache invalidation -> Confirmation modal. |
| `/redeem`    | `app/redeem/page.tsx`    | Complete 6-step share redemption flow: Share input -> Percentage presets (25%, 50%, 75%, 100%) -> Preview calculation -> Redemption execution -> Query invalidation -> Success confirmation.         |

---

## 3. Implemented Hooks & Contract Abstractions

### A. Contract Wrappers (`contracts/`)

- `contracts/Controller.ts`: Encapsulates `getDepositQuote`, `previewRedeem`, `deposit`, and `redeem` contract calls.
- `contracts/Portfolio.ts`: Encapsulates `calculateNAV`, `calculatePortfolioValue`, and `getTargetWeights`.
- `contracts/Token.ts`: Encapsulates `balanceOf`, `totalSupply`, `allowance`, and `approve`.
- `contracts/Liquidity.ts`: Encapsulates `checkLiquidity` and `getLiquidityBalances`.

### B. Custom Domain Hooks (`hooks/`)

- `useWallet.ts`: Manages RainbowKit wallet connection, account state, and network switching to Base.
- `useDeposit.ts`: Manages pre-flight simulations, deposit quote calculation, transaction submission, and status.
- `useRedeem.ts`: Manages redemption previews, share approvals, submission, and status.
- `usePortfolio.ts`: Fetches NAV per share and aggregate portfolio valuation via TanStack Query.
- `useVaultMetrics.ts`: Fetches TVL and total index share supply.
- `useAllowance.ts`: Manages collateral token approval thresholds.
- `useTokenBalance.ts`: Fetches real-time ERC20 and index share balances.

---

## 4. Multi-Step Transaction Modal & Wallet UX

- **RainbowKit Integration**: Connected button supports wallet connection, disconnection, wrong network detection, and automatic switching to Base.
- **Transaction Modal (`TransactionModal.tsx`)**: Manages 5 distinct states:
  1. `PREPARING`: Calculating pre-flight quotes.
  2. `APPROVING`: Awaiting wallet signature for token allowance.
  3. `EXECUTING`: Submitting deposit/redeem contract write transaction.
  4. `CONFIRMED`: Displaying Basescan transaction hash link and success checkmark.
  5. `FAILED`: Displaying user-friendly error message with retry options.

---

## 5. Responsive & Accessibility Validation

- **Responsive Layout**: Validated across Desktop (1440px+), Tablet (768px - 1024px), and Mobile (375px - 430px).
- **Accessibility**: ARIA labels on navigation bars (`aria-label="Main Navigation"`), keyboard focus rings, high-contrast typography, and pulse loading skeletons for zero layout shift.
