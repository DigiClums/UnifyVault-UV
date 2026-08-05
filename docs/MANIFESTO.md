# UnifyVault Manifesto v1.0

## Core Principle

> **Blockchain is the Database.**

Blockchain is not merely a settlement layer; it is the single source of truth for all protocol state.

---

## Architecture

```
Wallet
   │
   ▼
web-v2
   │
wagmi + viem
   │
ProtocolDirectory
   │
Base Chain
   │
├── Controller
├── Treasury
├── CustodyVault
├── StrategyManager
├── FeeManager
├── Oracle
└── UVBTCETH
```

---

## Never Build

- ❌ PostgreSQL
- ❌ MySQL
- ❌ Redis
- ❌ MongoDB
- ❌ Backend API
- ❌ Central Server
- ❌ Central Indexer
- ❌ Hardcoded Contract Addresses
- ❌ Hardcoded Strategy Weights
- ❌ Hardcoded Token Decimals
- ❌ Hardcoded RPC Logic
- ❌ Fake Analytics

---

## Always Build

- ✅ ProtocolDirectory
- ✅ On-chain Events
- ✅ Dynamic Discovery
- ✅ Runtime ABI Resolution
- ✅ Event Decoding
- ✅ Transaction Timeline
- ✅ Wallet Signatures
- ✅ Live Contract Reads
- ✅ Contract Events

---

## Frontend Rules

Every screen must read live data.

`Dashboard` → `Portfolio` → `Deposit` → `Redeem` → `Treasury` → `Custody` → `Admin` → `Explorer` → `Analytics`

_No fabricated values._

---

## Admin Philosophy

Everything executed through smart contracts.

- **Never**: `POST /pause`
- **Always**: Wallet Signature → `Controller.pause()`

---

## Explorer Philosophy

- **Never**: Database History
- **Always**: Controller Events → Receipt → Decode Logs → Timeline

---

## Analytics Philosophy

Analytics must be reproducible from chain data.

If a value cannot be derived from blockchain data, clearly mark it as unavailable instead of inventing or estimating it.

---

## Security Philosophy

No privileged backend.

Only:

- AccessControl
- Timelock (if adopted)
- Multi-signature governance (if adopted)
- Wallet signatures

---

## Upgrade Philosophy

Contracts remain modular.

Future modules can be added without changing the architecture:

- Lending
- Futures
- Options
- Insurance
- Staking
- Cross-chain
- RWA

---

## Engineering Rule

Every new feature must answer:

1. **Is the source of truth on-chain?**
2. **Can it work without a backend?**
3. **Does it avoid hardcoded assumptions?**
4. **Is it verifiable by anyone?**
5. **Will it continue to work if the frontend is replaced?**

_If any answer is No, redesign the feature before implementing it._
