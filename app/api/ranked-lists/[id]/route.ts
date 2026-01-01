import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRankedList, deleteRankedList, updateRankedList } from '@/lib/db/rankedLists'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const list = await getRankedList(user.id, params.id)
    
    if (!list) {
      return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
    }

    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error fetching ranked list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ranked list' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { songs } = body

    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json(
        { error: 'Songs array is required' },
        { status: 400 }
      )
    }

    const list = await updateRankedList(user.id, params.id, songs)
    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error updating ranked list:', error)
    return NextResponse.json(
      { error: 'Failed to update ranked list' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteRankedList(user.id, params.id)
    return NextResponse.json({ message: 'Ranking deleted successfully' })
  } catch (error) {
    console.error('Error deleting ranked list:', error)
    return NextResponse.json(
      { error: 'Failed to delete ranked list' },
      { status: 500 }
    )
  }
}

