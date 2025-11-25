-- Function to manually complete a season
CREATE OR REPLACE FUNCTION public.complete_season(
  p_season_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID := current_setting('app.current_association_id', true)::uuid;
  v_season public.seasons;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permissions (direct check to avoid session dependency issues)
  PERFORM 1
    FROM public.association_users au
    JOIN public.seasons s ON s.association_id = au.association_id
    WHERE s.id = p_season_id
      AND au.user_id = v_user_id
      AND au.status = 'active'
      AND 'Administrator' = ANY(au.roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to complete seasons';
  END IF;

  -- Get target season
  SELECT *
  INTO v_season
  FROM public.seasons
  WHERE id = p_season_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  IF v_season.status <> 'active' THEN
    RAISE EXCEPTION 'Only active seasons can be marked as completed';
  END IF;

  -- Complete season
  UPDATE public.seasons
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_season_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_season(UUID) TO authenticated;
