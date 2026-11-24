# Tasks

Legend: **[BE] = Roel** (db, `lib/*.ts` contract, `server/**`, `*.functions.ts`, `routes/api/*`) · **[FE] = Andu** (routes, components, hooks, styles).
Tick a box (`- [x]`) in the same commit that finishes the task. Groups are in priority order: groups 1-3 are the base assignment and must ship. Stop starting new groups at 15:00 and polish for the pitch.
Architecture and the server function contract: `design.md` (D1, D12). Behaviour: `specs/`.

## 1. Foundation and contract (target 10:45)

- [x] 1.1 [BE] Add every table, column and the `glitch_seq` sequence from design D4 to `db/schema.ts`; verify `npm run db:setup` succeeds and `npm run db:studio` shows all tables
- [x] 1.2 [BE] Write the contract: zod schemas + inferred types + constants for every type in D12 in `lib/glitch.ts`, `lib/echo.ts`, `lib/guardian.ts`, `lib/monitoring.ts`, `lib/assistant.ts`, `lib/live-events.ts`, plus `AppError` in `lib/errors.ts`; verify `npm run typecheck` passes
- [x] 1.3 [BE] Add stub server functions for every row of the D12 table, returning data from `lib/fixtures.ts`, so FE can build every screen; verify each stub returns its fixture when called from a route loader
- [x] 1.4 [BE] Check the real Jev API (endpoint, payload, auth) with one curl call, then write `server/ai/classifier.ts` (port), `jev.classifier.ts` (fetch, 3 s timeout) and `null.classifier.ts`; verify a unit test with a mocked `fetch` covers success, timeout -> `null` and missing key -> null classifier
- [x] 1.5 [FE] Add quality tooling: `vitest`, ESLint (`@tanstack/eslint-config`), Prettier, scripts `typecheck`/`lint`/`format`/`test`, and add typecheck + lint + test steps to `.github/workflows/build.yml`; verify all four scripts pass locally
- [x] 1.6 [FE] Build the mobile-first app shell: bottom nav below 1024 px and the starter `Sidebar` from 1024 px, both driven by one `navItems` list, plus a page container with safe-area padding; verify at 375 px and 1440 px
- [x] 1.7 [FE] Add UI primitives in `components/ui`: Button, Input, Textarea, Select, Badge, Dialog, Toast, EmptyState; plus `StatusBadge` and `GlitchTypeBadge` (lucide icon + color per `GlitchType`) in `components/glitches`; verify they render in light and dark mode

## 2. Base: login and roles

- [x] 2.1 [BE] Write `server/auth/password.ts` (scrypt hash + timing-safe verify); verify unit tests: correct password ok, wrong password rejected, two hashes of the same password differ
- [x] 2.2 [BE] Implement sessions (`server/auth/session.ts`) and the real `login`/`logout`/`getMe`; verify login sets an httpOnly cookie, a wrong codename or password gives the same generic error, and logout clears the session row
- [x] 2.3 [BE] Add `requireGuardian` / `requireCommander` middleware to every server function; verify tests: anonymous call -> `UNAUTHORIZED`, defender on a commander-only function -> `FORBIDDEN`
- [x] 2.4 [BE] Implement the guardians service (`listGuardians`, `createGuardian`, `setGuardianRole`) including the last-commander rule; verify tests for duplicate codename and for demoting the last commander
- [x] 2.5 [BE] Seed demo guardians (one commander, three defenders) with passwords listed in the root README; verify login works for each after `npm run db:setup`
- [x] 2.6 [FE] Build the `/login` page (mobile-first form, inline validation, generic error message); verify a wrong password shows the error and a correct one lands on the dashboard
- [x] 2.7 [FE] Add the auth guard in the root route `beforeLoad` (redirect to `/login`) and a user menu with codename, role and logout; verify an anonymous visit to `/glitches` redirects to `/login`
- [x] 2.8 [FE] Build the `/guardians` page (commander only): list, create form, role switch; hide it from defenders in nav; verify a defender opening `/guardians` sees a forbidden state

## 3. Base: echoes become glitches, glitch list

