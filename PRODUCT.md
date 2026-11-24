# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Defenders**: guardians who report echoes (signs that something is wrong) from wherever they are, mostly on a phone, and work the glitches assigned to them.
- **Commanders**: guardians who oversee all of Achrona from a desktop control room, triage, assign, merge, trigger lockdown and report to the High Council.
- **Hackathon audience (evaluation context)**: a jury plus the public, watching a live desktop demo on a projector over HDMI. They vote; the first seconds on the big screen must make the product legible and memorable.

## Product Purpose

Guardians of the Grid is Achrona's realtime mission control against The Desync, a curse that makes magic stutter and data leak. Guardians report echoes; echoes become glitches; glitches are triaged, assigned, worked through `LEAKED → ASSESSING → CONTAINING → FIXED`, and watched live together with the city's sensors and its remaining magic. Success: a glitch goes from first echo to fixed fast, nobody misses what is happening right now, and a commander can see the state of the whole city at a glance.

## Positioning

Built for the Hack the Future 2026 challenge "Guardians of the Grid" (sponsor Optis), judged on Creativity 40%, Functionality 30%, Presentation 30%. Its distinct mechanism: classification AI (Jev) decides (type, duplicates, moderation, assignment, intent) while every answer shown comes from live data, so the assistant never makes things up.

## Operating Context

- Defenders: one-handed phone use, outdoors or on the move, short bursts, voice input welcome.
- Commanders: long sessions on a large desktop screen; many glitches at once; live updates matter more than navigation.
- Demo: desktop at projector scale, two sessions side by side (defender and commander) to show realtime.

## Capabilities and Constraints

- Full scope lives in `openspec/changes/guardians-mission-control/` (specs, design, tasks).
- Terms: guardian, defender, commander, echo, glitch, The Desync, Achrona, magic level, lockdown, High Council, runbook.
- Stack fixed: TypeScript, React 19, TanStack Start, PostgreSQL, Drizzle, Tailwind 4, lucide-react.
- Must work from 360 px phones to large desktop screens; light, dark and system themes plus a lockdown state.
- Built in one day by two people; deadline 16:00 on 2026-11-25 for the pitch.

## Brand Commitments

- Names: "Guardians of the Grid", the city Achrona, the curse The Desync, from the event "Hack the Future 2026 - The Curse of Achrona", where "high fantasy and high tech merge".
- No mandatory logo, colors or fonts. The team wants authored or generated imagery to give the world life, and the event's own world (illustrated fantasy guardians in futuristic armor, glitch and circuit motifs, playful tone) is the cultural home to draw from, not to copy.

## Evidence on Hand

- Seed glitches in `app/src/db/seed.ts` (synthetic demo data). All glitches, guardians, sensors and map locations are synthetic and must be labeled as such where they could be mistaken for real.
- No real users, metrics, testimonials or logos exist; none may be invented.

## Product Principles

1. Now beats history: what changed in the last seconds is always the most visible thing.
2. The world is the interface: Achrona's lore names and shapes every screen, but never at the cost of a guardian finding the next action.
3. Decide with AI, answer with data: AI output is shown as a decision with its confidence, never as invented prose.
4. One-handed in the field, at-a-glance in the control room.

## Accessibility & Inclusion

WCAG 2.2 AA contrast and keyboard access (shortcuts are part of the spec); status is never conveyed by color alone; motion respects `prefers-reduced-motion`; lockdown must stay readable.
