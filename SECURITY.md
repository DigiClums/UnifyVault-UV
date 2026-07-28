# UnifyVault V2 — Security Policy & Responsible Disclosure

UnifyVault takes the security of our smart contracts, user funds, and protocol infrastructure extremely seriously. We appreciate the work of security researchers and ethical hackers who help us keep UnifyVault safe.

---

## 1. Reporting Vulnerabilities (Responsible Disclosure)

If you discover a security vulnerability, bug, or potential exploit in UnifyVault V2, please report it immediately through our confidential disclosure channel.

- **Primary Contact Email**: `security@unifyvault.io`
- **PGP Encryption Key**: Available upon request / published on protocol security page.
- **Reporting Details**:
  - Detailed steps to reproduce the issue.
  - Affected smart contracts, functions, or infrastructure components.
  - Proof of Concept (PoC) script (Foundry/Hardhat script preferred).
  - Potential impact assessment.

> **DO NOT** publicly disclose vulnerabilities, post on social media, or create GitHub issues for security vulnerabilities before giving our team time to investigate and fix the issue.

---

## 2. Expected Response SLA & Workflow

We are committed to responding promptly to all valid vulnerability reports:

| Severity Stage                         |  Target SLA  | Action Taken                                                           |
| :------------------------------------- | :----------: | :--------------------------------------------------------------------- |
| **Initial Acknowledgement**            | `< 24 Hours` | Receipt confirmed; triage assigned to security engineering team        |
| **Initial Triage & Impact Assessment** | `< 72 Hours` | Issue validated, severity categorized, patch development initiated     |
| **Fix & Remediation Timeline**         | `1 - 7 Days` | Patch written, tested, audited, and scheduled for governance execution |
| **Public Disclosure & Bounty Payout**  |   Post-Fix   | Resolution confirmed with reporter, bug bounty distributed             |

---

## 3. Supported Versions

We actively provide security support for the following components:

| Component                            | Version  |   Security Support Status   |
| :----------------------------------- | :------- | :-------------------------: |
| **UnifyVault V2 Core Contracts**     | `v2.2.0` |        ✅ Supported         |
| **OracleManager & Feed Integration** | `v2.2.0` |        ✅ Supported         |
| **Keeper & Event Indexers**          | `v1.0.0` |        ✅ Supported         |
| **UnifyVault Web Frontend**          | `v2.x`   |        ✅ Supported         |
| **UnifyVault V1 Contracts**          | `v1.x`   | ❌ End of Life / Deprecated |

---

## 4. Bug Bounty Program

UnifyVault operates a Bug Bounty Program for security researchers who identify critical vulnerabilities:

- **Critical (Loss of Funds / Permanent Freezing)**: Up to $100,000 USD (payable in USDC)
- **High (Temporary Freezing / Oracle Manipulation)**: Up to $25,000 USD
- **Medium (Logic Flaws / Fee Theft)**: Up to $5,000 USD
- **Low / Informational**: Swag / Recognition in Security Hall of Fame

---

## 5. Security Architecture & Documentation

For detailed information regarding protocol access control roles, emergency pause circuits, and reentrancy guards, see:

- [docs/SECURITY.md](file:///var/www/UnifyVault-UV/docs/SECURITY.md) — Security Model & Access Control Matrix
- [docs/THREAT_MODEL.md](file:///var/www/UnifyVault-UV/docs/THREAT_MODEL.md) — Protocol Threat Analysis
- [docs/Known_Limitations.md](file:///var/www/UnifyVault-UV/docs/Known_Limitations.md) — Known Limitations & Assumptions
