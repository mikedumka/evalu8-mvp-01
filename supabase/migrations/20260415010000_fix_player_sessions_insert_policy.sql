-- Fix player_sessions INSERT policy to not rely on current_setting('app.current_association_id')
-- which may not be set for all requests. Use association_users membership instead.

DROP POLICY IF EXISTS player_sessions_insert_admin ON public.player_sessions;
CREATE POLICY player_sessions_insert_admin
  ON public.player_sessions
  FOR INSERT
  TO authenticated
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
