# Spec Delta

## Purpose

Makes mission control fast and pleasant on a phone in the field and on a desktop in the control room: layout, themes, shortcuts, offline use, reports, notifications and motivation.

## ADDED Requirements

### Requirement: Mobile-first layout
Every page SHALL be usable from 360 px wide upwards without horizontal page scrolling. On narrow screens navigation SHALL be a bottom bar; from 1024 px it SHALL be the side bar. Tap targets SHALL be at least 44 px.

#### Scenario: Phone
- **WHEN** a guardian opens the glitch list on a 375 px wide phone
- **THEN** glitches are shown as stacked cards and navigation is a bottom bar

#### Scenario: Desktop
- **WHEN** the same page opens at 1440 px
- **THEN** glitches are shown in a table and navigation is the side bar

### Requirement: Dark mode
Guardians SHALL be able to switch between light, dark and system theme; the choice SHALL persist on the device.

#### Scenario: Persisted theme
- **WHEN** a guardian picks dark and reloads
- **THEN** the page loads in dark without a flash of light theme

### Requirement: Keyboard shortcuts
On the glitch list and detail pages, `j` and `k` SHALL move to the next and previous glitch, `Enter` opens the selected one, `n` opens the report form and `?` shows all shortcuts. Shortcuts SHALL NOT fire while typing in a field.

#### Scenario: Next glitch
- **WHEN** a guardian presses `j` on the detail page of a glitch
- **THEN** the detail page of the next glitch in the list opens

#### Scenario: Typing
- **WHEN** a guardian types "j" in the search field
- **THEN** no navigation happens

### Requirement: Offline mode
When the network is lost, the app SHALL show a clear "offline" indicator, keep showing the last loaded data, and SHALL keep the app shell loadable from cache. Actions that need the server SHALL be disabled with an explanation while offline.

#### Scenario: Network lost
- **WHEN** the device goes offline while the dashboard is open
- **THEN** an "offline" badge appears and the last data stays visible

#### Scenario: Back online
- **WHEN** the network returns
- **THEN** the badge disappears and data refreshes

### Requirement: PDF report
A commander SHALL be able to export a report for the High Council of Achrona as PDF, containing the magic level, counts per status and type, open glitches with assignees, and the leaderboard top 5.

#### Scenario: Export
- **WHEN** a commander clicks "Export report"
- **THEN** a print-ready report opens and can be saved as PDF with no navigation chrome

### Requirement: Notifications
Guardians SHALL get an in-app notification, and a browser notification if they allowed it, when a glitch is assigned to them, when a glitch they reported changes status, and when lockdown starts. Each guardian SHALL be able to turn each of these three kinds on or off.

#### Scenario: Assigned
- **WHEN** a glitch is assigned to Nova and Nova has assignment notifications on
- **THEN** Nova sees a notification within 2 seconds

#### Scenario: Turned off
- **WHEN** Nova turned status notifications off
- **THEN** status changes do not notify Nova

### Requirement: Leaderboard
A leaderboard SHALL rank defenders by glitches they fixed (they were assignee when it moved to `FIXED`), and SHALL award badges: "First Fix" (1 fix), "Stabilizer" (10 fixes), "Specialist" (5 fixes of one type) and "Rapid Response" (a fix within 15 minutes of the glitch being created).

#### Scenario: Ranking
- **WHEN** Nova fixed 3 glitches and Orion fixed 5
- **THEN** Orion is ranked above Nova

#### Scenario: Badge
- **WHEN** Nova's first assigned glitch moves to `FIXED`
- **THEN** Nova gets the "First Fix" badge
