'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BinaryInsertionRanker, type RankingState, type ComparisonResult } from '@/lib/ranking/binaryInsertion'
import { createClient } from '@/lib/supabase/client'

export default function SongsPage() {
  const router = useRouter()
  const [step, setStep] = useState<'select' | 'review' | 'ranking'>('select')
  const [selectedAlbums, setSelectedAlbums] = useState<any[]>([])
  const [selectedSongs, setSelectedSongs] = useState<any[]>([])

  return (
    <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f1e8' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="group flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#4a5d3a] dark:text-[#8a9a7a] bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 hover:bg-[#d8e8d0] dark:hover:bg-[#3a4d2a]/40 transition-all rounded-xl shadow-sm hover:shadow-md border border-[#6b7d5a]/30 dark:border-[#6b7d5a]/50"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
              Song Ranker
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Rank your favorite songs with precision</p>
          </div>
        </div>

        {step === 'select' && (
          <AlbumSelection
            selectedAlbums={selectedAlbums}
            onAlbumsSelected={(albums) => {
              setSelectedAlbums(albums)
              setStep('review')
            }}
          />
        )}

        {step === 'review' && (
          <SongReview
            albums={selectedAlbums}
            onSongsSelected={(songs) => {
              setSelectedSongs(songs)
              setStep('ranking')
            }}
            onBack={() => setStep('select')}
          />
        )}

        {step === 'ranking' && (
          <SongRanking
            songs={selectedSongs}
            onBack={() => setStep('review')}
          />
        )}
      </div>
    </main>
  )
}

