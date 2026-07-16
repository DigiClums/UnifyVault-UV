# UnifyVault Administration Scripts (`scripts/`)

This directory contains utility shell and Node scripts designed to assist with database initialization, container controls, and local testing.

---

## 1. Directory Structure

```
scripts/
├── manage-containers.sh   # Controller utility to start/stop local database & cache
└── README.md              # Utility scripts playbook reference
```

---

## 2. Utility Scripts

- **`manage-containers.sh`:** Starts, stops, checks, or clears the local PostgreSQL database and Redis container volumes:
  ```bash
  ./scripts/manage-containers.sh {start|stop|logs|clean|status}
  ```
