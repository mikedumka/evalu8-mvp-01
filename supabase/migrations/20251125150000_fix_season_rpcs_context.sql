-- Fix RPCs to derive association from the target season instead of session context
-- This prevents "Association context is not set" errors if the client context is missing

-- Update activate_season
CREATE OR REPLACE FUNCTION public.activate_season(
  p_season_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID;
  v_season public.seasons;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get target season first to determine association
  SELECT *
  INTO v_season
  FROM public.seasons
  WHERE id = p_season_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  v_association_id := v_season.association_id;

  -- Check permissions for this association
  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to activate seasons';
  END IF;

  IF v_season.status = 'active' THEN
    RETURN; -- Already active
  END IF;

  IF v_season.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot reactivate a completed season';
  END IF;

  -- Deactivate currently active season(s) for this association
  UPDATE public.seasons
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE association_id = v_association_id
    AND status = 'active';

  -- Activate target season
  UPDATE public.seasons
  SET 
    status = 'active',
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_season_id;

END;
$$;

-- Update delete_season
CREATE OR REPLACE FUNCTION public.delete_season(
  p_season_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID;
  v_season public.seasons;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get target season first to determine association
  SELECT *
  INTO v_season
  FROM public.seasons
  WHERE id = p_season_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  v_association_id := v_season.association_id;

  -- Check permissions for this association
  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to delete seasons';
  END IF;

  -- Check for dependencies
  -- 1. Players
  PERFORM 1 FROM public.players WHERE season_id = p_season_id;
  IF FOUND THEN
    RAISE EXCEPTION 'Cannot delete season with registered players';
  END IF;

  -- 2. Sessions
  PERFORM 1 FROM public.sessions WHERE season_id = p_season_id;
  IF FOUND THEN
    RAISE EXCEPTION 'Cannot delete season with scheduled sessions';
  END IF;

  -- 3. Waves
  PERFORM 1 FROM public.waves WHERE season_id = p_season_id;
  IF FOUND THEN
    RAISE EXCEPTION 'Cannot delete season with configured waves';
  END IF;

  -- Delete season
  DELETE FROM public.seasons WHERE id = p_season_id;

END;
$$;
