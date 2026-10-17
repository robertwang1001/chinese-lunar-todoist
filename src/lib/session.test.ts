import { cookies } from 'next/headers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hasSession, seal, token } from './session'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

const mockedCookies = vi.mocked(cookies)

describe('todoist session', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('SESSION_SECRET', 'test-secret-that-is-at-least-32-characters')
    vi.stubEnv('TODOIST_CLIENT_ID', 'client-id')
    vi.stubEnv('TODOIST_CLIENT_SECRET', 'client-secret')
  })

  it('refreshes an expired access token and rotates the encrypted cookie', async () => {
    const value = await seal({
      accessToken: 'expired-access-token',
      expiresAt: Date.now() - 1000,
      refreshToken: 'refresh-token',
    })
    const jar = {
      delete: vi.fn(),
      get: vi.fn(() => ({ value })),
      set: vi.fn(),
    }
    mockedCookies.mockResolvedValue(jar as never)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'new-access-token',
        expires_in: 3600,
        refresh_token: 'rotated-refresh-token',
      }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(token()).resolves.toBe('new-access-token')
    expect(fetchMock).toHaveBeenCalledOnce()
    const request = fetchMock.mock.calls[0]
    expect(request[0]).toBe('https://api.todoist.com/oauth/access_token')
    expect(String(request[1]?.body)).toContain('grant_type=refresh_token')
    expect(jar.set).toHaveBeenCalledWith(
      'todoist_session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, maxAge: 604800 }),
    )
    expect(jar.delete).not.toHaveBeenCalled()
  })

  it('recognizes a refreshable session without refreshing on page render', async () => {
    const value = await seal({
      accessToken: 'expired-access-token',
      expiresAt: Date.now() - 1000,
      refreshToken: 'refresh-token',
    })
    mockedCookies.mockResolvedValue({
      get: vi.fn(() => ({ value })),
    } as never)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(hasSession()).resolves.toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
