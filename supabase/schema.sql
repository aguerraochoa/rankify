-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- We'll use auth.users for authentication, this table stores additional user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  musicbrainz_id TEXT, -- MusicBrainz recording ID
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_title TEXT,
  album_musicbrainz_id TEXT, -- MusicBrainz release-group ID
  cover_art_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, musicbrainz_id)
);

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

-- Song rankings (for merge-sort style ranking)
CREATE TABLE IF NOT EXISTS public.song_rankings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  rank INTEGER NOT NULL, -- 1-N ranking
  comparison_session_id UUID, -- Groups comparisons from the same ranking session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, song_id, comparison_session_id)
);

-- Song comparisons (stores pairwise comparison results)
CREATE TABLE IF NOT EXISTS public.song_comparisons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  song_a_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  song_b_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  preferred_song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE, -- NULL if skipped/tied
  result TEXT CHECK (result IN ('preferred_a', 'preferred_b', 'tie', 'skip', 'havent_heard')) NOT NULL,
  comparison_session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, song_a_id, song_b_id, comparison_session_id)
);

-- Albums table
CREATE TABLE IF NOT EXISTS public.albums (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  musicbrainz_id TEXT NOT NULL, -- MusicBrainz release-group ID (canonical album ID)
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover_art_url TEXT,
  mu NUMERIC(4, 2) DEFAULT 5.0 NOT NULL, -- Estimated score (0-10)
  sigma NUMERIC(4, 2) DEFAULT 2.0 NOT NULL, -- Uncertainty/confidence (higher = less certain)
  initial_vibe TEXT CHECK (initial_vibe IN ('loved', 'mid', 'didnt_like')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, musicbrainz_id)
);

-- Album comparisons (for Beli-style ranking)
CREATE TABLE IF NOT EXISTS public.album_comparisons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  album_a_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  album_b_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  preferred_album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE, -- NULL if tied
  result TEXT CHECK (result IN ('preferred_a', 'preferred_b', 'tie')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, album_a_id, album_b_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON public.songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_musicbrainz_id ON public.songs(musicbrainz_id);
CREATE INDEX IF NOT EXISTS idx_ranked_lists_user_id ON public.ranked_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_ranked_lists_created_at ON public.ranked_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_rankings_user_id ON public.song_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_song_rankings_session ON public.song_rankings(comparison_session_id);
CREATE INDEX IF NOT EXISTS idx_song_comparisons_user_id ON public.song_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_musicbrainz_id ON public.albums(musicbrainz_id);
CREATE INDEX IF NOT EXISTS idx_album_comparisons_user_id ON public.album_comparisons(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_comparisons ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Songs policies
CREATE POLICY "Users can view own songs"
  ON public.songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own songs"
  ON public.songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs"
  ON public.songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs"
  ON public.songs FOR DELETE
  USING (auth.uid() = user_id);

-- Ranked lists policies
CREATE POLICY "Users can view own ranked lists"
  ON public.ranked_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ranked lists"
  ON public.ranked_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ranked lists"
  ON public.ranked_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ranked lists"
  ON public.ranked_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Song rankings policies
CREATE POLICY "Users can view own song rankings"
  ON public.song_rankings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own song rankings"
  ON public.song_rankings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own song rankings"
  ON public.song_rankings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own song rankings"
  ON public.song_rankings FOR DELETE
  USING (auth.uid() = user_id);

-- Song comparisons policies
CREATE POLICY "Users can view own song comparisons"
  ON public.song_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own song comparisons"
  ON public.song_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Albums policies
CREATE POLICY "Users can view own albums"
  ON public.albums FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own albums"
  ON public.albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own albums"
  ON public.albums FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own albums"
  ON public.albums FOR DELETE
  USING (auth.uid() = user_id);

-- Album comparisons policies
CREATE POLICY "Users can view own album comparisons"
  ON public.album_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own album comparisons"
  ON public.album_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

