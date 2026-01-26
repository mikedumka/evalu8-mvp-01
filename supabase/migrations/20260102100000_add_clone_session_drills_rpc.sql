CREATE OR REPLACE FUNCTION clone_session_drills(p_source_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wave_id UUID;
  v_association_id UUID;
  v_target_count INTEGER;
BEGIN
  -- Get wave_id and association_id from source session
  SELECT wave_id, association_id INTO v_wave_id, v_association_id
  FROM sessions
  WHERE id = p_source_session_id;

  IF v_wave_id IS NULL THEN
    RAISE EXCEPTION 'Source session is not assigned to a wave.';
  END IF;

  -- Count target sessions
  SELECT COUNT(*) INTO v_target_count
  FROM sessions
  WHERE wave_id = v_wave_id
  AND id != p_source_session_id;

  IF v_target_count = 0 THEN
    RETURN 0;
  END IF;

  -- Delete existing drills from target sessions in the same wave
  DELETE FROM session_drills
  WHERE session_id IN (
    SELECT id FROM sessions
    WHERE wave_id = v_wave_id
    AND id != p_source_session_id
  );

  -- Insert drills into target sessions
  INSERT INTO session_drills (association_id, session_id, drill_id, weight_percent, applies_to_positions)
  SELECT
    v_association_id,
    t.id, -- target session id
    s.drill_id,
    s.weight_percent,
    s.applies_to_positions
  FROM session_drills s
  CROSS JOIN (
    SELECT id FROM sessions
    WHERE wave_id = v_wave_id
    AND id != p_source_session_id
  ) t
  WHERE s.session_id = p_source_session_id;

  RETURN v_target_count;
END;
$$;
