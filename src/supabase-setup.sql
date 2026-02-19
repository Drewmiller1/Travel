-- ============================================================
-- THE ADVENTURE LEDGER — Multi-User Auth Migration
-- ============================================================
-- Run this in Supabase SQL Editor.
-- If you already have the old table, this will migrate it.
-- If starting fresh, this creates everything from scratch.
-- ============================================================

-- STEP 1: Enable Supabase Auth (already enabled by default)
-- Go to Authentication → Settings and make sure Email auth is ON.

-- STEP 2: Create or update the expeditions table
DO $$
BEGIN
  -- Create table if it doesn't exist
  CREATE TABLE IF NOT EXISTS expeditions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'dreams',
    continent   TEXT NOT NULL DEFAULT 'north_america',
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    image       TEXT DEFAULT '🗺️',
    budget      TEXT DEFAULT '',
    dates       TEXT DEFAULT '',
    tags        TEXT[] DEFAULT '{}',
    rating      INTEGER,
    sort_order  INTEGER DEFAULT 0,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    created_at  TIMESTAMPTZ DEFAULT now()
  );

  -- If table exists but doesn't have user_id, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expeditions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE expeditions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- If table exists but doesn't have latitude, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expeditions' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE expeditions ADD COLUMN latitude DOUBLE PRECISION;
  END IF;

  -- If table exists but doesn't have longitude, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expeditions' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE expeditions ADD COLUMN longitude DOUBLE PRECISION;
  END IF;
END $$;

-- STEP 3: Indexes
CREATE INDEX IF NOT EXISTS idx_expeditions_user ON expeditions (user_id);
CREATE INDEX IF NOT EXISTS idx_expeditions_sort ON expeditions (user_id, sort_order, created_at);

-- STEP 4: Row Level Security — each user can only see/edit their own data
ALTER TABLE expeditions ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policy if it exists
DROP POLICY IF EXISTS "Allow all access" ON expeditions;
DROP POLICY IF EXISTS "Users see own data" ON expeditions;
DROP POLICY IF EXISTS "Users insert own data" ON expeditions;
DROP POLICY IF EXISTS "Users update own data" ON expeditions;
DROP POLICY IF EXISTS "Users delete own data" ON expeditions;

CREATE POLICY "Users see own data" ON expeditions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own data" ON expeditions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own data" ON expeditions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own data" ON expeditions
  FOR DELETE USING (auth.uid() = user_id);

-- STEP 5: User settings table (for custom title / subtitle)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  board_title TEXT NOT NULL DEFAULT 'THE ADVENTURE LEDGER',
  board_subtitle TEXT NOT NULL DEFAULT 'Fortune & Glory Vacation Planner',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own settings" ON user_settings;
DROP POLICY IF EXISTS "Users insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users update own settings" ON user_settings;

CREATE POLICY "Users see own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- STEP 6: Function to seed sample data for new users
CREATE OR REPLACE FUNCTION seed_new_user_expeditions()
RETURNS TRIGGER AS $$
BEGIN
  -- Seed default settings
  INSERT INTO user_settings (user_id) VALUES (NEW.id);

  -- Seed sample expeditions
  INSERT INTO expeditions (user_id, status, continent, title, description, image, budget, dates, tags, rating, sort_order, latitude, longitude) VALUES
    (NEW.id, 'dreams',    'asia',          'Petra, Jordan',        'The Treasury awaits — rose-red city carved from stone',         '🛕', '$2,500', '',         '{"adventure","historical"}', NULL, 0, 30.3285, 35.4444),
    (NEW.id, 'dreams',    'south_america', 'Machu Picchu, Peru',   'Lost city in the clouds. High altitude trek required.',        '⛰️', '$3,200', '',         '{"trek","ruins"}',           NULL, 1, -13.1631, -72.5450),
    (NEW.id, 'planning',  'europe',        'Iceland Ring Road',    'Volcanic landscapes, glaciers, and northern lights',           '🌋', '$4,000', 'Jun 2026', '{"road trip","nature"}',     NULL, 2, 64.9631, -19.0208),
    (NEW.id, 'completed', 'europe',        'Rome, Italy',          'The Colosseum, Vatican, and endless pasta. Magnificent.',      '🍕', '$2,800', 'Sep 2025', '{"historical","food"}',      5,    3, 41.9028, 12.4964),
    (NEW.id, 'completed', 'asia',          'Kyoto, Japan',         'Temples, tea ceremonies, bamboo forests. Spiritual journey.',  '⛩️', '$3,500', 'Apr 2025', '{"culture","zen"}',          4,    4, 35.0116, 135.7681),
    (NEW.id, 'dreams',    'africa',        'Serengeti, Tanzania',  'The great migration. Lions, elephants, endless plains.',       '🌍', '$5,000', '',         '{"wildlife","adventure"}',   NULL, 5, -2.3333, 34.8333),
    (NEW.id, 'dreams',    'oceania',       'Great Barrier Reef',   'Dive into the world''s largest coral reef system.',            '🤿', '$3,800', '',         '{"beach","nature"}',         NULL, 6, -18.2871, 147.6992),
    (NEW.id, 'planning',  'north_america', 'Grand Canyon, USA',    'Rim-to-rim trek through ancient geological layers.',          '🏜️', '$1,500', 'Oct 2026', '{"trek","nature"}',          NULL, 7, 36.1069, -112.1129);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 7: Trigger — auto-seed when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION seed_new_user_expeditions();
