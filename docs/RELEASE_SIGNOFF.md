# UnifyVault V2 — Mainnet Release Sign-Off Matrix

> **Target Network**: Base Mainnet (Chain ID 8453)  
> **Release Target**: v2.2.0-mainnet  
> **Status**: In Progress

---

## Executive Approval Requirements

Deployment to Base Mainnet requires unanimous sign-off across all key operational operational functional domains. No contract deployment or mainnet asset wiring may occur without explicit sign-off from each designated area owner.

---

## Release Approval Table

| Domain / Area               | Designated Owner          | Required Criteria                                                 | Sign-Off Status | Sign-Off Date | Notes / References                |
| :-------------------------- | :------------------------ | :---------------------------------------------------------------- | :-------------: | :-----------: | :-------------------------------- |
| **Smart Contracts**         | Core Engineering Lead     | 100% test suite pass, zero pending PRs, NatSpec complete          |       ⏳        |       -       | 416 Foundry tests passing         |
| **External Security Audit** | Lead Auditor / Audit Firm | Final audit report delivered; Critical/High issues zero           |       ⏳        |       -       | Audit report pending final review |
| **Governance & Multisig**   | Lead Security Admin       | 3-of-5 Governance Safe created on Base Mainnet with hardware keys |       ⏳        |       -       | Hardware keys verified            |
| **Oracle Security**         | DeFi Infrastructure Lead  | Base Mainnet Chainlink feeds linked & staleness guards verified   |       ⏳        |       -       | Feeds mapped & checked            |
| **Frontend & Web UI**       | Frontend Lead             | Zero mock data, Base Mainnet web3 provider linked, smoke-tested   |       ⏳        |       -       | DApp linked to RPC fallback       |
| **Infrastructure & RPC**    | DevOps Lead               | Primary Alchemy RPC, Infura fallback, public RPC configured       |       ⏳        |       -       | Endpoints provisioned             |
| **Keeper & Event Indexing** | Infrastructure Lead       | PM2 keepers live with webhook alert notifications                 |       ⏳        |       -       | Keeper service active             |
| **Legal & Compliance**      | Legal Counsel             | Risk disclosures, TOS, and Privacy Policy published               |       ⏳        |       -       | Disclosures uploaded              |
| **Final Release Approval**  | Protocol Lead             | All domain sign-offs complete; Go decision executed               |       ⏳        |       -       | Awaiting domain sign-offs         |

---

## Verification Protocol

Upon receiving sign-off from all domain owners:

1. The Protocol Lead will initiate the mainnet deployment script execution.
2. Initial deployment addresses will be recorded in `MAINNET_READINESS.md`.
3. Governance roles will be transferred to the 3-of-5 Multisig Safe.
4. Smoke test transactions (small deposit, small redeem) will be performed.
