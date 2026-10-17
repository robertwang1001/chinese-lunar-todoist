import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { origin } from '@/lib/session'

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== origin())
    return new NextResponse(null, { status: 403 });
  (await cookies()).delete('todoist_session')
  return NextResponse.json({ ok: true })
}
