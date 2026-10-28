-- ========================================================
-- Streakboard Database Schema & Row Level Security (RLS)
-- Version: 20261028000000
-- Target: Supabase PostgreSQL
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. Boards Table (stores user habit board, sync state, and revisions)
CREATE TABLE IF NOT EXISTS public.boards (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for board queries
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards(user_id);

-- 3. Automatic Profile & Board Initialization on Signup (Email & OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.profiles
  INSERT INTO public.profiles (id, email, name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN public.profiles.name = '' THEN EXCLUDED.name ELSE public.profiles.name END,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  -- Initialize empty board with starter habits if not present
  INSERT INTO public.boards (user_id, state_json, rev, updated_at)
  VALUES (
    NEW.id,
    jsonb_build_object(
      'habits', jsonb_build_array(
        jsonb_build_object('id', 'h1', 'name', 'Wake up early', 'emoji', '⏰', 'color', 'mint', 'sched', jsonb_build_object('t', 'daily')),
        jsonb_build_object('id', 'h2', 'name', 'Read 10 pages', 'emoji', '📖', 'color', 'blue', 'sched', jsonb_build_object('t', 'daily'))
      ),
      'checks', jsonb_build_object(),
      'mind', jsonb_build_object(),
      'weeks', jsonb_build_object()
    ),
    1,
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing after user insertion in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Boards Policies
DROP POLICY IF EXISTS "Users can view own board" ON public.boards;
CREATE POLICY "Users can view own board"
  ON public.boards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own board" ON public.boards;
CREATE POLICY "Users can insert own board"
  ON public.boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own board" ON public.boards;
CREATE POLICY "Users can update own board"
  ON public.boards FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own board" ON public.boards;
CREATE POLICY "Users can delete own board"
  ON public.boards FOR DELETE
  USING (auth.uid() = user_id);
