# Proposal

## Why

Achrona needs a mission control center where guardians report echoes, see glitches live and act on them before The Desync spreads (see `CHALLENGE.md`). The starter only lists seeded glitches: there is no login, no roles, no way to report anything, and nothing updates live. Judging weighs Creativity 40%, Functionality 30%, Presentation 30%, so we need the base assignment rock solid first and then as many polished extensions as fit before the 16:00 pitch.

## What Changes

Ownership: **both sides**. Backend (Roel) owns data, server functions, AI and realtime. Frontend (Andu) owns routes, components, mobile-first UI. The contract is the shared types and validation schemas per domain, which backend writes first.

Base assignment (must ship):
- Guardians log in with codename + password; sessions are cookie-based; every page except login requires a session.
- Guardians have a role: `defender` reports echoes; `commander` can do everything a defender can plus admin actions.
- An echo has a timestamp, a description and a reporting guardian. Each new echo creates a new glitch by default.
- Logged-in guardians see the list of glitches.

Extensions (in priority order, all optional per the brief):
1. Workflow: glitch status lifecycle `LEAKED → ASSESSING → CONTAINING → FIXED`, glitch detail page with its echoes, search/filter/sort, commander assigns glitches to defenders, keyboard shortcuts (`j`/`k`), dark mode + commander-triggered lockdown mode, PDF report via print.
2. Real-time monitoring: live glitch feed, magic gauge (100% = all fine), interactive map of Achrona with glitch locations, simulated IoT sensor data with charts, mobile-first responsive layout, offline mode with indicator.
3. AI automation with Jev (TypeSafe's classification model - it decides, it does not generate text): duplicate grouping with commander override, glitch type classification with icon/color, moderation of text and images, auto-close and reopen, predictive glitches from sensor anomalies, automatic assignment, runbooks assembled from a curated step library ranked by Jev, and an operator chatbot that classifies the question with Jev and answers from live data (no generated text, so no made-up answers).
4. User engagement: image uploads on echoes, speech-to-text echo input, in-app and browser notifications with per-guardian preferences, leaderboard with badges.

Out of scope: email/SMS delivery, native mobile apps, multi-instance deployment (realtime runs in one server process), password reset and self sign-up (commanders create guardians), real IoT hardware (sensors are simulated).

## Capabilities

### New Capabilities
- `guardian-access`: login, logout, sessions, roles and commander management of guardians.
- `echo-reporting`: reporting echoes (text, location, image, voice) and how an echo becomes or joins a glitch.
- `glitch-management`: glitch list, detail, status lifecycle, search/filter/sort, assignment and merging.
- `live-monitoring`: live updates, magic gauge, map, sensor data, lockdown mode.
- `ai-assistance`: Jev-powered classification, duplicates, moderation, auto-close, prediction, auto-assignment, runbooks and chatbot.
- `operator-experience`: mobile-first layout, dark mode, keyboard shortcuts, offline mode, PDF report, notifications, leaderboard.

### Modified Capabilities
(none - no specs exist yet)

## Impact

- `app/src/db/schema.ts`: new tables `guardians`, `sessions`, `echoes`, `echo_images`, `sensor_readings`, `notification_prefs`, `app_state`; `glitches` gains `type`, `location`, `assigned_guardian_id`, `runbook`, `merged_into`.
- New server layer `app/src/server/**` (repositories, services, AI, event bus) and server functions in `app/src/lib/*.functions.ts`.
- New routes: `/login`, `/` (dashboard), `/glitches`, `/glitches/$glitchId`, `/echoes/new`, `/map`, `/sensors`, `/guardians`, `/leaderboard`, `/assistant`, `/council-report`, `/settings`, `/api/events` (SSE), `/api/images/$echoId`.
- New dependencies: `zod` (input validation), `vitest` (tests), `eslint` + `prettier` (code quality), `recharts` (charts), `nsfwjs` + `@tensorflow/tfjs` (image moderation). Jev is called over HTTP with `fetch`, no SDK.
- New env var: `TYPESAFE_API_KEY` (AI features switch off cleanly without it). Sessions are stored in Postgres, so no session secret is needed.
- `docker-compose.yml` passes `TYPESAFE_API_KEY` to the app.
- New root `CLAUDE.md` / `AGENTS.md` so every teammate's coding agent follows the same architecture rules.
