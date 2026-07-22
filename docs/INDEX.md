# UnifyVault Documentation Index

Welcome to the **UnifyVault Protocol** documentation directory. All documentation across the monorepo has been organized into thematic categories below.

For a full navigation overview of the repository, refer to the root [README.md](../README.md).

---

## 🏛️ Architecture & Specifications (`docs/architecture/`)

Comprehensive architectural designs, protocol specifications, tokenomics, and smart contract engineering specs.

- [02-whitepaper.md](architecture/02-whitepaper.md) — UnifyVault Protocol Whitepaper detailing core mechanism and design rationale
- [03-tokenomics.md](architecture/03-tokenomics.md) — Tokenomics model, index composition, and share pricing calculations
- [04-architecture.md](architecture/04-architecture.md) — High-level system architecture specification across smart contracts and services
- [05-smart-contracts.md](architecture/05-smart-contracts.md) — Smart contract engineering specification, module roles, and interface contracts
- [07-api.md](architecture/07-api.md) — Backend API specification and data ingestion architecture
- [08-frontend.md](architecture/08-frontend.md) — Next.js frontend architecture manual and Web3 state management design
- [09-backend.md](architecture/09-backend.md) — Microservices and indexing backend architecture specification
- [13-financial-model.md](architecture/13-financial-model.md) — Protocol financial model, fee routing calculations, and yield distribution math
- [ARCHITECTURE_FREEZE.md](architecture/ARCHITECTURE_FREEZE.md) — Architecture freeze confirmation report and contract interface locking
- [INFLATION_ATTACK_DESIGN.md](architecture/INFLATION_ATTACK_DESIGN.md) — Architectural design review for ERC-4626 first-depositor inflation attack mitigations
- [PROTOCOL_SMART_CONTRACT_ARCHITECTURE.md](architecture/PROTOCOL_SMART_CONTRACT_ARCHITECTURE.md) — Detailed smart contract module breakdown and storage layout review
- [REDEMPTION_ARCHITECTURE.md](architecture/REDEMPTION_ARCHITECTURE.md) — Liquidity redemption engine architecture and collateral distribution model

---

## 🛡️ Audits & Security (`docs/audits/`)

Security reviews, audit readiness assessments, static analysis reports, and contract reviews.

