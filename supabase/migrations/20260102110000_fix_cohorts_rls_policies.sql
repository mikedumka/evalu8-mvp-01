-- Fix RLS policies for cohorts to remove dependency on app.current_association_id
-- This aligns cohorts with the fixes previously applied to seasons and locations.

DROP POLICY IF EXISTS cohorts_insert_admin ON public.cohorts;
DROP POLICY IF EXISTS cohorts_update_admin ON public.cohorts;
DROP POLICY IF EXISTS cohorts_delete_admin ON public.cohorts;

CREATE POLICY cohorts_insert_admin
  ON public.cohorts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY cohorts_update_admin
  ON public.cohorts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY cohorts_delete_admin
  ON public.cohorts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );
