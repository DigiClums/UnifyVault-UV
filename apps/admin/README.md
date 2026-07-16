# UnifyVault Admin Portal (`@unifyvault/admin`)

This workspace hosts the administrative interface for managing the UnifyVault Protocol, built with Angular and styled with Tailwind CSS.

---

## 1. Directory Structure

```
apps/admin/
├── src/                   # Source files for administrative controls & metrics
│   └── src/.gitkeep
├── tsconfig.json          # Extends `@unifyvault/tsconfig/angular.json`
└── package.json           # Scripts and dependencies
```

---

## 2. Development Operations

Manage the admin portal workspace using the following commands:

- **Start Local Development Server:**
  ```bash
  pnpm --filter=@unifyvault/admin start
  ```
- **Compile Production Build:**
  ```bash
  pnpm --filter=@unifyvault/admin build
  ```
- **Run Lint Checks:**
  ```bash
  pnpm --filter=@unifyvault/admin lint
  ```
- **Run Test Suite:**
  ```bash
  pnpm --filter=@unifyvault/admin test
  ```
