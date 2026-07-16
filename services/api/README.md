# UnifyVault API Gateway (`@unifyvault/api`)

This workspace hosts the primary REST & WebSocket API gateway for the UnifyVault Protocol, built using NestJS and Prisma ORM.

---

## 1. Directory Structure

```
services/api/
├── src/                   # NestJS modules, services, and controllers (upcoming)
│   └── src/.gitkeep
├── tsconfig.json          # Extends `@unifyvault/tsconfig/nestjs.json`
└── package.json           # Scripts and dependencies
```

---

## 2. Development Operations

Manage the API service workspace from the root directory using the following commands:

- **Start Local Development Server:**
  ```bash
  pnpm --filter=@unifyvault/api dev
  ```
- **Compile Production Build:**
  ```bash
  pnpm --filter=@unifyvault/api build
  ```
- **Run Lint Checks:**
  ```bash
  pnpm --filter=@unifyvault/api lint
  ```
- **Run Test Suite:**
  ```bash
  pnpm --filter=@unifyvault/api test
  ```
