-- Function to transfer a player between sessions in a wave securely
CREATE OR REPLACE FUNCTION transfer_player_wave_session(
  p_player_id UUID,
  p_current_session_id UUID,
  p_target_session_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_association_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- 1. Get Association ID from current session
  SELECT association_id INTO v_association_id
  FROM sessions
  WHERE id = p_current_session_id;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Current session not found.';
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
        RAISE EXCEPTION 'Insufficient permissions to transfer player.';
     END IF;
  END IF;

  -- 3. Perform Update
  UPDATE player_sessions
  SET session_id = p_target_session_id,
      team_number = NULL,
      jersey_number = NULL,
      jersey_color = NULL
  WHERE session_id = p_current_session_id
  AND player_id = p_player_id;

END;
$$;
