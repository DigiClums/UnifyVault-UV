# UnifyVault Protocol Legal & Compliance Framework

## Regulatory Planning, Corporate Governance, and Compliance Blueprint

**Version 1.0** — _July 2026_

---

## 1. Disclaimer

> [!IMPORTANT]
> **DISCLAIMER:** This document is for strategic planning and educational purposes only. It does not constitute legal, financial, or regulatory advice. The UnifyVault Protocol is a decentralized software application deployed on public blockchain networks. The regulatory treatment of digital assets, index tokens, and Layer-2 rollups is subject to rapid policy shifts globally. Team members, developers, and partners must seek specialized legal counsel in their respective jurisdictions before deploying smart contracts, launching portals, or collecting fees.

---

## 2. Legal Philosophy

UnifyVault is guided by four core principles to manage legal risk and support compliance:

- **Non-Custodial Architecture:** Users maintain custody of their private keys and assets. The protocol does not custody client funds or manage private keys on behalf of users.
- **Decentralized Roadmaps:** Admin controls are designed to transition from a multi-signature system to a community DAO, reducing centralization risk.
- **Regulatory Cooperation:** The protocol is designed to adapt to compliance requirements, such as integrating KYC/AML verification checks if mandated by local laws.
- **User Transparency:** System risks, transaction fees, and asset backing ratios are publicly disclosed.

---

## 3. Jurisdiction Evaluation Framework

The table below evaluates potential jurisdictions for the protocol's issuing foundation:

| Jurisdiction       | Regulatory Clarity                                        | Setup Cost | Tax Treatment                | Web3 Suitability                                                   |
| :----------------- | :-------------------------------------------------------- | :--------- | :--------------------------- | :----------------------------------------------------------------- |
| **India**          | Evolving regulatory framework (30% VDA flat tax, 1% TDS). | Low        | High tax friction.           | High retail demand, but challenging for issuing entities.          |
| **Singapore**      | High clarity under MAS guidelines.                        | High       | Tax-exempt on capital gains. | Excellent corporate environment; requires active compliance.       |
| **Switzerland**    | Clear FINMA guidelines.                                   | High       | Moderate tax friction.       | Strong support for association and DAO structures.                 |
| **Cayman Islands** | Clear guidelines for Foundation Companies.                | Moderate   | Zero tax.                    | Popular choice for member-less foundations acting as DAO wrappers. |

---

## 4. Entity Structure Strategy

To balance regulatory compliance with decentralized operations, the protocol utilizes a dual-entity structure:

```
                  ┌─────────────────────────────────────┐
                  │       UnifyVault Foundation         │
                  │   (Non-Profit / Cayman Wrapper)     │
                  │   • Governs smart contracts         │
                  │   • Holds IP & Registry Marks       │
                  └──────────────────┬──────────────────┘
                                     │
                    Service Contract │ & Grant Allocation
                                     ▼
                  ┌─────────────────────────────────────┐
                  │         Software DevCo              │
                  │     (Local Operating Entity)        │
                  │   • Builds frontend interfaces      │
                  │   • Manages APIs & workers          │
                  └─────────────────────────────────────┘
```

- **The Foundation Wrapper:** An offshore, member-less foundation (e.g., in the Cayman Islands or Switzerland) serves as the legal representative of the protocol. It holds intellectual property, deployer keys, and manages treasury distributions.
- **The DevCo (Operating Entity):** A local corporation (e.g., in India or Singapore) provides development services to the Foundation under a service contract. This entity maintains the website and manages the API gateway.

---

## 5. Governance Model

Governance authority transitions through three phases:

1.  **Founder Multisig (Phase 1):** The core team maintains administrative keys to manage protocol launches, handle upgrades, and manage parameters.
2.  **Community Voting (Phase 2):** Users vote on risk parameters and fee configurations using off-chain voting platforms (such as Snapshot).
3.  **On-chain DAO (Phase 3):** Smart contracts are handed over to a decentralized autonomous organization, allowing proposals and updates to be executed programmatically on-chain.

---

## 6. Terms of Service Requirements

The frontend interface terms of service must include the following provisions:

- **Non-Custodial Nature:** Explicitly state that UnifyVault does not custody user funds or manage private keys.
- **Prohibited Jurisdictions:** Exclude users located in sanctioned regions or jurisdictions where digital asset trading is restricted.
- **No Investment Advice:** Clarify that index allocations and metrics are for informational purposes and do not constitute financial advice.
- **Protocol Pausing Acknowledgement:** Require users to acknowledge that administrative keys can pause transactions during security incidents or market disruptions.

---

## 7. Privacy Policy Requirements

The protocol's privacy policy must align with data protection standards (such as GDPR and the India DPDP Act):

- **Minimal Data Collection:** The protocol does not collect personally identifiable information (PII) on-chain. Wallet addresses and transaction hashes are public on the blockchain network.
- **IP Address Logging:** Explain that backend API gateways may log IP addresses temporarily for security and rate-limiting purposes, with logs deleted after 30 days.
- **Third-Party RPC Disclosures:** Inform users that connection metadata is routed through external RPC nodes (e.g., Alchemy or QuickNode), which maintain their own privacy policies.

---

## 8. Risk Disclosures

The interface must display clear disclosures explaining the risks of digital asset investing:

- **Market Volatility:** Digital asset prices are highly volatile, and users may lose their entire investment.
- **Smart Contract Bugs:** Despite security audits, smart contracts are subject to bugs or logical exploits.
- **Oracle Performance:** Price calculations depend on third-party oracle feeds. Outages or stale data can impact token valuation and mint/burn processes.

