import { createHash, randomBytes } from 'node:crypto'
import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from '@tanstack/react-start/server'
import * as repo from './session.repository.ts'
import type { Guardian } from '#/lib/guardian.ts'

export const SESSION_COOKIE = 'htf_session'
const SESSION_HOURS = 12

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Starts a session for the guardian and sets the httpOnly cookie on the current response. */
export async function startSession(guardianId: number): Promise<void> {
  const now = new Date()
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3600_000)
  await repo.deleteExpiredSessions(now.toISOString())
  await repo.insertSession({
    tokenHash: hashToken(token),
    guardianId,
    expiresAt: expiresAt.toISOString(),
  })
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    // Only over HTTPS: phones on the LAN reach the dev/demo server over plain http.
    secure: getRequestProtocol({ xForwardedProto: true }) === 'https',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

/** The signed-in guardian for the current request, or null. */
export async function currentGuardian(): Promise<Guardian | null> {
  const token = getCookie(SESSION_COOKIE)
  if (!token) return null
  return repo.findGuardianBySession(hashToken(token), new Date().toISOString())
}

/**
 * The current request's session, for long-lived responses (the live stream) that must notice a
 * logout or expiry later: `isActive()` re-reads the session row without needing the request.
 */
export async function currentSession(): Promise<{
  guardian: Guardian
  isActive: () => Promise<boolean>
} | null> {
  const token = getCookie(SESSION_COOKIE)
  if (!token) return null
  const tokenHash = hashToken(token)
  const guardian = await repo.findGuardianBySession(tokenHash, new Date().toISOString())
  if (!guardian) return null
  return {
    guardian,
    isActive: async () =>
      (await repo.findGuardianBySession(tokenHash, new Date().toISOString())) !== null,
  }
}

export async function endSession(): Promise<void> {
  const token = getCookie(SESSION_COOKIE)
  if (token) await repo.deleteSession(hashToken(token))
  deleteCookie(SESSION_COOKIE, { path: '/' })
}
