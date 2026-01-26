-- Fix RLS policies for sessions and related tables to remove app.current_association_id dependency
-- Generated on 2026-01-03

-- =========================================================================
-- Waves (Re-applying to ensure consistency)
-- =========================================================================
DROP POLICY IF EXISTS waves_select_association ON public.waves;
DROP POLICY IF EXISTS waves_insert_admin ON public.waves;
DROP POLICY IF EXISTS waves_update_admin ON public.waves;
DROP POLICY IF EXISTS waves_delete_admin ON public.waves;

CREATE POLICY waves_select_association ON public.waves
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.waves.association_id
    AND au.user_id = auth.uid()
  )
);

CREATE POLICY waves_insert_admin ON public.waves
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.waves.association_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY waves_update_admin ON public.waves
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.waves.association_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY waves_delete_admin ON public.waves
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.waves.association_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

-- =========================================================================
-- Sessions
-- =========================================================================
DROP POLICY IF EXISTS sessions_insert_admin ON public.sessions;
DROP POLICY IF EXISTS sessions_update_admin ON public.sessions;
DROP POLICY IF EXISTS sessions_delete_admin ON public.sessions;
DROP POLICY IF EXISTS sessions_update_assigned_staff ON public.sessions;

CREATE POLICY sessions_insert_admin ON public.sessions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.sessions.association_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY sessions_update_admin ON public.sessions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.sessions.association_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY sessions_delete_admin ON public.sessions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.sessions.association_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY sessions_update_assigned_staff ON public.sessions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.sessions.association_id
    AND au.user_id = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.session_evaluators se
      WHERE se.session_id = public.sessions.id
      AND se.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.session_intake_personnel sip
      WHERE sip.session_id = public.sessions.id
      AND sip.user_id = auth.uid()
    )
  )
);

-- =========================================================================
-- Session Drills
-- =========================================================================
DROP POLICY IF EXISTS session_drills_manage_admin ON public.session_drills;
DROP POLICY IF EXISTS session_drills_update_admin ON public.session_drills;
DROP POLICY IF EXISTS session_drills_delete_admin ON public.session_drills;

CREATE POLICY session_drills_manage_admin ON public.session_drills
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.association_users au ON s.association_id = au.association_id
    WHERE s.id = public.session_drills.session_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY session_drills_update_admin ON public.session_drills
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.association_users au ON s.association_id = au.association_id
    WHERE s.id = public.session_drills.session_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY session_drills_delete_admin ON public.session_drills
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.association_users au ON s.association_id = au.association_id
    WHERE s.id = public.session_drills.session_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

-- =========================================================================
-- Session Evaluators
-- =========================================================================
DROP POLICY IF EXISTS session_evaluators_insert_admin ON public.session_evaluators;
DROP POLICY IF EXISTS session_evaluators_update_admin ON public.session_evaluators;
DROP POLICY IF EXISTS session_evaluators_delete_admin ON public.session_evaluators;

CREATE POLICY session_evaluators_insert_admin ON public.session_evaluators
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.association_users au ON s.association_id = au.association_id
    WHERE s.id = public.session_evaluators.session_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY session_evaluators_update_admin ON public.session_evaluators
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.association_users au ON s.association_id = au.association_id
    WHERE s.id = public.session_evaluators.session_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY session_evaluators_delete_admin ON public.session_evaluators
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.association_users au ON s.association_id = au.association_id
    WHERE s.id = public.session_evaluators.session_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

-- =========================================================================
-- Session Intake Personnel
-- =========================================================================
DROP POLICY IF EXISTS session_intake_manage_admin ON public.session_intake_personnel;
DROP POLICY IF EXISTS session_intake_delete_admin ON public.session_intake_personnel;

CREATE POLICY session_intake_manage_admin ON public.session_intake_personnel
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.association_users au ON s.association_id = au.association_id
    WHERE s.id = public.session_intake_personnel.session_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);

CREATE POLICY session_intake_delete_admin ON public.session_intake_personnel
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.association_users au ON s.association_id = au.association_id
    WHERE s.id = public.session_intake_personnel.session_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);
