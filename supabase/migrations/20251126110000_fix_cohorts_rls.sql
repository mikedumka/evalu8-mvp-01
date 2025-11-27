-- Fix RLS policies for cohorts to remove dependency on app.current_association_id for SELECT
-- This ensures data can be fetched even if the session variable is not set (which happens in stateless HTTP requests)

DROP POLICY IF EXISTS cohorts_select_association ON public.cohorts;

CREATE POLICY cohorts_select_association
  ON public.cohorts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
    )
  );
