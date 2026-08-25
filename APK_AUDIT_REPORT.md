# 📋 UnifyVault-UV Android APK Architecture Audit Report

**Date**: August 25, 2026  
**Scope**: Full codebase audit of `apps/web-v2`, `packages/protocol`, and auxiliary services for "Blockchain-First + Local-First" Android APK standalone conversion.

---

## 🎯 Target Architecture & Core Principles

```
UNIFYVAULT APK (Standalone Android / Capacitor)
    │
    ├── 📱 Local Web UI Bundle (Next.js Static Export / Local Asset Bundle)
    ├── 🔐 Mobile Wallet Connect / Deep Links (MetaMask, Coinbase, Rainbow, Trust)
    ├── ⚡ Base RPC (Primary + Decentralized Fallbacks)
    ├── ⛓️ Canonical Verified Base Smart Contracts (No Backend Intermediary)
    ├── 🔍 Client-Side OCR (Native Android Google ML Kit / WebAssembly Tesseract.js)
    ├── 💬 Temporary P2P Chat (XMTP Wallet-to-Wallet Direct Encrypted Channel)
    ├── 💾 Local Device Storage & Cache (SharedPreferences / IndexedDB)
    └── 🔄 App Version & Integrity Checker (AppRegistry On-Chain / GitHub Releases)
```

> [!IMPORTANT]
> **Zero UnifyVault-Owned Backend for Core Protocol Operations**: The installed APK does not require `unifyvault.xyz` or any centralized server to be online to execute index deposits, redemptions, staking, dynamic MLM rewards, transfers, flash predictions, and P2P escrow settlement.

---

## 🔍 Feature-by-Feature Classification Matrix

Every feature in `apps/web-v2` is classified into one of six categories:
- **[A] Already client-side and APK compatible**
- **[B] Blockchain direct and APK compatible (RPC-based)**
- **[C] Requires native mobile integration (Capacitor / Android Bridge)**
- **[D] Currently server-dependent and must be replaced / decoupled**
- **[E] Requires an indexer/backend for full historical analytics (with RPC fallback)**
- **[F] Security-sensitive and requires special handling**

| Module / Component | Classification | Description & Compatibility Assessment | Action Required for APK |
| :--- | :---: | :--- | :--- |
| **Web3 Provider & RPC** (`providers/Web3Provider.tsx`) | **[B]** | Uses `wagmi` + `viem` with `fallback([publicnode, 1rpc, base])`. Direct connection to Base network. | Fully compatible. Keep RPC fallback matrix. |
| **Wallet Connection** (`RainbowKitProvider`) | **[C] / [F]** | Injected wallets work in browser; in mobile WebView, requires WalletConnect v2 & deep links. | Configure mobile deep links & WalletConnect project ID. |
| **Portfolio Manager & NAV** (`usePortfolio.ts`, `useVault.ts`) | **[B]** | Reads NAV, dynamic cost-basis, and mint/burn pricing directly from `PortfolioManager.sol` & `UnifyVaultController.sol`. | Fully client-side & APK compatible. |
| **Deposit & Mint Flow** (`useDeposit.ts`) | **[B]** | Direct ERC-20 approval (`USDC`/`cbBTC`/`WETH`) and controller `deposit()` transaction. | 100% on-chain. Zero backend needed. |
| **Redeem & Burn Flow** (`useRedeem.ts`) | **[B]** | Direct controller `redeem()` call converting UVBE back to underlying assets. | 100% on-chain. Zero backend needed. |
| **UVBE Dynamic Staking & MLM** (`useStaking.ts`) | **[B]** | Dynamic APY calculation, 10-generation referral registry, rank qualifications, and reward claims directly via `UVBEStakingVault.sol` and `UVBERewardDistributor.sol`. | 100% on-chain. Zero backend needed. |
| **FlashPulse 30s Prediction** (`useFlashPulse.ts`, `api/flashpulse`) | **[B] / [D]** | Currently polls `api/flashpulse` for mock/cached rounds, but smart contract handles lock, settlement, and payouts via Pyth Oracle. | Provide direct Pyth Hermes RPC client fallback for client-side round resolution. |
| **P2P Marketplace Orderbook** (`MarketplaceOrderBook.tsx`) | **[B]** | Reads on-chain orders directly from `Marketplace.sol` and `P2PEscrow.sol`. | 100% on-chain. |
| **P2P Escrow Lifecycle** (`TradeDetailCard.tsx`, `useP2PEscrow.ts`) | **[B]** | `createTrade`, `fundTrade`, `submitPayment`, `confirmAndRelease`, `refund`, `raiseDispute` execute directly against `P2PEscrow.sol`. | 100% on-chain. |
| **Receipt OCR & Verification** (`lib/evidence/`, `app/api/p2p/evidence`) | **[C] / [D]** | Currently writes original file bytes to VPS filesystem `/var/lib/unifyvault/p2p-evidence` and calls server OCR. | **Replace with Client-Side OCR**: Native Google ML Kit on Android APK + `tesseract.js` WASM fallback in web. Do not upload photos to server. |
| **P2P Dispute Chat** (`DisputeChatWorkspace.tsx`, `api/p2p/dispute-chat`) | **[D]** | Currently uses Next.js server memory/file-backed API with wallet signatures. | **Migrate to XMTP**: Decentralized wallet-to-wallet E2E encrypted messaging. No UnifyVault-owned chat server. |
| **Account Abstraction / Gasless** (`useSmartAccount.ts`, `api/smart-account`) | **[E] / [F]** | Gasless sponsorship requires paymaster RPC or Pimlico/Biconomy bundler. Standard EOA transactions do not require any sponsor server. | Gracefully fallback to standard connected wallet if paymaster bundler is offline. |
| **Admin Operations Console** (`app/admin/*`, `v2.unifyvault.xyz`) | **[F]** | Admin timelock, contract parameter controls, and oracle adjustments. | Isolate to web admin portal; APK focuses on user & trader workflows. |
| **Multi-Domain Shell Mode** (`app/layout.tsx`, `AppShell.tsx`) | **[D]** | Uses Next.js dynamic `headers()` to detect `docs.` vs `app.` vs `v2.`. Breaks static export. | Refactor `app/layout.tsx` to static-safe shell mode using client-side router detection. |

