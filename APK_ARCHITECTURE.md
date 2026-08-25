# 🏗️ UnifyVault Android APK Architecture

## 1. System Overview

UnifyVault is designed to be **Blockchain-First and Local-First**. The mobile application runs as an Android APK compiled via Capacitor, bundling the Next.js client-side web application locally inside the phone assets directory.

```
+-------------------------------------------------------------------------+
|                         UNIFYVAULT ANDROID APK                          |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     Local Web UI Bundle (out/)                    |  |
|  |   - Next.js React 19 Client SPA                                   |  |
|  |   - Local Routing (Dashboard, Staking, P2P, Predictions)          |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +---------------------------+  +------------------------------------+  |
|  |   Client-Side OCR         |  |   Decentralized P2P Chat           |  |
|  |   - Native Google ML Kit  |  |   - XMTP Wallet-to-Wallet          |  |
|  |   - Tesseract.js WASM     |  |   - Zero UnifyVault Central DB     |  |
|  +---------------------------+  +------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     Wagmi / Viem Web3 Layer                       |  |
|  |   - Injected / Mobile WalletConnect Deep Linking                  |  |
|  |   - Base RPC Fallback Provider Matrix                             |  |
|  +---------------------------------+---------------------------------+  |
+------------------------------------|------------------------------------+
                                     |
                                     v
                   +-----------------------------------+
                   |     BASE BLOCKCHAIN (Chain 8453)  |
                   |   - UnifyVaultController (UUPS)   |
                   |   - UVBEStakingVault & Rewards    |
                   |   - P2PEscrow & Marketplace       |
                   |   - Pyth & Chainlink Oracles      |
                   +-----------------------------------+
```

---

## 2. Core Architectural Pillars

### A. Decentralized Network Routing
- **Primary RPC**: `https://mainnet.base.org`
- **Fallback RPC 1**: `https://base-rpc.publicnode.com`
- **Fallback RPC 2**: `https://1rpc.io/base`
- **Wallet Connection**: WalletConnect v2 (`projectId: 146781145b65a1c63ffcd7d6eaf03bd1`) with deep link handling for MetaMask, Rainbow, Coinbase Wallet, and Trust Wallet.

### B. Client-Side OCR Engine
- **No Receipt Image Uploads**: Payment screenshots are processed locally in memory.
- **Extraction**: Parses 12-digit bank UTR reference numbers and payment amounts.
- **On-Chain Attestation**: Generates deterministic `keccak256(receiptBytes)` as the immutable `evidenceHash`.

### C. Decentralized P2P Temporary Chat
- **Protocol**: XMTP (Extensible Message Transport Protocol) with Local-First fallback.
- **Privacy**: End-to-end encrypted between Buyer and Seller wallets.
- **Zero Backend DB**: UnifyVault owns no chat servers or message databases.

---

## 3. Platform Adapter Mapping

| Capability | Web / Desktop PWA | Android Standalone APK |
| :--- | :--- | :--- |
| **Asset Delivery** | HTTPS from CDN/Nginx | Local `file:///android_asset/` bundle |
| **Web3 Wallet** | Browser Extension / QR Code | Mobile Deep Link / WalletConnect v2 |
| **OCR Processing** | Tesseract.js WebAssembly | Native Google ML Kit / Tesseract.js |
| **Storage / Cache** | Browser `localStorage` / `IndexedDB` | Android SharedPreferences / Capacitor Storage |
| **Protocol Logic** | Direct Base RPC Calls | Direct Base RPC Calls |
