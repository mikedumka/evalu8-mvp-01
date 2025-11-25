-- Fix drill management RPCs to accept association_id explicitly
-- instead of relying on unreliable session context

CREATE OR REPLACE FUNCTION public.create_drill(
  p_association_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_criteria TEXT
) RETURNS public.drills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_drill public.drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_association_id IS NULL THEN
    RAISE EXCEPTION 'Association ID is required';
  END IF;

  IF p_name IS NULL OR char_length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Drill name is required';
  END IF;

  IF p_description IS NULL OR char_length(btrim(p_description)) = 0 THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF p_criteria IS NULL OR char_length(btrim(p_criteria)) = 0 THEN
    RAISE EXCEPTION 'Evaluation criteria is required';
  END IF;

  PERFORM 1
    FROM public.association_users
    WHERE association_id = p_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to create drills';
  END IF;

  INSERT INTO public.drills (
    association_id,
    name,
    description,
    criteria,
    status
  )
  VALUES (
    p_association_id,
    btrim(p_name),
    btrim(p_description),
    btrim(p_criteria),
    'active'
  )
  RETURNING * INTO v_drill;

  RETURN v_drill;
END;
$$;

-- Update drill doesn't need association_id passed because it looks it up from the drill_id
-- BUT it checks permissions against current_setting.
-- We should change it to check permissions against the drill's association_id.

CREATE OR REPLACE FUNCTION public.update_drill(
  p_drill_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_criteria TEXT
) RETURNS public.drills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing public.drills;
  v_updated public.drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.drills
  WHERE id = p_drill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drill not found';
  END IF;

  -- Check if user is admin of the drill's association
  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_existing.association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to update drills';
  END IF;

  IF p_name IS NULL OR char_length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Drill name is required';
  END IF;

  IF p_description IS NULL OR char_length(btrim(p_description)) = 0 THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF p_criteria IS NULL OR char_length(btrim(p_criteria)) = 0 THEN
    RAISE EXCEPTION 'Evaluation criteria is required';
  END IF;

  UPDATE public.drills
  SET
    name = btrim(p_name),
    description = btrim(p_description),
    criteria = btrim(p_criteria),
    updated_at = NOW()
  WHERE id = p_drill_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

-- Same for set_drill_status, it can derive association from the drill
CREATE OR REPLACE FUNCTION public.set_drill_status(
  p_drill_id UUID,
  p_status TEXT
) RETURNS public.drills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing public.drills;
  v_updated public.drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status %', p_status;
  END IF;

  SELECT *
  INTO v_existing
  FROM public.drills
  WHERE id = p_drill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drill not found';
  END IF;

  -- Check permissions against drill's association
  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_existing.association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to manage drill status';
  END IF;

  IF p_status = 'inactive' THEN
    PERFORM 1
    FROM public.session_drills sd
    JOIN public.sessions s ON s.id = sd.session_id
    WHERE sd.drill_id = p_drill_id
      AND s.status IN ('draft', 'ready', 'in_progress');

    IF FOUND THEN
      RAISE EXCEPTION 'Cannot deactivate drill while it is used in active sessions';
    END IF;
  END IF;

  UPDATE public.drills
  SET status = p_status,
      updated_at = NOW()
  WHERE id = p_drill_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;
