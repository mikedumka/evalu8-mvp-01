-- Add session configuration columns to cohorts table
ALTER TABLE public.cohorts 
ADD COLUMN session_capacity INTEGER DEFAULT 20 NOT NULL,
ADD COLUMN minimum_sessions_per_athlete INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN sessions_per_cohort INTEGER DEFAULT 1 NOT NULL;

-- Remove session configuration columns from seasons table
ALTER TABLE public.seasons 
DROP COLUMN IF EXISTS session_capacity,
DROP COLUMN IF EXISTS minimum_sessions_per_athlete;
