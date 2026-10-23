#!/bin/bash
# setup.sh - Initial local monorepo workspace environment bootstrapper

echo "System Design Learning OS Bootstrapper"

# 1. Install dependencies
echo "Installing workspaces dependencies..."
pnpm install

# 2. Copy environment
if [ ! -f .env ]; then
  echo "Copying .env.example -> .env"
  cp .env.example .env
fi

# 3. Generate DB Schema
echo "Configuring schema client..."
pnpm db:generate

echo "Setup completed successfully."
