// Stub data for the server functions until each one gets its real service (design D13).
import type { AssistantAnswer } from './assistant.ts'
import type { NotificationPrefs } from './monitoring.ts'

export const fixtureNotificationPrefs: NotificationPrefs = {
  onAssigned: true,
  onStatus: true,
  onLockdown: true,
}

export const fixtureAssistantAnswer: AssistantAnswer = {
  intent: 'glitch-status',
  text: 'GL-0142 is LEAKED (time-anomaly), assigned to Nova. Last echo: "The clock tower keeps repeating the same minute".',
  glitchIds: ['GL-0142'],
  suggestions: [
    'What is going on right now?',
    'How much magic is left?',
    'What should I do about GL-0139?',
  ],
}
