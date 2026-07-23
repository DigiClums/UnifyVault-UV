# UnifyVault V2 State Management Specification

## 1. Dual-Layer State Architecture

The UnifyVault V2 frontend uses a dual-layer state architecture separating **Client UI/Local State** from **Async Server/Blockchain Data State**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    UnifyVault Frontend State                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼                                                 ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Client State (Zustand v4)   │        │ Async State (TanStack v5)    │
│                              │        │                              │
│  - Wallet Connection State   │        │  - Protocol NAV & TVL        │
│  - UI Modals & Sidebars      │        │  - Oracle Prices             │
│  - Theme Preferences         │        │  - Strategy Allocation       │
│  - Multi-step Tx Lifecycle   │        │  - User ERC20 & Share Bal    │
│  - Form Input Drafts         │        │  - Liquidity Health Metrics  │
└──────────────────────────────┘        └──────────────────────────────┘
```

---

## 2. Client Local State (Zustand Stores)

### A. `useWalletStore`

Manages connected account address, network chain ID, and connection state.

```typescript
interface WalletState {
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  setAddress: (address?: `0x${string}`) => void;
  setChainId: (chainId?: number) => void;
}
```

### B. `useUIStore`

Manages global UI states, active modals, and sidebar drawer toggles.

```typescript
interface UIState {
  isSidebarOpen: boolean;
  activeModal: 'DEPOSIT_CONFIRM' | 'REDEEM_CONFIRM' | 'SETTINGS' | null;
  toggleSidebar: () => void;
  openModal: (modal: UIState['activeModal']) => void;
  closeModal: () => void;
}
```

### C. `useThemeStore`

Manages theme preference (Dark/Light) with local storage persistence.

```typescript
interface ThemeState {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}
```

### D. `useTransactionStore`

Manages multistep transaction execution states for `TransactionModal`.

```typescript
type TxStep = 'IDLE' | 'PREPARING' | 'APPROVING' | 'EXECUTING' | 'SUCCESS' | 'ERROR';

interface TransactionState {
  step: TxStep;
  txHash?: `0x${string}`;
  errorMessage?: string;
  startTransaction: () => void;
  setStep: (step: TxStep) => void;
  setTxHash: (hash: `0x${string}`) => void;
  setError: (msg: string) => void;
  reset: () => void;
}
```

---

## 3. Async Blockchain & Server State (TanStack Query v5)

TanStack Query manages RPC fetching, background polling, and cache invalidation.

### Key Query Specifications

| Query Key                         | Function                                  | Refetch Interval | Stale Time     | Invalidation Triggers    |
| :-------------------------------- | :---------------------------------------- | :--------------- | :------------- | :----------------------- |
| `['nav']`                         | Fetches NAV per share & total TVL         | 12s (Block Time) | 6s             | Confirmed Deposit/Redeem |
| `['portfolio']`                   | Fetches portfolio value & asset balances  | 12s              | 6s             | Confirmed Deposit/Redeem |
| `['oraclePrices']`                | Fetches Chainlink/Mock oracle prices      | 12s              | 10s            | Price update event       |
| `['userBalances', address]`       | Fetches user USDC and `UVBTCETH` balances | 12s              | 4s             | Confirmed Deposit/Redeem |
| `['depositQuote', asset, amount]` | Calculates deposit fee & share preview    | On input change  | 0s (Immediate) | Input amount change      |
| `['liquidityHealth']`             | Fetches operational vs reserve health     | 30s              | 15s            | Governance refill/sweep  |

### Cache Invalidation Pattern

Upon confirmation of a deposit or redemption transaction, the application invalidates relevant queries to immediately trigger UI updates:

```typescript
queryClient.invalidateQueries({ queryKey: ['nav'] });
queryClient.invalidateQueries({ queryKey: ['portfolio'] });
queryClient.invalidateQueries({ queryKey: ['userBalances', userAddress] });
```
