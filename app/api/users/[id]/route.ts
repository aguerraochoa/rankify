import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/db/users'
import { getFollowCounts, isFollowing } from '@/lib/db/follows'
import { getPublicRankedLists } from '@/lib/db/rankedLists'

// Mark this route as dynamic since it uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = params.id

    // Get user profile
    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get follow counts
    const followCounts = await getFollowCounts(userId)

    // Check if current user is following this user
    let isFollowingUser = false
    if (user) {
      isFollowingUser = await isFollowing(user.id, userId)
    }

    // Get public rankings
    const publicRankings = await getPublicRankedLists(userId)

    return NextResponse.json({
      profile: {
        ...profile,
        ...followCounts,
      },
      isFollowing: isFollowingUser,
      publicRankings,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

