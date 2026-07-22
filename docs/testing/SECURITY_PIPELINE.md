# UnifyVault Continuous Security Scanning Pipeline

This document outlines the automated security scanning and verification pipelines established for the UnifyVault Protocol monorepo.

---

## 1. Automated Security Jobs Matrix

| Scanner        | Target Scope                 | Execution Trigger  | Failure Condition                                |
| :------------- | :--------------------------- | :----------------- | :----------------------------------------------- |
| **Gitleaks**   | Entire Repository (Secrets)  | Push / PR          | Any detected private key, token, or credential.  |
| **pnpm audit** | Workspace Dependencies       | Push / PR / Weekly | High/Critical dependency vulnerabilities.        |
| **Slither**    | Solidity Smart Contracts     | Push / PR          | Compiler warnings or static analysis violations. |
| **Solhint**    | Solidity Style & Linting     | Push / PR          | Rule warnings or compiler standard mismatches.   |
| **CodeQL**     | TypeScript & JavaScript APIs | Push / PR / Weekly | Critical structural or logic security issues.    |
| **forge fmt**  | Solidity formatting check    | Push / PR          | Incorrectly formatted Solidity code.             |
| **forge test** | Solidity unit & fuzz tests   | Push / PR          | Any failing unit, fuzz, or invariant test.       |

---

## 2. Security Tooling Configurations

### A. Secret Scanning (`.gitleaks.toml`)

We run Gitleaks to verify commit histories before push. Custom ignore paths (e.g. `node_modules/`, output builds) are registered in the root [.gitleaks.toml](file:///Users/apple/Documents/UnifyVault-UV/.gitleaks.toml) configuration.

### B. Solidity Linting (`.solhint.json`)

The solidity style linter config [packages/protocol/.solhint.json](file:///Users/apple/Documents/UnifyVault-UV/packages/protocol/.solhint.json) enforces fixed compiler targets (`0.8.20`), reentrancy indicators, snake_case constants, and visibility declarations.

### C. Dependency Auditing (`pnpm audit`)

Dependency trees are evaluated on each build. Dependabot monitors the npm registry and updates package configuration files weekly.

### D. CodeQL Scanner

GitHub CodeQL scans the TypeScript backend (`services/api`) and SDK structures on pull requests, uploading vulnerability warnings to the repository Security tab.