- [x] 3.1 [BE] Write the glitch repository and the real `getGlitches(GlitchQuery)` and `getGlitch`, excluding merged glitches; verify tests for keyword, status, type, date range and sort
- [x] 3.2 [BE] Implement `echo.service.reportEcho` without AI: validation, `GL-` id from the sequence, glitch + echo in one transaction, image stored in `echo_images` after a magic-byte and 5 MB check; verify an integration test against the compose Postgres
- [x] 3.3 [BE] Add the `GET /api/images/$echoId` server route (session required, stored mime); verify an anonymous request gets 401 and a signed-in one gets the image
- [x] 3.4 [FE] Build the `/echoes/new` form: description with 3-1000 counter, optional map location picker, optional image with preview, submit, then navigate to the glitch; verify on a 375 px phone
- [x] 3.5 [FE] Build the `/glitches` list: cards on mobile, the starter table on desktop, search/filter/sort in URL search params via `validateSearch`; verify a copied URL restores the same filters
- [x] 3.6 [FE] Build `/glitches/$glitchId`: fields, location, assignee, echo timeline (oldest first) with reporter and image, not-found page; verify with a seeded glitch and an unknown id
- [x] 3.7 [FE] Base end-to-end check (integration): defender logs in, reports an echo, sees the new `LEAKED` glitch in the list and detail; a commander sees it too; verify and note the result in the PR (done 2026-11-24: Nova reported GL-0232 from a phone, Aegis found it via LEAKED filter + search, unknown id shows the not-found page)

## 4. Workflow

- [x] 4.1 [BE] Write `server/glitches/status.ts` (pure, forward one step, reopen only from `FIXED`), then `advanceStatus` and `reopenGlitch` with permission rules and `fixed_at`/`fixed_by`; verify unit tests for every allowed and rejected transition
- [x] 4.2 [BE] Implement `assignGlitch`, `addGlitchUpdate`, `moveEcho` and `mergeGlitch`; verify tests: merge moves all echoes and hides the source glitch, and moving an echo out creates a new `LEAKED` glitch
- [x] 4.3 [FE] Add detail-page actions: advance status, reopen (C), assign dropdown (C), add update form (assignee); buttons appear only when allowed; verify as defender and as commander
- [x] 4.4 [FE] Add merge-glitch and move-echo controls (C) on the detail page; verify the merged glitch disappears from the list
- [x] 4.5 [FE] Write the `useShortcuts` hook (`j`/`k`/`Enter`/`n`/`?`, ignored inside inputs) and a shortcut help dialog; verify that typing "j" in search does not navigate
- [x] 4.6 [FE] Add the light/dark/system theme toggle with no flash (inline script in `__root.tsx`, `localStorage`); verify a reload in dark mode shows no light flash

## 5. Real-time monitoring

- [x] 5.1 [BE] Write `server/events/bus.ts` and the `GET /api/events` SSE route (session required, 15 s heartbeat, notification events only to the target guardian); publish events from every write service; verify `curl -N` with a session cookie prints events while reporting an echo
- [x] 5.2 [BE] Write `server/monitoring/magic.ts` (pure, weights from the spec) and the real `getDashboard` (`recent` = every open glitch + the 5 latest FIXED, newest first); verify unit tests: all fixed -> 100, one normal `LEAKED` -> 90, never below 0
- [x] 5.3 [BE] Write the sensor simulator (3 s random walk for 3 sensors, lazy start once per process), the real `getSensorSeries` and `triggerIncident` (C); verify readings grow in `sensor_readings` and `triggerIncident` produces a visible drop
- [x] 5.4 [BE] Implement `setLockdown` (C) stored in `app_state`, publishing a `lockdown` event; verify a defender call -> `FORBIDDEN`
- [x] 5.5 [FE] Write the `useLiveEvents` hook (EventSource, backoff reconnect, `router.invalidate()` on data events, lockdown and notification dispatch); verify that an echo reported in browser A appears in browser B within 2 s (verified against a stubbed SSE stream; end-to-end once /api/events (5.1) exists)
- [x] 5.6 [FE] Build the dashboard `/`: SVG magic gauge, counts per status and type, recent glitches, lockdown banner; verify the gauge drops when a glitch is reported (UI done 2026-11-24; the drop shows once 5.2 makes getDashboard real)
- [x] 5.7 [FE] Build `/sensors`: one `recharts` line chart per sensor (last 15 min), appended live; verify the charts move without reload (polls every 3 s until 5.5 live events exist)
- [x] 5.8 [FE] Build `/map`: `public/achrona-map.svg` with type-colored markers placed by percentage; tapping a marker shows a summary card with a link; verify a fixed glitch's marker disappears live (fixed glitches are filtered out; the live part arrives with 5.5)
- [x] 5.9 [FE] Add the lockdown toggle (C) and the red lockdown theme (`data-lockdown` on `<html>`); verify all open browsers switch within 2 s (the commander switches at once, others via the lockdown live event once 5.1/5.4 exist)

## 6. AI automation (Jev)

