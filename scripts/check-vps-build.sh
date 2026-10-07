#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Never use the live dist directory for this independent build check.
output_dir="$(mktemp -d "${TMPDIR:-/tmp}/store-vps-build.XXXXXX")"
trap 'rm -rf -- "$output_dir"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

# Use the installed Vite, without downloading tools or running deployment hooks.
# Keep plugin caches (e.g. Tailwind's jiti cache) inside the cleanup boundary too.
TMPDIR="$output_dir" ./node_modules/.bin/vite build --config vite.config.vps.ts \
  --outDir "$output_dir/public" --emptyOutDir
