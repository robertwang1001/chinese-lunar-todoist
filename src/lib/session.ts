import process from 'node:process'
import { EncryptJWT, jwtDecrypt } from 'jose'
import { cookies } from 'next/headers'

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}
export const sessionMaxAge = 604800

interface SessionData {
  accessToken: string
  expiresAt: number
  refreshToken?: string
}

async function key() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32)
    throw new Error('Set a random SESSION_SECRET of at least 32 characters.')
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)),
  )
}
export async function seal(session: SessionData) {
  return new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + sessionMaxAge)
    .encrypt(await key())
}

async function readSession(value: string) {
  const { payload } = await jwtDecrypt(value, await key())
  if (typeof payload.token === 'string') {
    return {
      accessToken: payload.token,
      expiresAt: Number.POSITIVE_INFINITY,
    } satisfies SessionData
  }
  if (
    typeof payload.accessToken !== 'string'
    || typeof payload.expiresAt !== 'number'
    || (payload.refreshToken !== undefined && typeof payload.refreshToken !== 'string')
  ) {
    return null
  }
  return {
    accessToken: payload.accessToken,
    expiresAt: payload.expiresAt,
    refreshToken: payload.refreshToken,
  } satisfies SessionData
}

export async function hasSession() {
  const value = (await cookies()).get('todoist_session')?.value
  if (!value)
    return false
  try {
    const session = await readSession(value)
    return Boolean(
      session
      && (session.expiresAt > Date.now() || session.refreshToken),
    )
  }
  catch {
    return false
  }
}

async function refresh(session: SessionData) {
  if (
    !session.refreshToken
    || !process.env.TODOIST_CLIENT_ID
    || !process.env.TODOIST_CLIENT_SECRET
  ) {
    return null
  }
  const response = await fetch('https://api.todoist.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TODOIST_CLIENT_ID,
      client_secret: process.env.TODOIST_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    }),
    cache: 'no-store',
  })
  if (!response.ok)
    return null
  const data: unknown = await response.json()
  if (
    !data
    || typeof data !== 'object'
    || !('access_token' in data)
    || typeof data.access_token !== 'string'
  ) {
    return null
  }
  const expiresIn
    = 'expires_in' in data && typeof data.expires_in === 'number'
      ? data.expires_in
      : 3600
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshToken:
      'refresh_token' in data && typeof data.refresh_token === 'string'
        ? data.refresh_token
        : session.refreshToken,
  } satisfies SessionData
}

export async function token() {
  const jar = await cookies()
  const value = jar.get('todoist_session')?.value
  if (!value)
    return null
  try {
    const session = await readSession(value)
    if (!session)
      return null
    if (session.expiresAt > Date.now() + 60000)
      return session.accessToken
    const renewed = await refresh(session)
    if (!renewed) {
      jar.delete('todoist_session')
      return null
    }
    jar.set('todoist_session', await seal(renewed), {
      ...cookieOptions,
      maxAge: sessionMaxAge,
    })
    return renewed.accessToken
  }
  catch {
    jar.delete('todoist_session')
    return null
  }
}
export function origin() {
  return new URL(process.env.APP_URL || 'http://localhost:3000').origin
}
