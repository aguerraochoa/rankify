import { createClient } from '@/lib/supabase/server'
import { UserProfile } from './users'

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

/**
 * Follow a user
 */
export async function followUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const supabase = await createClient()

  // Prevent self-following
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself')
  }

  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: followingId,
    })

  if (error) {
    // If already following, that's okay (idempotent)
    if (error.code === '23505') {
      return // Already following
    }
    console.error('Error following user:', error)
    throw error
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) {
    console.error('Error unfollowing user:', error)
    throw error
  }
}

/**
 * Check if a user is following another user
 */
export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return false // Not following
    }
    console.error('Error checking follow status:', error)
    throw error
  }

  return !!data
}

/**
 * Get users that a user is following
 */
export async function getFollowing(userId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (error) {
    console.error('Error fetching following:', error)
    throw error
  }

  return (data || []).map((f) => f.following_id)
}

/**
 * Get users that follow a user
 */
export async function getFollowers(userId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)

  if (error) {
    console.error('Error fetching followers:', error)
    throw error
  }

  return (data || []).map((f) => f.follower_id)
}

/**
 * Get follow count for a user
 */
export async function getFollowCounts(userId: string): Promise<{
  following: number
  followers: number
}> {
  const supabase = await createClient()

  const [followingResult, followersResult] = await Promise.all([
    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', userId),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', userId),
  ])

  return {
    following: followingResult.count || 0,
    followers: followersResult.count || 0,
  }
}

/**
 * Get users that a user is following with full profile details
 */
export async function getFollowingUsers(userId: string): Promise<UserProfile[]> {
  const supabase = await createClient()

  // First get the following IDs
  const { data: followsData, error: followsError } = await supabase
    .from('follows')
    .select('following_id, created_at')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })

  if (followsError) {
    console.error('Error fetching following:', followsError)
    throw followsError
  }

  if (!followsData || followsData.length === 0) {
    return []
  }

  // Then get the profile details for each following user
  const followingIds = followsData.map((f) => f.following_id)
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', followingIds)

  if (profilesError) {
    console.error('Error fetching following user profiles:', profilesError)
    throw profilesError
  }

  // Return profiles in the same order as follows (most recent first)
  const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]))
  return followingIds
    .map((id) => profilesMap.get(id))
    .filter((profile): profile is UserProfile => profile !== undefined)
}

