-- Fix RLS policies for seasons to remove dependency on app.current_association_id
-- This fixes the "new row violates row-level security policy" error during insert
-- because the session variable is not persisted across requests in the JS client.

-- Drop existing policies
DROP POLICY IF EXISTS seasons_select_association ON public.seasons;
DROP POLICY IF EXISTS seasons_insert_admin ON public.seasons;
DROP POLICY IF EXISTS seasons_update_admin ON public.seasons;
DROP POLICY IF EXISTS seasons_delete_admin ON public.seasons;

-- Re-create policies using direct association_users check

CREATE POLICY seasons_select_association
  ON public.seasons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY seasons_insert_admin
  ON public.seasons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY seasons_update_admin
  ON public.seasons
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY seasons_delete_admin
  ON public.seasons
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );
