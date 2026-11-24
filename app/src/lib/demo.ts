import { z } from 'zod'

/** Scripted moments the presenter can fire if the live demo stalls (Wi-Fi, a phone, the AI). */
export const DEMO_STAGES = ['echo', 'duplicate', 'storm', 'incident'] as const
export const demoStageSchema = z.enum(DEMO_STAGES)
export type DemoStage = z.infer<typeof demoStageSchema>

export const stageDemoInput = z.object({ stage: demoStageSchema })
export type StageDemoInput = z.infer<typeof stageDemoInput>