---

## 9. User Responsibilities

Users are responsible for:

- **Key Security:** Securing seed phrases and protecting private keys.
- **Tax Compliance:** Calculating and paying any local capital gains taxes or transaction taxes.
- **Legal Compliance:** Ensuring that accessing the protocol is legal under their local laws.

---

## 10. AML Integration (Future Planning)

To support future compliance requirements, the backend architecture includes modular integration slots:

```
  [User Transaction Request] ──> [Compliance Gateway Hook] ──> [Address Screening Check]
                                                                     │
                                      ┌──────────────────────────────┴──────────────────────────────┐
                                      ▼ (Flagged / Sanctioned)                                      ▼ (Clean)
                               [Reject & Block IP]                                           [Route to Controller]
```

- **Transaction Monitoring:** Integrations with transaction monitoring services (such as Chainalysis or Elliptic) to identify and flag wallets associated with illicit activities.
- **Trigger Thresholds:** Dynamic transaction screening checks based on volume limits.

---

## 11. KYC Integration (Future Planning)

If mandated by local regulations, the protocol can integrate decentralized identity checks:

- **Account Abstraction Hooks:** Smart contracts can verify identity status using credential providers (e.g., Coinbase Verifications or EAS Attestations) before allowing minting.
- **Off-Chain Verification:** Third-party gateways can handle KYC checks, passing cryptographically signed approvals to allow transactions.

---

## 12. Sanctions Screening

- **Sanction Lists:** The frontend gateway filters and blocks wallet addresses on global sanctions lists (such as OFAC or UN lists).
- **Geo-Blocking:** The API gateway uses geo-IP filtering to restrict access from sanctioned regions.

---

## 13. Consumer Protection

- **Slippage Slivers:** The interface displays slip warnings and alerts users if transaction sizes could cause price slippage.
- **Confirmation Prompts:** Users must confirm transaction terms (including fees and expected token output) before submitting transactions.

---

## 14. Data Protection Alignment (DPDP Act / GDPR)

- **PII Separation:** The database does not link physical identities (like email addresses) directly with on-chain wallet transactions.
- **Data Rights:** The system supports data deletion requests for email notifications and user preferences.

---

## 15. Compliance Record Keeping

- **Audit Trails:** The database maintains logs of administrative changes, fee adjustments, and code updates.
- **Verification Archives:** Maintains cryptographic logs of SIWE approvals to verify transaction authorization.

---

## 16. Intellectual Property

- **Software Repository:** The core code is hosted in public repositories under open-source licenses.
- **Trademark Protection:** The name "UnifyVault" and associated logo designs are protected under trademark filings managed by the Foundation.

---

## 17. Open Source Licensing Strategy

To balance community auditability with product protection, code is licensed under standardized open-source terms:

- **Smart Contracts:** Licensed under the **MIT License** to encourage integration and compatibility.
- **Backend & Frontend Core:** Licensed under the **Apache License 2.0** to protect trademark rights.

---

## 18. Tax Considerations

- **Direct Income Taxes:** Corporate revenues generated from mint/burn transaction fees are reported under the local issuing entity's tax jurisdiction.
- **Indirect Taxes (GST/VAT):** Local entities comply with applicable service tax rules on fee services.
- **User Reporting:** The portfolio portal provides transaction history exports to help users calculate their capital gains taxes.

---

## 19. Compliance Monitoring

- **Sanctions Monitor:** The backend runs automated daily checks of sanctions lists to ensure screening records remain up-to-date.
- **Security Sentinels:** Automated monitors scan on-chain events and alert developers in the event of unauthorized contract calls.

---

## 20. Regulatory Change Management

The legal team monitors regulatory updates across key jurisdictions:

- **India:** Tracks announcements from the Ministry of Finance and FIU.
- **United States:** Monitors SEC commodity rulings and FinCEN guidelines.
- **European Union:** Tracks MiCA implementations to ensure compliance with stablecoin and index regulations.

---

## 21. Third-Party Vendor Risk

- **Oracle Providers:** We evaluate oracle provider reliability, pricing feeds, and data sources.
- **Node Infrastructure:** We use redundant RPC node providers to prevent transaction processing delays.

---

## 22. Business Continuity & Legal Fail-Safe

- **Key Rotation:** The protocol maintains a key rotation plan to replace administrative keys in the event of a key compromise.
- **Interface Redundancy:** If the primary website goes offline, the smart contracts remain accessible on-chain, allowing users to redeem assets directly.

---

## 23. Legal Risk Register

The table below lists identified legal risks and their associated mitigation strategies:

| Risk ID   | Identified Risk                   |  Impact  | Risk Mitigation Strategy                                                                                                   |
| :-------- | :-------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------- |
| **LR-01** | **Securities Reclassification**   | Critical | Avoid marketing index assets as yield-bearing or promising returns. Structure assets to track underlying spot commodities. |
| **LR-02** | **AML Non-Compliance**            |   High   | Integrate modular compliance hooks and sanctions screening at the gateway layer.                                           |
| **LR-03** | **Data Breach (Privacy)**         |  Medium  | Minimize PII storage on backend databases, separating email accounts from wallet addresses.                                |
| **LR-04** | **Unlicensed Financial Activity** | Critical | Route all transactions through non-custodial smart contracts, avoiding custody of user assets.                             |