- [x] 6.1 [BE] Add moderation and type classification to `reportEcho` through the classifier port; verify tests with a fake classifier: spam rejected with the spec message, "time loop" -> `time-anomaly`, classifier `null` -> `unknown` and still created
- [x] 6.2 [BE] Add duplicate grouping (open glitches) and reopen (glitches fixed in the last 24 h) at the 0.8 threshold; verify tests: 0.85 -> grouped with `groupedByAi`, 0.5 -> new glitch, match on a fixed glitch -> reopened `LEAKED`
- [ ] 6.3 [BE] Add auto-close to `addGlitchUpdate` (P(solved) ≥ 0.8 -> `FIXED`, `autoClosed: true`); verify tests for both outcomes
- [x] 6.4 [BE] Write `server/monitoring/anomaly.ts` (pure: ≥40% drop in 5 min, 3σ over 15 min) and wire predictive glitch creation (one open per sensor, `source: 'prediction'`); verify unit tests with crafted series and that `triggerIncident` creates exactly one glitch
- [x] 6.5 [BE] Add auto-assign (Jev score × 1/(1 + open load), fallback = least-loaded defender); verify a test where the specialist with the lower load wins
- [x] 6.6 [BE] Write `server/ai/runbook-library.ts` (5-8 steps per type), ranking + placeholder filling, and `setRunbookStep`; verify tests: 3-6 steps, placeholders filled, no AI -> first 4 library steps
- [ ] 6.7 [BE] Implement `askAssistant`: Jev intent + glitch id regex + templated answers from repository data, `unknown` -> suggestions; verify a test per intent
- [x] 6.8 [FE] Show the "grouped by AI" marker on echoes, type icons everywhere, and hide AI-only controls when AI is off; verify with and without `TYPESAFE_API_KEY` (the AI marker is data-driven and the UI has no AI-only controls, so nothing needs hiding; the with-key check runs once 6.1 wires Jev)
- [x] 6.9 [FE] Show the runbook checklist on the detail page (tick steps live); verify ticking persists after reload (UI and permissions verified; persistence follows when setRunbookStep is real, today it returns the fixture runbook)
- [x] 6.10 [FE] Build the `/assistant` chat screen: message list, input, suggestion chips, links to mentioned glitches, mobile keyboard-safe layout; verify each intent from the spec (UI verified on desktop and phone against the stub; intents become real with 6.7)
- [x] 6.11 [FE] Add client-side image moderation with `nsfwjs` before upload (lazy-loaded model, clear rejection message); verify a safe image uploads and the model loads only on the report page

## 7. Engagement and reporting

- [x] 7.1 [BE] Implement notification prefs (`getNotificationPrefs`/`setNotificationPrefs`, defaults all on) and emit `notification` events on assign, status change of own echo's glitch, and lockdown, respecting prefs; verify tests for an on and an off preference
- [x] 7.2 [BE] Write `server/monitoring/badges.ts` (pure, the four badges from the spec), the real `getLeaderboard` and `getReport` (C); verify unit tests for each badge rule
- [x] 7.3 [FE] Show in-app notification toasts, request browser Notification permission, and add a `/settings` page with the three notification toggles; verify an assignment notifies the assignee only
- [x] 7.4 [FE] Add the speech-to-text mic button (`useSpeech`, Web Speech API, hidden when unsupported) on the echo form; verify on Chrome Android and that it is hidden on Firefox (verified with a stubbed recogniser and with the API removed; still to try on a real phone)
- [x] 7.5 [FE] Build `/leaderboard` with ranking and badge icons; verify the order matches fixes
- [x] 7.6 [FE] Build `/council-report` (C) with print CSS and a "Save as PDF" button (`window.print()`); verify the print preview has no nav and fits A4
- [x] 7.7 [FE] Add offline support: `public/sw.js` shell cache, `manifest.webmanifest` (installable on phones), `useOnline` badge, server actions disabled offline; verify in DevTools offline mode

## 8. Demo readiness (integration)

- [x] 8.1 [BE] Expand the seed into a realistic demo: about 15 glitches across all types, statuses and map spots, echoes from several guardians, 15 min of sensor history; `db:setup` stays re-runnable; verify a fresh `docker compose down -v && npm run db:setup`
- [ ] 8.2 [BE] Pass `TYPESAFE_API_KEY` through `docker-compose.yml`, update the root README (env vars, demo accounts); verify `docker compose --profile full up --build` serves the full app
- [x] 8.3 [FE] Mobile pass: every page at 375 px (no horizontal scroll, 44 px tap targets, bottom nav, keyboard does not cover inputs); verify on a real phone over the LAN (scripted pass at 375 px on all 11 pages: no horizontal scroll, no visible target under 44 px; real-phone check still to do with the team)
- [ ] 8.4 [FE] Rehearse the pitch demo script end to end in two browsers (defender phone + commander desktop): report -> AI groups/types/assigns -> live gauge/map -> runbook -> fix -> leaderboard -> lockdown -> PDF; verify it runs twice without errors

## Workflow follow-up

- Run `/openspec-archive-change guardians-mission-control` after the pitch to fold the specs into `openspec/specs/`.
