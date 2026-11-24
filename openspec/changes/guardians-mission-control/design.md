# Design

## Context

The app is the Optis starter (TanStack Start + Router, React 19, Tailwind 4, Drizzle) switched to Postgres. Today it has one table (`glitches`, ISO-text timestamps, text ids like `GL-0142`), one server function (`getGlitches` in `lib/glitches.functions.ts`), shared types in `lib/glitch.ts`, and UI primitives in `components/ui`. There is no auth, no tests, no lint. Two people build in parallel for ~6 hours: Roel = backend, Andu = frontend. Requirements are in `specs/`, motivation in `proposal.md`.

Installed framework facts this design relies on (checked in `node_modules`):
- `createServerFn().validator(...)` (not `inputValidator`) and `createMiddleware` from `@tanstack/react-start`.
- `getCookie` / `setCookie` from `@tanstack/react-start/server`. There is no built-in `useSession`, so sessions are ours.
- Server routes are file routes with `server: { handlers: { GET } }`. They are used for SSE and image bytes.

## Goals / Non-Goals

**Goals:**
- A layered architecture where each layer has one job and dependencies point one way, so the two devs never edit the same file for the same task.
- A typed, validated contract (zod schemas + TS types) that backend publishes first and frontend builds against.
- Business rules as pure functions with unit tests (status machine, magic level, anomaly detection, badges, runbook filling).
- AI and realtime that fail open: the base flow works with no API key and no live connection.

**Non-Goals:**
- Horizontal scaling (the event bus and sensor simulator live in one Node process).
- A generic plugin system for AI providers beyond the one port described below.
- Full PWA offline writes (offline is read-only).

## Decisions

### D1. Layered architecture inside `app/src`

```
lib/                      CONTRACT, isomorphic (safe in browser). Owner: BE, FE reviews.
  <domain>.ts             zod schemas + inferred types + constants (glitch, echo, guardian, monitoring, assistant, live-events, errors)
  <domain>.functions.ts   server function adapters: validator(zod) -> auth middleware -> service call. No logic, no SQL.
server/                   SERVER ONLY. Owner: BE.
  auth/                   password.ts (scrypt), session.ts (cookie <-> sessions table), middleware.ts (requireGuardian, requireCommander)
  <domain>/               <domain>.repository.ts (Drizzle only), <domain>.service.ts (use cases), pure rule modules + *.test.ts
  ai/                     classifier.ts (port), jev.classifier.ts (adapter), null.classifier.ts, triage.ts, runbook-library.ts, assistant.ts
  events/bus.ts           in-process typed pub/sub for LiveEvent
  monitoring/             magic.ts, anomaly.ts, badges.ts (pure), sensor-simulator.ts
db/                       schema.ts, index.ts, seed.ts. Owner: BE.
routes/                   pages (loader = server function call, component = composition only) + routes/api/* server routes. Owner: FE (api/* BE).
components/               ui/ (primitives), layout/, <domain>/ feature components. Owner: FE.
hooks/                    useLiveEvents, useShortcuts, useOnline, useTheme, useSpeech. Owner: FE.
```

Dependency rule (enforced in review, written in `CLAUDE.md`): `routes, components, hooks -> lib` · `lib/*.functions.ts -> server/*/service` · `service -> repository, ai port, events bus, pure rules` · `repository -> db`. UI never imports `server/` or `db/`. Repositories never contain rules; services never write SQL.

Why: it is the starter's own convention (`lib/<domain>.ts` + `lib/<domain>.functions.ts`) extended with an explicit service/repository split, which keeps server functions thin and makes rules testable without a database. Alternative: feature folders that mix UI and server code. Rejected because the two devs would constantly touch the same folders, and server-only code could leak into client bundles.

### D2. Validation and errors at the boundary
Every server function input is a zod schema from `lib/<domain>.ts`, passed to `.validator(schema.parse)`. Services throw `AppError` (`lib/errors.ts`) with a `code` of `UNAUTHORIZED | FORBIDDEN | NOT_FOUND | VALIDATION | CONFLICT`. The UI maps codes to messages, so no raw stack traces reach users. Why zod: one schema gives runtime validation on the server and types plus form validation on the client.

