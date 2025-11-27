CREATE OR REPLACE FUNCTION public.delete_cohort(
  p_cohort_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort_name TEXT;
BEGIN
  -- Check if cohort exists
  SELECT name INTO v_cohort_name FROM public.cohorts WHERE id = p_cohort_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cohort not found';
  END IF;

  -- Check for players
  IF EXISTS (SELECT 1 FROM public.players WHERE cohort_id = p_cohort_id) THEN
    RAISE EXCEPTION 'Cannot delete cohort "%" because it has registered players. Please reassign or remove players first.', v_cohort_name;
  END IF;

  -- Check for sessions
  IF EXISTS (SELECT 1 FROM public.sessions WHERE cohort_id = p_cohort_id) THEN
    RAISE EXCEPTION 'Cannot delete cohort "%" because it has scheduled sessions.', v_cohort_name;
  END IF;

  -- Proceed with deletion
  DELETE FROM public.cohorts WHERE id = p_cohort_id;
END;
$$;
