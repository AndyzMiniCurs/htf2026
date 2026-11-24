# Spec Delta

## Purpose

Makes the Oracle, the operator assistant, look ahead as well as at the present: it warns which sensor is heading for a predictive glitch, follows a conversation, proposes actions the guardian confirms, and can be spoken to and listened to.

## ADDED Requirements

### Requirement: Foresight from sensor trends
When asked what is coming, the Oracle SHALL report, for every sensor trending toward a predictive-glitch rule (a 40% drop within 5 minutes, or 3σ from its 15-minute mean), the sensor, its rate of change and the estimated time until the rule trips, if that is within 10 minutes. All numbers SHALL come from the sensor data; the AI only recognises the question.

#### Scenario: Sensor heading for an alarm
- **WHEN** the magic reserve has been falling steadily for the last minute and an operator asks "what's coming?"
- **THEN** the Oracle names the magic reserve, its fall per minute, the estimated seconds until a predictive glitch would be raised, and the kind of glitch it would be

#### Scenario: Steady realm
- **WHEN** no sensor is trending toward a rule within 10 minutes and an operator asks "will anything break soon?"
- **THEN** the Oracle says the sensors look steady and gives their current readings

### Requirement: Foresight names open predictive glitches
A foresight answer SHALL also list the predictive glitches (raised by the system from sensor data) that are still open, with their ids, so the operator can open them.

#### Scenario: Prediction already raised
- **WHEN** a predictive `magic-drain` glitch is open and an operator asks "what do you foresee?"
- **THEN** the answer names that glitch id as already raised and links it

### Requirement: Warning comes before the glitch
In the scripted demo incident a commander triggers, the sensor SHALL decline gradually enough that there are at least 30 seconds between the trigger and the predictive glitch, during which a foresight answer warns about that sensor.

#### Scenario: Demo incident
- **WHEN** a commander triggers an incident on the magic reserve and asks "what's coming?" 30 seconds later
- **THEN** the Oracle warns about the magic reserve, and the predictive glitch appears only after that

### Requirement: Conversation memory
The Oracle SHALL take the last few exchanges of the conversation into account: a question that names no glitch SHALL be about the last glitch the conversation named, and a short follow-up SHALL be understood in the context of the previous question.

#### Scenario: Follow-up without an id
- **WHEN** an operator asks "what's going on with GL-0142?" and then "who is working on it?"
- **THEN** the second answer is about GL-0142's assignee

#### Scenario: Fresh conversation
- **WHEN** the first question of a conversation is "who is working on it?"
- **THEN** the Oracle asks which glitch is meant and suggests example questions

### Requirement: Oracle proposes actions
The Oracle SHALL recognise requests to assign a glitch to a defender, advance a glitch's status, report an echo, and turn lockdown on or off, and SHALL answer with a proposed action that describes exactly what will happen. It SHALL NOT change anything itself.

#### Scenario: Assign by name
- **WHEN** a commander asks "give GL-0142 to Orion"
- **THEN** the answer proposes assigning GL-0142 to Orion and nothing changes yet

#### Scenario: Report from the chat
- **WHEN** a defender says "report a purple rift opening above the fountain"
- **THEN** the answer proposes reporting an echo with that description

### Requirement: Confirmed actions use normal permissions
A proposed action SHALL only take effect after the guardian confirms it, and it SHALL then follow the same rules and permission checks as the same action anywhere else in the app. The Oracle SHALL NOT propose an action the asker is not allowed to take; it SHALL say who can.

#### Scenario: Confirm
- **WHEN** a commander confirms the proposal to assign GL-0142 to Orion
- **THEN** GL-0142 is assigned to Orion, Orion is notified, and every open screen shows it live

#### Scenario: Not allowed
- **WHEN** a defender asks the Oracle to turn on lockdown
- **THEN** no action is proposed and the Oracle says only a commander can do that

#### Scenario: Unclear target
- **WHEN** a commander asks "assign it to Orion" in a conversation that named no glitch
- **THEN** no action is proposed and the Oracle asks which glitch is meant

### Requirement: Talk to the Oracle
The Oracle screen SHALL offer a microphone button that turns speech into the question, where the browser supports speech recognition, and SHALL read answers aloud, with a control to mute them. Where speech recognition is unsupported the button SHALL be hidden and typing SHALL work as before.

#### Scenario: Spoken question
- **WHEN** an operator taps the mic in Chrome and says "how much magic is left?"
- **THEN** the question is asked and the answer is shown and read aloud

#### Scenario: Muted
- **WHEN** the operator has muted spoken answers
- **THEN** answers are only shown, not read aloud

### Requirement: Low-cost AI
The Oracle and the other AI features SHALL run on a small, low-cost model with a capped answer length per call, and SHALL keep failing open: without an AI opinion the Oracle still answers questions that name a glitch id and foresight questions it can recognise without AI.

#### Scenario: AI unavailable
- **WHEN** the AI times out and an operator asks "what's coming?"
- **THEN** the Oracle still gives the foresight answer from the sensor data
