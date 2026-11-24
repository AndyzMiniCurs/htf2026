import { AppError } from './errors.ts'
import type { z } from 'zod'

/** Server function validator: parses with the zod schema and turns failures into `VALIDATION` errors. */
export function validate<TSchema extends z.ZodType>(schema: TSchema) {
  return (input: z.input<TSchema>): z.output<TSchema> => {
    const result = schema.safeParse(input)
    if (result.success) return result.data
    const issue = result.error.issues.at(0)
    const field = issue?.path.join('.')
    throw new AppError(
      'VALIDATION',
      issue ? (field ? `${field}: ${issue.message}` : issue.message) : 'Invalid input',
    )
  }
}
