# Guardians of the Grid — HTF 2026

Realtime mission control for Achrona: live stats, early anomaly detection, operator insights.
Challenge: https://www.2026.hackthefuture.be/challenges/guardians-of-the-grid

Stack: TypeScript · React · TanStack Start (Router, Query, Table) · PostgreSQL · Drizzle

## Layout

| Path | What |
|------|------|
| `app/` | TanStack Start app (from the Optis starter) |
| `openspec/` | Specs and change proposals (OpenSpec) |
| `docker-compose.yml` | Postgres (+ the app with `--profile full`) |

## Run

```bash
docker compose up -d db        # Postgres on localhost:5432 (htf/htf/htf)
cd app
npm install
npm run db:setup               # push Drizzle schema + seed glitches
npm run dev                    # http://localhost:3000
```

Everything in Docker: `docker compose --profile full up --build`

## Team split

| Owner | Paths |
|-------|-------|
| Backend | `app/src/db/**`, `app/src/lib/*.functions.ts` (server functions) |
| Frontend | `app/src/routes/**`, `app/src/components/**`, styles |

Contract = shared types in `app/src/lib/<domain>.ts` + server function signatures in `openspec/specs`. Agree on them first, then build in parallel.

## OpenSpec workflow

```bash
npx @fission-ai/openspec list           # active changes
```
In Claude Code: `/openspec-propose "<idea>"` → review → `/openspec-apply-change` → `/openspec-archive-change`.
Tasks are tagged `[BE]` / `[FE]`.
