#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm install --no-audit --no-fund
npm run test:security
npm run build

# Schema changes require a separate, reviewed migration. Never run interactive
# drizzle-kit push here: code-only merges must not alter or truncate store data.
