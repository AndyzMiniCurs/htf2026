# Proposal

## Why

The Oracle's name promises foresight, but today it only reports the present: it never looks at the sensor trends that the predictive-glitch detector watches, it forgets each question as soon as it answers, and it cannot help an operator act. Making it warn before a predictive glitch appears, follow a conversation and propose actions turns it into the centrepiece of the 5-minute pitch: "the Oracle saw it coming, and Orion is already on it".

## What Changes

- **Foresight**: a new "what is coming?" intent. Code (not the AI) reads each sensor's recent trend, projects when it will cross the same rules that create predictive glitches (a 40% drop within 5 minutes, or 3σ from the 15-minute mean), and answers with the sensor, its rate and an estimated time. It also names the predictive glitches that are already open. When nothing is trending toward a rule it says the realm looks steady.
- **Demo pacing**: the scripted demo incident (commander "trigger incident") slides more slowly, so there are tens of seconds between the trigger and the predictive glitch for the Oracle to warn about it.
- **Conversation memory**: the chat sends its last few exchanges with each question. A follow-up without a glitch id ("and who has it?") is about the last glitch the conversation named, and the AI sees the previous questions when it picks the intent.
- **Actions with confirmation**: new intents to assign a glitch, advance its status, report an echo and turn lockdown on or off. The Oracle only proposes the action ("Assign GL-0142 to Orion?"). The guardian confirms, and the UI calls the existing server function, so the same permission checks apply. The Oracle does not propose what the asker is not allowed to do and says why.
- **Voice**: a mic button on the Oracle (reusing `useSpeech`) and spoken answers through the browser's speech synthesis, with a toggle to mute.
- **Low-cost AI**: the AI stays on OpenRouter with a small, cheap model (`google/gemini-2.5-flash-lite` or `openai/gpt-4o-mini`, whichever passes the live checks), with a token cap per call. No large or reasoning models.

Ownership: **both**. Backend (Roel) owns foresight, memory, action proposals, the incident pacing, the model choice and the contract change. Frontend (Andu) owns the Confirm card, sending the history, the mic button and spoken answers.

Out of scope: free-text (generative) answers, the Oracle acting without a confirmation, actions other than the four listed, raw-audio transcription by the AI, and changing the anomaly rules themselves.

## Capabilities

### New Capabilities
- `oracle`: the operator assistant's foresight over sensor trends, its conversation memory, its confirmed actions and its voice interface. It builds on the assistant requirement in the in-flight `guardians-mission-control` change (`ai-assistance`); every Oracle answer is still built from live data, with the AI only picking the intent.

### Modified Capabilities
None. `openspec/specs/` has no archived capability yet; the existing assistant behaviour stays as specified in `guardians-mission-control`.

## Impact

- Contract (`app/src/lib/assistant.ts`, design D12 of `guardians-mission-control`): `askAssistant` input gains an optional `history`; `AssistantAnswer` gains `action` (null when nothing is proposed); `INTENTS` gains `foresight`, `assign-glitch`, `advance-glitch`, `report-echo`, `set-lockdown`. Existing callers keep working: `history` is optional and the current UI ignores `action`.
- Backend: `server/ai/assistant.ts` and `assistant.service.ts`, a new pure `server/monitoring/forecast.ts` with tests, `server/monitoring/sensor-simulator.ts` (incident pace), `server/ai/openrouter.classifier.ts` (model pin, token cap).
- Frontend: `routes/_app/assistant.tsx` and a confirm-card component, reusing `hooks/useSpeech.ts`, plus a small speech-synthesis hook.
- No new dependency. Cost: about one cheap model call per question (well under $0.001).
