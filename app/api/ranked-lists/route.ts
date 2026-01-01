import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveRankedList, getUserRankedLists } from '@/lib/db/rankedLists'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lists = await getUserRankedLists(user.id)
    return NextResponse.json({ lists })
  } catch (error) {
    console.error('Error fetching ranked lists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ranked lists' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { songs, name } = body

    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json(
        { error: 'Songs array is required' },
        { status: 400 }
      )
    }

    const list = await saveRankedList(user.id, songs, name)
    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error saving ranked list:', error)
    return NextResponse.json(
      { error: 'Failed to save ranked list' },
      { status: 500 }
    )
  }
}

