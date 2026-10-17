import type { NextRequest } from 'next/server'
import process from 'node:process'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { cookieOptions, origin, seal } from '@/lib/session'

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
    const data = await response.json()
    if (typeof data.access_token !== 'string')
      throw new Error('Missing token')
    const maxAge = Math.min(
      604800,
      typeof data.expires_in === 'number' ? data.expires_in : 604800,
    )
    jar.set('todoist_session', await seal(data.access_token, maxAge), {
      ...cookieOptions,
      maxAge,
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
