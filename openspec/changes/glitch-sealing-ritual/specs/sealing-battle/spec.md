# Spec Delta

## Purpose

Lets the guardian who seals a rift do it by fighting the glitch in a short 3D battle, with spells and a summonable AI familiar, while keeping a plain way to seal for anyone who cannot or does not want to play.

## ADDED Requirements

### Requirement: Battle opens on sealing
When a guardian who may advance a `CONTAINING` glitch chooses "Seal the rift", the system SHALL open a full-screen sealing battle for that glitch instead of advancing it at once.

#### Scenario: Assignee seals
- **WHEN** the assigned defender presses "Seal the rift" on a `CONTAINING` glitch
- **THEN** the sealing battle opens and the glitch is still `CONTAINING`

#### Scenario: Not allowed to seal
- **WHEN** a defender who is not assigned views a `CONTAINING` glitch
- **THEN** no seal control and no battle is offered

### Requirement: Creature per glitch kind
The battle SHALL show the glitch as a creature whose colour, name and title match the glitch's kind, with the glitch id and a health bar starting full.

#### Scenario: Portal glitch
- **WHEN** the battle opens for a `portal` glitch
- **THEN** the creature uses the portal colour and is titled with the glitch id and "Portal"

### Requirement: Spells against weak points
Weak-point shards SHALL move around the creature. Hitting a shard SHALL cast a spell that lowers the glitch's health and charges the summon meter; a cast that hits no shard SHALL do no damage.

#### Scenario: Hit
- **WHEN** the guardian taps or selects a shard and casts
- **THEN** the shard breaks with a spell effect, health goes down and the summon meter goes up

#### Scenario: Miss
- **WHEN** the guardian taps empty space
- **THEN** health is unchanged and the miss is counted

### Requirement: Summon the AI familiar
When the summon meter is full the guardian SHALL be able to summon the AI familiar once per battle; the familiar SHALL strike the creature for heavy damage with its own effect.

#### Scenario: Summon ready
- **WHEN** the meter is full and the guardian summons
- **THEN** the familiar appears, strikes, and health drops by the familiar's damage

#### Scenario: Meter not full
- **WHEN** the meter is not full
- **THEN** the summon control is disabled and shows how much charge is missing

### Requirement: Winning seals the glitch
When health reaches zero the system SHALL play a sealing effect, advance the glitch to `FIXED` through the existing lifecycle, and show a victory card with time taken, hits, misses and whether the familiar was summoned.

#### Scenario: Victory
- **WHEN** the creature's health reaches zero
- **THEN** the glitch becomes `FIXED` and the victory card is shown

#### Scenario: Sealing fails on the server
- **WHEN** the battle is won but advancing the glitch fails
- **THEN** the guardian sees an error with a retry, and the glitch is not shown as fixed

### Requirement: Leaving never seals
Closing the battle, navigating away or losing the connection before victory SHALL leave the glitch unchanged.

#### Scenario: Closed early
- **WHEN** the guardian closes the battle at half health
- **THEN** the glitch is still `CONTAINING`

### Requirement: Accessible way to seal
The battle SHALL always offer "Seal without the battle", which advances the glitch directly. The battle SHALL be playable with keyboard only (move between shards, cast, summon) and SHALL respect reduced motion by removing screen shake and fast particle bursts.

#### Scenario: Skip
- **WHEN** the guardian chooses "Seal without the battle"
- **THEN** the glitch becomes `FIXED` without playing

#### Scenario: Keyboard only
- **WHEN** a guardian uses only Tab or arrow keys, Space and S
- **THEN** they can aim at shards, cast, summon and win

### Requirement: Short battles
A battle with no misses SHALL take between 15 and 40 seconds, so it fits the flow of work and a live pitch.

#### Scenario: Steady play
- **WHEN** a guardian hits a shard about once per second
- **THEN** the creature is defeated within 40 seconds
