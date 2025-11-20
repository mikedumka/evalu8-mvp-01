DROP FUNCTION IF EXISTS public.swap_previous_level_ranks(UUID, UUID);

CREATE OR REPLACE FUNCTION public.swap_previous_level_ranks(level_id_1 UUID, level_id_2 UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rank_1 INTEGER;
    rank_2 INTEGER;
BEGIN
    -- Get the ranks
    SELECT rank_order INTO rank_1 FROM public.previous_levels WHERE id = level_id_1;
    SELECT rank_order INTO rank_2 FROM public.previous_levels WHERE id = level_id_2;

    -- Check if both exist
    IF rank_1 IS NULL OR rank_2 IS NULL THEN
        RAISE EXCEPTION 'One or both levels not found';
    END IF;

    -- Update first to -1 to avoid unique constraint violation
    -- We use a negative value that is unlikely to collide. 
    -- Since this is within a transaction, it should be fine.
    UPDATE public.previous_levels SET rank_order = -1 WHERE id = level_id_1;

    -- Update second to first's rank
    UPDATE public.previous_levels SET rank_order = rank_1 WHERE id = level_id_2;

    -- Update first to second's rank
    UPDATE public.previous_levels SET rank_order = rank_2 WHERE id = level_id_1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.swap_previous_level_ranks(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.swap_previous_level_ranks(UUID, UUID) TO service_role;
