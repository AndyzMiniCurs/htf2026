# Tasks

Legend: **[BE] = Roel** (`lib/*.ts` contract, `server/**`, `*.functions.ts`) · **[FE] = Andu** (routes, components, hooks, styles).
Tick a box (`- [x]`) in the same commit that finishes the task. Groups are in priority order: foresight is the pitch beat, voice is last. Stop starting new tasks at 15:00.
How: `design.md` (D1-D8). Behaviour: `specs/oracle/spec.md`.

## 1. Contract

- [x] 1.1 [BE] Extend `lib/assistant.ts`: the five new `INTENTS`, `oracleActionSchema` / `OracleAction`, `action` on `assistantAnswerSchema`, optional `history` (≤ 6, question 1-500 chars) on `askAssistantInput`; return `action: null` from the current answers; update D12 in `guardians-mission-control/design.md` in the same commit; verify `npm run typecheck` and the existing assistant tests pass, and tell Andu

## 2. Foresight (pitch beat)

- [x] 2.1 [BE] Write `server/monitoring/forecast.ts` (pure, D1), reusing the detector's exported constants from `anomaly.ts`; verify unit tests with crafted series: flat noise → steady, a 30/min slide → heading with an ETA within 10% of the true crossing, a rising spike → deviation line, an ETA beyond 10 min → steady
- [ ] 2.2 [BE] Slow the scripted incident (D2, `PULL.incident`); verify with the dev server: trigger an incident on the magic reserve, and the predictive glitch appears between 30 and 90 s later (time it twice)
- [ ] 2.3 [BE] Add `getForesight()` to the monitoring service and the `foresight` intent + template + no-AI keyword fallback (D3, D4); verify a template test per case (heading, steady, already raised) and, live, that "what's coming?" 20 s after a trigger warns about the magic reserve before its glitch appears

## 3. Memory

- [ ] 3.1 [BE] Use `history` in `askAssistant`: the context glitch and earlier questions in the intent prompt (D4); verify tests: "who is working on it?" after a GL-0142 exchange → GL-0142's assignee, the same question with no history → asks which glitch
- [ ] 3.2 [FE] Send the last 6 exchanges (question + answer `glitchIds`) as `history` from the Oracle page; verify the GL-0142 → "who is working on it?" follow-up in the browser

## 4. Actions

- [ ] 4.1 [BE] Add the four action intents with deterministic arguments and permission checks (D5); `askAssistant` takes the asking guardian; verify a test per action (proposal built), per gap (no glitch, unknown defender, FIXED glitch, short description) and per permission refusal (defender asks for lockdown or assignment)
- [ ] 4.2 [FE] Show the confirm card for `answer.action` and on Confirm call the existing server function (D6), showing the result or the error message as an Oracle line; verify with Aegis: "give GL-0142 to Orion" → Confirm → Orion is assigned live in a second browser; Cancel changes nothing

## 5. Low-cost model

- [ ] 5.1 [BE] Add `max_tokens: 400` to the OpenRouter adapter, run the live-check script (moderation, types, duplicate, solved, assignment, every Oracle intent) against `google/gemini-2.5-flash-lite`, and pin it if it gets every case right within 3 s, otherwise keep `openai/gpt-4o-mini` (D8); record the result in D8; verify the adapter tests pass and the live script output is all correct for the pinned model

## 6. Voice

- [ ] 6.1 [FE] Add the mic button to the Oracle (reuse `useSpeech`, hidden when unsupported, asks on the final transcript); verify in Chrome on `localhost` and that the button is hidden in Firefox
- [ ] 6.2 [FE] Add `hooks/useSpeak.ts` (speechSynthesis, cancel on a new question, mute toggle in `localStorage`) and read answers and proposals aloud; verify an answer is spoken, muting stops it, and the mute survives a reload

## 7. Demo integration

- [ ] 7.1 [FE] Rehearse the Oracle beat in two browsers: commander triggers an incident → asks "what's coming?" (spoken) → warning → predictive glitch appears live → "give it to Orion" → Confirm → assigned; verify it runs twice in a row without errors

## Workflow follow-up

- Archive with `/openspec-archive-change oracle-foresight` after the pitch, after `guardians-mission-control` is archived (its `ai-assistance` spec is what this change builds on).