- [06-security.md](audits/06-security.md) — Comprehensive security architecture manual and access control rules
- [ACCOUNTING_MODEL_REVIEW.md](audits/ACCOUNTING_MODEL_REVIEW.md) — Internal accounting model review and precision loss verification
- [AUDIT_READINESS.md](audits/AUDIT_READINESS.md) — Protocol-wide security audit readiness assessment report
- [CHAINLINK_PROVIDER_REVIEW.md](audits/CHAINLINK_PROVIDER_REVIEW.md) — Chainlink AggregatorV3 price feed provider review and freshness checks
- [COLLATERAL_TRANSFER_REVIEW.md](audits/COLLATERAL_TRANSFER_REVIEW.md) — Safe ERC-20 collateral transfer layer verification
- [CONTROLLER_ARCHITECTURE_REVIEW.md](audits/CONTROLLER_ARCHITECTURE_REVIEW.md) — UnifyVaultController security review and access control audit
- [CUSTODY_VAULT_REVIEW.md](audits/CUSTODY_VAULT_REVIEW.md) — CustodyVault collateral isolation and authorization review
- [DEPOSIT_FLOW_REVIEW.md](audits/DEPOSIT_FLOW_REVIEW.md) — End-to-end deposit workflow security audit and invariant checks
- [DEPOSIT_QUOTE_REVIEW.md](audits/DEPOSIT_QUOTE_REVIEW.md) — Deposit quote calculation and oracle slippage audit
- [DEPOSIT_VALIDATION_REVIEW.md](audits/DEPOSIT_VALIDATION_REVIEW.md) — Input validation and parameter check audit for deposit functions
- [FEE_ROUTING_REVIEW.md](audits/FEE_ROUTING_REVIEW.md) — Fee collection and Treasury distribution security review
- [MINTING_ENGINE_REVIEW.md](audits/MINTING_ENGINE_REVIEW.md) — Index share minting engine security review and supply bounds audit
- [MOCK_ORACLE_PROVIDER_REVIEW.md](audits/MOCK_ORACLE_PROVIDER_REVIEW.md) — Mock oracle provider implementation review for testnet/local environments
- [ORACLE_MANAGER_REVIEW.md](audits/ORACLE_MANAGER_REVIEW.md) — OracleManager fallback routing and heartbeat staleness security review
- [ORACLE_PROVIDER_REVIEW.md](audits/ORACLE_PROVIDER_REVIEW.md) — Oracle provider abstraction interface security review
- [PRE_RELEASE_AUDIT.md](audits/PRE_RELEASE_AUDIT.md) — Pre-release internal security audit and findings resolution report
- [PROTOCOL_DIRECTORY_REVIEW.md](audits/PROTOCOL_DIRECTORY_REVIEW.md) — ProtocolDirectory registry security review and immutability freeze audit
- [REDEMPTION_ENGINE_REVIEW.md](audits/REDEMPTION_ENGINE_REVIEW.md) — Redemption execution and share burning security audit
- [SECURITY.md](audits/SECURITY.md) — Protocol security policy and vulnerability disclosure guidelines
- [SECURITY_REVIEW.md](audits/SECURITY_REVIEW.md) — Overall security review and threat model documentation
- [SLITHER_ZERO_WARNING_REPORT.md](audits/SLITHER_ZERO_WARNING_REPORT.md) — Slither static analysis zero-warning refactoring report
- [TREASURY_REVIEW.md](audits/TREASURY_REVIEW.md) — Treasury vault fee storage and withdrawal permission audit
- [UVBTCETHTOKEN_REVIEW.md](audits/UVBTCETHTOKEN_REVIEW.md) — UVBTCETHToken ERC-20 and EIP-2612 permit security review
- [VERIFICATION_REPORT.md](audits/VERIFICATION_REPORT.md) — Contract bytecode and Etherscan/Basescan verification report

---

## 🧪 Testing & Quality Assurance (`docs/testing/`)

Test strategies, execution results, test suite documentation, and continuous security pipeline specifications.

- [CONTRACT_TEST_STRATEGY.md](testing/CONTRACT_TEST_STRATEGY.md) — Smart contract testing strategy (Unit, Integration, Fuzzing, Invariants)
- [PORTFOLIO_INTEGRATION_TESTS.md](testing/PORTFOLIO_INTEGRATION_TESTS.md) — Web frontend Portfolio page integration test suite documentation
- [SECURITY_PIPELINE.md](testing/SECURITY_PIPELINE.md) — Continuous security scanning and static analysis CI/CD pipeline configuration
- [SEPOLIA_TEST_RESULTS.md](testing/SEPOLIA_TEST_RESULTS.md) — Base Sepolia live testnet integration test execution log and results

---

## 🚀 Deployment & Operations (`docs/deployment/`)

Deployment logs, contract addresses, and deployment scripts documentation.

- [DEPLOYMENT_ADDRESSES.md](deployment/DEPLOYMENT_ADDRESSES.md) — Deployed contract addresses across Base Sepolia and Base Mainnet
- [DEPLOYMENT_REPORT.md](deployment/DEPLOYMENT_REPORT.md) — Smart contract deployment report and verification logs
- [SEPOLIA_TRANSACTION_LOG.md](deployment/SEPOLIA_TRANSACTION_LOG.md) — Base Sepolia deployment transaction hashes and gas consumption records

---

## 💻 Development & Operations (`docs/development/`)

Developer guides, contribution instructions, roadmap, brand guidelines, and product decision logs.

