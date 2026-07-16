#!/bin/bash
# UnifyVault Container Management Script

COMMAND=$1

case $COMMAND in
  start)
    echo "Starting PostgreSQL and Redis containers..."
    docker compose up -d
    ;;
  stop)
    echo "Stopping PostgreSQL and Redis containers..."
    docker compose down
    ;;
  logs)
    echo "Showing logs for containers..."
    docker compose logs -f
    ;;
  clean)
    echo "Cleaning database volumes and stopping containers..."
    docker compose down -v
    ;;
  status)
    echo "Checking container status..."
    docker compose ps
    ;;
  *)
    echo "Usage: $0 {start|stop|logs|clean|status}"
    exit 1
    ;;
esac
