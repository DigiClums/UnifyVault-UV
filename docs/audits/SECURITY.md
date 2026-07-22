# Security Policy & Vulnerability Disclosure

Security is a core priority of the UnifyVault Protocol. This document outlines our vulnerability reporting policy and response procedures.

---

## 1. Supported Versions

We actively monitor and patch the following versions:

| Version                   | Supported | Notes                                              |
| :------------------------ | :-------: | :------------------------------------------------- |
| **V1.x.x**                |    YES    | Active development and mainnet deployment version. |
| **V0.x.x (Pre-releases)** |    NO     | Testnet-only prototypes.                           |

---

## 2. Reporting a Vulnerability

> [!WARNING]
> **DO NOT CREATE PUBLIC ISSUES** for security vulnerabilities. All security-related issues must be reported privately to prevent public exploits.

If you discover a vulnerability, report it immediately to our security team:

- **Email:** security@unifyvault.com
- **Response Window:** The security team will acknowledge receipt of your report within 24 hours.

To help us investigate, please include:

1.  A detailed description of the vulnerability.
2.  Step-by-step instructions or proof-of-concept scripts to reproduce the issue.
3.  An assessment of the potential impact (e.g., loss of funds, pricing manipulation, oracle delay).

---

## 3. Severity Classification

Vulnerabilities are evaluated using a standard severity scale:

- **Critical:** Smart contract vulnerabilities resulting in theft of reserve collateral, uncollateralized token minting, or permanent lockup of user funds.
- **High:** Oracle data corruption or latency exploits that impact pricing calculations.
- **Medium:** Frontend or API vulnerabilities that disrupt user access or session integrity (e.g., DNS spoofing, session hijacking).
- **Low:** Minor issues that do not impact protocol solvency or transaction routing.

---

## 4. Disclosure & Remediation Process

1.  **Acknowledge:** The security team acknowledges the report and isolates the issue on local test forks.
2.  **Remediate:** Engineers write and test a patch, then deploy it via our timelocked upgrade proxy.
3.  **Disclose:** The team publishes a postmortem and credits the finder once the patch is live.
4.  **Reward:** Eligible findings are rewarded through our bug bounty program.
