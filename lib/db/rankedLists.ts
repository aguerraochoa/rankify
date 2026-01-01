import { createClient } from '@/lib/supabase/server'
import type { Song } from '@/lib/ranking/binaryInsertion'

export interface RankedListSong {
  song_id?: string // If song exists in DB
  musicbrainz_id: string
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  rank: number
}

export interface RankedList {
  id: string
  user_id: string
  name: string | null
  songs: RankedListSong[]
  song_count: number
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
    rank: index + 1,
  }))

  const { data, error } = await supabase
    .from('ranked_lists')
    .insert({
      user_id: userId,
      name: name || null,
      songs: songsData,
      song_count: rankedSongs.length,
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
 */
export async function getRankedList(
  userId: string,
  listId: string
): Promise<RankedList | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('id', listId)
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
  songs: RankedListSong[]
): Promise<RankedList> {
  const supabase = await createClient()

  const songsData = songs.map((song, index) => ({
    ...song,
    rank: index + 1, // Update ranks based on new order
  }))

  const { data, error } = await supabase
    .from('ranked_lists')
    .update({
      songs: songsData,
      song_count: songs.length,
      updated_at: new Date().toISOString(),
    })
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

