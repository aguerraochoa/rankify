import { createClient } from '@/lib/supabase/server'
import type { Song } from '@/lib/ranking/binaryInsertion'

export interface RankedListSong {
  song_id?: string // If song exists in DB
  musicbrainz_id: string
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  album_musicbrainz_id?: string // MusicBrainz release-group ID
  rank: number
}

export interface RankedList {
  id: string
  user_id: string
  name: string | null
  songs: RankedListSong[]
  song_count: number
  is_public: boolean
  share_token: string | null
  created_at: string
  updated_at: string
}

/**
 * Save a completed ranked list
 */
export async function saveRankedList(
  userId: string,
  rankedSongs: Song[],
  name?: string
): Promise<RankedList> {
  const supabase = await createClient()

  const songsData = rankedSongs.map((song, index) => ({
    musicbrainz_id: song.musicbrainzId || song.id,
    title: song.title,
    artist: song.artist,
    cover_art_url: song.coverArtUrl,
    album_title: song.albumTitle,
    album_musicbrainz_id: (song as any).albumId || (song as any).album_musicbrainz_id || null, // Preserve album ID from SongReview
    rank: index + 1,
  }))

  const { data, error } = await supabase
    .from('ranked_lists')
    .insert({
      user_id: userId,
      name: name || null,
      songs: songsData,
      song_count: rankedSongs.length,
      is_public: true, // Rankings are public by default
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving ranked list:', error)
    throw error
  }

  return data
}

/**
 * Get all ranked lists for a user
 */
export async function getUserRankedLists(userId: string): Promise<RankedList[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching ranked lists:', error)
    throw error
  }

  return data || []
}

/**
 * Get a specific ranked list
 * Can access own rankings or public rankings
 */
export async function getRankedList(
  userId: string,
  listId: string
): Promise<RankedList | null> {
  const supabase = await createClient()

  // Allow access to own rankings OR public rankings
  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('id', listId)
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    console.error('Error fetching ranked list:', error)
    throw error
  }

  return data
}

/**
 * Update a ranked list
 */
export async function updateRankedList(
  userId: string,
  listId: string,
  songs: RankedListSong[],
  name?: string | null
): Promise<RankedList> {
  const supabase = await createClient()

  const songsData = songs.map((song, index) => ({
    ...song,
    rank: index + 1, // Update ranks based on new order
  }))

  const updateData: any = {
    songs: songsData,
    song_count: songs.length,
    updated_at: new Date().toISOString(),
  }

  // Only update name if provided
  if (name !== undefined) {
    updateData.name = name || null
  }

  const { data, error } = await supabase
    .from('ranked_lists')
    .update(updateData)
    .eq('user_id', userId)
    .eq('id', listId)
    .select()
    .single()

  if (error) {
    console.error('Error updating ranked list:', error)
    throw error
  }

  return data
}

/**
 * Update the public/private status of a ranked list
 */
export async function updateRankedListVisibility(
  userId: string,
  listId: string,
  isPublic: boolean
): Promise<RankedList> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .update({
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', listId)
    .select()
    .single()

  if (error) {
    console.error('Error updating ranked list visibility:', error)
    throw error
  }

  return data
}

/**
 * Delete a ranked list
 */
export async function deleteRankedList(
  userId: string,
  listId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ranked_lists')
    .delete()
    .eq('user_id', userId)
    .eq('id', listId)

  if (error) {
    console.error('Error deleting ranked list:', error)
    throw error
  }
}

/**
 * Get a ranked list by share token (public access)
 */
export async function getRankedListByShareToken(
  shareToken: string
): Promise<RankedList | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('share_token', shareToken)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching ranked list by token:', error)
    throw error
  }

  return data
}

/**
 * Get public ranked lists for a user
 */
export async function getPublicRankedLists(
  userId: string
): Promise<RankedList[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching public ranked lists:', error)
    throw error
  }

  return data || []
}

/**
 * Generate or regenerate share token for a ranked list
 */
export async function generateShareToken(
  userId: string,
  listId: string
): Promise<string> {
  const supabase = await createClient()

  // Generate a unique token (using crypto.randomUUID or similar)
  // For now, we'll use a simple approach with timestamp + random
  const token = `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

  const { data, error } = await supabase
    .from('ranked_lists')
    .update({
      share_token: token,
      is_public: true, // Make it public when sharing
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', listId)
    .select('share_token')
    .single()

  if (error) {
    console.error('Error generating share token:', error)
    throw error
  }

  return data.share_token!
}

/**
 * Get ranked list for template use (can be public or owned by user)
 */
export async function getRankedListForTemplate(
  listId: string,
  userId?: string
): Promise<RankedList | null> {
  const supabase = await createClient()

  // Build query - can be owned by user OR public
  let query = supabase
    .from('ranked_lists')
    .select('*')
    .eq('id', listId)

  if (userId) {
    // If user is authenticated, they can access their own or public rankings
    query = query.or(`user_id.eq.${userId},is_public.eq.true`)
  } else {
    // If not authenticated, only public rankings
    query = query.eq('is_public', true)
  }

  const { data, error } = await query.single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching ranked list for template:', error)
    throw error
  }

  return data
}

