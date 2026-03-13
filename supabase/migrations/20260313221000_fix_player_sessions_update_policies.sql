-- Fix intermittent player_sessions update no-ops by removing reliance on
-- current_setting('app.current_association_id') in UPDATE policies.
--
-- Background:
-- SELECT policy was updated to association-based membership checks, but UPDATE
-- policies still relied on app.current_association_id. If that setting is not
-- present for a request, UPDATE can silently affect zero rows (RLS no-op).

DROP POLICY IF EXISTS player_sessions_update_admin ON public.player_sessions;
CREATE POLICY player_sessions_update_admin
  ON public.player_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.player_sessions.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
        AND au.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.player_sessions.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
        AND au.status = 'active'
    )
  );

DROP POLICY IF EXISTS player_sessions_update_intake ON public.player_sessions;
CREATE POLICY player_sessions_update_intake
  ON public.player_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_intake_personnel sip
      WHERE sip.session_id = public.player_sessions.session_id
        AND sip.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.player_sessions.association_id
        AND au.user_id = auth.uid()
        AND au.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_intake_personnel sip
      WHERE sip.session_id = public.player_sessions.session_id
        AND sip.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.player_sessions.association_id
        AND au.user_id = auth.uid()
        AND au.status = 'active'
    )
  );
