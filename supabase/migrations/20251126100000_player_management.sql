-- Migration: 20251126100000_player_management.sql

-- 1. Fix RLS Policies for players table
DROP POLICY IF EXISTS players_select_association ON public.players;
DROP POLICY IF EXISTS players_insert_admin ON public.players;
DROP POLICY IF EXISTS players_update_admin ON public.players;
DROP POLICY IF EXISTS players_delete_admin ON public.players;

CREATE POLICY players_select_association
  ON public.players
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.players.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY players_insert_admin
  ON public.players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.players.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY players_update_admin
  ON public.players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.players.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.players.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY players_delete_admin
  ON public.players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.players.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- 2. Create delete_player RPC
CREATE OR REPLACE FUNCTION public.delete_player(
  p_player_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_association_id UUID;
  v_player public.players;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get target player
  SELECT *
  INTO v_player
  FROM public.players
  WHERE id = p_player_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  v_association_id := v_player.association_id;

  -- Check permissions
  PERFORM 1
    FROM public.association_users
    WHERE association_id = v_association_id
      AND user_id = v_user_id
      AND status = 'active'
      AND 'Administrator' = ANY(roles);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator privileges are required to delete players';
  END IF;

  -- Check for dependencies
  -- 1. Evaluations (Strict check: cannot delete if evaluated)
  PERFORM 1 FROM public.evaluations WHERE player_id = p_player_id;
  IF FOUND THEN
    RAISE EXCEPTION 'Cannot delete player with existing evaluations. Consider withdrawing them instead.';
  END IF;

  -- Delete player
  DELETE FROM public.players WHERE id = p_player_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_player(UUID) TO authenticated;
