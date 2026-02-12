-- Add sort_order column to cohorts table
ALTER TABLE "public"."cohorts" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0;

-- Seed existing rows with a default order based on creation date
WITH numbered_cohorts AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY association_id ORDER BY created_at ASC) as rnk
  FROM cohorts
)
UPDATE cohorts
SET sort_order = numbered_cohorts.rnk
FROM numbered_cohorts
WHERE cohorts.id = numbered_cohorts.id;

-- Ensure RLS allows updating this column (usually covered by 'all' or specific update policies)
-- Assuming existing Update policy covers non-restricted columns. 
