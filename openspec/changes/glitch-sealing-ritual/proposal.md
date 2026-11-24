# Proposal

## Why

Sealing a rift is the climax of every glitch, yet today it is one button click ("Seal the rift"). The pitch is judged 40% on creativity and is shown live on a projector. Turning the final step into a short 3D battle, where the defender attacks the glitch with spells and can summon an AI familiar to land the final blow, makes the fantasy-game world of Achrona something guardians do, and dramatises the product's idea that AI helps guardians fix glitches.

## What Changes

Ownership: **frontend (Andu)**. No backend change: the battle ends by calling the existing `advanceStatus` server function, which already enforces who may seal and the one-step lifecycle.

- On a `CONTAINING` glitch, "Seal the rift" opens a full-screen **3D sealing battle** instead of advancing at once.
- The glitch appears as a corrupted crystal creature in an arena, coloured and named by its kind (time anomaly, magic drain, portal, sensor fault, creature, unknown), with a health bar.
- Glowing weak-point shards orbit and drift around the creature. Hitting one casts a spell (bolt, burst of light) that damages the glitch; missing wastes the cast.
- Every hit charges a **summon** meter. When full, the defender can summon **Claude**, the AI familiar, which flies in and strikes for heavy damage. (Hackathon-only joke for the pitch; the name lives in one constant.)
- At zero health the rift collapses in a sealing burst, the glitch is advanced to `FIXED`, and a victory card shows time, hits and whether the familiar was summoned.
- Works with touch, mouse and keyboard (Tab/arrows to aim at the next shard, Space or Enter to cast, S to summon). About 20 to 40 seconds.
- "Seal without the battle" is always available, so the game never blocks the task or excludes anyone; reduced-motion keeps the battle but drops shakes and fast particles.
- Leaving or losing the connection never advances the glitch; only a finished battle or the explicit "seal without the battle" calls `advanceStatus`.

Out of scope: storing battle scores or adding them to the Hall of Fame (needs a backend change; can follow as its own proposal), battles for other stages, sound, multiplayer, third-party logos or brand art (the familiar is our own glowing orb).

## Capabilities

### New Capabilities
- `sealing-battle`: the 3D battle guardians play to seal a rift: the creature per glitch kind, spells and weak points, the summonable AI familiar, the accessibility escape and how winning seals the glitch.

### Modified Capabilities
(none - the glitch lifecycle rules are unchanged; the battle is another way to trigger the existing CONTAINING to FIXED step)

## Impact

- New `app/src/components/battle/`: a pure battle state machine (health, charge, hits, timing) with tests, the react-three-fiber arena (creature, shards, spell and summon effects) lazy-loaded like the world scene, and the battle overlay UI.
- `app/src/components/glitches/GlitchActions.tsx`: the CONTAINING stage button opens the battle.
- Reuses three.js, @react-three/fiber, drei, postprocessing and motion, which are already installed; no new dependencies, server functions, schema or environment variables.
