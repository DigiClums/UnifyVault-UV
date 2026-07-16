# UnifyVault Shared Utilities (`@unifyvault/shared`)

This workspace contains shared TypeScript utilities, helper functions, and constants used across multiple packages and services.

---

## 1. Directory Structure

```
packages/shared/
├── src/                   # Helper functions, validators, and constants
│   └── src/.gitkeep
├── tsconfig.json          # Extends `@unifyvault/tsconfig/base.json`
└── package.json           # Scripts and dependencies
```

---

## 2. Development Operations

Manage the shared utilities workspace using the following commands:

- **Compile Shared Utilities Build:**
  ```bash
  pnpm --filter=@unifyvault/shared build
  ```
- **Run Local Development Watcher:**
  ```bash
  pnpm --filter=@unifyvault/shared dev
  ```
- **Run Lint Checks:**
  ```bash
  pnpm --filter=@unifyvault/shared lint
  ```
