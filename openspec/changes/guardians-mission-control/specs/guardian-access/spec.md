# Spec Delta

## Purpose

Controls who can use mission control: guardians sign in with a codename and password, carry a role, and commanders manage the guardian roster.

## ADDED Requirements

### Requirement: Guardian login
The system SHALL let a guardian sign in with codename and password and SHALL keep them signed in with an HTTP-only session cookie.

#### Scenario: Valid credentials
- **WHEN** a guardian submits a known codename and the matching password
- **THEN** a session is created and the guardian lands on the dashboard

#### Scenario: Invalid credentials
- **WHEN** the codename is unknown or the password is wrong
- **THEN** login fails with one generic "invalid codename or password" message that does not reveal which part was wrong

### Requirement: Protected pages
Every page and server function except login SHALL require a valid session.

#### Scenario: Anonymous visit
- **WHEN** a visitor without a session opens any page other than `/login`
- **THEN** they are redirected to `/login`

#### Scenario: Anonymous server call
- **WHEN** a server function is called without a session
- **THEN** it fails with an unauthorized error and returns no data

### Requirement: Logout
The system SHALL let a signed-in guardian end their session.

#### Scenario: Logout
- **WHEN** a guardian logs out
- **THEN** the session cookie is cleared and the next page load redirects to `/login`

### Requirement: Roles
Every guardian SHALL have exactly one role: `defender` or `commander`. A commander SHALL have every permission a defender has plus the admin actions marked "commander only" in these specs.

#### Scenario: Defender calls a commander-only action
- **WHEN** a defender calls a commander-only server function
- **THEN** it fails with a forbidden error and nothing changes

#### Scenario: Commander uses a defender action
- **WHEN** a commander reports an echo
- **THEN** it succeeds exactly as for a defender

### Requirement: Guardian management
A commander SHALL be able to list guardians, create a guardian (codename, password, role) and change a guardian's role. Commander only.

#### Scenario: Create guardian
- **WHEN** a commander creates a guardian with an unused codename
- **THEN** the guardian can log in with that codename and password

#### Scenario: Duplicate codename
- **WHEN** a commander creates a guardian with a codename that already exists
- **THEN** creation fails with a "codename taken" error

#### Scenario: Last commander
- **WHEN** a commander tries to demote the only remaining commander
- **THEN** the change is rejected so the system always keeps at least one commander

### Requirement: Password storage
Passwords SHALL be stored only as salted hashes and SHALL never be returned by any server function.

#### Scenario: Guardian data leaves the server
- **WHEN** any server function returns guardian data
- **THEN** it contains id, codename and role only
