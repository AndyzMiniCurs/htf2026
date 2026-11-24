import { z } from 'zod'

export const ROLES = ['defender', 'commander'] as const
export const roleSchema = z.enum(ROLES)
export type Role = z.infer<typeof roleSchema>

/** The only guardian shape that ever leaves the server: no password hash. */
export const guardianSchema = z.object({
  guardianId: z.number().int(),
  codename: z.string(),
  role: roleSchema,
})
export type Guardian = z.infer<typeof guardianSchema>

export const codenameSchema = z
  .string()
  .trim()
  .min(2, 'Codename needs at least 2 characters')
  .max(32, 'Codename can have at most 32 characters')
export const passwordSchema = z
  .string()
  .min(8, 'Password needs at least 8 characters')
  .max(200, 'Password can have at most 200 characters')

export const loginInput = z.object({
  codename: z.string().trim().min(1, 'Codename is required'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginInput>

export const createGuardianInput = z.object({
  codename: codenameSchema,
  password: passwordSchema,
  role: roleSchema,
})
export type CreateGuardianInput = z.infer<typeof createGuardianInput>

export const setGuardianRoleInput = z.object({
  guardianId: z.number().int().positive(),
  role: roleSchema,
})
export type SetGuardianRoleInput = z.infer<typeof setGuardianRoleInput>
