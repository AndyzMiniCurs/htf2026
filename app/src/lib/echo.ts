import { z } from 'zod'
import { AppError } from './errors.ts'
import { echoSchema, glitchIdSchema } from './glitch.ts'
import { validate } from './validate.ts'

export const ECHO_DESCRIPTION_MIN = 3
export const ECHO_DESCRIPTION_MAX = 1000
export const ECHO_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const ECHO_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type EchoImageMime = (typeof ECHO_IMAGE_MIMES)[number]

export const echoDescriptionSchema = z
  .string()
  .trim()
  .min(ECHO_DESCRIPTION_MIN, `Description needs at least ${ECHO_DESCRIPTION_MIN} characters`)
  .max(ECHO_DESCRIPTION_MAX, `Description can have at most ${ECHO_DESCRIPTION_MAX} characters`)

/** The text fields of the report form; the image is checked separately (bytes, size). */
export const reportEchoFields = z
  .object({
    description: echoDescriptionSchema,
    x: z.coerce.number().min(0).max(100).optional(),
    y: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((v) => (v.x === undefined) === (v.y === undefined), {
    message: 'Location needs both x and y',
    path: ['x'],
  })
  .transform(({ description, x, y }) => ({
    description,
    location: x !== undefined && y !== undefined ? { x, y } : null,
  }))

export type ReportEchoInput = z.output<typeof reportEchoFields> & { image: File | null }

const parseReportEchoFields = validate(reportEchoFields)

/**
 * Validator for `reportEcho`. The client sends FormData with `description`, optional `x`/`y`
 * (0-100) and an optional `image` file.
 */
export function parseReportEchoForm(data: FormData): ReportEchoInput {
  if (!(data instanceof FormData)) throw new AppError('VALIDATION', 'Expected form data')
  const field = (name: string) => {
    const value = data.get(name)
    return typeof value === 'string' && value !== '' ? value : undefined
  }
  const image = data.get('image')
  return {
    ...parseReportEchoFields({
      description: field('description') ?? '',
      x: field('x'),
      y: field('y'),
    }),
    image: image instanceof File && image.size > 0 ? image : null,
  }
}

export const ECHO_OUTCOMES = ['created', 'grouped', 'reopened'] as const

export const reportEchoResultSchema = z.object({
  echo: echoSchema,
  glitchId: z.string(),
  outcome: z.enum(ECHO_OUTCOMES),
})
export type ReportEchoResult = z.infer<typeof reportEchoResultSchema>

export const addGlitchUpdateInput = z.object({
  glitchId: glitchIdSchema,
  description: echoDescriptionSchema,
})
export type AddGlitchUpdateInput = z.infer<typeof addGlitchUpdateInput>

export const addGlitchUpdateResultSchema = z.object({
  echo: echoSchema,
  autoClosed: z.boolean(),
})
export type AddGlitchUpdateResult = z.infer<typeof addGlitchUpdateResultSchema>

export const moveEchoInput = z.object({
  echoId: z.number().int().positive(),
  /** null moves the echo out to a new `LEAKED` glitch. */
  toGlitchId: glitchIdSchema.nullable(),
})
export type MoveEchoInput = z.infer<typeof moveEchoInput>
