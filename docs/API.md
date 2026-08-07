# Protocol API Specification

This document details the backend and external API integration layer for the UnifyVault V2 protocol.

---

## 1. Backend REST & GraphQL APIs

**Not implemented in the current version.**

UnifyVault V2 operates as a fully decentralized, client-side Web3 application. The architecture intentionally omits central backend API servers, database services, or off-chain middleware endpoints.

All protocol state queries (e.g. Total Value Locked, NAV, user share balances, asset prices) and action broadcasts (deposits, redemptions, rebalances) are executed directly against the EVM blockchain via public JSON-RPC nodes.

---

## 2. EVM JSON-RPC Integration Layer

The frontend application (`apps/web-v2`) interacts with smart contracts using standardized EVM JSON-RPC calls over HTTP/WebSocket.

### 2.1 Supported RPC Endpoints

| Chain Name | Chain ID | Public RPC Endpoint |
| :--- | :--- | :--- |
| **Base Mainnet** | `8453` | `https://mainnet.base.org` |
| **Base Sepolia** | `84532` | `https://sepolia.base.org` |

---

## 3. On-Chain Query Reference

Client applications query protocol state through view methods on core contracts:

### 3.1 Fetch Protocol Module Addresses
Call `ProtocolDirectory.getAddress(bytes32 name)`:
- `ModuleIds.VAULT` (`keccak256("CustodyVault")`)
- `ModuleIds.ORACLE` (`keccak256("OracleManager")`)
- `ModuleIds.TOKEN` (`keccak256("IndexToken")`)
- `ModuleIds.TREASURY` (`keccak256("Treasury")`)
- `ModuleIds.PORTFOLIO_MANAGER` (`keccak256("PortfolioManager")`)

### 3.2 Fetch Asset Price
Call `OracleManager.getAssetPrice(address asset)`:
- Returns normalized 18-decimal USD valuation of the asset.

### 3.3 Fetch Total NAV & Share Value
Call `PortfolioManager.calculateNAV()`:
- Returns total portfolio net asset value in USD (18 decimals).
Call `UVBTCETHToken.totalSupply()`:
- Returns total share supply.
