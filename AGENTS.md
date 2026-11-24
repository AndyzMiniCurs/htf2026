# Agent guide - Guardians of the Grid (HTF 2026)

Read this before writing any code in this repo. It applies to every teammate's coding agent.

## Project

Realtime mission control for Achrona (brief: `CHALLENGE.md`). Judged on Creativity 40%, Functionality 30%, Presentation 30%; pitch at 16:00. Code quality matters: follow the architecture below strictly.
Stack: TypeScript (strict), React 19, TanStack Start + Router, Drizzle on PostgreSQL, Tailwind 4, lucide-react, zod. AI = Jev (TypeSafe classification model) behind `server/ai/classifier.ts`.
Most users are on phones (iOS/Android): build mobile-first.

Run: `docker compose up -d db` → `cd app && npm install && npm run db:setup && npm run dev` (http://localhost:3000).

## Workflow (OpenSpec)

- The plan lives in `openspec/changes/guardians-mission-control/`: `proposal.md` (why), `specs/` (behaviour, the source of truth), `design.md` (architecture + server function contract D12), `tasks.md` (the checklist).
- Ownership: **[BE] = Roel**, **[FE] = Andu**. Only pick tasks with your tag, in group order. Ask your human which person you are working for if unclear.
- Tick the task (`- [x]`) in `tasks.md` in the same commit that finishes it, and meet its "verify" clause before ticking.
- The contract (`app/src/lib/<domain>.ts` + the D12 table) is owned by BE. FE does not edit it; FE asks for changes. Any contract change updates `design.md` D12 in the same commit.
- New behaviour not in the specs: use `/openspec-propose` instead of improvising.

## Architecture (design.md D1) - mandatory

```
app/src/
  lib/<domain>.ts            contract: zod schemas, inferred types, constants. Isomorphic, never imports server/ or db/.
  lib/<domain>.functions.ts  createServerFn adapters: .validator(schema.parse) -> auth middleware -> one service call. No logic, no SQL.
  server/auth/               password, session, requireGuardian / requireCommander middleware
  server/<domain>/           <domain>.repository.ts (Drizzle only) · <domain>.service.ts (use cases) · pure rule modules + *.test.ts
  server/ai/                 classifier port, Jev adapter, null adapter, triage, runbook library, assistant
  server/events/bus.ts       typed in-process pub/sub for LiveEvent (SSE)
  db/                        schema, connection, seed
  routes/                    pages: loader calls server functions, component only composes. routes/api/* = server routes (BE).
  components/ui/             primitives · components/layout/ · components/<domain>/ feature components
  hooks/                     useLiveEvents, useShortcuts, useOnline, useTheme, useSpeech
```

Dependency direction: `routes/components/hooks → lib` · `lib/*.functions.ts → server/*/service` · `service → repository, ai port, bus, pure rules` · `repository → db`. Never import `server/` or `db/` from UI code. Repositories hold no business rules; services write no SQL; server functions hold no logic.

## Code rules

- TypeScript strict, no `any`, no non-null `!` on data. Use types inferred from zod (`z.infer`) instead of hand-written duplicates.
- Validate every server function input with its zod schema. Throw `AppError` (`lib/errors.ts`) with a code (`UNAUTHORIZED | FORBIDDEN | NOT_FOUND | VALIDATION | CONFLICT`); never leak stack traces or password hashes.
- Every server function except `login`/`getMe`/`logout` goes through `requireGuardian`; commander-only ones through `requireCommander`.
- AI fails open: a `null` classifier result means "no opinion" and takes the non-AI path. Never block a guardian's action on AI.
- Business rules (status transitions, magic level, anomaly detection, badges, runbook filling) are pure functions with Vitest tests in the same task.
- Follow the starter's conventions: `#/` imports, ISO-text timestamps, `GL-0000` glitch ids, `components/ui` primitives before new markup.
- UI: mobile-first Tailwind (base = 360 px, `lg:` for desktop), 44 px tap targets, semantic HTML, labels on inputs, `aria-label` on icon buttons, works in light/dark/lockdown themes.
- Comments explain why, not what. No dead code, no commented-out code, no speculative abstractions.
- No new dependency unless `design.md` lists it or your human agrees.

## Git

- Work on `main`; small commits; `git pull --rebase` before every push. `app/src/routeTree.gen.ts` is generated: on conflict, take either side and run the dev server to regenerate it.
- Before committing: `npm run typecheck && npm run lint && npm test` (once task 1.5 adds them) must pass.
- Commit messages: imperative, describe the change (`Add echo intake pipeline`). Never add AI attribution anywhere (no `Co-Authored-By`, no "Generated with", no tool links) in commits, PRs, code or docs.
