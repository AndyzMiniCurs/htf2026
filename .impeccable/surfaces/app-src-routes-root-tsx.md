---
version: 1
slug: "app-src-routes-root-tsx"
primary_target: "app/src/routes/__root.tsx"
related_targets: ["app/src/routes/index.tsx"]
---

# Surface brief: app shell and dashboard

Scope: the whole operating app (shell, dashboard, primitives) of Guardians of the Grid. Mode: Operate, with a user-pinned world: an old-style fantasy story game in the spirit of Hack the Future 2026 "The Curse of Achrona" (illustrated fantasy guardians, high fantasy meets high tech), animated, with real 3D. The user rejected four flat dashboard directions and pinned this world; it overrides the roll.

Audience and job: defenders on phones report echoes and work quests; commanders on a desktop watch the whole city; the jury sees it on a projector. Constraints: WCAG AA contrast, keyboard shortcuts, reduced motion, 360 px phones, light/dark/system plus lockdown.

## Direction contract

THESIS: Mission control is a living chronicle of Achrona. The city is a 3D diorama the guardians watch over, glitches are rifts torn into it, and the interface is the game's HUD and quest log. It refuses the KPI-tile ops dashboard and the big-number hero metric.

OWN-WORLD: Night-indigo stone panels framed by thin gilt lines with small corner flourishes; parchment only for reading matter (echo text, runbooks); arcane blue and desync violet as magic light, ember for leaks, verdant for seals and fixes. Grenze Gotisch for titles, glitch ids and quest names; Alegreya Sans for every control and data. The low-poly Kenney town floats as a moonlit island lit by magic. Light theme is the same world by day: parchment ground, ink, gilt.

STORY: A guardian sees the city, sees where it is torn and how much magic is left, takes a quest, acts, and watches the rift close. They believe Achrona is alive and watched.

FIRST VIEWPORT: Desktop 1440x900. A HUD bar on top (crest and title left, the magic vial centre, live presence and the guardian's portrait, codename and role right). A spellbook rail on the left with icon tabs. The 3D diorama fills the centre at about 60% width, with rift markers floating over buildings and a chronicle ticker of the latest echoes along its bottom edge. The quest log on the right lists open glitches as scroll entries with status seals, newest first. The primary action "Report an echo" is a gilt seal button in the HUD. Phone: compact HUD, a shorter diorama, the quest log below it, and a bottom hotbar with the report seal in the centre.

FORM: User-pinned fantasy story-game world (not dealt by the roll; the roll's hand was rejected and rerolled bolder). seed: 72c66950c8fcae09. Signature interaction: a new glitch opens a violet rift of light and particles over its spot on the diorama while its scroll unrolls into the quest log; fixing it seals the rift in a verdant flash and the magic vial refills.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
