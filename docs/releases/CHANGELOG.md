# Changelog

All notable changes to the UnifyVault Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