### D3. Auth: DB-backed sessions
`guardians(password_hash)` uses `node:crypto` scrypt with a per-user salt (no dependency). Login creates a random 32-byte token. Its SHA-256 goes into `sessions(token_hash, guardian_id, expires_at)` and the raw token into an `httpOnly; sameSite=lax` cookie for 12 hours, `secure` when the request is HTTPS (phones reach the dev/demo server over plain http on the LAN, where a secure cookie would be dropped). `requireGuardian` middleware loads the session for every server function and puts `context.guardian` there. `requireCommander` builds on it. The root route's `beforeLoad` calls `getMe()` and redirects to `/login`. Alternative: signed stateless cookies. Rejected because they cannot be revoked on logout and need an extra secret.

### D4. Data model (Postgres, Drizzle)
Keeps the starter's ISO-text timestamps and `GL-0000` text ids.
- `guardians(guardian_id serial pk, codename text unique, role text enum, password_hash text)`
- `sessions(token_hash text pk, guardian_id fk, expires_at text)`
- `glitches` + `type text enum default 'unknown'`, `location_x real null`, `location_y real null`, `assigned_guardian_id fk null`, `runbook jsonb null` (`{steps: {text, done}[]}`), `merged_into text fk null`, `fixed_at text null`, `fixed_by fk null`, `source text enum('echo','prediction')` (prediction = sensor anomaly), `sensor_id text null`.
- `echoes(echo_id serial pk, glitch_id fk, description, timestamp, reporting_guardian_id fk null (null = system), location_x/y null, grouped_by_ai bool, has_image bool)`
- `echo_images(echo_id pk fk, mime text, bytes bytea)`
- `sensor_readings(id serial pk, sensor_id text, value real, timestamp text)` + index `(sensor_id, timestamp)`
- `notification_prefs(guardian_id pk fk, on_assigned bool, on_status bool, on_lockdown bool)`
- `app_state(key text pk, value jsonb)` holds `lockdown`.
- Postgres sequence `glitch_seq` (start 200) becomes `GL-` + 4 digits.

Why keep text timestamps: the starter and its seed use them, and lexical order equals time order. Changing that would only cost time.

### D5. Realtime: SSE + in-process bus
`server/events/bus.ts` is a typed `EventEmitter`. Services publish a `LiveEvent` after each successful write. `GET /api/events` (server route, session required) streams the events as `text/event-stream`. Notification events are filtered to the target guardian, and a heartbeat goes out every 15 s. Client `useLiveEvents()` opens an `EventSource`, calls `router.invalidate()` on data events (loaders refetch) and dispatches lockdown and notification events to UI state. It reconnects with backoff and invalidates once on reconnect. Alternatives: WebSockets (two-way traffic is not needed, and there is more setup in Nitro), and polling (laggy, wasteful). shortcut: single-process bus; upgrade to Postgres `LISTEN/NOTIFY` if we ever run more than one app instance.

### D6. AI via Jev behind a port
`server/ai/classifier.ts` defines the port the rest of the code uses:
```ts
interface Classifier {
  choose(question: string, options: string[]): Promise<{ option: string; probability: number }[] | null> // ranked
  score(question: string, items: string[]): Promise<number[] | null>                                  // 0..1 per item
  yesNo(question: string): Promise<number | null>                                                     // P(yes)
}
```
`jev.classifier.ts` implements it with `fetch` against TypeSafe's System One API (Jev: Choice / Score / yes-no questions, bearer `TYPESAFE_API_KEY`, 3 s timeout). The exact endpoint and payload must be checked against TypeSafe's docs; task 1.4 does that before anything depends on it. `openrouter.classifier.ts` is the fallback while no TypeSafe key is available: the same port over OpenRouter's chat completions (bearer `OPENROUTER_API_KEY`, model pinned to `openai/gpt-4o-mini`, temperature 0, JSON mode). It asks for numbers only (`{"yes"}`, `{"probabilities"}`, `{"scores"}`) and validates them with zod, so it still only decides and never writes user-facing text. `createClassifier` picks Jev when `TYPESAFE_API_KEY` is set, otherwise OpenRouter when `OPENROUTER_API_KEY` is set. `null.classifier.ts` returns `null` for everything and is used when there is no key. Every caller treats `null` as "no opinion" and takes the non-AI path, which keeps the fail-open rule in one place.
How each feature maps onto Jev:
- Type: `choose("Which kind of glitch is this echo about? <text>", GLITCH_TYPES)`.
- Duplicates and reopen: `choose("Which open glitch does this echo describe? <text>", [...openGlitchSummaries, "none"])`, take the top option if its probability is at least 0.8. The same runs over glitches fixed in the last 24 h for reopen.
- Moderation: `yesNo("Is this a useful report about a problem in a city?")` < 0.3 or `yesNo("Is this illegal or abusive content?")` > 0.7 means reject.
- Auto-close: `yesNo("Does this update say the problem is solved?")` ≥ 0.8.
- Auto-assign: `score("How suited is this defender for a <type> glitch?", defenderProfiles)` combined in code with open workload (`score × 1/(1+open)`).
- Runbook: `score("How relevant is this step for: <glitch>?", RUNBOOK_LIBRARY[type])`, keep the top 3-6 in library order, then fill `{location}`, `{sensor}`, `{glitchId}` placeholders.
- Assistant: `choose("What is the operator asking? <q>", INTENTS)`, extract a glitch id with a regex, and build the answer from repository data with templates.
Why Jev over a generative LLM: the team chose it, it is strong at classification, and the "AI decides, data answers" design cannot hallucinate. That makes a good pitch point. Alternative: a generative LLM for runbook and chat. Rejected to keep a single provider and grounded answers. The OpenRouter fallback keeps that property: the LLM only returns probabilities, and the answers are still built from data. Its probabilities are self-reported rather than calibrated, so the 0.8 thresholds are less exact than with Jev; checked live on typical echoes (type, spam, solved, duplicate, assignee) with clear margins.

