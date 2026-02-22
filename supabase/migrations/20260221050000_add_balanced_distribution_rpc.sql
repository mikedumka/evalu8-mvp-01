-- Migration to support new distribution algorithms
-- 1. Updates waves table constraint to allow new algorithm values
-- 2. Updates distribute_wave_players function with new logic

-- Drop the old constraint if it exists (using standard naming convention for unnamed check constraints)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'waves_distribution_algorithm_check' 
        AND table_name = 'waves'
    ) THEN
        ALTER TABLE waves DROP CONSTRAINT waves_distribution_algorithm_check;
    END IF;
END $$;

-- Add the new constraint with all valid values
ALTER TABLE waves 
ADD CONSTRAINT waves_distribution_algorithm_check 
CHECK (distribution_algorithm IN ('alphabetical', 'random', 'previous_level', 'current_ranking', 'previous_level_grouped', 'previous_level_balanced'));

-- Function: distribute_wave_players
-- Purpose: Distributes players in a wave to sessions based on selected algorithm
-- Supports: alphabetical, random, previous_level (grouped), previous_level_balanced

CREATE OR REPLACE FUNCTION distribute_wave_players(
  p_wave_id UUID,
  p_algorithm TEXT, -- 'alphabetical', 'random', 'previous_level_grouped', 'previous_level_balanced'
  p_teams_per_session INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort_id UUID;
  v_season_id UUID;
  v_association_id UUID;
  v_sessions UUID[];
  v_session_count INTEGER;
  v_player_records RECORD;
  v_player_id UUID;
  v_session_idx INTEGER := 1;
  v_team_idx INTEGER := 1;
  v_player_cursor INTEGER := 0;
  v_total_players INTEGER;
  v_total_teams_for_wave INTEGER;
  v_current_session_id UUID;
BEGIN
  -- 1. Get Wave Details
  SELECT cohort_id, season_id, association_id 
  INTO v_cohort_id, v_season_id, v_association_id
  FROM waves 
  WHERE id = p_wave_id;

  IF v_cohort_id IS NULL THEN
    RAISE EXCEPTION 'Wave not found';
  END IF;

  -- 2. Validate Permission (Security Definer handles RLS but good to check context if needed)
  -- Assuming caller has rights via RLS on Wave update

  -- 3. Get Sessions for this Wave (Ordered by Date/Time)
  SELECT ARRAY_AGG(id ORDER BY scheduled_date, scheduled_time)
  INTO v_sessions
  FROM sessions
  WHERE wave_id = p_wave_id;

  v_session_count := array_length(v_sessions, 1);

  IF v_session_count IS NULL OR v_session_count = 0 THEN
    RAISE EXCEPTION 'No sessions found for this wave.';
  END IF;

  -- 4. Clear Existing Assignments for this Wave
  DELETE FROM player_sessions
  WHERE session_id = ANY(v_sessions);

  -- 5. Fetch and Sort Players based on Algorithm
  -- create a temporary table to hold sorted players
  CREATE TEMPORARY TABLE temp_sorted_players (
    row_num SERIAL,
    player_id UUID
  ) ON COMMIT DROP;

  IF p_algorithm = 'random' THEN
    INSERT INTO temp_sorted_players (player_id)
    SELECT id FROM players 
    WHERE cohort_id = v_cohort_id 
    AND season_id = v_season_id 
    AND status = 'active'
    ORDER BY random();
    
  ELSIF p_algorithm = 'previous_level_grouped' OR p_algorithm = 'previous_level_balanced' THEN
    -- Sort by Previous Level Rank (or Name), then Name
    -- Join previous_levels to get rank/name
    INSERT INTO temp_sorted_players (player_id)
    SELECT p.id 
    FROM players p
    LEFT JOIN previous_levels pl ON p.previous_level_id = pl.id
    WHERE p.cohort_id = v_cohort_id 
    AND p.season_id = v_season_id 
    AND p.status = 'active'
    ORDER BY pl.rank_order ASC NULLS LAST, pl.name ASC, p.last_name ASC, p.first_name ASC;

  ELSE -- Default 'alphabetical'
    INSERT INTO temp_sorted_players (player_id)
    SELECT id FROM players 
    WHERE cohort_id = v_cohort_id 
    AND season_id = v_season_id 
    AND status = 'active'
    ORDER BY last_name ASC, first_name ASC;
  END IF;

  SELECT count(*) INTO v_total_players FROM temp_sorted_players;

  IF v_total_players = 0 THEN
      -- No active players to distribute
      RETURN;
  END IF;


  -- 6. Distribute Players
  -- Strategy differs by algorithm:
  -- 'grouped': Fill Session 1, then Session 2 (Tiered/Chunked)
  -- 'balanced' (and others): Round Robin / Snake (Even distribution)

  v_player_cursor := 0;

  FOR v_player_records IN SELECT player_id FROM temp_sorted_players ORDER BY row_num
  LOOP
      v_player_id := v_player_records.player_id;
      v_player_cursor := v_player_cursor + 1;

      -- Calculate Target Session Index (1-based)
      IF p_algorithm = 'previous_level_grouped' THEN
          -- Chunked Distribution: 
          -- Index = floor((cursor-1) * sessions / total) + 1
          v_session_idx := floor((v_player_cursor - 1.0) * v_session_count / v_total_players) + 1;
          
          -- Ensure bounds
          IF v_session_idx > v_session_count THEN v_session_idx := v_session_count; END IF;

      ELSE 
          -- Round Robin / Balanced:
          -- Player 1 -> Session 1
          -- Player 2 -> Session 2
          -- ...
          -- 0-indexed cursor for math: 0 -> 0, 1 -> 1 ...
          v_session_idx := ((v_player_cursor - 1) % v_session_count) + 1;
      END IF;

      -- Get Session ID
      v_current_session_id := v_sessions[v_session_idx];

      -- Calculate Team Number for that Session
      -- Should be balanced within the session
      -- We'll use a session-specific cursor if we wanted perfect balance, but global round robin works generally well enough if random or ID sorted? 
      -- Actually, simple ((cursor-1) % teams) + 1 distributes evenly to teams A, B, A, B...
      -- For grouped, since we fill session 1 completely first, this works perfectly (team 1, team 2, team 1, team 2...)
      -- For balanced, since we jump sessions, player 1 -> S1 T1, player 2 -> S2 T2... 
      -- Wait, if teams=2 and sessions=2.
      -- P1 -> S1. (1-1)%2 + 1 = T1.
      -- P2 -> S2. (2-1)%2 + 1 = T2. S2 gets T2 first? That's weird.
      -- We want each session to fill T1 then T2? Or T1, T2, T1, T2?
      -- If we use global cursor % teams, and teams=2.
      -- P1 -> S1, T1.
      -- P2 -> S2, T2.
      -- P3 -> S1, T1.
      -- P4 -> S2, T2.
      -- Result: S1 has only T1s... NO. 
      -- If P3 -> S1, (3-1)%2 + 1 = 1. T1.
      -- This results in S1 getting only Team 1 players and S2 getting only Team 2 players if session count matches team count or multiple.
      
      -- BETTER LOGIC: Count players assigned to this session so far to determine team.
      -- But that requires querying or tracking state per session.
      -- Simpler: We can use a counter per session in an array variable? 
      -- PL/pgSQL arrays are 1-based.
      
      -- Let's initialize an array of counters?
      -- Alternatively, calculate team based on (v_player_cursor / v_session_count)? 
      -- For Balanced: Player 1 (S1), Player 2 (S2). Player 3 (S1), Player 4 (S2).
      -- P1 should be T1. P2 should be T1. P3 should be T2. P4 should be T2.
      -- The "round" index is floor((cursor-1) / sessions).
      -- So team = (round_index % teams) + 1.
      
      IF p_algorithm = 'previous_level_grouped' THEN
         -- Simple sequential fill within session
         -- team = ((cursor-1) % teams) + 1
         v_team_idx := ((v_player_cursor - 1) % p_teams_per_session) + 1;
      ELSE
         -- Balanced across sessions
         -- The "nth player in this session" is needed.
         -- n = floor((cursor-1) / sessions)
         v_team_idx := (floor((v_player_cursor - 1) / v_session_count)::INTEGER % p_teams_per_session) + 1;
      END IF;

      -- Insert Record
      INSERT INTO player_sessions (
          association_id, 
          player_id, 
          session_id, 
          team_number,
          checked_in
      ) VALUES (
          v_association_id,
          v_player_id,
          v_current_session_id,
          v_team_idx,
          FALSE
      );
      
      -- Update existing wave record status to update timestamp/etc
      UPDATE waves SET updated_at = NOW() WHERE id = p_wave_id;
      
  END LOOP;

  -- 7. Update Wave Status using existing update
  UPDATE waves 
  SET 
      distribution_algorithm = p_algorithm,
      teams_per_session = p_teams_per_session,
      updated_at = NOW(),
      status = 'ready' -- Mark as ready after distribution
  WHERE id = p_wave_id;

END;
$$;
