import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    // IMPORTANT: Read cookies first to ensure they're loaded (Next.js 14 lazy evaluation)
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll() // Force cookies to be read
    
    // Log cookies for debugging (remove in production)
    console.log('Cookies available:', allCookies.map(c => c.name))
    
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: code.substring(0, 10) + '...',
      })
      // Redirect to login with error
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'auth_failed')
      loginUrl.searchParams.set('details', error.message)
      return NextResponse.redirect(loginUrl)
    }

    console.log('Session exchanged successfully, user:', data.user?.email)

    // Verify the session was created
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('Session created but no user found')
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'session_failed')
      return NextResponse.redirect(loginUrl)
    }

    // Redirect to home page - cookies are set by createClient
    // Add a small query param to force a refresh
    const redirectUrl = new URL(next, requestUrl.origin)
    redirectUrl.searchParams.set('auth', 'success')
    const response = NextResponse.redirect(redirectUrl)
    
    // Ensure cookies are included in the response
    return response
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

