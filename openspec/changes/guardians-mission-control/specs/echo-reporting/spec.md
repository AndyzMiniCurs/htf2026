# Spec Delta

## Purpose

Lets guardians report echoes (signals that something is wrong in Achrona) by text, voice, location and photo, and decides which glitch each echo belongs to.

## ADDED Requirements

### Requirement: Report an echo
Any signed-in guardian SHALL be able to report an echo with a description (3-1000 characters). The server SHALL set the timestamp and the reporting guardian; clients cannot set them.

#### Scenario: Valid echo
- **WHEN** a guardian submits a description of 3 to 1000 characters
- **THEN** an echo is stored with the server time and the guardian as reporter

#### Scenario: Invalid description
- **WHEN** the description is empty, shorter than 3 or longer than 1000 characters
- **THEN** the echo is rejected with a validation error naming the field

### Requirement: Echo creates a glitch by default
An echo that is not matched to an existing open glitch SHALL create a new glitch with status `LEAKED`, the echo's description and timestamp, and an id in the `GL-0000` format.

#### Scenario: First echo about a problem
- **WHEN** an echo is reported and no open glitch matches it
- **THEN** a new `LEAKED` glitch is created and the echo is linked to it

#### Scenario: AI unavailable
- **WHEN** duplicate detection is unavailable (no API key, timeout or error)
- **THEN** the echo still creates a new glitch, so reporting never fails because of AI

### Requirement: Echo location
An echo MAY carry a location on the Achrona map (x and y from 0 to 100). A new glitch SHALL take the location of the echo that created it.

#### Scenario: Echo with location
- **WHEN** a guardian picks a spot on the map while reporting
- **THEN** the echo and its new glitch store that location

#### Scenario: Out-of-range location
- **WHEN** x or y is below 0 or above 100
- **THEN** the echo is rejected with a validation error

### Requirement: Image attachment
An echo MAY have one image (JPEG, PNG or WebP, at most 5 MB). Images that fail moderation SHALL NOT be stored.

#### Scenario: Valid image
- **WHEN** a guardian attaches a 2 MB PNG that passes moderation
- **THEN** the image is stored and shown with the echo

#### Scenario: Wrong type or size
- **WHEN** the file is a PDF or larger than 5 MB
- **THEN** the echo is rejected with a clear error and nothing is stored

### Requirement: Voice input
The report form SHALL offer speech-to-text where the browser supports it; the recognized text fills the description field and the guardian can edit it before sending.

#### Scenario: Supported browser
- **WHEN** a guardian taps the microphone button and speaks
- **THEN** the spoken words appear in the description field

#### Scenario: Unsupported browser
- **WHEN** the browser has no speech recognition
- **THEN** the microphone button is hidden and typing still works

### Requirement: Echo updates on assigned glitches
A defender assigned to a glitch SHALL be able to add an echo directly to that glitch as a progress update, without duplicate detection.

#### Scenario: Progress update
- **WHEN** the assigned defender posts an echo from the glitch detail page
- **THEN** the echo is linked to that glitch and appears in its timeline