### D7. Echo intake pipeline (`echo.service.reportEcho`)
validate (zod: description, optional x/y) → image checks (mime/size) → moderation (AI, fail open) → one match question over open glitches plus glitches fixed in the last 24 h (a match on a fixed one reopens it to `LEAKED`) → either attach (`grouped_by_ai = true`) or create the glitch (`GL-` id from the sequence) → classify the type → auto-assign → build the runbook → commit the transaction → publish events → notify. AI calls run before the DB transaction so the transaction stays short; moderation, matching and type classification run in parallel so an echo waits for about one AI round-trip. Classify, assign and runbook happen only on create.

### D8. Image moderation in the browser
`nsfwjs` (TensorFlow.js) classifies the image in the browser before upload and blocks explicit content. The server still enforces mime type (magic bytes) and the 5 MB cap. shortcut: client-side moderation can be bypassed by a crafted request; move it server-side with `@tensorflow/tfjs-node` if this goes beyond the hackathon.

### D9. Sensors and prediction
`sensor-simulator.ts` starts once per process (lazily, on the first `/api/events` connection or `getDashboard` call) and writes a reading every 3 s for `magic-reserve`, `ley-flux` and `portal-stability`. The readings are random walks, with a scripted drop available from a commander-only `triggerIncident()` server function so the demo is reliable. After each reading, `anomaly.ts` (pure) checks a ≥40% drop within 5 min and a 3σ deviation over 15 min. A hit creates a glitch (`source = 'prediction'`) unless one is already open for that sensor. Two refinements found while building it: the 3σ rule also needs at least 8 units of absolute deviation (so sensor noise never pages anyone during the pitch), and only readings taken after the sensor's latest prediction are judged (so a drop that was already predicted and fixed, still inside the 5-minute window, is not reported again). `triggerIncident` lowers the sensor's baseline to 45% until its predicted glitch is FIXED, then the sensor recovers.

### D10. Frontend architecture
- Pages are thin: `loader` calls server functions; the component composes feature components from `components/<domain>`. Search state lives in validated route search params (`validateSearch` with the zod `GlitchQuery`).
- Mobile-first Tailwind: base styles target 360 px, `lg:` adds desktop. The bottom nav (<1024 px) and the existing `Sidebar` (≥1024 px) share one `navItems` list.
- Lists are cards on mobile and the starter's table on desktop, and both use the same `GlitchTypeBadge` and `StatusBadge`.
- Theme: a `class` on `<html>` set by an inline script before paint (no flash), stored in `localStorage`. Lockdown adds `data-lockdown` on top of it.
- Charts: `recharts` for sensor lines; the gauge is a small custom SVG. The map is a custom `public/achrona-map.svg` with markers placed by percentage (`left: x%`, `top: y%`), so there is no map library and no tiles.
- Offline: `public/sw.js` caches the app shell (network-first for navigations), `useOnline()` shows the badge, and the last successful loader data is kept in memory and shown while offline. Server-dependent buttons are disabled with a tooltip.
- PDF: the `/report` route plus print CSS (`@media print`) and a "Save as PDF" button that calls `window.print()`. No PDF library.
- Speech: Web Speech API (`webkitSpeechRecognition`), hidden when unsupported.
- Shortcuts: one `useShortcuts(map)` hook that ignores events from inputs, textareas and contenteditable.

