-- Fix RLS policies to not rely on app.current_association_id for SELECT operations
-- Generated on 2025-12-18

-- 1. Position Types
DROP POLICY IF EXISTS position_types_select_association ON public.position_types;
CREATE POLICY position_types_select_association
  ON public.position_types
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.position_types.association_id
        AND au.user_id = auth.uid()
        AND au.status = 'active'
    )
  );

-- 2. Drills
DROP POLICY IF EXISTS drills_select_association ON public.drills;
CREATE POLICY drills_select_association
  ON public.drills
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.drills.association_id
        AND au.user_id = auth.uid()
        AND au.status = 'active'
    )
  );

-- 3. Sessions
DROP POLICY IF EXISTS sessions_select_association ON public.sessions;
CREATE POLICY sessions_select_association
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.sessions.association_id
        AND au.user_id = auth.uid()
        AND au.status = 'active'
    )
  );

-- 4. Session Drills
DROP POLICY IF EXISTS session_drills_select_association ON public.session_drills;
CREATE POLICY session_drills_select_association
  ON public.session_drills
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.association_users au ON s.association_id = au.association_id
      WHERE s.id = public.session_drills.session_id
        AND au.user_id = auth.uid()
        AND au.status = 'active'
    )
  );
