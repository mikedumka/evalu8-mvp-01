-- Fix RLS policies for previous_levels to allow insert/update/delete based on role check only
-- avoiding reliance on app.current_association_id setting which is flaky over HTTP

DROP POLICY IF EXISTS previous_levels_insert_admin ON public.previous_levels;
DROP POLICY IF EXISTS previous_levels_update_admin ON public.previous_levels;
DROP POLICY IF EXISTS previous_levels_delete_admin ON public.previous_levels;

CREATE POLICY previous_levels_insert_admin
  ON public.previous_levels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY previous_levels_update_admin
  ON public.previous_levels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY previous_levels_delete_admin
  ON public.previous_levels
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );
