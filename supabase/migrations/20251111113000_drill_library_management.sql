-- Drill library management enhancements and session drill validations
-- Generated on 2025-11-11

-- Add detailed criteria column for drills
ALTER TABLE public.drills
  ADD COLUMN criteria TEXT;

UPDATE public.drills
SET criteria = COALESCE(description, '')
WHERE criteria IS NULL;

ALTER TABLE public.drills
  ALTER COLUMN criteria SET NOT NULL;

ALTER TABLE public.drills
  ADD CONSTRAINT drills_criteria_not_blank
  CHECK (char_length(btrim(criteria)) > 0);

ALTER TABLE public.drills
  ADD CONSTRAINT drills_name_not_blank
  CHECK (char_length(btrim(name)) > 0);

ALTER TABLE public.drills
  ALTER COLUMN description SET DATA TYPE TEXT;

-- Ensure updated_at tracks changes
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drills_touch_updated_at ON public.drills;
CREATE TRIGGER drills_touch_updated_at
  BEFORE UPDATE ON public.drills
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Function to create drills bound to current association
CREATE OR REPLACE FUNCTION public.create_drill(
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
  v_association_id UUID := current_setting('app.current_association_id', true)::uuid;
  v_drill public.drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Association context is not set';
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
    WHERE association_id = v_association_id
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
    v_association_id,
    btrim(p_name),
    btrim(p_description),
    btrim(p_criteria),
    'active'
  )
  RETURNING * INTO v_drill;

  RETURN v_drill;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_drill(TEXT, TEXT, TEXT) TO authenticated;

-- Function to update drill content
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
  v_association_id UUID := current_setting('app.current_association_id', true)::uuid;
  v_existing public.drills;
  v_updated public.drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Association context is not set';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.drills
  WHERE id = p_drill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drill not found';
  END IF;

  IF v_existing.association_id <> v_association_id THEN
    RAISE EXCEPTION 'Access denied for this drill';
  END IF;

  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
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

GRANT EXECUTE ON FUNCTION public.update_drill(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Function to toggle drill status with safety checks
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
  v_association_id UUID := current_setting('app.current_association_id', true)::uuid;
  v_existing public.drills;
  v_updated public.drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Association context is not set';
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

  IF v_existing.association_id <> v_association_id THEN
    RAISE EXCEPTION 'Access denied for this drill';
  END IF;

  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
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

GRANT EXECUTE ON FUNCTION public.set_drill_status(UUID, TEXT) TO authenticated;

-- Session drill constraint enforcement
CREATE OR REPLACE FUNCTION public.session_drill_enforce()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session public.sessions;
  v_position_id UUID;
  v_position_name TEXT;
  v_existing_count INTEGER;
  v_existing_weight INTEGER;
  v_new_total INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.session_id <> OLD.session_id THEN
      RAISE EXCEPTION 'Cannot move drill assignments between sessions';
    END IF;
    IF NEW.drill_id <> OLD.drill_id THEN
      RAISE EXCEPTION 'Cannot change drill reference. Remove and add a new drill instead.';
    END IF;
  END IF;

  SELECT *
  INTO v_session
  FROM public.sessions
  WHERE id = NEW.session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found', NEW.session_id;
  END IF;

  IF v_session.drill_config_locked THEN
    RAISE EXCEPTION 'Drill configuration is locked for this session';
  END IF;

  NEW.association_id := v_session.association_id;

  IF NEW.weight_percent < 1 OR NEW.weight_percent > 100 THEN
    RAISE EXCEPTION 'Weight percent must be between 1 and 100';
  END IF;

  IF NEW.applies_to_positions IS NULL OR array_length(NEW.applies_to_positions, 1) = 0 THEN
    RAISE EXCEPTION 'At least one position must be selected for a session drill';
  END IF;

  NEW.applies_to_positions := (
    SELECT ARRAY(
      SELECT DISTINCT pos
      FROM UNNEST(NEW.applies_to_positions) AS pos
      ORDER BY pos
    )
  );

  FOR v_position_id IN
    SELECT DISTINCT UNNEST(NEW.applies_to_positions)
  LOOP
    SELECT name
    INTO v_position_name
    FROM public.position_types
    WHERE id = v_position_id
      AND association_id = v_session.association_id
      AND status = 'active';

    IF v_position_name IS NULL THEN
      RAISE EXCEPTION 'Invalid or inactive position selected for this session';
    END IF;

    IF TG_OP = 'UPDATE' THEN
      SELECT COUNT(*)
      INTO v_existing_count
      FROM public.session_drills sd
      WHERE sd.session_id = NEW.session_id
        AND sd.id <> NEW.id
        AND v_position_id = ANY(sd.applies_to_positions);

      SELECT COALESCE(SUM(sd.weight_percent), 0)
      INTO v_existing_weight
      FROM public.session_drills sd
      WHERE sd.session_id = NEW.session_id
        AND sd.id <> NEW.id
        AND v_position_id = ANY(sd.applies_to_positions);
    ELSE
      SELECT COUNT(*)
      INTO v_existing_count
      FROM public.session_drills sd
      WHERE sd.session_id = NEW.session_id
        AND v_position_id = ANY(sd.applies_to_positions);

      SELECT COALESCE(SUM(sd.weight_percent), 0)
      INTO v_existing_weight
      FROM public.session_drills sd
      WHERE sd.session_id = NEW.session_id
        AND v_position_id = ANY(sd.applies_to_positions);
    END IF;

    IF v_existing_count >= 4 THEN
      RAISE EXCEPTION 'Position "%" already has maximum 4 drills', v_position_name;
    END IF;

    v_new_total := v_existing_weight + NEW.weight_percent;
    IF v_new_total > 100 THEN
      RAISE EXCEPTION 'Cannot add drill: position "%" would exceed 100%% (current: %, adding: %, total: %)',
        v_position_name,
        v_existing_weight,
        NEW.weight_percent,
        v_new_total;
    END IF;
  END LOOP;

  IF TG_OP = 'INSERT' THEN
    PERFORM 1
    FROM public.drills
    WHERE id = NEW.drill_id
      AND association_id = v_session.association_id
      AND status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Drill must be active to assign to a session';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_drills_enforce ON public.session_drills;
CREATE TRIGGER session_drills_enforce
  BEFORE INSERT OR UPDATE ON public.session_drills
  FOR EACH ROW
  EXECUTE FUNCTION public.session_drill_enforce();

-- Prevent deletion when configuration locked
CREATE OR REPLACE FUNCTION public.session_drill_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session public.sessions;
BEGIN
  SELECT *
  INTO v_session
  FROM public.sessions
  WHERE id = OLD.session_id;

  IF v_session.drill_config_locked THEN
    RAISE EXCEPTION 'Drill configuration is locked for this session';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS session_drills_prevent_delete ON public.session_drills;
CREATE TRIGGER session_drills_prevent_delete
  BEFORE DELETE ON public.session_drills
  FOR EACH ROW
  EXECUTE FUNCTION public.session_drill_prevent_delete();

-- Touch session updated_at when drills change
CREATE OR REPLACE FUNCTION public.session_drills_touch_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.sessions
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS session_drills_touch_session ON public.session_drills;
CREATE TRIGGER session_drills_touch_session
  AFTER INSERT OR UPDATE OR DELETE ON public.session_drills
  FOR EACH ROW
  EXECUTE FUNCTION public.session_drills_touch_session();

-- RPC helpers for managing session drills
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
  v_association_id UUID := current_setting('app.current_association_id', true)::uuid;
  v_session public.sessions;
  v_new_record public.session_drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Association context is not set';
  END IF;

  SELECT *
  INTO v_session
  FROM public.sessions
  WHERE id = p_session_id
    AND association_id = v_association_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found for current association';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.add_session_drill(UUID, UUID, INTEGER, UUID[]) TO authenticated;

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
  v_association_id UUID := current_setting('app.current_association_id', true)::uuid;
  v_existing public.session_drills;
  v_updated public.session_drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Association context is not set';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.session_drills
  WHERE id = p_session_drill_id
    AND association_id = v_association_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session drill not found for current association';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.update_session_drill(UUID, INTEGER, UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_session_drill(
  p_session_drill_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID := current_setting('app.current_association_id', true)::uuid;
  v_existing public.session_drills;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Association context is not set';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.session_drills
  WHERE id = p_session_drill_id
    AND association_id = v_association_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session drill not found for current association';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.remove_session_drill(UUID) TO authenticated;
