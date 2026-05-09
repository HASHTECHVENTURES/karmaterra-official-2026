import { createClient } from '@supabase/supabase-js'

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

/**
 * Ensures the JS client has a session before PostgREST calls.
 * Login also writes `admin_session`; without syncing, requests can run as anon
 * and RLS on `profiles` returns zero rows.
 */
export async function ensureSupabaseSessionFromStorage(): Promise<void> {
  if (typeof window === 'undefined') return

  const {
    data: { session: existing },
  } = await supabase.auth.getSession()
  if (existing?.access_token) return

  const raw = localStorage.getItem(ADMIN_SESSION_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as { session?: { access_token?: string; refresh_token?: string } }
    const s = parsed.session
    if (!s?.access_token || !s?.refresh_token) return

    const { error } = await supabase.auth.setSession({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
    })
    if (error) console.error('ensureSupabaseSessionFromStorage:', error)
  } catch (e) {
    console.error('ensureSupabaseSessionFromStorage parse error:', e)
  }
}








