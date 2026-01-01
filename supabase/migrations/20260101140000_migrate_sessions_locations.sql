
-- Migration to link sessions to locations
-- Generated on 2026-01-01

-- 1. Add location_id column
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- 2. Update existing records
-- Map "Keith Bodley Arena..." to the specific location ID
UPDATE public.sessions
SET location_id = (SELECT id FROM public.locations WHERE name = 'Keith Bodley Arena' LIMIT 1)
WHERE location LIKE 'Keith Bodley Arena%';

-- Map "Kinsman Allard Arena..." to the specific location ID
-- Note: The location name in DB is 'Kinsman-Allard Arena' (with hyphen)
-- The session text is 'Kinsman Allard Arena' (space)
UPDATE public.sessions
SET location_id = (SELECT id FROM public.locations WHERE name = 'Kinsman-Allard Arena' LIMIT 1)
WHERE location LIKE 'Kinsman Allard Arena%';

-- 3. Handle any remaining records (optional - set to a default or leave null)
-- For now, we leave them null if no match found, but we expect all to match based on the analysis.

-- 4. Drop the old location column
-- WARNING: This is destructive. Ensure data is migrated first.
ALTER TABLE public.sessions
DROP COLUMN location;
