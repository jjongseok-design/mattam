-- Add slug column to restaurants for readable URLs
-- Keeps existing ID intact (no breaking changes)

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS slug text;

-- Generate initial slugs from existing IDs + name
-- Format: {category_prefix}-{name_romanized} — simplified: just use the existing id as slug initially
-- Then update to human-readable slugs via the app
UPDATE restaurants SET slug = id WHERE slug IS NULL;

-- Unique constraint
ALTER TABLE restaurants ADD CONSTRAINT restaurants_slug_key UNIQUE (slug);

-- Index for fast slug lookups (used in /restaurant/:slug route)
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);

COMMENT ON COLUMN restaurants.slug IS 'URL-friendly identifier (e.g. "dakgalbi-matzip-01"). Defaults to id. Use for /restaurant/:slug routes.';