- [01-vision.md](development/01-vision.md) — Protocol vision, market positioning, and core value proposition
- [10-roadmap.md](development/10-roadmap.md) — UnifyVault project execution roadmap and milestone tracker
- [11-brand.md](development/11-brand.md) — Brand identity, logo design guidelines, and color palette
- [12-founder-deck.md](development/12-founder-deck.md) — UnifyVault pitch deck and investor presentation notes
- [14-legal-compliance.md](development/14-legal-compliance.md) — Legal, regulatory, and compliance risk assessment framework
- [15-liquidity-strategy.md](development/15-liquidity-strategy.md) — Liquidity bootstrapping and market making strategy
- [CODE_OF_CONDUCT.md](development/CODE_OF_CONDUCT.md) — Community code of conduct guidelines
- [CONTRIBUTING.md](development/CONTRIBUTING.md) — Developer contribution guidelines, setup, and PR conventions
- [DASHBOARD_PORTFOLIO.md](development/DASHBOARD_PORTFOLIO.md) — Frontend Dashboard and Portfolio component architecture
- [DEPOSIT_INTEGRATION.md](development/DEPOSIT_INTEGRATION.md) — Deposit page integration details and custom Web3 hooks
- [KNOWN_LIMITATIONS.md](development/KNOWN_LIMITATIONS.md) — Operational constraints, known edge cases, and protocol boundaries
- [PRODUCT_DECISIONS.md](development/PRODUCT_DECISIONS.md) — Product design decisions log and feature trade-offs
- [PROJECT_STATUS.md](development/PROJECT_STATUS.md) — UnifyVault overall project status dashboard
- [REDEEM_INTEGRATION.md](development/REDEEM_INTEGRATION.md) — Redeem page integration details and transaction hooks
- [SOLIDITY_STANDARDS.md](development/SOLIDITY_STANDARDS.md) — Solidity coding standards, style guide, and Nomic guidelines
- [WALLET_INTEGRATION.md](development/WALLET_INTEGRATION.md) — Frontend wallet connection, chain switching, and Web3 modal setup

---

## 📦 Releases & Production (`docs/releases/`)

Release approvals, changelogs, and production readiness sign-offs.

- [CHANGELOG.md](releases/CHANGELOG.md) — Version history, feature release logs, and bug fixes
- [PRODUCTION_RELEASE_APPROVAL.md](releases/PRODUCTION_RELEASE_APPROVAL.md) — Production release approval sign-off report

---

## 🗄️ Archive (`docs/archive/`)

Historical milestone cleanup reports and legacy refactoring documentation.

- [FOUNDATION_CLEANUP_REPORT.md](archive/FOUNDATION_CLEANUP_REPORT.md) — Frontend Foundation Module 1 cleanup and refactoring report
- [WALLET_CLEANUP_REPORT.md](archive/WALLET_CLEANUP_REPORT.md) — Web3 Wallet integration Module 2 cleanup report

---

## 🧩 Workspace Package READMEs

README entry points preserved within specific sub-packages:

- [apps/web/README.md](../apps/web/README.md) — Next.js Web Frontend Package
- [apps/admin/README.md](../apps/admin/README.md) — Admin Portal Workspace
- [services/api/README.md](../services/api/README.md) — API Gateway Service Workspace
- [packages/protocol/README.md](../packages/protocol/README.md) — Smart Contracts Package
- [packages/sdk/README.md](../packages/sdk/README.md) — TypeScript SDK Package
- [packages/shared/README.md](../packages/shared/README.md) — Shared Utilities Package
- [packages/design-system/README.md](../packages/design-system/README.md) — Design System UI Package
- [infra/README.md](../infra/README.md) — Infrastructure Configuration
- [scripts/README.md](../scripts/README.md) — Helper Scripts Workspace
- [tests/README.md](../tests/README.md) — Integration & E2E Testing Directory
