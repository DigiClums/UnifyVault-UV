# Protocol API Specification

This document details the on-chain EVM JSON-RPC querying model and the Next.js P2P Payment API integration layer for the UnifyVault V2 protocol.

---

## 1. On-Chain EVM JSON-RPC Integration Layer

The primary protocol data and transaction execution layer is fully decentralized and client-side. The frontend interacts directly with smart contracts via JSON-RPC over HTTP/WebSocket.

### 1.1 Supported RPC Endpoints

| Chain Name       | Chain ID | Public RPC Endpoint        |
| :--------------- | :------- | :------------------------- |
| **Base Mainnet** | `8453`   | `https://mainnet.base.org` |
| **Base Sepolia** | `84532`  | `https://sepolia.base.org` |

### 1.2 On-Chain Query Reference

Client applications query protocol state through view methods on core contracts:

- **Module Resolution**: `ProtocolDirectory.getAddress(bytes32 name)`
- **Asset Pricing**: `OracleManager.getAssetPrice(address asset)`
- **Price Freshness**: `OracleManager.isPriceFresh(address asset)`
- **Vault Net Asset Value**: `PortfolioManager.calculateNAV()`
- **Share Valuation**: `PortfolioManager.calculateUVPrice()`
- **Investor Cost Basis**: `CostBasisManagerV2.costBasis(address user)`
- **Investor Realized P&L**: `CostBasisManagerV2.realizedPnL(address user)`
- **Investor Unrealized P&L**: `CostBasisManagerV2.unrealizedPnL(address user)`
- **P2P Escrow Trade State**: `P2PEscrowV2.getTrade(uint256 tradeId)`
- **Orderbook State**: `Marketplace.getOrder(uint256 orderId)`

---

## 2. Next.js P2P Payment API Routes

For off-chain peer-to-peer fiat settlement coordination (UPI / bank transfers), the application provides cryptographically protected Next.js App Router API routes located at `apps/web-v2/app/api/p2p/`.

### 2.1 Cryptographic Wallet Authentication

All write and retrieval API endpoints enforce wallet signature verification (`verifyWalletAuth`). Callers must sign an EIP-191 timestamped message proving ownership of `userAddress`.

---

### 2.2 Endpoint Catalog

#### `POST /api/p2p/payment-intent`

- **Purpose**: Creates or retrieves an off-chain Payment Intent with standardized UPI URIs for buyer fiat transfers.
- **Security**: Verifies caller is buyer or seller of the trade. Fetches authoritative trade details directly from `P2PEscrowV2` on-chain.
- **Parameters**: `tradeId`, `userAddress`, `signature`, `timestamp`.

#### `POST /api/p2p/payment-claim`

- **Purpose**: Records the buyer's off-chain payment declaration (UTR and receipt hash).
- **Security**: Restricted to `trade.buyer`. Does NOT trigger on-chain token release.
- **Parameters**: `tradeId`, `userAddress`, `signature`, `timestamp`, `utr`, `evidenceHash`.

#### `POST /api/p2p/payment-confirm`

- **Purpose**: Records seller confirmation of fiat receipt.
- **Security**: Restricted to `trade.seller`.
- **Parameters**: `tradeId`, `userAddress`, `signature`, `timestamp`.

#### `POST /api/p2p/payment-dispute`

- **Purpose**: Records dispute details and attaches evidence logs for arbitration.
- **Parameters**: `tradeId`, `userAddress`, `signature`, `timestamp`, `reason`.

#### `POST /api/p2p/payment-verify`

- **Purpose**: Sole verification authority in development/test environments (`ALLOW_MOCK_VERIFIER=true`) to process automated bank webhook attestations.
- **Security Invariant**: Strictly disabled in production unless explicit mock verifiers are enabled.
