# Tasks

Legend: **[FE] = Andu**. This change has no backend tasks; it reuses `advanceStatus` as is.

## 1. Battle rules

- [x] 1.1 [FE] Write `components/battle/battle.ts` (pure state machine from design D1) and `familiar.ts` (D5); verify Vitest covers spell damage, charge to full in five hits, a single summon, the summon being refused before full charge, victory at zero health, and no change after victory

## 2. Arena

- [x] 2.1 [FE] Build `BattleScene.tsx` (D2): arena floor with rune circle, kind-tinted crystal creature with pulsing core, five orbiting shards, bloom and vignette, lazy-loaded behind ClientOnly/Suspense/error boundary; verify it renders for each glitch kind with no console errors
- [x] 2.2 [FE] Add spell effects (bolt, ring, spark burst) on hit and Claude, the voxel familiar (D5), leaping in on an arc with a trail to strike on summon; verify each plays once per action and reduced motion drops the bursts and shake

## 3. Overlay and flow

- [x] 3.1 [FE] Build the `SealingBattle` dialog overlay (D3, D4): title with glitch id and kind, health bar, summon meter and button, one-line instruction, "Seal without the battle", keyboard targeting (arrows, Space/Enter, S, Escape); verify a keyboard-only player can win
- [x] 3.2 [FE] Wire sealing: one guarded `advanceStatus` call on victory, victory card (time, hits, misses, summoned), retry on failure, nothing called when closed early; verify in the browser that a won battle moves the glitch to FIXED and a closed one leaves it CONTAINING
- [x] 3.3 [FE] Open the battle from "Seal the rift" on CONTAINING glitches in `StageActions`; other stages keep the plain button; verify as assignee and commander, and that an unassigned defender sees no seal control

## 4. Pitch check

- [x] 4.1 [FE] Play the battle on the projector resolution (1920x1080) and on a 375 px phone; verify a steady player wins within 40 s, the skip works, and lint, typecheck, tests and build pass

## 5. Cinematic rework

- [x] 5.1 [FE] Make Claude's summon a one-strike finisher and add combos to the rules (D1); verify Vitest covers the finisher and combo reset
- [x] 5.2 [FE] Rebuild the arena, the voxel dragon, spells and Claude's finisher with a directed camera (D6); verify by filming the battle at 1440, 1920 and 375 px with no page errors
- [x] 5.3 [FE] Add the title card, letterbox, combo, summon pips and Claude Code terminal to the overlay; verify the terminal lines land in time with the beam

## Workflow follow-up

- Archive the change after the pitch with `/openspec-archive-change glitch-sealing-ritual`.
- Optional follow-up proposal: store battle results and show the fastest seals in the Hall of Fame (needs a backend change).
