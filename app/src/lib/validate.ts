import type { z } from 'zod'
import { AppError } from './errors.ts'

/** Server function validator: parses with the zod schema and turns failures into `VALIDATION` errors. */
export function validate<S extends z.ZodType>(schema: S) {
  return (input: z.input<S>): z.output<S> => {
    const result = schema.safeParse(input)
    if (result.success) return result.data
    const issue = result.error.issues[0]
    const field = issue?.path.join('.')
    throw new AppError('VALIDATION', issue ? (field ? `${field}: ${issue.message}` : issue.message) : 'Invalid input')
  }
}
