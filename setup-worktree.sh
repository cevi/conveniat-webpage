#!/usr/bin/env bash
# Prepares a fresh checkout or git worktree for `pnpm verify` and `pnpm dev`: the gitignored
# artifacts CI also generates before it checks (the Prisma client and src/build.ts), plus a .env.
# Safe to run again, for example after a rebase that changed the Prisma schema.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
# The first entry of `git worktree list` is always the main checkout.
main_checkout=$(git worktree list --porcelain | awk 'NR == 1 { print $2 }')

if [ ! -d node_modules/.bin ]; then
  pnpm install --frozen-lockfile
fi

if [ ! -f .env ]; then
  if [ "$main_checkout" != "$PWD" ] && [ -f "$main_checkout/.env" ]; then
    cp "$main_checkout/.env" .env
  else
    cp .env.example .env
  fi
fi

# Always regenerate rather than copy from the main checkout: its client can be older than the
# schema on this branch.
pnpm exec prisma generate --no-hints
bash create_build_info.sh
