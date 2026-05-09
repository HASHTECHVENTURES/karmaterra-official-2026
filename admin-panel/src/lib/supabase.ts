import { createClient, type Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

const ADMIN_SESSION_KEY = 'admin_session'
const ADMIN_JWT_REFRESH_TS_KEY = 'karmaterra_admin_claim_refresh_at'

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const parts = accessToken.split('.')
    if (parts.length < 2) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    return JSON.parse(atob(b64 + pad)) as Record<string, unknown>
  } catch {
    return null
  }
}

function jwtHasKarmaterraAdmin(accessToken: string): boolean {
  const payload = decodeJwtPayload(accessToken)
  const meta = payload?.app_metadata as Record<string, unknown> | undefined
  return meta?.karmaterra_admin === true
}

/**
 * After app_metadata is changed in Supabase, existing access tokens do not
 * include the new claims until refresh. RLS reads auth.jwt(), so we refresh
 * when the admin flag is missing (throttled).
 */
async function refreshSessionIfAdminClaimsMissing(session: Session): Promise<void> {
  if (jwtHasKarmaterraAdmin(session.access_token)) return

  const last = sessionStorage.getItem(ADMIN_JWT_REFRESH_TS_KEY)
  const now = Date.now()
  if (last && now - Number(last) < 30_000) return

  const { error } = await supabase.auth.refreshSession()
  if (error) {
    console.warn('refreshSession (admin claims):', error.message)
    return
  }
  sessionStorage.setItem(ADMIN_JWT_REFRESH_TS_KEY, String(now))
}

/**
 * Ensures the JS client has a session before PostgREST calls.
 * Login also writes `admin_session`; without syncing, requests can run as anon
 * and RLS on `profiles` returns zero rows.
 */
export async function ensureSupabaseSessionFromStorage(): Promise<void> {
  if (typeof window === 'undefined') return

  let session = (await supabase.auth.getSession()).data.session

  if (!session?.access_token) {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { session?: { access_token?: string; refresh_token?: string } }
        const s = parsed.session
        if (s?.access_token && s?.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: s.access_token,
            refresh_token: s.refresh_token,
          })
          if (error) console.error('ensureSupabaseSessionFromStorage setSession:', error)
        }
      } catch (e) {
        console.error('ensureSupabaseSessionFromStorage parse error:', e)
      }
      session = (await supabase.auth.getSession()).data.session
    }
  }

  if (!session?.access_token) return

  await refreshSessionIfAdminClaimsMissing(session)
}

/** Call from logout so the next login can refresh claims immediately. */
export function clearAdminJwtRefreshThrottle(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ADMIN_JWT_REFRESH_TS_KEY)
}
