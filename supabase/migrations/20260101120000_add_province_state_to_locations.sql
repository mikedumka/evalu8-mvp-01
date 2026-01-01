
-- Add province_state column to locations table
-- Generated on 2026-01-01

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS province_state TEXT NOT NULL DEFAULT '';

-- Remove default after adding column (optional, but good practice if we want to enforce it later without default)
ALTER TABLE public.locations
ALTER COLUMN province_state DROP DEFAULT;
