# Design

## Context

- The Oracle is `server/ai/assistant.ts` (pure: `pickIntent`, `composeAnswer`, `findGlitchId`) plus `assistant.service.ts` (gathers dashboard and glitch data). The AI only picks one of six intents through the `Classifier` port (`choose` / `score` / `yesNo`); templates build every answer from data. This change keeps that split.
- Predictive glitches come from `server/monitoring/anomaly.ts` (`detectAnomaly`: a ≥40% drop from the 5-minute peak, or a deviation from the 15-minute mean of more than 3σ and at least 8 units), run by `sensor-simulator.ts` every 3 s. A sensor stays quiet while its last prediction is open.
- Today a commander-triggered incident pulls the sensor 25% of the way to 45% of baseline every tick, so the 8-unit deviation rule trips in about 2 ticks (~6 s). There is no time to warn ahead (proposal: Demo pacing).
- The server functions the actions need already exist with their permission checks: `assignGlitch` (C), `advanceStatus` (assignee or C), `reportEcho` (any guardian), `setLockdown` (C).
- AI runs on OpenRouter (`openrouter.classifier.ts`, pinned `openai/gpt-4o-mini`, 3 s timeout, no token cap yet).

## Goals / Non-Goals

**Goals:**
- Foresight numbers computed by a pure, tested module that uses the same thresholds as the detector, so "the Oracle warned" and "the glitch appeared" cannot disagree.
- No new write path: every Oracle action ends in an existing server function called by the UI.
- Keep the `Classifier` port unchanged (three methods). Every new decision is a `choose`, or plain code.

**Non-Goals:**
- Changing the anomaly rules or the magic-level formula.
- Server-side conversation storage. The history lives in the page and is lost on reload.
- A generic "do anything" command parser. Only the four actions, with deterministic argument extraction.

## Decisions

### D1. Forecast is a pure module next to the detector
`server/monitoring/forecast.ts` exports `forecastSensor(readings, now)`, which works on the same `Reading[]` as `detectAnomaly`:
- **Trend**: a least-squares slope over the last 45 s of readings, in units per minute. A trend counts only when |slope| ≥ 3 units/min, which is well above the simulator's noise (±1.2 per tick).
- **Alarm lines**, using the detector's own constants (exported from `anomaly.ts`, not copied): drop line = 60% of the 5-minute peak; deviation lines = 15-minute mean ± max(8, 3σ).
- **ETA**: the time until the projected value crosses the nearest line in the trend's direction. It is reported only when it is at most 10 minutes away.
- Result: `{ status: 'steady', value } | { status: 'heading', value, ratePerMin, etaSeconds, rule: 'drop' | 'deviation' }`.

Why linear and not something smarter: the demo signal is a smooth slide, a line explains itself on stage ("falling 12 per minute"), and it is testable with crafted series. Alternative: exponential fit. Rejected because it adds code and nobody would see the difference.

### Tuned values (simulated 200 runs per sensor, then checked live)
- Forecast: 45 s trend window, |rate| ≥ 3/min, and the value already ≥ 2 units from its 15-minute mean in the trend's direction. This gives about 0.7% false warnings on quiet sensors and a warning in ~95% of incidents when asked 30 s after the trigger.
- Simulator: normal pull 0.35 (was 0.15, which wandered too much for a clean trend). The incident level steps 0.45 per tick toward 45% of baseline, the value follows it with pull 0.5, and the incident noise is ±0.4. The glitch comes 42–78 s after the trigger (median 60 s).
- Live: the portal incident was warned at 33 s and its glitch raised at 63 s. The ETA in the answer runs long early in a slide (the trend window still holds pre-incident points), hence "about".

### D2. Slower demo incident
`PULL.incident` drops from 0.25 to about 0.012, so a triggered sensor slides at roughly 30–40 units/min at first and trips the 8-unit deviation rule about 45–60 s after the trigger. That leaves a ≥30 s window in which a foresight answer warns (spec: Warning comes before the glitch). The real-world rules are unchanged. Only the scripted incident is slower. The exact value is tuned against the verify step in the tasks.

### D3. Foresight data and answer
`monitoring.service.getForesight()` reads the last 15 minutes of readings (`sensorRepo.readingsSince`) and each sensor's latest prediction (`findLatestPrediction`, which already exists), and returns one forecast per sensor plus the open predictive glitches.
- A sensor whose prediction is still open is reported as "already raised: GL-xxxx", not forecast again, the same way the detector stays quiet then.
- The `foresight` template sorts by ETA: "Magic reserve is falling 14/min. At this rate it trips the alarm in about 40 s and I will raise a magic-drain glitch."
- With nothing heading anywhere: "The sensors look steady: Magic reserve 82 %, …".

### D4. Intent picking with memory
- `askAssistantInput` gains `history?: Array<{ question: string; glitchIds: string[] }>`, the last 6 exchanges, oldest first, each question 1–500 characters.
- **Context glitch**: the id in the question, else the newest history entry's first `glitchIds`, else an id in the newest history question.
- **Intent prompt**: it includes the last two history questions as "Earlier questions: …", so a bare "and now?" or "who has it?" gets understood.
- **Without AI** (fail open): a foresight keyword regex (`coming|foresee|predict|future|soon|next`) maps to `foresight`. A glitch id still maps to `glitch-status`. Everything else is `unknown`.

### D5. Actions are proposals with deterministic arguments
New intents: `assign-glitch`, `advance-glitch`, `report-echo`, `set-lockdown`. The AI only recognises the intent. The arguments come from code:

| Intent | Arguments | Allowed for | Proposal |
|---|---|---|---|
| `assign-glitch` | context glitch; defender = a defender codename found as a word in the question (case-insensitive, from `listGuardians`) | commander | `{ kind: 'assign', glitchId, guardianId, codename }` |
| `advance-glitch` | context glitch; `to = nextStatus(status)` | assignee or commander | `{ kind: 'advance', glitchId, from, to }` |
| `report-echo` | description = the question with a leading "report (an echo)?(that)?:?" stripped, validated by `echoDescriptionSchema` | any guardian | `{ kind: 'report', description }` |
| `set-lockdown` | `on` = false if the question says off/end/lift/stop/cancel, else the opposite of the current state | commander | `{ kind: 'lockdown', on }` |

- A missing argument (no glitch, no known defender, a FIXED glitch, a description that is too short) gives no proposal and a question back.
- A permission gap gives no proposal and "Only a commander can …".
- The permission check uses the same pure helpers as the services (`assertAssigneeOrCommander` logic, role checks), and the server function checks again on confirm.
- Why deterministic arguments: codenames, ids and on/off are exact tokens. Asking the AI for them would add calls and a way to be wrong. Alternative: AI `choose` over the defender list. Kept only as a fallback idea, not built.

### D6. Confirm in the UI, calling existing server functions
`AssistantAnswer.action` is `OracleAction | null`. The UI shows a confirm card with the proposal text and Confirm / Cancel. Confirm calls:
- `assign` → `assignGlitch({ glitchId, guardianId })`
- `advance` → `advanceStatus({ glitchId })`
- `report` → `reportEcho(FormData{ description })`
- `lockdown` → `setLockdown({ on })`

The result shows as an Oracle line ("Done: GL-0142 is now assigned to Orion"), and errors show their `AppError` message. Live events update every other screen as usual. Why not a server-side `executeAction`: it would duplicate four server functions and their permission checks. Alternative rejected.

### D7. Voice in the browser only
- The mic reuses `useSpeech` (hidden when `supported` is false). The final transcript is asked at once.
- A new `hooks/useSpeak.ts` wraps `speechSynthesis`: it speaks `answer.text` and the confirm text, cancels on a new question, and keeps the mute state in `localStorage`.
- No audio goes to the server or to the AI.
- The mic needs a secure context (HTTPS or `localhost`).

### D8. Low-cost model, capped
- OpenRouter's cheapest non-reasoning models (Nov 2026, per million input / output tokens): `google/gemini-2.5-flash-lite` $0.10/$0.40, `openai/gpt-4.1-nano` $0.10/$0.40, `openai/gpt-4o-mini` $0.15/$0.60.
- Reasoning models (`gpt-5-nano`, `gpt-5-mini`) are excluded: they are slower and their hidden reasoning tokens cost more.
- The live-check script runs moderation, types, duplicates, solved, assignment and the Oracle intents against `gemini-2.5-flash-lite`. If it gets them all right within the 3 s timeout, pin it. Otherwise keep `gpt-4o-mini`.
- `max_tokens: 400` on every call (enough for a 30-option probability map).
- The key's $50 monthly cap at OpenRouter is the hard spend limit.

### Server functions and endpoints touched

| Server function | Input | Output | Change |
|---|---|---|---|
| `askAssistant` (assistant) | `{ question: string; history?: Array<{ question: string; glitchIds: string[] }> }` (question 1-500 chars, history ≤ 6) | `AssistantAnswer` = `{ intent: Intent; text: string; glitchIds: string[]; suggestions: string[]; action: OracleAction \| null }` | input and output extended |
| `assignGlitch` (glitches) (C) | `{ glitchId: string; guardianId: number \| null }` | `GlitchListItem` | unchanged, called by Confirm |
| `advanceStatus` (glitches) - assignee or (C) | `{ glitchId: string }` | `GlitchListItem` | unchanged, called by Confirm |
| `reportEcho` (echoes) | `FormData{ description, x?, y?, image? }` | `{ echo: Echo; glitchId: string; outcome: 'created' \| 'grouped' \| 'reopened' }` | unchanged, called by Confirm |
| `setLockdown` (monitoring) (C) | `{ on: boolean }` | `{ on: boolean }` | unchanged, called by Confirm |

`OracleAction = { kind: 'assign'; glitchId: string; guardianId: number; codename: string } | { kind: 'advance'; glitchId: string; from: GlitchStatus; to: GlitchStatus } | { kind: 'report'; description: string } | { kind: 'lockdown'; on: boolean }`.

There's no new HTTP endpoint. `INTENTS` adds `foresight`, `assign-glitch`, `advance-glitch`, `report-echo` and `set-lockdown`. The D12 table in `guardians-mission-control/design.md` is updated in the same commit as the contract.

## Risks / Trade-offs

- [The incident still trips the rule too fast or too slow] → D2 is tuned against a timed verify step (≥30 s lead, glitch within 90 s).
- [A linear projection overstates the ETA as the slide flattens] → the answer says "about" and "at this rate". The deviation rule usually trips early in the slide, where it is close to linear.
- [A codename that is also a normal word ("Nova star")] → only defender codenames count, and the confirm card shows exactly who will be assigned before anything happens.
- [The cheaper model misreads intents] → D8 only pins it after the live check. Otherwise gpt-4o-mini stays.
- [Two people, about 2 hours] → priority order in the tasks: foresight and pacing (the pitch beat) → memory → actions → voice. Stop at 15:00 whatever is done.
- [The mic does not work on a phone over plain HTTP on the LAN] → demo the voice on the laptop at `localhost`.

## Migration Plan

No schema change and no data migration. Deploy is the usual pull + restart. Rollback is reverting the commits: the UI ignores `action` and `history` is optional, so old and new pieces stay compatible in either order.
