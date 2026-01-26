-- Fix RLS policies for waves table
-- Generated on 2026-01-03

-- Drop existing policies
DROP POLICY IF EXISTS waves_select_association ON public.waves;
DROP POLICY IF EXISTS waves_insert_admin ON public.waves;
DROP POLICY IF EXISTS waves_update_admin ON public.waves;
DROP POLICY IF EXISTS waves_delete_admin ON public.waves;

-- Create new policies without app.current_association_id dependency
CREATE POLICY waves_select_association
  ON public.waves
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY waves_insert_admin
  ON public.waves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY waves_update_admin
  ON public.waves
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY waves_delete_admin
  ON public.waves
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );
