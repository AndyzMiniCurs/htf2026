# Spec Delta

## Purpose

Gives guardians the list and detail of glitches and lets them move each glitch through its lifecycle, find it fast and get it to the right defender.

## ADDED Requirements

### Requirement: Glitch list
Signed-in guardians SHALL see glitches newest first with id, type, status, description, timestamp and assignee. Glitches merged into another glitch SHALL NOT appear in the list.

#### Scenario: Open the list
- **WHEN** a guardian opens the glitch list
- **THEN** all non-merged glitches are shown newest first

### Requirement: Search, filter and sort
The list SHALL support a keyword search on id and description, filters on status, type and date range, and sorting by timestamp or status. The current search state SHALL live in the URL so it can be shared and survives reload.

#### Scenario: Keyword search
- **WHEN** a guardian searches for "portal"
- **THEN** only glitches whose id or description contains "portal" (case-insensitive) are shown

#### Scenario: Combined filters
- **WHEN** a guardian filters on status `LEAKED` and a date range
- **THEN** only `LEAKED` glitches inside that range are shown

#### Scenario: Shared link
- **WHEN** a guardian opens a copied list URL
- **THEN** the same search, filters and sort are applied

### Requirement: Glitch detail
Each glitch SHALL have a detail page with its fields, location, assignee, runbook and a timeline of its echoes (oldest first) with reporter codename and image.

#### Scenario: Open detail
- **WHEN** a guardian opens `GL-0142`
- **THEN** its data and all its echoes are shown

#### Scenario: Unknown id
- **WHEN** a guardian opens a glitch id that does not exist
- **THEN** a not-found page is shown

### Requirement: Status lifecycle
A glitch SHALL move only forward through `LEAKED → ASSESSING → CONTAINING → FIXED`, one step at a time. The assigned defender or any commander SHALL be able to advance it. Only a commander or the auto-reopen rule SHALL move a `FIXED` glitch back to `LEAKED`.

#### Scenario: Advance
- **WHEN** the assigned defender advances an `ASSESSING` glitch
- **THEN** its status becomes `CONTAINING`

#### Scenario: Skipping a step
- **WHEN** someone tries to move a `LEAKED` glitch straight to `FIXED`
- **THEN** the change is rejected

#### Scenario: Unassigned defender
- **WHEN** a defender who is not assigned tries to change the status
- **THEN** the change is rejected with a forbidden error

#### Scenario: Reopen
- **WHEN** a commander reopens a `FIXED` glitch
- **THEN** its status becomes `LEAKED`

### Requirement: Manual assignment
A commander SHALL be able to assign a glitch to a defender or clear the assignment. Commander only.

#### Scenario: Assign
- **WHEN** a commander assigns `GL-0142` to defender "Nova"
- **THEN** Nova is shown as assignee and Nova is notified

### Requirement: Merge and split echoes
A commander SHALL be able to move an echo to another glitch or out to a new glitch, and to merge a glitch into another. Commander only. A merged glitch keeps pointing at the glitch it was merged into.

#### Scenario: Override AI grouping
- **WHEN** a commander moves an echo out of a glitch it was wrongly grouped into
- **THEN** a new `LEAKED` glitch is created for that echo

#### Scenario: Merge glitches
- **WHEN** a commander merges `GL-0141` into `GL-0139`
- **THEN** all echoes of `GL-0141` move to `GL-0139` and `GL-0141` disappears from the list
