'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  bio: string | null
  following: number
  followers: number
}

interface RankedList {
  id: string
  name: string | null
  songs: Array<{
    title: string
    artist: string
    cover_art_url?: string
  }>
  song_count: number
  created_at: string
}

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [rankings, setRankings] = useState<RankedList[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTogglingFollow, setIsTogglingFollow] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setCurrentUserId(user.id)

        // Fetch user profile and rankings
        const [profileResponse, rankingsResponse, followResponse] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/rankings`),
          fetch(`/api/users/${userId}/follow`),
        ])

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch user profile')
        }

        const profileData = await profileResponse.json()
        setProfile(profileData.profile)
        setIsFollowing(profileData.isFollowing || false)

        if (rankingsResponse.ok) {
          const rankingsData = await rankingsResponse.json()
          setRankings(rankingsData.rankings || [])
        }
      } catch (err: any) {
        console.error('Error fetching user data:', err)
        setError(err.message || 'Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId, router, supabase.auth])

  const handleFollowToggle = async () => {
    setIsTogglingFollow(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/users/${userId}/follow`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsFollowing(false)
          if (profile) {
            setProfile({ ...profile, followers: Math.max(0, profile.followers - 1) })
          }
        }
      } else {
        // Follow
        const response = await fetch(`/api/users/${userId}/follow`, {
          method: 'POST',
        })
        if (response.ok) {
          setIsFollowing(true)
          if (profile) {
            setProfile({ ...profile, followers: profile.followers + 1 })
          }
        }
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
      alert('Failed to update follow status. Please try again.')
    } finally {
      setIsTogglingFollow(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f1e8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading profile...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f1e8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'User not found'}</p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Back to Discover
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f1e8' }}>
      <div className="max-w-6xl mx-auto">
        {/* Buttons row - top */}
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/discover"
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#8a9a7a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#d8e8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#6b7d5a]/30 dark:border-[#6b7d5a]/50"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        {/* Profile Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-xl mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-full font-bold text-white text-3xl shadow-lg flex-shrink-0">
              {(profile.display_name || profile.username || profile.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {profile.display_name || profile.username || profile.email || 'User'}
              </h1>
              {profile.username && profile.username !== profile.display_name && (
                <p className="text-slate-500 dark:text-slate-400 mb-2">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="text-slate-600 dark:text-slate-400 mb-4">{profile.bio}</p>
              )}
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-2xl font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">{profile.following}</span>
                  <span className="text-slate-600 dark:text-slate-400 ml-2">Following</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">{profile.followers}</span>
                  <span className="text-slate-600 dark:text-slate-400 ml-2">Followers</span>
                </div>
              </div>
            </div>
            {currentUserId === userId ? (
              <button
                onClick={() => {
                  // TODO: Open edit profile modal or navigate to edit page
                  alert('Profile editing coming soon!')
                }}
                className="px-6 py-3 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </span>
              </button>
            ) : (
              <button
                onClick={handleFollowToggle}
                disabled={isTogglingFollow}
                className={`px-6 py-3 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    : 'bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white'
                }`}
              >
                {isTogglingFollow ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ...
                  </span>
                ) : isFollowing ? (
                  'Unfollow'
                ) : (
                  'Follow'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Public Rankings */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Public Rankings
          </h2>
          {rankings.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-slate-600 dark:text-slate-400 text-lg">No public rankings yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rankings.map((ranking) => {
                const date = new Date(ranking.created_at)
                const formattedDate = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <Link
                    key={ranking.id}
                    href={`/rankings/${ranking.id}`}
                    className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-lg hover:shadow-xl transition-all card-hover"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100 line-clamp-2">
                        {ranking.name || `Ranking from ${formattedDate}`}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formattedDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-[#4a5d3a] dark:text-[#6b7d5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {ranking.song_count} songs
                      </span>
                    </div>

                    {/* Preview of top 3 songs */}
                    <div className="space-y-2 mb-4">
                      {ranking.songs.slice(0, 3).map((song, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl"
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-lg font-bold text-white text-xs shadow-md flex-shrink-0">
                            #{index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{song.title}</p>
                            <p className="text-xs text-slate-500 truncate">{song.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {ranking.songs.length > 3 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
                        +{ranking.songs.length - 3} more songs
                      </p>
                    )}

                    <div className="flex items-center justify-center pt-4 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] group-hover:text-[#5a6d4a] dark:group-hover:text-[#7b8d6a] transition-colors">
                        View Full Ranking →
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