---

## 🛠️ Static Export Compatibility Analysis (`output: 'export'`)

In order to bundle `apps/web-v2` into a local Android APK assets directory (`capacitor://localhost`), the Next.js application must build cleanly with static export:

1. **`headers()` and Server Request Objects**:
   - `app/layout.tsx` currently calls `await headers()` to detect subdomains.
   - *Refactoring*: Replace with client-side hostname detection (`window.location.hostname`) inside `AppShell.tsx` so `layout.tsx` is 100% static.
2. **Server-Side API Routes (`app/api/*`)**:
   - Next.js static export skips building server API routes into the bundle.
   - *Refactoring*: Ensure all client components perform on-chain RPC reads and client-side processing, without runtime reliance on `fetch('/api/...')` when running inside Capacitor.
3. **Receipt Hashing & Storage**:
   - Client calculates `keccak256(receiptBytes)` in-memory for the on-chain `evidenceHash`.
   - OCR runs locally via Native Android ML Kit / Tesseract.js.
   - No filesystem write to `/var/lib/unifyvault/p2p-evidence` needed on mobile.

---

## 💬 Decentralized Chat (XMTP) Architecture

```
P2P Trade Created (Escrow ID #123)
               │
               ▼
Buyer Wallet Signer ◄────────── XMTP Network ──────────► Seller Wallet Signer
(0xBuyer...)                (E2E Encrypted)                 (0xSeller...)
               │                                                 │
               └────────── Topic: trade-base-8453-123 ───────────┘
                                   │
                    Trade Completed / Settle Escrow
                                   │
                                   ▼
                         Conversation Concluded
```

- **Zero UnifyVault-Owned Database**: Messages are stored on decentralized XMTP nodes, encrypted by wallet keys.
- **Trade Isolation**: Conversations are bound by trade ID and participant wallet addresses.

---

## 📱 Mobile Platform Adapter Architecture

```
                       ┌─────────────────────────┐
                       │   Shared Business &     │
                       │   Blockchain UI Layer   │
                       └────────────┬────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
        ┌─────────────────────────┐   ┌─────────────────────────┐
        │    Web / PWA Platform   │   │  Android Native Platform│
        │         Adapter         │   │         Adapter         │
        ├─────────────────────────┤   ├─────────────────────────┤
        │ • Tesseract.js WASM     │   │ • Google ML Kit Native  │
        │ • Injected/WalletConnect│   │ • WalletConnect DeepLink│
        │ • Browser LocalStorage  │   │ • Capacitor Preferences │
        │ • Web Camera API        │   │ • Capacitor Camera API  │
        └─────────────────────────┘   └─────────────────────────┘
```

---

## 📋 Recommended Action Plan

1. **Phase 2**: Refactor `app/layout.tsx` and client hooks to support clean Next.js client-side execution and static asset bundling.
2. **Phase 3**: Implement resilient RPC Fallback Provider for Base Mainnet.
3. **Phase 4**: Build unified Client-Side OCR Adapter (Tesseract.js WASM + Native Bridge interface).
4. **Phase 5**: Build XMTP P2P temporary trade chat component with fallback.
5. **Phase 6**: Initialize Capacitor Android configuration (`capacitor.config.ts`, Android project scaffold in Turborepo).
6. **Phase 7-10**: Setup WalletConnect deep linking, secure local storage, and on-chain AppRegistry interface.
7. **Phase 11-13**: Maintain 100% desktop web compatibility, execute verification tests, and generate documentation.
