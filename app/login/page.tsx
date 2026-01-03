'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Check for error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    const details = urlParams.get('details')
    if (error === 'auth_failed') {
      setMessage(
        details
          ? `Authentication failed: ${details}`
          : 'Authentication failed. Please check your Supabase redirect URL configuration.'
      )
      // Clear the error from URL
      window.history.replaceState({}, '', '/login')
    } else if (error === 'session_failed') {
      setMessage('Session creation failed. Please try again.')
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    }
    // Note: If successful, user will be redirected to Google, so we don't need to handle success here
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8" style={{ backgroundColor: '#f5f1e8' }}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
            Rankify
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Sign in to start ranking your music
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-slate-300 dark:border-slate-600 rounded-xl shadow-md hover:shadow-lg text-sm font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6b7d5a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.includes('failed') || message.includes('error')
                  ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              }`}
            >
              {message}
            </div>
          )}

          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            By signing in, you agree to Rankify's terms of service
          </p>
        </div>
      </div>
    </div>
  )
}

