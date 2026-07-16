# UnifyVault Angular Client (`@unifyvault/web`)

This workspace hosts the primary retail client interface for the UnifyVault Protocol, built using Angular v18 and styled with Tailwind CSS.

---

## 1. Directory Structure

```
apps/web/
├── src/
│   ├── app/               # Standalone components, config files, and router routes
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── main.ts            # Bootstrapping script
│   └── styles.scss        # Tailwind baseline imports
├── tailwind.config.js     # Tailwind content selectors and visual tokens
├── tsconfig.json          # Extends `@unifyvault/tsconfig/angular.json`
└── package.json           # Scripts and package dependencies
```

---

## 2. Development Operations

Manage the web dashboard workspace from the root directory using the following commands:

- **Start Local Development Server:**
  ```bash
  pnpm --filter=@unifyvault/web start
  ```
- **Compile Production Build:**
  ```bash
  pnpm --filter=@unifyvault/web build
  ```
- **Run Lint Checks:**
  ```bash
  pnpm --filter=@unifyvault/web lint
  ```
- **Run Test Suite:**
  ```bash
  pnpm --filter=@unifyvault/web test
  ```
