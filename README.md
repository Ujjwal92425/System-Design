# System Design Learning OS

A collaborative monorepo containing the Next.js 15 frontend web interface, modular Express.js backend API, dynamic canvas drawing models, deterministic simulation ticking engine, and transactional BullMQ workers.

## Quick Start
1. Run `pnpm install` at the root directory to download node modules.
2. Edit `.env` to configure your PostgreSQL and Redis instances.
3. Run `pnpm db:generate` followed by `pnpm db:push` to sync database tables.
4. Run `pnpm dev` to start the frontend and backend concurrently.
