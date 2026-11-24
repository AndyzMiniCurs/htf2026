# Spec Delta

## Purpose

Shows the state of Achrona as it happens: new glitches and changes appear without reload, and gauges, the map and sensor charts summarise how much magic is left.

## ADDED Requirements

### Requirement: Live updates
Open screens SHALL reflect new echoes, new glitches, status changes, assignments, sensor readings and lockdown changes within 2 seconds, without a page reload, for every signed-in guardian.

#### Scenario: New glitch
- **WHEN** guardian A reports an echo that creates a glitch
- **THEN** guardian B's open dashboard shows the glitch within 2 seconds

#### Scenario: Connection drops
- **WHEN** the live connection drops
- **THEN** the client reconnects automatically and reloads the current data once reconnected

### Requirement: Magic gauge
The dashboard SHALL show a magic level from 0 to 100%. It SHALL be 100% when there are no open glitches and go down with each open glitch, weighted by status (`LEAKED` 10, `ASSESSING` 7, `CONTAINING` 4) and by type severity, never below 0.

#### Scenario: All fixed
- **WHEN** every glitch is `FIXED` or merged
- **THEN** the gauge shows 100%

#### Scenario: New leak
- **WHEN** a new `LEAKED` glitch of normal severity appears and the gauge was at 100%
- **THEN** the gauge drops to 90%

### Requirement: Map of Achrona
A map page SHALL show every open glitch that has a location as a marker colored by type. Tapping a marker SHALL show the glitch summary with a link to its detail.

#### Scenario: Marker
- **WHEN** a glitch with location (40, 60) is open
- **THEN** a marker is shown at that spot on the map

#### Scenario: Fixed glitch
- **WHEN** that glitch becomes `FIXED`
- **THEN** its marker disappears

### Requirement: Sensor data
The system SHALL ingest readings from simulated IoT sensors (magic reserve, ley-line flux, portal stability) at least every 5 seconds and show each sensor's last 15 minutes as a chart.

#### Scenario: Charts update
- **WHEN** a new reading arrives
- **THEN** that sensor's chart shows it without reload

### Requirement: Lockdown mode
A commander SHALL be able to switch lockdown mode on and off. While it is on, every guardian's screen SHALL show a clear lockdown state (red theme and banner). Commander only.

#### Scenario: Activate lockdown
- **WHEN** a commander turns lockdown on
- **THEN** all open screens switch to the lockdown theme within 2 seconds

#### Scenario: Defender tries
- **WHEN** a defender tries to toggle lockdown
- **THEN** the change is rejected with a forbidden error
