-- Helper function to set per-session association context for RLS
-- Generated on 2025-11-11

CREATE OR REPLACE FUNCTION public.set_association_context(association uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF association IS NULL THEN
    -- Do not set context if association is null; rely on existing policies to block access
    RETURN;
  END IF;

  PERFORM set_config('app.current_association_id', association::text, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_association_context(uuid) TO authenticated;
