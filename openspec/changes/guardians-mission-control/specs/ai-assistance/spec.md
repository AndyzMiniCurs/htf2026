# Spec Delta

## Purpose

Uses classification AI (Jev) to triage echoes and glitches automatically - grouping, typing, moderating, closing, predicting, assigning - and to help operators with runbooks and answers grounded in live data.

## ADDED Requirements

### Requirement: AI is optional
Every AI feature SHALL fail open: when the AI service is not configured, times out (3 seconds) or errors, the system SHALL fall back to the non-AI behaviour and SHALL NOT block or lose a guardian's action.

#### Scenario: No API key
- **WHEN** no AI key is configured and an echo is reported
- **THEN** the echo creates a new glitch of type `unknown` and the UI hides AI-only controls

### Requirement: Glitch type classification
Each new glitch SHALL get a type from a fixed list (`time-anomaly`, `magic-drain`, `portal`, `sensor-fault`, `creature`, `unknown`). Each type SHALL have its own icon and color everywhere a glitch is shown.

#### Scenario: Classify
- **WHEN** an echo "Time loop detected near the clock tower" creates a glitch
- **THEN** the glitch type is `time-anomaly` and it shows the time-anomaly icon and color

### Requirement: Duplicate grouping
When an echo is reported, the system SHALL compare it with open glitches and SHALL attach it to the most likely one when the match probability is at least 0.8, instead of creating a new glitch. The UI SHALL mark echoes that were grouped by AI so a commander can override them.

#### Scenario: Duplicate
- **WHEN** a second guardian reports "the clock tower keeps repeating the same minute" while `GL-0142` (time loop at the clock tower) is open
- **THEN** the echo is attached to `GL-0142` and marked "grouped by AI"

#### Scenario: Not a duplicate
- **WHEN** no open glitch scores 0.8 or more
- **THEN** a new glitch is created

### Requirement: Moderation
Echo descriptions the AI is sure are junk (spam, gibberish, a test, text naming no problem) or illegal, and images judged explicit, SHALL be rejected before they are stored, with a message telling the guardian why.

#### Scenario: Spam
- **WHEN** a guardian submits "asdfasdf buy cheap potions"
- **THEN** the echo is rejected with "This echo was flagged as not useful" and a hint to say what is wrong and where

#### Scenario: Plain report
- **WHEN** a guardian submits an ordinary observation such as "the lights are off at the archive"
- **THEN** the echo is accepted

### Requirement: Auto-close and reopen
An echo added to a glitch that says the problem is resolved SHALL move the glitch to `FIXED`. A new echo that matches a `FIXED` glitch with probability at least 0.8 SHALL reopen it to `LEAKED` instead of creating a new glitch.

#### Scenario: Resolved
- **WHEN** an echo "all clear, the portal is stable again" is added to a `CONTAINING` portal glitch
- **THEN** the glitch becomes `FIXED`

#### Scenario: Problem returns
- **WHEN** a new echo matches a glitch fixed earlier
- **THEN** that glitch is reopened as `LEAKED` and the echo is attached

### Requirement: Predictive glitches
The system SHALL create a glitch on its own, reported by the system, when sensor data shows an anomaly: a reading that drops 40% or more within 5 minutes, or a value more than 3 standard deviations from the sensor's last 15 minutes. It SHALL NOT create a second open glitch for the same sensor.

#### Scenario: Sudden drop
- **WHEN** the magic reserve sensor drops from 80 to 44 within 5 minutes
- **THEN** a `magic-drain` glitch is created with a description naming the sensor and the drop

#### Scenario: Already open
- **WHEN** the same sensor keeps dropping while its predicted glitch is still open
- **THEN** no new glitch is created

### Requirement: Automatic assignment
A new glitch SHALL be assigned by the forecast pressure (see Forecast). In a storm or steady hours it goes to the defender with the best skill at its type (speed against everyone else at that type, trusted more with more fixes), weighed down by the open glitches they hold, with the AI's fit weighed in when it has an opinion. In a lull it becomes a training quest for the least practised defender holding at most one open glitch, so the experts stay rested. A commander can always reassign.

#### Scenario: Specialist in a storm
- **WHEN** a storm is forecast and a `portal` glitch is created, and defender "Orion" seals portal glitches fastest and holds few open ones
- **THEN** the glitch is assigned to Orion

#### Scenario: Training quest in a lull
- **WHEN** a lull is forecast and a glitch is created
- **THEN** it is assigned to the free defender with the least skill at its type

### Requirement: Forecast
The system SHALL forecast new glitches for each of the next 12 hours with a model trained on past incidents (time of day and week, and the last day's activity), with an 80% range, and SHALL report the model's error on a held-out last week next to the weekday-and-hour average's. From the forecast it SHALL project magic at the usual fixing pace and call the next 3 hours a storm (1.5× the usual drain or magic heading under 20%), a lull (0.7× or less) or steady. Where the incident history is synthetic it SHALL say so. The `/forecast` page shows the verdict, the hourly forecast, the magic projection, who the next glitch of each type would go to and why, each defender's skill per type, and incidents per weekday and hour.

#### Scenario: Evening storm
- **WHEN** the history has its busiest hours in the evening and the forecast is read in the afternoon
- **THEN** the peak hour shown is in the evening and new glitches go to the strongest defender per type

### Requirement: Runbook
Each glitch SHALL get a runbook: an ordered list of 3 to 6 steps chosen and ranked by AI from a curated step library for its type, filled in with the glitch's own data (location, sensor, ids). Guardians SHALL be able to tick off steps.

#### Scenario: Runbook shown
- **WHEN** a guardian opens a `portal` glitch
- **THEN** its detail page shows an ordered runbook with portal-specific steps

### Requirement: Operator assistant
A chat screen SHALL answer operator questions about active incidents. The AI SHALL only pick the intent of the question; answers SHALL be built from live data. Supported intents: active incidents summary, status of a glitch id, who is assigned, magic level, what to do about a glitch (its runbook), and "unknown" with suggested questions.

#### Scenario: Status question
- **WHEN** an operator asks "what's going on with GL-0142?"
- **THEN** the assistant answers with GL-0142's current status, type, assignee and last echo

#### Scenario: Out of scope
- **WHEN** an operator asks something none of the intents cover
- **THEN** the assistant says it cannot answer that and lists example questions
