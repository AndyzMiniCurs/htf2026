# Design

## Context

See proposal.md for why. Today `StageActions` in `app/src/components/glitches/GlitchActions.tsx` renders the next-stage button; from `CONTAINING` it is labelled "Seal the rift" and calls `advanceStatus` through the shared `useAction` helper (toast + `router.invalidate()`). The overview world (`components/achrona/`) already uses react-three-fiber, drei, postprocessing (bloom, vignette, tone mapping), crystal and rift effects, and loads lazily inside `ClientOnly` + `Suspense` + an error boundary. Glitch kinds have colours and icons in `components/glitches/glitch-meta.ts`.

## Goals / Non-Goals

**Goals:**
- A short, legible 3D battle that reads well on a projector and on a phone.
- Game rules as a pure, tested state machine; the 3D layer only renders state and reports input.
- Sealing goes through the same `advanceStatus` call and permission check as today.

**Non-Goals:**
- Physics, collision libraries, sound, persistence of scores, multiple creature models.

## Decisions

### D1. Pure battle machine (`components/battle/battle.ts`)
State: `{ health, maxHealth, charge, hits, misses, summoned, startedAt, endedAt, phase: 'fighting' | 'won' }`. Actions: `hit(now)`, `miss()`, `summon(now)`. Constants: `maxHealth = 100`, spell damage `8`, summon damage `35`, charge per hit `20` (full at 100, so 5 hits), so a steady player wins in about 8 to 9 hits plus one summon (15 to 25 s at roughly one hit per second; the 40 s ceiling holds even without summoning, about 13 hits). `summon` is a no-op unless `charge >= 100 && !summoned`. Reaching zero health sets `phase: 'won'` and `endedAt`. Unit tests cover damage, charge, the single summon, and that no action changes state after `won`.
Why: the rules are where bugs hide; keeping them out of the render loop makes them testable without WebGL.

### D2. Arena scene (`components/battle/BattleScene.tsx`, lazy)
A separate small `<Canvas>`, not the world scene: dark arena floor with a rune circle, the creature (a cluster of large emissive octahedrons around a pulsing core, tinted with the kind's colour, slowly rotating, recoiling on hits), 5 shards orbiting at varied radii and speeds, bloom and vignette. Spells are short-lived additive meshes (a bolt line from camera to shard via drei `Line`, an expanding ring, `Sparkles` burst) driven by a small effects queue in component state. The familiar (D5) leaps in on an arc from off-screen with a trail (drei `Trail`) and strikes the core. Loaded with `lazy()` inside `ClientOnly`/`Suspense`/the existing `SceneBoundary` pattern so a WebGL failure falls back to the 2D controls.
Alternative: reuse the world scene and fight on the island. Rejected: too many objects to aim at on a phone, and the world's camera is cinematic, not interactive.

### D3. Input and accessibility
Pointer: r3f `onClick` on shards (hit) and on the arena floor (miss). Keyboard: the overlay keeps a "targeted shard" index; Tab/arrow keys cycle it (the targeted shard gets a gold ring), Space/Enter casts at it, S summons. Escape closes without sealing. The overlay (HTML, outside the canvas) holds the health bar, the summon meter and button, the shard count, and "Seal without the battle". Reduced motion (`useReducedMotion`) disables camera shake, the creature recoil and spark bursts, keeping the bolt and health changes.

### D4. Flow and sealing
`StageActions` opens `<SealingBattle glitch=… onSealed=… />` (a full-screen native `<dialog>` like `components/ui/Dialog.tsx`) when the current stage is `CONTAINING`; other stages keep the plain button. On `won`, the overlay calls `advanceStatus({ data: { glitchId } })` once (guarded by a ref), shows the victory card on success, and offers retry on failure without leaving the dialog. "Seal without the battle" calls the same function directly. Closing before success calls nothing. After success the dialog's "Back to the glitch" closes it and `router.invalidate()` refreshes the page.

### D5. The familiar: Claude
A single exported constant `FAMILIAR = { name: 'Claude', title: 'AI familiar' }` in `components/battle/familiar.ts`; the summon button reads "Summon Claude". The team chose the name as a hackathon pitch joke (the project is not published). The familiar is modelled by us as a small voxel creature in the spirit of the Claude Code mascot: an orange block body built from instanced cubes, two dark eye blocks, little legs, a soft glow and a trail as it leaps in and strikes. It is built from three.js boxes in code; no image or model files are copied, and no logos are used.

### Server functions / HTTP endpoints

No new or changed endpoints. Used as is:

| Server function | Input | Output |
|---|---|---|
| `advanceStatus` (`lib/glitches.functions.ts`) - assignee or commander | `{ glitchId: string }` | `GlitchListItem` |

## Risks / Trade-offs

- [Phones with weak GPUs stutter] → smaller canvas DPR on phones, at most 5 shards, no shadows; the 2D overlay and "Seal without the battle" always work.
- [A guardian taps "Seal" by habit during the pitch and the battle surprises them] → the battle opens with a one-line instruction and the skip button visible from the first frame.
- [Double advance on a fast double-tap at victory] → a ref guards the single `advanceStatus` call; the server's one-step rule rejects a second advance anyway.
