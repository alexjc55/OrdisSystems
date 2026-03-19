#!/bin/bash
set -e

echo "=== Fetching latest code from GitHub ==="
git fetch origin main

echo "=== Discarding local changes to tracked files ==="
git reset --hard origin/main

echo "=== Removing untracked source files (keeps .env and uploads/) ==="
git clean -fd --exclude='.env' --exclude='uploads/' --exclude='*.env*'

echo "=== Installing dependencies ==="
npm install

echo "=== Building project ==="
npm run build

echo "=== Restarting PM2 process ==="
pm2 restart demo --update-env

echo ""
echo "=== Done! ==="
pm2 list
