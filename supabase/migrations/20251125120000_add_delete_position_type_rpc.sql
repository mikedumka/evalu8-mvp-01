-- Function to delete a position type if it has no usage
CREATE OR REPLACE FUNCTION public.delete_position_type(
  p_position_type_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID := current_setting('app.current_association_id', true)::uuid;
  v_position_type public.position_types;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_association_id IS NULL THEN
    RAISE EXCEPTION 'Association context is not set';
  END IF;

  SELECT *
  INTO v_position_type
  FROM public.position_types
  WHERE id = p_position_type_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Position type not found';
  END IF;

  IF v_position_type.association_id <> v_association_id THEN
    RAISE EXCEPTION 'Access denied for this position type';
  END IF;

  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to delete position types';
  END IF;

  -- Check for usage in players
  PERFORM 1
  FROM public.players
  WHERE position_type_id = p_position_type_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Cannot delete position type with assigned players. You can deactivate it instead.';
  END IF;

  DELETE FROM public.position_types
  WHERE id = p_position_type_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_position_type(UUID) TO authenticated;
