# Setup & Execution Guide — UnifyVault Early Radar

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL running locally on port 5432

## 1. Backend Setup (`apps/radar-backend`)

```bash
cd apps/radar-backend
pnpm install
npx prisma db push
pnpm build
node dist/main
```

Environment variables (`.env`):

```env
DATABASE_URL="postgresql://radar_user:radar_pass_2026@127.0.0.1:5432/early_radar?schema=public"
PORT=4005
GITHUB_TOKEN=""
NODE_ENV="production"
```

## 2. Frontend Execution (`apps/web-v2`)

```bash
cd apps/web-v2
pnpm build
pnpm start
```

Access Early Radar Dashboard at:
`http://localhost:3001/radar` or `https://app.unifyvault.xyz/radar`
