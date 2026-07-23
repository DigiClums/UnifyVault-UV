# UnifyVault V2 Component Inventory

This document defines the 16 core reusable UI components designed for the UnifyVault V2 frontend application.

---

## 1. Core Component Specifications

### 1. `Navbar`

- **Location**: `components/layout/Navbar.tsx`
- **Description**: Main top navigation bar containing protocol brand logo, navigation links (`Dashboard`, `Deposit`, `Redeem`, `Portfolio`, `Health`, `Docs`), chain network selector, and `WalletButton`.
- **Props**: `{ activeRoute: string }`

### 2. `Sidebar`

- **Location**: `components/layout/Sidebar.tsx`
- **Description**: Collapsible vertical sidebar for desktop and drawer for mobile devices. Displays active route highlighting and protocol status indicators.
- **Props**: `{ isOpen: boolean; onToggle: () => void }`

### 3. `Footer`

- **Location**: `components/layout/Footer.tsx`
- **Description**: Bottom layout footer displaying documentation links, GitHub repository, block height indicator, and social channels.
- **Props**: `None`

### 4. `WalletButton`

- **Location**: `components/layout/WalletButton.tsx`
- **Description**: RainbowKit connection trigger button. Displays formatted address (`0x1234...5678`), connected network badge, and account modal trigger when connected.
- **Props**: `{ className?: string }`

### 5. `StatCard`

- **Location**: `components/dashboard/StatCard.tsx`
- **Description**: Metric display card for primary protocol KPIs (e.g. Total Value Locked, NAV per Share, Index Price, Total Supply). Supports percentage trend badge (positive/negative) and loading skeleton state.
- **Props**:
  ```typescript
  interface StatCardProps {
    title: string;
    value: string;
    change?: string;
    isPositive?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
  }
  ```

### 6. `TokenCard`

- **Location**: `components/dashboard/TokenCard.tsx`
- **Description**: Individual strategy asset card displaying token logo, symbol (e.g. `cbBTC`, `WETH`), target weight %, current custody balance, and USD value.
- **Props**:
  ```typescript
  interface TokenCardProps {
    symbol: string;
    name: string;
    weightBps: number;
    balance: string;
    valueUSD: string;
    iconUrl: string;
  }
  ```

### 7. `BalanceCard`

- **Location**: `components/dashboard/BalanceCard.tsx`
- **Description**: Displays the user's `UVBTCETH` index share balance, equivalent USD value, and quick-action buttons for Deposit and Redeem.
- **Props**: `{ sharesBalance: string; usdValue: string; loading?: boolean }`

### 8. `DepositForm`

- **Location**: `components/forms/DepositForm.tsx`
- **Description**: Interactive collateral deposit form. Includes asset selector (USDC), collateral amount input, max balance button, slippage tolerance slider (0.1%, 0.5%, 1.0%), deposit quote breakdown (`netDeposit`, `protocolFee`, `sharesPreview`), and multi-step Approval/Deposit button.
- **Props**: `{ onDepositSuccess?: () => void }`

### 9. `RedeemForm`

- **Location**: `components/forms/RedeemForm.tsx`
- **Description**: Index share redemption form. Includes share amount input, percentage preset buttons (25%, 50%, 75%, 100%), output preview (`grossAssets`, `protocolFee`, `netAssetsOut`), deadline selector, and Redeem button.
- **Props**: `{ onRedeemSuccess?: () => void }`

### 10. `TransactionModal`

- **Location**: `components/modals/TransactionModal.tsx`
- **Description**: Global multi-step transaction status modal. Visualizes stages: `Preparing` -> `Approving Token` -> `Executing Transaction` -> `Transaction Confirmed` / `Failed`. Displays Etherscan/Basescan tx link.
- **Props**: `Uses useTransactionStore()`

### 11. `LoadingSkeleton`

- **Location**: `components/ui/LoadingSkeleton.tsx`
- **Description**: Shimmering pulse loading skeletons for cards, charts, and table rows.
- **Props**: `{ variant: 'card' | 'chart' | 'table' | 'text'; count?: number }`

### 12. `EmptyState`

- **Location**: `components/ui/EmptyState.tsx`
- **Description**: Reusable empty state view with title, description, and action button.
- **Props**: `{ title: string; description: string; actionText?: string; onAction?: () => void }`

### 13. `ErrorCard`

- **Location**: `components/ui/ErrorCard.tsx`
- **Description**: Alert card displaying contract or network error messages with retry button.
- **Props**: `{ title?: string; message: string; onRetry?: () => void }`

### 14. `HealthBadge`

- **Location**: `components/ui/HealthBadge.tsx`
- **Description**: Operational status badge (`Healthy` - Emerald, `Refill Needed` - Amber, `Sweep Needed` - Blue, `Paused` - Red).
- **Props**: `{ status: 'HEALTHY' | 'REFILL_REQUIRED' | 'RESERVE_SWEEP_REQUIRED' | 'PAUSED' }`

### 15. `AllocationChart`

- **Location**: `components/charts/AllocationChart.tsx`
- **Description**: Interactive Recharts Donut chart visualizing current vs target portfolio strategy asset weights (60% cbBTC, 40% WETH).
- **Props**: `{ data: Array<{ name: string; value: number; color: string }> }`

### 16. `TVLChart`

- **Location**: `components/charts/TVLChart.tsx`
- **Description**: Recharts Area chart displaying historical Total Value Locked (TVL) and NAV per share performance over selected timeframes (24H, 7D, 30D, ALL).
- **Props**: `{ timeframe: '24H' | '7D' | '30D' | 'ALL'; onTimeframeChange: (tf: string) => void }`
