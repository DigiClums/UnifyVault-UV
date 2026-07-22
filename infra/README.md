# UnifyVault Infrastructure (`infra/`)

This directory contains infrastructure configurations, deployment pipelines, and Docker container templates used to run the UnifyVault Protocol in staging and production environments.

---

## 1. Directory Structure

```
infra/
├── docker/                # Deployment Dockerfile blueprints & production Compose setups
├── k8s/                   # Kubernetes deployment manifest sets (planned)
└── README.md              # Infrastructure playbook reference
```

---

## 2. Infrastructure Operations

- **Database and Cache Spin-up:** Use the root `docker-compose.yml` to launch local development databases and caching services:
  ```bash
  docker compose up -d
  ```
- **Production Deployment:** Refer to deployment instructions in the core roadmap spec [10-roadmap.md](file:///Users/apple/Documents/UnifyVault-UV/docs/development/10-roadmap.md).
