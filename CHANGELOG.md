# Changelog

All notable changes to the UnifyVault Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0-rc1] - 2026-07-26

### Added

- **UV-501 Cost Basis Engine (`CostBasisManager`):** Weighted average cost basis tracking per vault user ($O(1)$ constant time accounting).
- **UV-502 High Water Mark Engine (`HighWaterMarkManager`):** Monotonically increasing High Water Mark tracking to prevent double-charging on realized gains.
- **UV-503 Realized Profit Engine (`RealizedProfitEngine`):** Pure, deterministic calculation module for proportional cost removal, realized profit, and chargeable profit.
- **UV-504 Performance Fee Settlement (`PerformanceFeeSettler`):** Orchestration engine connecting cost basis, high water marks, and fee calculation.
- **UV-505 Controller Integration (`UnifyVaultController`):** Full end-to-end integration of performance fee settlement into deposit and redemption execution flows.
- **UV-506 Hardening & Test Suite:** Added comprehensive unit, integration, fuzzing, and protocol-level economic invariant test suites (416 tests passing, 0 failing).

## [1.0.0-alpha.1] - 2026-07-16

### Added

- **Monorepo Foundation:** Set up a production-grade Turborepo workspace using `pnpm`.
- **Git Init:** Initialized version control configuration.
- **Commit & Formatting Rules:** Configured Commitlint conventional commit rules, Prettier configuration, and ESLint configs.
- **Husky Hooks:** Set up `.husky/pre-commit` (runs format & lint) and `.husky/commit-msg` (validates messages).
- **GitHub Actions CI:** Added `.github/workflows/ci.yml` for automated code verification on PRs.
- **Dependabot:** Added `.github/dependabot.yml` for dependency monitoring.
- **Local Services:** Configured `docker-compose.yml` for local PostgreSQL and Redis DB testing.
- **Documentation Suite:** Completed 15 core architectural specifications inside the `/docs` folder.

-# v0.6.0

## Added

- Implemented UnifyVaultController architecture skeleton.
- Added immutable protocol module references.
- Added constructor validation for deployed contracts.
- Added protocol workflow skeleton methods.
- Added controller invariant tests.
- Added controller architecture documentation.

## Security

- Constructor verifies deployed contracts.
- No business logic implemented.
- No asset movement.
- No token minting.
- No oracle interaction.
