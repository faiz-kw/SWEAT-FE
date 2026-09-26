#!/usr/bin/env bash
# ==============================================================================
# PerformanceOS / SWEAT - Production Deployment Seed Runner (Linux/Docker/K8s)
# ==============================================================================
set -e

# Determine directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"

echo "=================================================================="
echo " Starting PerformanceOS Deployment Database Seeder..."
echo "=================================================================="

cd "${BACKEND_DIR}"

# 1. Run standard Django schema migrations on Master DB
echo "[1/3] Running master migrations (default database)..."
python manage.py migrate --noinput

# 2. Execute comprehensive deployment seeder
echo "[2/3] Seeding Master catalog, Platform Admin, Tenant, RBAC & Packages..."
python manage.py seed_deployment "$@"

# 3. Check and report migration status
echo "[3/3] Verifying database connectivity & migrations..."
python manage.py showmigrations master --list | tail -n 5

echo "=================================================================="
echo " Database deployment seed completed successfully!"
echo "=================================================================="
