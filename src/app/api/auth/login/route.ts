import process from 'node:process'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { cookieOptions, origin } from '@/lib/session'

export async function GET() {
  if (
    !process.env.TODOIST_CLIENT_ID
    || !process.env.TODOIST_CLIENT_SECRET
    || !process.env.SESSION_SECRET
  ) {
    return NextResponse.json(
      { error: 'Todoist OAuth is not configured yet.' },
      { status: 503 },
    )
  }
  const state = crypto.randomUUID();
  (await cookies()).set('todoist_state', state, {
    ...cookieOptions,
    maxAge: 600,
  })
  const url = new URL('https://app.todoist.com/oauth/authorize')
  url.search = new URLSearchParams({
    client_id: process.env.TODOIST_CLIENT_ID,
    scope: 'data:read_write',
    state,
    response_type: 'code',
    redirect_uri: `${origin()}/api/auth/callback`,
  }).toString()
  return NextResponse.redirect(url)
}
