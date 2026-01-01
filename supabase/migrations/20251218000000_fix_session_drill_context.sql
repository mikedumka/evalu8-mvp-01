-- Fix session drill functions to not rely on app.current_association_id setting
-- Generated on 2025-12-18

CREATE OR REPLACE FUNCTION public.add_session_drill(
  p_session_id UUID,
  p_drill_id UUID,
  p_weight_percent INTEGER,
  p_position_ids UUID[]
) RETURNS public.session_drills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID;
  v_session public.sessions;
  v_new_record public.session_drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get session and association_id directly from the session
  SELECT *
  INTO v_session
  FROM public.sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  v_association_id := v_session.association_id;

  -- Verify user has access to this association as Administrator
  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to configure session drills';
  END IF;

  INSERT INTO public.session_drills (
    association_id,
    session_id,
    drill_id,
    weight_percent,
    applies_to_positions
  )
  VALUES (
    v_association_id,
    p_session_id,
    p_drill_id,
    p_weight_percent,
    p_position_ids
  )
  RETURNING * INTO v_new_record;

  RETURN v_new_record;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This drill has already been assigned to the session';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_session_drill(
  p_session_drill_id UUID,
  p_weight_percent INTEGER,
  p_position_ids UUID[]
) RETURNS public.session_drills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID;
  v_existing public.session_drills;
  v_updated public.session_drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get existing record to find association_id
  SELECT *
  INTO v_existing
  FROM public.session_drills
  WHERE id = p_session_drill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session drill not found';
  END IF;

  v_association_id := v_existing.association_id;

  -- Verify user has access to this association as Administrator
  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to update session drills';
  END IF;

  UPDATE public.session_drills
  SET
    weight_percent = p_weight_percent,
    applies_to_positions = p_position_ids
  WHERE id = p_session_drill_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_session_drill(
  p_session_drill_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID;
  v_existing public.session_drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get existing record to find association_id
  SELECT *
  INTO v_existing
  FROM public.session_drills
  WHERE id = p_session_drill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session drill not found';
  END IF;

  v_association_id := v_existing.association_id;

  -- Verify user has access to this association as Administrator
  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to remove session drills';
  END IF;

  DELETE FROM public.session_drills
  WHERE id = p_session_drill_id;

  RETURN p_session_drill_id;
END;
$$;
