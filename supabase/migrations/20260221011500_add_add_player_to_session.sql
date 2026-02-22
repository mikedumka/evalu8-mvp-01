-- Function to add a player to a session securely
CREATE OR REPLACE FUNCTION add_player_to_session(
  p_session_id UUID,
  p_player_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_association_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- 1. Get Association ID from session
  SELECT association_id INTO v_association_id
  FROM sessions
  WHERE id = p_session_id;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Session not found.';
  END IF;

  -- 2. Verify permission (must be admin or have access to association)
  PERFORM 1
  FROM association_users
  WHERE association_id = v_association_id
  AND user_id = v_user_id
  AND (
    'Administrator' = ANY(roles) OR 
    'Evaluator' = ANY(roles) OR
    'Intake' = ANY(roles)
  );
  
  IF NOT FOUND THEN
     IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND 'System Administrator' = ANY(system_roles)
     ) THEN
        RAISE EXCEPTION 'Insufficient permissions to add player to session.';
     END IF;
  END IF;

  -- 3. Perform Insert
  INSERT INTO player_sessions (session_id, player_id, association_id)
  VALUES (p_session_id, p_player_id, v_association_id)
  ON CONFLICT (session_id, player_id) DO NOTHING; -- Or update? Usually shouldn't conflict if UI checks.

END;
$$;
