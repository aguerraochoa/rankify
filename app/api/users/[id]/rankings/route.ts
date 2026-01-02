import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPublicRankedLists } from '@/lib/db/rankedLists'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    // Get public rankings for this user (no auth required for public data)
    const rankings = await getPublicRankedLists(userId)

    return NextResponse.json({ rankings })
  } catch (error) {
    console.error('Error fetching user rankings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    )
  }
}

