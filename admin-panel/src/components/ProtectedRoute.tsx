import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if there's a session in localStorage
        const storedSession = localStorage.getItem('admin_session')
        if (storedSession) {
          const { session } = JSON.parse(storedSession)
          if (session) {
            // Verify session with Supabase
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              setIsAuthenticated(true)
              setLoading(false)
              return
            }
          }
        }

        // Check current session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          localStorage.setItem('admin_session', JSON.stringify({
            user: session.user,
            session: session,
          }))
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('admin_session', JSON.stringify({
          user: session.user,
          session: session,
        }))
        setIsAuthenticated(true)
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('admin_session')
        setIsAuthenticated(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d4a574] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

