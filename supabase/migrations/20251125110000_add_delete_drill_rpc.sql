-- Function to delete a drill if it has no usage
CREATE OR REPLACE FUNCTION public.delete_drill(
  p_drill_id UUID
) RETURNS void
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

  SELECT *
  INTO v_drill
  FROM public.drills
  WHERE id = p_drill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drill not found';
  END IF;

  IF v_drill.association_id <> v_association_id THEN
    RAISE EXCEPTION 'Access denied for this drill';
  END IF;

  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to delete drills';
  END IF;

  -- Check for usage in sessions
  PERFORM 1
  FROM public.session_drills
  WHERE drill_id = p_drill_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Cannot delete drill with historical evaluation data. You can deactivate it instead.';
  END IF;

  -- Check for usage in evaluations (redundant but safe)
  PERFORM 1
  FROM public.evaluations
  WHERE drill_id = p_drill_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Cannot delete drill with historical evaluation data. You can deactivate it instead.';
  END IF;

  DELETE FROM public.drills
  WHERE id = p_drill_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_drill(UUID) TO authenticated;