// Album Selection Component
function AlbumSelection({
  selectedAlbums,
  onAlbumsSelected,
}: {
  selectedAlbums: any[]
  onAlbumsSelected: (albums: any[]) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [localSelected, setLocalSelected] = useState<any[]>(selectedAlbums)
  const [searchMode, setSearchMode] = useState<'album' | 'artist'>('album')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const query = searchMode === 'artist' 
        ? `artist:"${searchQuery.trim()}"`
        : searchQuery.trim()
      
      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(query)}&type=release-group&limit=50&filterStudioAlbums=${searchMode === 'artist'}`
      )
      const data = await response.json()
      
      // If searching by artist, filter to only show albums by that exact artist
      let results = data.results || []
      if (searchMode === 'artist') {
        const searchArtist = searchQuery.trim().toLowerCase()
        // Filter to albums where the artist name matches (case-insensitive)
        // This handles cases like "The Beatles" matching "The Beatles" exactly
        results = results.filter((album: any) => {
          const albumArtist = album.artist.toLowerCase()
          // Check if the artist name starts with the search query (for exact matches)
          // or if it's the primary artist (first in the list if multiple artists)
          return albumArtist === searchArtist || 
                 albumArtist.startsWith(searchArtist + ',') ||
                 albumArtist.startsWith(searchArtist + ' &') ||
                 albumArtist.startsWith(searchArtist + ' and')
        })
      }
      
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAlbum = (album: any) => {
    if (localSelected.find((a) => a.id === album.id)) {
      setLocalSelected(localSelected.filter((a) => a.id !== album.id))
    } else {
      setLocalSelected([...localSelected, album])
    }
  }

  const removeAlbum = (albumId: string) => {
    setLocalSelected(localSelected.filter((a) => a.id !== albumId))
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
          Select Albums
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Search for albums and select the ones you want to rank songs from
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
        {/* Search Mode Toggle */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSearchMode('album')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              searchMode === 'album'
                ? 'bg-[#4a5d3a] text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Search Albums
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('artist')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              searchMode === 'artist'
                ? 'bg-[#4a5d3a] text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Search by Artist
          </button>
        </div>
        
        <div className="relative flex items-center">
          <svg className="absolute left-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchMode === 'artist' ? "Search by artist name... (e.g., 'The Beatles')" : "Search for albums... (e.g., 'Revolver The Beatles')"}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-[#6b7d5a] focus:outline-none transition-all text-lg shadow-sm hover:shadow-md"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !searchQuery.trim()}
          className="mt-4 w-full py-4 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </span>
          ) : (
            'Search Albums'
          )}
        </button>
      </form>

      {localSelected.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Selected Albums
              <span className="ml-2 px-3 py-1 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 text-[#4a5d3a] dark:text-[#6b7d5a] rounded-full text-sm font-semibold">
                {localSelected.length}
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localSelected.map((album) => (
              <div
                key={album.id}
                className="group relative bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-md hover:shadow-xl transition-all card-hover"
              >
                <button
                  onClick={() => removeAlbum(album.id)}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                  aria-label="Remove album"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-start gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <div className="album-placeholder absolute inset-0 w-20 h-20 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden transition-opacity duration-300">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                      <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    </div>
                    {album.coverArtUrl && (
                      <img
                        src={album.coverArtUrl}
                        alt={album.title}
                        className="w-20 h-20 object-cover rounded-xl shadow-lg transition-opacity duration-300 opacity-0"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '0'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.opacity = '1'
                        }}
                        onLoad={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '1'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.opacity = '0'
                        }}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-lg">{album.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">{album.artist}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onAlbumsSelected(localSelected)}
            disabled={localSelected.length === 0}
            className="w-full py-4 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
          >
            Continue with {localSelected.length} album{localSelected.length !== 1 ? 's' : ''} →
          </button>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Search Results
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
              ({searchResults.length} found)
            </span>
          </h3>
          
          {/* Mobile: Table View */}
          <div className="md:hidden bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16">
                      {/* Image column header */}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Album
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Artist
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16">
                      {/* Select column header */}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {searchResults.map((album) => {
                    const isSelected = localSelected.find((a) => a.id === album.id)
                    return (
                      <tr
                        key={album.id}
                        onClick={() => toggleAlbum(album)}
                        className={`group cursor-pointer transition-all hover:bg-[#f0f8e8] dark:hover:bg-[#2a3d1a]/10 ${
                          isSelected ? 'bg-[#f0f8e8] dark:bg-[#2a3d1a]/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="relative w-12 h-12">
                            <div className="album-placeholder absolute inset-0 w-12 h-12 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-lg shadow-md flex items-center justify-center relative overflow-hidden transition-opacity duration-300">
                              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                              <svg className="w-6 h-6 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                              </svg>
                            </div>
                            {album.coverArtUrl && (
                              <img
                                src={album.coverArtUrl}
                                alt={album.title}
                                className="w-12 h-12 object-cover rounded-lg shadow-md transition-opacity duration-300 opacity-0"
                                onError={(e) => {
                                  const target = e.currentTarget
                                  target.style.opacity = '0'
                                  const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                                  if (placeholder) placeholder.style.opacity = '1'
                                }}
                                onLoad={(e) => {
                                  const target = e.currentTarget
                                  target.style.opacity = '1'
                                  const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                                  if (placeholder) placeholder.style.opacity = '0'
                                }}
                                loading="lazy"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`font-bold ${isSelected ? 'text-[#2a3d1a] dark:text-[#f0f8e8]' : 'text-slate-900 dark:text-slate-100'}`}>
                            {album.title}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-600 dark:text-slate-400">
                            {album.artist}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isSelected ? (
                            <div className="inline-flex items-center justify-center w-8 h-8 bg-[#4a5d3a] rounded-full shadow-md">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-8 h-8 border-2 border-slate-300 dark:border-slate-600 rounded-full group-hover:border-[#6b7d5a] dark:group-hover:border-[#6b7d5a] transition-colors">
                              <div className="w-4 h-4 rounded-full bg-transparent group-hover:bg-[#6b7d5a] dark:group-hover:bg-[#f0f8e8] transition-colors"></div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Desktop: Card Grid View */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {searchResults.map((album) => {
              const isSelected = localSelected.find((a) => a.id === album.id)
              return (
                <button
                  key={album.id}
                  onClick={() => toggleAlbum(album)}
                  className={`group relative bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 text-left transition-all card-hover ${
                    isSelected
                      ? 'border-[#4a5d3a] bg-[#f0f8e8] dark:bg-[#2a3d1a]/20 shadow-lg'
                      : 'border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] shadow-md hover:shadow-xl'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-[#4a5d3a] rounded-full flex items-center justify-center shadow-lg z-10">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="relative w-full aspect-square mb-3">
                    {/* Placeholder - shown by default, hidden when image loads */}
                    <div className={`album-placeholder absolute inset-0 w-full aspect-square bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-md flex items-center justify-center relative overflow-hidden transition-opacity duration-300 ${album.coverArtUrl ? '' : ''}`}>
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                      <svg className="w-12 h-12 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    </div>
                    {/* Image - hidden initially, shown when loaded */}
                    {album.coverArtUrl && (
                      <img
                        src={album.coverArtUrl}
                        alt={album.title}
                        className="w-full aspect-square object-cover rounded-xl shadow-md transition-opacity duration-300 opacity-0"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '0'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) {
                            placeholder.style.opacity = '1'
                          }
                        }}
                        onLoad={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '1'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) {
                            placeholder.style.opacity = '0'
                          }
                        }}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold truncate ${isSelected ? 'text-[#2a3d1a] dark:text-[#f0f8e8]' : 'text-slate-900 dark:text-slate-100'}`}>
                      {album.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                      {album.artist}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Song Review Component
function SongReview({
  albums,
  onSongsSelected,
  onBack,
}: {
  albums: any[]
  onSongsSelected: (songs: any[]) => void
  onBack: () => void
}) {
  const [songsByAlbum, setSongsByAlbum] = useState<Record<string, any[]>>({})
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true)
      setError(null)
      const songsMap: Record<string, any[]> = {}

      try {
        // Fetch songs for each album sequentially to respect MusicBrainz rate limits
        // MusicBrainz allows max 1 request per second
        for (let i = 0; i < albums.length; i++) {
          const album = albums[i]
          try {
            // Add delay between requests (except for the first one)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 1200)) // 1.2 seconds between requests
            }
            
            const params = new URLSearchParams({
              releaseGroupId: album.id,
              albumTitle: album.title,
              artist: album.artist,
            })
            const response = await fetch(`/api/music/album-songs?${params}`)
            const data = await response.json()
            songsMap[album.id] = (data.songs || []).map((song: any) => ({
              ...song,
              albumId: album.id,
              albumTitle: album.title,
              albumArtist: album.artist,
              albumCoverArt: album.coverArtUrl,
            }))
          } catch (err) {
            console.error(`Error fetching songs for album ${album.id}:`, err)
            songsMap[album.id] = []
            // Wait a bit longer after an error before continuing
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }

        setSongsByAlbum(songsMap)
        // Select all songs by default
        // Use composite key (albumId + songId) to handle same song on multiple albums
        const allSongIds = new Set<string>()
        Object.entries(songsMap).forEach(([albumId, songs]) => {
          songs.forEach((song) => {
            // Create unique key: albumId + songId to handle duplicates across albums
            const uniqueKey = `${albumId}:${song.id}`
            allSongIds.add(uniqueKey)
          })
        })
        setSelectedSongs(allSongIds)
      } catch (err) {
        setError('Failed to load songs. Please try again.')
        console.error('Error fetching songs:', err)
      } finally {
        setLoading(false)
      }
    }

    if (albums.length > 0) {
      fetchSongs()
    }
  }, [albums])

  const toggleSong = (songId: string, albumId: string) => {
    const uniqueKey = `${albumId}:${songId}`
    const newSelected = new Set(selectedSongs)
    if (newSelected.has(uniqueKey)) {
      newSelected.delete(uniqueKey)
    } else {
      newSelected.add(uniqueKey)
    }
    setSelectedSongs(newSelected)
  }

  const toggleAlbumSongs = (albumId: string) => {
    const albumSongs = songsByAlbum[albumId] || []
    const albumSongKeys = albumSongs.map((s) => `${albumId}:${s.id}`)
    const allSelected = albumSongKeys.length > 0 && albumSongKeys.every((key) => selectedSongs.has(key))

    const newSelected = new Set(selectedSongs)
    if (allSelected) {
      // Deselect all songs from this album
      albumSongKeys.forEach((key) => newSelected.delete(key))
    } else {
      // Select all songs from this album
      albumSongKeys.forEach((key) => newSelected.add(key))
    }
    setSelectedSongs(newSelected)
  }

  const handleContinue = () => {
    const allSongs: any[] = []
    Object.entries(songsByAlbum).forEach(([albumId, songs]) => {
      songs.forEach((song) => {
        const uniqueKey = `${albumId}:${song.id}`
        if (selectedSongs.has(uniqueKey)) {
          allSongs.push(song)
        }
      })
    })
    onSongsSelected(allSongs)
  }

  const totalSongs = Object.values(songsByAlbum).reduce(
    (sum, songs) => sum + songs.length,
    0
  )

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Loading songs from {albums.length} album{albums.length !== 1 ? 's' : ''}...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 rounded-2xl max-w-md mx-auto mb-6">
          <div className="flex items-center gap-3 justify-center">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold">{error}</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
          Review Songs
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">
          Select which songs to include in your ranking
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 rounded-full">
          <span className="text-sm font-semibold text-[#4a5d3a] dark:text-[#6b7d5a]">
            {selectedSongs.size} / {totalSongs} selected
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {albums.map((album) => {
          const albumSongs = songsByAlbum[album.id] || []
          const selectedCount = albumSongs.filter((s) =>
            selectedSongs.has(`${album.id}:${s.id}`)
          ).length
          const allSelected = albumSongs.length > 0 && selectedCount === albumSongs.length

          return (
            <div
              key={album.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <div className="album-placeholder absolute inset-0 w-20 h-20 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-xl shadow-md flex items-center justify-center relative overflow-hidden transition-opacity duration-300">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '8px 8px' }}></div>
                      <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    </div>
                    {album.coverArtUrl && (
                      <img
                        src={album.coverArtUrl}
                        alt={album.title}
                        className="w-20 h-20 object-cover rounded-xl shadow-md transition-opacity duration-300 opacity-0"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '0'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.opacity = '1'
                        }}
                        onLoad={(e) => {
                          const target = e.currentTarget
                          target.style.opacity = '1'
                          const placeholder = target.parentElement?.querySelector('.album-placeholder') as HTMLElement
                          if (placeholder) placeholder.style.opacity = '0'
                        }}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-1">{album.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">{album.artist}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 text-[#4a5d3a] dark:text-[#6b7d5a] rounded-full text-xs md:text-sm font-semibold whitespace-nowrap">
                        {selectedCount} of {albumSongs.length} selected
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleAlbumSongs(album.id)}
                  className={`px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-base font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-105 whitespace-nowrap ${
                    allSelected
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      : 'bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white'
                  }`}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {albumSongs.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-slate-500 dark:text-slate-400">No songs found for this album</p>
                  </div>
                ) : (
                  albumSongs.map((song) => {
                    const uniqueKey = `${album.id}:${song.id}`
                    const isSelected = selectedSongs.has(uniqueKey)
                    return (
                      <label
                        key={uniqueKey}
                        className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#f0f8e8] dark:bg-[#2a3d1a]/20 border-2 border-[#6b7d5a] dark:border-[#6b7d5a]'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSong(song.id, album.id)}
                            className="w-5 h-5 text-[#4a5d3a] rounded focus:ring-2 focus:ring-[#4a5d3a] cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${isSelected ? 'text-[#2a3d1a] dark:text-[#f0f8e8]' : 'text-slate-900 dark:text-slate-100'}`}>
                            {song.title}
                          </p>
                          {song.albumTitle && song.albumTitle !== album.title && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              from {song.albumTitle}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <svg className="w-5 h-5 text-[#4a5d3a] dark:text-[#6b7d5a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="px-6 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all shadow-md hover:shadow-lg"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={selectedSongs.size === 0}
          className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          Start Ranking ({selectedSongs.size} songs) →
        </button>
      </div>
    </div>
  )
}

// Song Ranking Component
function SongRanking({
  songs,
  onBack,
}: {
  songs: any[]
  onBack: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [ranker, setRanker] = useState<BinaryInsertionRanker | null>(null)
  const [state, setState] = useState<RankingState | null>(null)
  const [saving, setSaving] = useState(false)
  const [listName, setListName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)

  useEffect(() => {
    if (songs.length === 0) {
      setState({
        ranked: [],
        remaining: [],
        currentComparison: null,
        isComplete: true,
        totalComparisons: 0,
        estimatedRemaining: 0,
      })
      return
    }

    const newRanker = new BinaryInsertionRanker(songs, (newState) => {
      setState(newState)
    })
    setRanker(newRanker)
    const initialState = newRanker.initialize()
    setState(initialState)
  }, [songs])

  const handleComparison = async (result: ComparisonResult) => {
    if (!ranker || !state) return

    let newState: RankingState

    if (state.currentComparison && state.ranked.length === 0) {
      // Initial comparison
      newState = ranker.handleInitialComparison(result)
    } else {
      // Binary insertion comparison - pass the current comparison from state
      newState = ranker.handleComparison(result, state.currentComparison || undefined)
    }

    setState(newState)

    // Auto-save progress (optional - can be removed if too frequent)
    // await saveProgress(newState)
  }


  const handleSave = async () => {
    if (!state || state.ranked.length === 0) return

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/ranked-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: state.ranked,
          name: listName || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save ranking')
      }

      // Success - redirect to rankings page
      router.push('/rankings')
    } catch (error: any) {
      console.error('Error saving ranking:', error)
      alert(`Failed to save ranking: ${error.message || 'Please try again.'}`)
    } finally {
      setSaving(false)
    }
  }

  if (!state) {
    return (
      <div className="text-center py-16">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#4a5d3a] border-t-transparent mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 text-lg">Initializing ranking...</p>
      </div>
    )
  }

  if (songs.length < 2) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
          <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
            You need at least 2 songs to rank them.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (state.isComplete) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
            Ranking Complete!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            You&apos;ve ranked <span className="font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">{state.ranked.length}</span> songs in <span className="font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">{state.totalComparisons}</span> comparisons
          </p>
        </div>

        {!showNameInput ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {state.ranked.map((song, index) => (
                <div
                  key={song.id}
                  className="group flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] transition-all card-hover"
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-xl font-bold text-white text-xl shadow-lg flex-shrink-0">
                    #{index + 1}
                  </div>
                  {song.coverArtUrl && (
                    <img
                      src={song.coverArtUrl}
                      alt={song.title}
                      className="w-16 h-16 object-cover rounded-xl shadow-md flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">{song.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {song.artist}
                    </p>
                    {song.albumTitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {song.albumTitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 shadow-xl max-w-md mx-auto">
            <label className="block text-sm font-bold mb-3 text-slate-700 dark:text-slate-300">
              Name your ranking (optional)
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., My Top 50 Songs"
              className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#4a5d3a] focus:border-[#6b7d5a] dark:bg-slate-900 text-lg"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-4 pt-4">
          {!showNameInput ? (
            <>
              <button
                onClick={onBack}
                className="px-6 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Start Over
              </button>
              <button
                onClick={() => setShowNameInput(true)}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
              >
                Save Ranking
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowNameInput(false)}
                className="px-6 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] hover:from-[#5a6d4a] hover:to-[#7b8d6a] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Show ranked list preview
  const progress = state.ranked.length > 0
    ? ((songs.length - state.remaining.length) / songs.length) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-1 bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] dark:from-[#6b7d5a] dark:to-[#8a9a7a] bg-clip-text text-transparent">
              Rank Your Songs
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {state.ranked.length} of {songs.length} ranked
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">
              {Math.round(progress)}%
            </div>
            {state.estimatedRemaining > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ~{state.estimatedRemaining} comparisons left
              </p>
            )}
          </div>
        </div>
        <div className="relative w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#4a5d3a] to-[#6b7d5a] rounded-full transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Comparison Section */}
        <div className="lg:col-span-2">
          {state.currentComparison ? (
            <div className="space-y-8">
              <div className="text-center">
                {state.ranked.length === 0 ? (
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                      Which song do you prefer?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Choose your favorite to start building your ranking
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                      Where does this song rank?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Comparing with song <span className="font-bold text-[#4a5d3a] dark:text-[#6b7d5a]">#{state.currentComparison.position + 1}</span> of {state.currentComparison.totalRanked}
                    </p>
                  </div>
                )}
              </div>

              {/* Always show side-by-side cards */}
              <div className="grid grid-cols-2 gap-2 md:gap-6">
                <button
                  onClick={() => handleComparison('better')}
                  className="group relative bg-white dark:bg-slate-800 rounded-xl md:rounded-3xl p-3 md:p-8 border-2 md:border-4 border-slate-300 dark:border-slate-600 shadow-lg md:shadow-2xl hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] hover:shadow-[#4a5d3a]/20 hover:scale-[1.02] transition-all text-left"
                >
                  <div className="absolute top-1 right-1 md:top-4 md:right-4 px-1.5 py-0.5 md:px-3 md:py-1 bg-slate-600 text-white rounded-full text-[10px] md:text-xs font-bold">
                    {state.ranked.length === 0 ? 'SONG A' : 'NEW SONG'}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 md:w-48 md:h-48 mx-auto mb-2 md:mb-6">
                      <div className="absolute inset-0 w-20 h-20 md:w-48 md:h-48 bg-gradient-to-br from-[#6b7d5a] to-[#4a5d3a] rounded-lg md:rounded-2xl shadow-md md:shadow-xl flex items-center justify-center relative overflow-hidden transition-opacity duration-300">
                        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 3px 3px, white 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#c97d4a]/10 to-transparent"></div>
                        <svg className="w-10 h-10 md:w-24 md:h-24 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                      {state.currentComparison.newSong.coverArtUrl && (
                        <img
                          src={state.currentComparison.newSong.coverArtUrl}
                          alt={state.currentComparison.newSong.title}
                          className="w-20 h-20 md:w-48 md:h-48 object-cover rounded-lg md:rounded-2xl shadow-md md:shadow-xl transition-opacity duration-300 opacity-0 absolute inset-0"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.opacity = '0'
                            const placeholder = target.parentElement?.querySelector('div:first-child') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '1'
                          }}
                          onLoad={(e) => {
                            const target = e.currentTarget
                            target.style.opacity = '1'
                            const placeholder = target.parentElement?.querySelector('div:first-child') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '0'
                          }}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <h4 className="text-sm md:text-2xl font-bold mb-1 md:mb-2 text-slate-900 dark:text-slate-100 line-clamp-2">
                      {state.currentComparison.newSong.title}
                    </h4>
                    <p className="text-xs md:text-lg text-slate-600 dark:text-slate-400 mb-1 md:mb-2 line-clamp-1">
                      {state.currentComparison.newSong.artist}
                    </p>
                    {state.currentComparison.newSong.albumTitle && (
                      <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 mb-2 md:mb-6 line-clamp-1 hidden md:block">
                        {state.currentComparison.newSong.albumTitle}
                      </p>
                    )}
                    <div className="w-full py-1.5 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg md:rounded-xl font-bold text-xs md:text-lg shadow-md md:shadow-lg hover:shadow-lg md:hover:shadow-xl transition-all">
                      Choose This One
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleComparison('worse')}
                  className="group relative bg-white dark:bg-slate-800 rounded-xl md:rounded-3xl p-3 md:p-8 border-2 md:border-4 border-slate-300 dark:border-slate-600 shadow-lg md:shadow-2xl hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] hover:shadow-[#4a5d3a]/20 hover:scale-[1.02] transition-all text-left"
                >
                  <div className="absolute top-1 right-1 md:top-4 md:right-4 px-1.5 py-0.5 md:px-3 md:py-1 bg-slate-600 text-white rounded-full text-[10px] md:text-xs font-bold">
                    {state.ranked.length === 0 ? 'SONG B' : `SONG #${state.currentComparison.position + 1}`}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 md:w-48 md:h-48 mx-auto mb-2 md:mb-6">
                      <div className="absolute inset-0 w-20 h-20 md:w-48 md:h-48 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 rounded-lg md:rounded-2xl shadow-md md:shadow-xl flex items-center justify-center relative overflow-hidden transition-opacity duration-300">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 3px 3px, white 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
                        <svg className="w-10 h-10 md:w-24 md:h-24 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                      {state.currentComparison.comparedSong.coverArtUrl && (
                        <img
                          src={state.currentComparison.comparedSong.coverArtUrl}
                          alt={state.currentComparison.comparedSong.title}
                          className="w-20 h-20 md:w-48 md:h-48 object-cover rounded-lg md:rounded-2xl shadow-md md:shadow-xl transition-opacity duration-300 opacity-0 absolute inset-0"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.opacity = '0'
                            const placeholder = target.parentElement?.querySelector('div:first-child') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '1'
                          }}
                          onLoad={(e) => {
                            const target = e.currentTarget
                            target.style.opacity = '1'
                            const placeholder = target.parentElement?.querySelector('div:first-child') as HTMLElement
                            if (placeholder) placeholder.style.opacity = '0'
                          }}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <h4 className="text-sm md:text-2xl font-bold mb-1 md:mb-2 text-slate-900 dark:text-slate-100 line-clamp-2">
                      {state.currentComparison.comparedSong.title}
                    </h4>
                    <p className="text-xs md:text-lg text-slate-600 dark:text-slate-400 mb-1 md:mb-2 line-clamp-1">
                      {state.currentComparison.comparedSong.artist}
                    </p>
                    {state.currentComparison.comparedSong.albumTitle && (
                      <p className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 mb-2 md:mb-6 line-clamp-1 hidden md:block">
                        {state.currentComparison.comparedSong.albumTitle}
                      </p>
                    )}
                    <div className="w-full py-1.5 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg md:rounded-xl font-bold text-xs md:text-lg shadow-md md:shadow-lg hover:shadow-lg md:hover:shadow-xl transition-all">
                      Choose This One
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Don't Know Button */}
              <button
                onClick={() => handleComparison('dont_know')}
                className="w-full py-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold text-lg transition-all shadow-md hover:shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Don&apos;t Know This Song
                </span>
              </button>

            </div>
          ) : (
            <div className="text-center py-12">
              <p>Preparing comparison...</p>
            </div>
          )}
        </div>

        {/* Ranked List Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-xl sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Current Ranking</h3>
              <span className="px-3 py-1 bg-[#e8f0e0] dark:bg-[#2a3d1a]/30 text-[#4a5d3a] dark:text-[#6b7d5a] rounded-full text-sm font-bold">
                {state.ranked.length}
              </span>
            </div>
            {state.ranked.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Start comparing to build your ranking</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {state.ranked.map((song, index) => (
                  <div
                    key={song.id}
                    className="group flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#6b7d5a] dark:hover:border-[#6b7d5a] transition-all"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#4a5d3a] to-[#6b7d5a] rounded-lg font-bold text-white text-sm shadow-md flex-shrink-0">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{song.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Review
        </button>
      </div>
    </div>
  )
}


