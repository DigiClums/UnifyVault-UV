# Contributing Guidelines

Thank you for your interest in contributing to the **UnifyVault Protocol**!

To ensure the security, correctness, and maintainability of our digital asset infrastructure, we enforce strict engineering standards across our codebase.

---

## 1. Development Principles

All contributions must align with our core engineering tenets:

- **Correctness and Security First:** Code that handles capital allocations must be secure, audited, and cover all test parameters.
- **Documentation-First:** API updates, configuration changes, or contract updates must be documented before pull requests are approved.
- **Conventional Commit Formatting:** All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format.

---

## 2. Coding Standards

Before submitting changes, format and validate your code locally using:

- **Formatting Check:** `pnpm run format`
- **Linter Check:** `pnpm run lint`
- **Test Runner:** `pnpm run test`

The CI pipeline runs these checks on every pull request. PRs with failing checks will not be reviewed.

---

## 3. Git Branching Strategy

Our team uses the **GitFlow** branching workflow:

- **Feature Branches:** Create branches off of `develop` using the prefix `feature/` (e.g., `feature/add-siwe-auth`).
- **Pull Requests:** Direct all pull requests against the `develop` branch. Direct merges to `main` or `master` are blocked.
- **Releases:** Releases are staged on the `release/` branch before being merged to `main` and tagged.

---

## 4. Conventional Commit Messages

Commit messages must use standard semantic prefixes:

- `feat:` A new feature (e.g., `feat: integrate chainlink oracle Dev feed`).
- `fix:` A bug fix (e.g., `fix: resolve stale price heartbeat validation offset`).
- `docs:` Documentation changes only.
- `style:` Changes that do not affect code logic (formatting, spacing).
- `refactor:` Code changes that neither fix a bug nor add a feature.
- `test:` Adding missing tests or correcting existing tests.
- `chore:` Updates to build tasks or package configurations.

---

## 5. Definition of Done (DoD)

A task is only considered complete when it meets the following criteria:

1.  **Documentation:** All API paths, database tables, and smart contract interfaces are documented.
2.  **Test Coverage:** Code passes lint checks and achieves target unit test coverage.
3.  **Code Review:** Pull requests require approval from at least one core engineer before merge.
