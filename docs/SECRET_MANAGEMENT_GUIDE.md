# 🔒 UnifyVault V2 — Production Secret Management & Zero-Key Security Architecture

> **Security Mandate**: Raw, unencrypted private keys and secret credentials must NEVER be stored on VPS disk files, committed to Git repositories, or hardcoded in source code.

---

## 1. Zero-Key Architecture Overview

In the UnifyVault V2 production architecture:

1. **Frontend Web Apps (`apps/web-v2`)**: Require ZERO private keys or secret credentials. All user signatures are requested interactively via RainbowKit (MetaMask, WalletConnect, Coinbase Wallet, Ledger).
2. **Indexer Daemon (`scripts/indexerDaemon.js`)**: Performs read-only RPC event log queries (`eth_getLogs`). Requires ZERO private keys or write access.
3. **Chainlink Oracles**: Operate autonomously on Base Mainnet. No local keeper script or write key is used in production.
4. **Governance Operations**: Managed exclusively via a 3-of-5 Safe (Gnosis Safe) multisig on Base Mainnet. Hardware wallets (Ledger / Trezor) sign transaction payloads interactively through the Safe Web App interface.

---

## 2. Environment Variables & Secret Scoping

### 2.1 Public Frontend Variables (`apps/web-v2/.env.local`)

Only non-sensitive, public configuration items may be prefixed with `NEXT_PUBLIC_`:

```env
NEXT_PUBLIC_ACTIVE_CHAIN=base-mainnet
NEXT_PUBLIC_RPC_URL_BASE_MAINNET=https://mainnet.base.org
NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET=0x...
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=146781145b65a1c63ffcd7d6eaf03bd1
```

> **Security Rule**: Any environment variable prefixed with `NEXT_PUBLIC_` is bundled into client-side JavaScript. **NEVER place private keys, API secret tokens, or database passwords in `NEXT_PUBLIC_` variables.**

---

## 3. Recommended Secret Managers for Production Infrastructure

If server-side API keys or RPC endpoint secrets are needed, store them in a secure Secret Manager:

| Provider           | Recommended Solution        | Usage Pattern                                                               |
| ------------------ | --------------------------- | --------------------------------------------------------------------------- |
| **AWS**            | AWS Secrets Manager / KMS   | Environment injection at runtime.                                           |
| **GCP**            | Google Cloud Secret Manager | Dynamic secret fetch on container launch.                                   |
| **HashiCorp**      | HashiCorp Vault             | Encrypted secret engine with audit logging.                                 |
| **GitHub Actions** | GitHub Encrypted Secrets    | Injected into CI/CD build environments (`${{ secrets.BASESCAN_API_KEY }}`). |

---

## 4. Git Security & CI Scans

- `.gitignore` includes `.env`, `.env.local`, `.env.production`, `*.pem`, `*.key`, and `keystores/`.
- GitHub Actions workflow `.github/workflows/security.yml` executes **Gitleaks** secret scans on every push and pull request to prevent accidental secret commits.
