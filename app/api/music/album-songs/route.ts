import { NextRequest, NextResponse } from 'next/server'
import { getSongsFromReleaseGroup, searchRecordings } from '@/lib/musicbrainz/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const releaseGroupId = searchParams.get('releaseGroupId')
  const albumTitle = searchParams.get('albumTitle')
  const artist = searchParams.get('artist')

  if (!releaseGroupId) {
    return NextResponse.json(
      { error: 'releaseGroupId is required' },
      { status: 400 }
    )
  }

  try {
    // Try new method: Get songs from the primary release of this release-group
    // Pass albumTitle and artist for cover art fetching
    let songs = await getSongsFromReleaseGroup(releaseGroupId, albumTitle || undefined, artist || undefined)

    // Fallback to old method if new method returns no songs
    if (songs.length === 0 && albumTitle) {
      console.log(`New method returned no songs, falling back to search method`)
      const query = artist 
        ? `release:"${albumTitle}" AND artist:"${artist}"`
        : `release:"${albumTitle}"`
      const searchResults = await searchRecordings(query, 100)
      
      // Filter to only include songs that match this release-group
      songs = searchResults.filter((song) => {
        return song.albumId === releaseGroupId
      })
      
      // Try to add cover art to fallback results
      if (songs.length > 0) {
        const { getCoverArtUrl } = await import('@/lib/musicbrainz/client')
        const coverArtUrl = await getCoverArtUrl(releaseGroupId)
        songs = songs.map(song => ({ ...song, coverArtUrl }))
      }
    }

    console.log(`API: Returning ${songs.length} songs for release-group ${releaseGroupId}`)
    return NextResponse.json({ songs })
  } catch (error) {
    console.error('Error fetching album songs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch album songs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

