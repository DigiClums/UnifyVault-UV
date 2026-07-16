# UnifyVault Design System (`@unifyvault/design-system`)

This workspace contains shared UI components, visual assets, and style tokens used by the web client and admin portal.

---

## 1. Directory Structure

```
packages/design-system/
├── src/                   # Common component configurations and styling files
│   └── src/.gitkeep
├── tsconfig.json          # Extends `@unifyvault/tsconfig/base.json`
└── package.json           # Scripts and dependencies
```

---

## 2. Development Operations

Manage the design system workspace using the following commands:

- **Compile Design System Build:**
  ```bash
  pnpm --filter=@unifyvault/design-system build
  ```
- **Run Local Development Watcher:**
  ```bash
  pnpm --filter=@unifyvault/design-system dev
  ```
- **Run Lint Checks:**
  ```bash
  pnpm --filter=@unifyvault/design-system lint
  ```
