# UnifyVault TypeScript SDK (`@unifyvault/sdk`)

This workspace contains the client-side TypeScript SDK for interacting with the UnifyVault Protocol, designed for frontend applications and integration partners.

---

## 1. Directory Structure

```
packages/sdk/
├── src/                   # TypeScript SDK source files
│   └── src/.gitkeep
├── tsconfig.json          # Extends `@unifyvault/tsconfig/base.json`
└── package.json           # Scripts and dependencies
```

---

## 2. Development Operations

Manage the SDK workspace using the following commands:

- **Compile SDK Build:**
  ```bash
  pnpm --filter=@unifyvault/sdk build
  ```
- **Run Local Development Watcher:**
  ```bash
  pnpm --filter=@unifyvault/sdk dev
  ```
- **Run Lint Checks:**
  ```bash
  pnpm --filter=@unifyvault/sdk lint
  ```