### D11. Quality gates
Scripts: `typecheck` (`tsc --noEmit`), `lint` (ESLint with `@tanstack/eslint-config`), `format` (Prettier), `test` (Vitest). CI runs typecheck, lint, test and build on every push. Pure rule modules get unit tests in the same task that writes them. Services are covered through the pure rules plus one integration test of the echo pipeline against the compose Postgres (skipped when `DATABASE_URL` is not reachable).

### D12. Server function contract (the FE/BE interface)
Types live in `lib/<domain>.ts`. All functions need a session unless noted; (C) = commander only.

```ts
// lib/guardian.ts
type Role = 'defender' | 'commander'
type Guardian = { guardianId: number; codename: string; role: Role }
// lib/glitch.ts (extends the starter's)
type GlitchType = 'time-anomaly' | 'magic-drain' | 'portal' | 'sensor-fault' | 'creature' | 'unknown'
type Location = { x: number; y: number }               // 0..100
type RunbookStep = { text: string; done: boolean }
type GlitchListItem = Glitch & { type: GlitchType; location: Location | null; assignee: Guardian | null; echoCount: number; source: 'echo' | 'prediction' }
type Echo = { echoId: number; glitchId: string; description: string; timestamp: string; reporter: Guardian | null; location: Location | null; groupedByAi: boolean; imageUrl: string | null }
type GlitchDetail = GlitchListItem & { echoes: Echo[]; runbook: RunbookStep[]; mergedInto: string | null }
type GlitchQuery = { q?: string; status?: GlitchStatus[]; type?: GlitchType[]; from?: string; to?: string /* full ISO instants for local days; bare dates = UTC days */; sort?: 'newest' | 'oldest' | 'status' }
// lib/monitoring.ts
type Dashboard = { magicLevel: number; byStatus: Record<GlitchStatus, number>; byType: Record<GlitchType, number>; recent: GlitchListItem[] /* all open + 5 latest FIXED, newest first */; lockdown: boolean }
type SensorId = 'magic-reserve' | 'ley-flux' | 'portal-stability'
type SensorSeries = { sensorId: SensorId; label: string; unit: string; points: { timestamp: string; value: number }[] }
type Badge = 'first-fix' | 'stabilizer' | 'specialist' | 'rapid-response'
type LeaderboardEntry = { guardian: Guardian; fixes: number; badges: Badge[] }
type Report = { generatedAt: string; dashboard: Dashboard; open: GlitchListItem[]; leaderboard: LeaderboardEntry[] }
type NotificationPrefs = { onAssigned: boolean; onStatus: boolean; onLockdown: boolean }
// lib/assistant.ts
type Intent = 'active-summary' | 'glitch-status' | 'glitch-assignee' | 'magic-level' | 'glitch-runbook' | 'unknown'
type AssistantAnswer = { intent: Intent; text: string; glitchIds: string[]; suggestions: string[] }
// lib/live-events.ts
type Notification = { kind: 'assigned' | 'status' | 'lockdown'; text: string; glitchId?: string }
type LiveEvent =
  | { type: 'glitch.created' | 'glitch.updated'; glitchId: string }
  | { type: 'echo.created'; echoId: number; glitchId: string }
  | { type: 'sensor.reading'; sensorId: SensorId; timestamp: string; value: number }
  | { type: 'lockdown'; on: boolean }
  | { type: 'notification'; notification: Notification }
```

