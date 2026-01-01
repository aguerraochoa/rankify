'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        // Check if we just came from auth callback
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('auth') === 'success') {
          // Clear the query param
          window.history.replaceState({}, '', '/')
          // Refresh the session
          await supabase.auth.refreshSession()
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Error getting user:', error)
          setLoading(false)
          router.push('/login')
          return
        }

        setUser(user)
        setLoading(false)
        if (!user) {
          router.push('/login')
        }
      } catch (error) {
        console.error('Error getting user:', error)
        setLoading(false)
        router.push('/login')
      }
    }
    getUser()
  }, [router, supabase.auth])

  if (loading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <p>Loading...</p>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: '#f5f1e8' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
              Rankify
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Rank your music with precision
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/rankings"
              className="px-5 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              My Rankings
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
                router.refresh()
              }}
              className="px-5 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#8a9a7a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#d8e8d0] dark:hover:bg-[#3a4d2a]/40 transition-all shadow-md hover:shadow-lg border border-[#6b7d5a]/30 dark:border-[#6b7d5a]/50 rounded-xl"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <Link
            href="/songs"
            className="group relative bg-white dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 rounded-3xl hover:border-[#6b7d5a] dark:hover:border-[#8a9a7a] shadow-xl hover:shadow-2xl transition-all card-hover"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-slate-900 dark:text-slate-100">Song Ranker</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              Rank your favorite songs using binary insertion comparisons
            </p>
          </Link>

          <Link
            href="/albums"
            className="group relative bg-white dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 rounded-3xl hover:border-[#c97d4a] dark:hover:border-[#d98d5a] shadow-xl hover:shadow-2xl transition-all card-hover"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#c97d4a] to-[#d98d5a] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-slate-900 dark:text-slate-100">Album Ranker</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              Rank albums with Beli-style preference system
            </p>
          </Link>
        </div>
      </div>
    </main>
  )
}

