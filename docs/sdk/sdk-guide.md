---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# TypeScript Client SDK Reference (@unifyvault/sdk)

This document provides installation, configuration, and API reference details for the **[`@unifyvault/sdk`](../../packages/sdk)** package.

---

## 📦 1. Installation & Setup

```bash
pnpm add @unifyvault/sdk viem
```

---

## 🛠️ 2. Core SDK Usage Examples

### Initializing the SDK Client

```typescript
import { UnifyVaultClient } from '@unifyvault/sdk';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const client = new UnifyVaultClient({
  publicClient,
  directoryAddress: '0x...', // ProtocolDirectory address
});
```

### Fetching Portfolio NAV & Quotes

```typescript
// Fetch current Share Price NAV
const nav = await client.getSharePriceNAV();

// Fetch deposit quote
const quote = await client.getDepositQuote({
  asset: '0x...', // USDC address
  amount: 1000000000n, // 1,000 USDC
});
```

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
