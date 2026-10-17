import type { NextRequest } from 'next/server'
import process from 'node:process'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { cookieOptions, origin, seal, sessionMaxAge } from '@/lib/session'

export async function GET(req: NextRequest) {
  const jar = await cookies()
  const expected = jar.get('todoist_state')?.value
  jar.delete('todoist_state')
  const code = req.nextUrl.searchParams.get('code')
  if (!expected || req.nextUrl.searchParams.get('state') !== expected || !code) {
    return NextResponse.json(
      { error: 'Invalid or expired authorization. Please reconnect.' },
      { status: 400 },
    )
  }
  try {
    const response = await fetch('https://api.todoist.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.TODOIST_CLIENT_ID!,
        client_secret: process.env.TODOIST_CLIENT_SECRET!,
        code,
        redirect_uri: `${origin()}/api/auth/callback`,
      }),
      cache: 'no-store',
    })
    if (!response.ok)
      throw new Error('Authorization failed')
    const data: unknown = await response.json()
    if (
      !data
      || typeof data !== 'object'
      || !('access_token' in data)
      || typeof data.access_token !== 'string'
    ) {
      throw new Error('Missing token')
    }
    const expiresIn
      = 'expires_in' in data && typeof data.expires_in === 'number'
        ? data.expires_in
        : sessionMaxAge
    const refreshToken
      = 'refresh_token' in data && typeof data.refresh_token === 'string'
        ? data.refresh_token
        : undefined
    jar.set('todoist_session', await seal({
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
      refreshToken,
    }), {
      ...cookieOptions,
      maxAge: sessionMaxAge,
    })
    return NextResponse.redirect(origin())
  }
  catch {
    return NextResponse.json(
      { error: 'Todoist authorization failed. Please reconnect.' },
      { status: 502 },
    )
  }
}
