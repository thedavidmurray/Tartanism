-- Tartanism Database Schema
-- Generated: 2026-01-18
-- This creates all tables, indexes, and RLS policies for the Tartanism app

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- User Profiles (linked to Supabase auth.users)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username CITEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patterns
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pattern_type TEXT NOT NULL DEFAULT 'threadcount'
    CHECK (pattern_type IN ('threadcount', 'geometric', 'motif', 'image_based')),
  threadcount JSONB NOT NULL,           -- Generator params: sett, colors, symmetry
  seed TEXT,                             -- For reproducibility
  constraints JSONB,                     -- Generation constraints
  motifs JSONB,                          -- Illustrated motif data (if applicable)
  image_path TEXT NOT NULL,              -- Storage key (NOT base64)
  preview_path TEXT,                     -- Thumbnail path
  image_mime TEXT NOT NULL DEFAULT 'image/png',
  image_width INT,
  image_height INT,
  image_bytes INT,
  image_sha256 CHAR(64),                 -- For deduplication
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'unlisted', 'public')),
  share_slug TEXT UNIQUE,                -- Short URL slug
  deleted_at TIMESTAMPTZ,                -- Soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Full-text search column
ALTER TABLE patterns ADD COLUMN search TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
) STORED;

-- Pattern Shares (for unlisted access via token)
CREATE TABLE pattern_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_access_at TIMESTAMPTZ,
  access_count BIGINT NOT NULL DEFAULT 0
);

-- Collections (folders/albums)
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'unlisted', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Collection Items (junction table)
CREATE TABLE collection_items (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  position INT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, pattern_id)
);

-- Favorites
CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pattern_id)
);

-- Follows (social)
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Comments (optional)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Tags (for discovery)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE pattern_tags (
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (pattern_id, tag_id)
);

-- Pattern Stats (denormalized for performance)
CREATE TABLE pattern_stats (
  pattern_id UUID PRIMARY KEY REFERENCES patterns(id) ON DELETE CASCADE,
  favorites_count BIGINT NOT NULL DEFAULT 0,
  comments_count BIGINT NOT NULL DEFAULT 0,
  views_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Patterns
CREATE INDEX patterns_owner_idx ON patterns (owner_id, created_at DESC);
CREATE INDEX patterns_visibility_idx ON patterns (visibility, published_at DESC);
CREATE INDEX patterns_search_idx ON patterns USING GIN (search);
CREATE INDEX patterns_image_hash_idx ON patterns (image_sha256);

-- Pattern Shares
CREATE INDEX pattern_shares_pattern_idx ON pattern_shares (pattern_id);

-- Collections
CREATE INDEX collections_owner_idx ON collections (owner_id, created_at DESC);
CREATE INDEX collection_items_pattern_idx ON collection_items (pattern_id);

-- Social
CREATE INDEX favorites_pattern_idx ON favorites (pattern_id, created_at DESC);
CREATE INDEX follows_following_idx ON follows (following_id, created_at DESC);
CREATE INDEX comments_pattern_idx ON comments (pattern_id, created_at);
CREATE INDEX pattern_tags_tag_idx ON pattern_tags (tag_id);

-- Stats
CREATE INDEX pattern_stats_popular_idx ON pattern_stats (favorites_count DESC, views_count DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read any, update only their own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Patterns: Owner can do anything, public can read public patterns
CREATE POLICY patterns_owner ON patterns
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY patterns_public_read ON patterns
  FOR SELECT USING (
    visibility = 'public'
    OR auth.uid() = owner_id
    OR visibility = 'unlisted'  -- Unlisted readable if you have the URL
  );

-- Pattern Shares: Owner can manage
CREATE POLICY pattern_shares_owner ON pattern_shares
  FOR ALL USING (auth.uid() = created_by);

CREATE POLICY pattern_shares_read ON pattern_shares
  FOR SELECT USING (true);

-- Collections: Owner can do anything, public can read public collections
CREATE POLICY collections_owner ON collections
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY collections_public_read ON collections
  FOR SELECT USING (visibility = 'public' OR auth.uid() = owner_id);

-- Collection Items: Owner of collection can manage
CREATE POLICY collection_items_owner ON collection_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM collections WHERE id = collection_id AND owner_id = auth.uid())
  );

CREATE POLICY collection_items_read ON collection_items
  FOR SELECT USING (true);

-- Favorites: Users can manage their own
CREATE POLICY favorites_owner ON favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY favorites_read ON favorites
  FOR SELECT USING (true);

-- Follows: Users can manage their own follows
CREATE POLICY follows_owner ON follows
  FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY follows_read ON follows
  FOR SELECT USING (true);

-- Comments: Users can manage their own, read any non-deleted
CREATE POLICY comments_owner ON comments
  FOR ALL USING (auth.uid() = author_id);

CREATE POLICY comments_read ON comments
  FOR SELECT USING (deleted_at IS NULL);

-- Pattern Stats: Anyone can read, system manages writes
CREATE POLICY pattern_stats_read ON pattern_stats
  FOR SELECT USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'preferred_username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-create pattern_stats when pattern is created
CREATE OR REPLACE FUNCTION handle_new_pattern()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pattern_stats (pattern_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_pattern_created
  AFTER INSERT ON patterns
  FOR EACH ROW EXECUTE FUNCTION handle_new_pattern();

-- Update favorites count when favorite added/removed
CREATE OR REPLACE FUNCTION update_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pattern_stats SET favorites_count = favorites_count + 1, updated_at = NOW()
    WHERE pattern_id = NEW.pattern_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pattern_stats SET favorites_count = favorites_count - 1, updated_at = NOW()
    WHERE pattern_id = OLD.pattern_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_favorite_change
  AFTER INSERT OR DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_favorites_count();

-- Update comments count when comment added/removed
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pattern_stats SET comments_count = comments_count + 1, updated_at = NOW()
    WHERE pattern_id = NEW.pattern_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pattern_stats SET comments_count = comments_count - 1, updated_at = NOW()
    WHERE pattern_id = OLD.pattern_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comments_count();
