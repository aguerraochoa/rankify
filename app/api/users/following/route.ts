import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFollowingUsers } from '@/lib/db/follows'

// Mark this route as dynamic since it uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const followingUsers = await getFollowingUsers(user.id)

    return NextResponse.json({ users: followingUsers })
  } catch (error) {
    console.error('Error fetching following users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch following users' },
      { status: 500 }
    )
  }
}

