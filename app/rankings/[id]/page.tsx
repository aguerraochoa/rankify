'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generateRankingPDF } from '@/lib/pdf/generateRankingPDF'

interface RankedSong {
  musicbrainz_id?: string
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  rank?: number
}

interface RankedList {
  id: string
  name: string | null
  songs: RankedSong[]
  song_count: number
  created_at: string
}

export default function RankingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const rankingId = params.id as string
  const [ranking, setRanking] = useState<RankedList | null>(null)
  const [editableSongs, setEditableSongs] = useState<RankedSong[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/ranked-lists/${rankingId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Ranking not found')
          }
          throw new Error('Failed to fetch ranking')
        }

        const data = await response.json()
        setRanking(data.list)
        setEditableSongs([...data.list.songs]) // Initialize editable copy
      } catch (err: any) {
        setError(err.message || 'Failed to load ranking')
      } finally {
        setLoading(false)
      }
    }

    if (rankingId) {
      fetchRanking()
    }
  }, [rankingId, router, supabase.auth])

  const handleEdit = () => {
    setIsEditing(true)
    setEditableSongs([...ranking!.songs]) // Reset to original when entering edit mode
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditableSongs([...ranking!.songs]) // Reset to original
    setDraggedIndex(null)
  }

  // Check if changes have been made
  const hasChanges = () => {
    if (!ranking || !isEditing) return false
    
    // Compare lengths
    if (ranking.songs.length !== editableSongs.length) return true
    
    // Compare each song's position - if order changed, there are changes
    for (let i = 0; i < ranking.songs.length; i++) {
      const original = ranking.songs[i]
      const edited = editableSongs[i]
      
      // Create unique identifiers for comparison
      // Use musicbrainz_id if available, otherwise use title + artist
      const originalId = original.musicbrainz_id || `${original.title}|${original.artist}`
      const editedId = edited.musicbrainz_id || `${edited.title}|${edited.artist}`
      
      // If the song at this position is different, order changed
      if (originalId !== editedId) {
        return true
      }
    }
    
    return false
  }

  const handleSave = async () => {
    if (!ranking) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: editableSongs,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save changes')
      }

      const data = await response.json()
      setRanking(data.list)
      setEditableSongs([...data.list.songs])
      setIsEditing(false)
      setDraggedIndex(null)
    } catch (err: any) {
      alert(`Failed to save changes: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const moveSong = (fromIndex: number, toIndex: number) => {
    const newSongs = [...editableSongs]
    const [movedSong] = newSongs.splice(fromIndex, 1)
    newSongs.splice(toIndex, 0, movedSong)
    setEditableSongs(newSongs)
  }

  const moveUp = (index: number) => {
    if (index > 0) {
      moveSong(index, index - 1)
    }
  }

  const moveDown = (index: number) => {
    if (index < editableSongs.length - 1) {
      moveSong(index, index + 1)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newSongs = [...editableSongs]
    const draggedSong = newSongs[draggedIndex]
    newSongs.splice(draggedIndex, 1)
    newSongs.splice(index, 0, draggedSong)
    setEditableSongs(newSongs)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this ranking? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/ranked-lists/${rankingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete ranking')
      }

      router.push('/rankings')
    } catch (err: any) {
      console.error('Error deleting ranking:', err)
      alert('Failed to delete ranking. Please try again.')
    }
  }

  const handleDownloadPDF = async () => {
    if (!ranking) return

    setIsGeneratingPDF(true)
    try {
      await generateRankingPDF({
        name: ranking.name,
        songs: ranking.songs,
        created_at: ranking.created_at,
      })
    } catch (err: any) {
      console.error('Error generating PDF:', err)
      alert(`Failed to generate PDF: ${err.message || 'Please try again.'}`)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f1e8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Loading ranking...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !ranking) {
    return (
      <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f1e8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Ranking not found'}</p>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
            >
              Back to Rankings
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const date = new Date(ranking.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f5f1e8] via-white to-[#f5f1e8] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Buttons row - top */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href="/rankings"
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  aria-label="Download ranking as image"
                  className="w-10 h-10 flex items-center justify-center text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPDF ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#dce8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#dce8d0] dark:border-[#3a4d2a]/40"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </span>
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all rounded-xl shadow-sm hover:shadow-md border border-red-200 dark:border-red-800"
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all rounded-xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges()}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] transition-all rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Title row - below buttons */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
            {ranking.name || 'My Ranking'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{formattedDate}</p>
        </div>

        <div className="mb-6">
          <div className="inline-flex px-4 py-2 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-xl">
            <span className="text-base md:text-lg font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">
              {ranking.song_count} songs
            </span>
          </div>
        </div>

        {isEditing && (
          <div className="mb-6 p-4 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-2xl border-2 border-[#6b7d5a] dark:border-[#6b7d5a]">
            <p className="text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Edit Mode: Drag songs to reorder, or use the up/down arrows
            </p>
          </div>
        )}

        <div className="space-y-3">
          {(isEditing ? editableSongs : ranking.songs).map((song, index) => (
            <div
              key={index}
              draggable={isEditing}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all ${
                isEditing
                  ? draggedIndex === index
                    ? 'border-[#c97d4a] dark:border-[#d98d5a] shadow-2xl scale-[1.02] cursor-grabbing'
                    : 'border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] cursor-grab shadow-lg hover:shadow-xl'
                  : 'border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-lg hover:shadow-xl card-hover'
              }`}
            >
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-xl font-bold text-white text-base md:text-xl shadow-lg">
                  #{index + 1}
                </div>
                {isEditing && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 hover:bg-[#6b7d5a] hover:text-white dark:hover:bg-[#6b7d5a] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === editableSongs.length - 1}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 hover:bg-[#6b7d5a] hover:text-white dark:hover:bg-[#6b7d5a] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="flex-shrink-0 cursor-grab active:cursor-grabbing">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              )}
              <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
                {/* Placeholder - shown by default */}
                <div className="song-placeholder absolute inset-0 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-md flex items-center justify-center overflow-hidden transition-opacity duration-300">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                {/* Image - overlays placeholder when loaded */}
                {song.cover_art_url && (
                  <img
                    src={song.cover_art_url}
                    alt={song.title}
                    className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-md transition-opacity duration-300 opacity-0"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.opacity = '0'
                      const placeholder = target.parentElement?.querySelector('.song-placeholder') as HTMLElement
                      if (placeholder) placeholder.style.opacity = '1'
                    }}
                    onLoad={(e) => {
                      const target = e.currentTarget
                      target.style.opacity = '1'
                      const placeholder = target.parentElement?.querySelector('.song-placeholder') as HTMLElement
                      if (placeholder) placeholder.style.opacity = '0'
                    }}
                    loading="lazy"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base md:text-lg text-slate-900 dark:text-slate-100 truncate">{song.title}</p>
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 truncate">{song.artist}</p>
                {song.album_title && (
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5 md:mt-1">
                    {song.album_title}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

