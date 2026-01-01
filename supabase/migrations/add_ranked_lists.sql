-- Migration: Add ranked_lists table
-- This adds the new ranked_lists table without recreating existing tables/policies

-- Ranked lists (simple storage for completed rankings)
CREATE TABLE IF NOT EXISTS public.ranked_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT, -- Optional name for the list
  songs JSONB NOT NULL, -- Array of {song_id, rank, title, artist, cover_art_url}
  song_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ranked_lists_user_id ON public.ranked_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_ranked_lists_created_at ON public.ranked_lists(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.ranked_lists ENABLE ROW LEVEL SECURITY;

-- Ranked lists policies
DROP POLICY IF EXISTS "Users can view own ranked lists" ON public.ranked_lists;
CREATE POLICY "Users can view own ranked lists"
  ON public.ranked_lists FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ranked lists" ON public.ranked_lists;
CREATE POLICY "Users can insert own ranked lists"
  ON public.ranked_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ranked lists" ON public.ranked_lists;
CREATE POLICY "Users can update own ranked lists"
  ON public.ranked_lists FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ranked lists" ON public.ranked_lists;
CREATE POLICY "Users can delete own ranked lists"
  ON public.ranked_lists FOR DELETE
  USING (auth.uid() = user_id);