| Server function (file) | Input | Output |
|---|---|---|
| `login` (auth) - no session | `{ codename: string; password: string }` | `Guardian` |
| `logout` (auth) | `void` | `void` |
| `getMe` (auth) - no session | `void` | `Guardian \| null` |
| `listGuardians` (guardians) (C) | `void` | `Guardian[]` |
| `createGuardian` (guardians) (C) | `{ codename: string; password: string; role: Role }` | `Guardian` |
| `setGuardianRole` (guardians) (C) | `{ guardianId: number; role: Role }` | `Guardian` |
| `reportEcho` (echoes) | `FormData{ description, x?, y?, image? }` | `{ echo: Echo; glitchId: string; outcome: 'created' \| 'grouped' \| 'reopened' }` |
| `addGlitchUpdate` (echoes) - assignee or (C) | `{ glitchId: string; description: string }` | `{ echo: Echo; autoClosed: boolean }` |
| `moveEcho` (echoes) (C) | `{ echoId: number; toGlitchId: string \| null }` | `{ glitchId: string }` |
| `getGlitches` (glitches) | `GlitchQuery` | `GlitchListItem[]` |
| `getGlitch` (glitches) | `{ glitchId: string }` | `GlitchDetail` |
| `advanceStatus` (glitches) - assignee or (C) | `{ glitchId: string }` | `GlitchListItem` |
| `reopenGlitch` (glitches) (C) | `{ glitchId: string }` | `GlitchListItem` |
| `assignGlitch` (glitches) (C) | `{ glitchId: string; guardianId: number \| null }` | `GlitchListItem` |
| `mergeGlitch` (glitches) (C) | `{ glitchId: string; intoGlitchId: string }` | `void` |
| `setRunbookStep` (glitches) | `{ glitchId: string; index: number; done: boolean }` | `RunbookStep[]` |
| `getDashboard` (monitoring) | `void` | `Dashboard` |
| `getSensorSeries` (monitoring) | `{ minutes?: number }` (default 15) | `SensorSeries[]` |
| `setLockdown` (monitoring) (C) | `{ on: boolean }` | `{ on: boolean }` |
| `triggerIncident` (monitoring) (C) | `{ sensorId: SensorId }` | `void` |
| `getLeaderboard` (monitoring) | `void` | `LeaderboardEntry[]` |
| `getReport` (monitoring) (C) | `void` | `Report` |
| `getNotificationPrefs` / `setNotificationPrefs` (notifications) | `void` / `NotificationPrefs` | `NotificationPrefs` |
| `askAssistant` (assistant) | `{ question: string }` (1-500 chars) | `AssistantAnswer` |
| `GET /api/events` (server route) | session cookie | SSE stream of `LiveEvent` |
| `GET /api/images/$echoId` (server route) | session cookie | image bytes with stored mime |

### D13. Contract-first parallel work
Backend's first task publishes every `lib/*.ts` type and schema plus stub `*.functions.ts` that return fixtures from `lib/fixtures.ts`. Frontend builds every screen against the stubs while backend swaps them one by one for real services. The signatures do not change, so the frontend needs no rework. A contract change requires telling the other person and updating this table.

## Risks / Trade-offs

- [Jev API shape differs from the blog descriptions] → Task 1.4 verifies it first. The port isolates the impact to one adapter, and the null classifier keeps everything working meanwhile.
- [AI latency slows echo reporting] → 3 s timeout per call, run before the DB transaction, fail open. If it is still slow, run classify/assign/runbook after the response and publish `glitch.updated`.
- [Scope is larger than 6 hours for two people] → Task groups are in priority order. Base (groups 1-3) is the must-ship line. Stop adding features at 15:00 and polish for the pitch.
- [Client-side image moderation is bypassable] → acknowledged shortcut (D8).
- [Single-process event bus] → fine for the demo; documented upgrade path (D5).
- [Merge conflicts on shared files (`schema.ts`, `routeTree.gen.ts`, `lib/*.ts`)] → schema and `lib` belong to backend; frontend asks instead of editing. `routeTree.gen.ts` is generated, so regenerate it on conflict instead of hand-merging. Small commits, pull before push.

## Migration Plan

`npm run db:setup` (drizzle push + seed) recreates the schema. The seed adds guardians (`commander` / `defender` demo accounts, password in README) and the starter's glitches with types and locations. There is no production data, so rollback = `docker compose down -v` + `db:setup`.

## Open Questions

- ~~Exact Jev endpoint, payload and pricing limits.~~ Answered in task 1.4: `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer $TYPESAFE_API_KEY` (confirmed with curl: a bad key gives a 401 JSON error). Body `{ model, state, questions: { <id>: { type: 'noul' | 'choice', instructions, criteria? } } }`, answers at `answers.<id>.noul` (P(yes)) or `answers.<id>.probabilities` (per choice key). Model pinned to `jev-1.13.0` so thresholds stay stable. `score()` is one request with one `noul` question per item. The success shape comes from TypeSafe's published examples and has not been seen live (no key yet); the adapter validates it with zod and treats any mismatch as `null`.
