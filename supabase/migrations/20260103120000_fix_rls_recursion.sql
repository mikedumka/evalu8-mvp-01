-- Fix RLS recursion and missing SELECT policies
-- Generated on 2026-01-03

-- 1. Session Drills SELECT
DROP POLICY IF EXISTS session_drills_select_association ON public.session_drills;
CREATE POLICY session_drills_select_association ON public.session_drills
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.session_drills.association_id
    AND au.user_id = auth.uid()
  )
);

-- 2. Session Evaluators SELECT
DROP POLICY IF EXISTS session_evaluators_select_association ON public.session_evaluators;
CREATE POLICY session_evaluators_select_association ON public.session_evaluators
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.session_evaluators.association_id
    AND au.user_id = auth.uid()
  )
);

-- 3. Session Intake Personnel SELECT
DROP POLICY IF EXISTS session_intake_select_association ON public.session_intake_personnel;
CREATE POLICY session_intake_select_association ON public.session_intake_personnel
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.session_intake_personnel.association_id
    AND au.user_id = auth.uid()
  )
);

-- 4. Player Sessions SELECT
DROP POLICY IF EXISTS player_sessions_select_association ON public.player_sessions;
CREATE POLICY player_sessions_select_association ON public.player_sessions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.player_sessions.association_id
    AND au.user_id = auth.uid()
  )
);

-- 5. Evaluations SELECT
DROP POLICY IF EXISTS evaluations_select_association ON public.evaluations;
CREATE POLICY evaluations_select_association ON public.evaluations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.evaluations.association_id
    AND au.user_id = auth.uid()
  )
);

-- 6. Reconciliation Decisions SELECT
DROP POLICY IF EXISTS reconciliation_select_association ON public.reconciliation_decisions;
CREATE POLICY reconciliation_select_association ON public.reconciliation_decisions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.association_users au
    WHERE au.association_id = public.reconciliation_decisions.association_id
    AND au.user_id = auth.uid()
  )
);
