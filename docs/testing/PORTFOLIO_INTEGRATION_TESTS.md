# Sprint 2 – Phase 2.4: Portfolio Page Integration Tests

## Executive Summary

This document details the design, implementation, and empirical verification of the integration test suite for the **UnifyVault Portfolio Page** (`apps/web/app/portfolio/page.tsx`).

The integration tests validate that the Portfolio page correctly handles all wallet connection states, network status checks, query loading states, empty portfolio scenarios, error conditions, populated metric displays (shares balance, collateral values, USD calculations), manual balance refresh actions, and reactive UI updates following TanStack Query invalidations.

All production application code remained **unmodified** as specified by requirements.

---

## Verification Matrix

| Checklist Requirement                                          | Implementation Strategy                                                                                                                                 | Verification Status |
| :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :-----------------: |
| **✓ Page renders successfully**                                | Tests main page heading, description, refresh button, section headers ("Your Collateral Holdings", "Transaction Activity").                             |     **PASSED**      |
| **✓ Disconnected wallet prompt**                               | Mocks `useWallet` to return `isConnected: false` and verifies `ConnectCard` UI prompt renders.                                                          |     **PASSED**      |
| **✓ Empty portfolio state**                                    | Mocks `usePortfolio` returning `sharesBalance: 0n` and verifies empty state UI with deposit link renders.                                               |     **PASSED**      |
| **✓ Populated portfolio renders correctly**                    | Mocks `usePortfolio` with non-zero shares & collateral balances and verifies total metric cards & breakdown table.                                      |     **PASSED**      |
| **✓ Vault share balance displays**                             | Asserts exact share count formatting (e.g., `100 Shares`, `2,500 Shares`) within the Index Holdings metric card.                                        |     **PASSED**      |
| **✓ Collateral value displays**                                | Asserts wallet balances and redeemable collateral values for each asset (e.g., `500 USDC`, `100 USDC`, `2 WETH`) in the holdings table.                 |     **PASSED**      |
| **✓ USD calculations display correctly**                       | Validates `formatUSD` output across total portfolio value (`$700.00`), withdrawable vault value (`$200.00`), and asset values (`$100.00`, `$1,500.00`). |     **PASSED**      |
| **✓ Loading skeletons render**                                 | Mocks `isLoading: true` and verifies skeleton elements (`.animate-pulse`) render in the DOM grid.                                                       |     **PASSED**      |
| **✓ Error state renders when queries fail**                    | Mocks `portfolio: null` and verifies "No Portfolio Data Available" error component renders.                                                             |     **PASSED**      |
| **✓ Refresh/refetch updates displayed balances**               | Simulates clicking the "Refresh Balances" button, verifies `refetch` function call, and asserts UI updates when new balance data arrives.               |     **PASSED**      |
| **✓ Portfolio metrics update after mocked query invalidation** | Triggers `queryClient.invalidateQueries({ queryKey: ['portfolio'] })`, updates mock state, and asserts dynamic metric re-renders.                       |     **PASSED**      |

---

## Test Suite Architecture

The integration test file is located at:
[portfolio.test.tsx](file:///Users/apple/Documents/UnifyVault-UV/apps/web/test/integration/portfolio.test.tsx)

### Key Test Helpers & Utilities Used

1. **`renderWithProviders()`**:
   - Source: [renderWithProviders.tsx](file:///Users/apple/Documents/UnifyVault-UV/apps/web/test/utils/renderWithProviders.tsx)
   - Wraps the tested page in a dedicated `QueryClientProvider` configured with isolated `QueryClient` defaults (`retry: false`, `staleTime: Infinity`). Returns both RTL render utilities and the `queryClient` instance for query invalidation tests.

2. **Wallet & Network Mocks**:
   - Mocks `useWallet()` and `useNetwork()` to seamlessly toggle between connected (`0x1234...`), disconnected, and unsupported network (`chainId: 1`) states.

3. **Contract Read & Portfolio Data Mocks**:
   - Mocks `usePortfolio()` to return realistic BigInt balance values (`sharesBalance`, `sharesValueUSD`, `walletCollateralUSD`, `totalPortfolioValueUSD`, `assetsBalances`).

---

## Test Execution Results

The integration test suite was verified by running:

```bash
pnpm --filter=@unifyvault/web test
```

### Execution Log Summary

```text
 RUN  v4.1.10 /Users/apple/Documents/UnifyVault-UV/apps/web

 ✓ test/integration/portfolio.test.tsx (12 tests) 1356ms
     ✓ renders Portfolio page successfully with header and main sections
     ✓ renders disconnected wallet prompt when wallet is disconnected
     ✓ renders unsupported network warning when connected to unsupported chain
     ✓ renders loading skeletons while queries are pending
     ✓ renders error state when portfolio queries fail or yield null data
     ✓ renders empty portfolio state when user has zero shares balance
     ✓ renders populated portfolio correctly with vault share balance, collateral values, and USD calculations
     ✓ displays vault share balance accurately in index holdings metric card
     ✓ displays collateral values and balance breakdown accurately in asset table
     ✓ displays USD calculations correctly across portfolio metrics
     ✓ triggers refetch and updates displayed balances when refresh balances button is clicked
     ✓ updates portfolio metrics after mocked query invalidation

 Test Files  16 passed (16)
      Tests  91 passed (91)
```

---

## Code Reference

### Integration Test File

```tsx
// File: apps/web/test/integration/portfolio.test.tsx
describe('Portfolio Page Integration Tests', () => {
  // 12 Integration Test Specs Covering All Sprint Requirements
});
```

See [portfolio.test.tsx](file:///Users/apple/Documents/UnifyVault-UV/apps/web/test/integration/portfolio.test.tsx) for full implementation details.
