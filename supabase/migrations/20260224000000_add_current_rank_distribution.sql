-- Migration to add support for 'current_ranking' distribution algorithm
-- 1. Updates distribute_wave_players function to include logic for 'current_ranking' using Snake Draft

CREATE OR REPLACE FUNCTION distribute_wave_players(
  p_wave_id UUID,
  p_algorithm TEXT, -- 'alphabetical', 'random', 'previous_level_grouped', 'previous_level_balanced', 'current_ranking'
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
  v_session_idx INTEGER;
  v_team_idx INTEGER;
  v_player_cursor INTEGER := 0;
  v_total_players INTEGER;
  v_current_session_id UUID;
  v_round INTEGER;
  v_slot_in_round INTEGER;
  v_player_rank_in_session INTEGER;
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
  CREATE TEMPORARY TABLE temp_sorted_players (
    row_num SERIAL,
    player_id UUID,
    sort_score NUMERIC
  ) ON COMMIT DROP;

  IF p_algorithm = 'random' THEN
    INSERT INTO temp_sorted_players (player_id)
    SELECT id FROM players 
    WHERE cohort_id = v_cohort_id 
    AND season_id = v_season_id 
    AND status = 'active'
    ORDER BY random();
    
  ELSIF p_algorithm = 'current_ranking' THEN
    -- Sort by Average Score (Highest to Lowest)
    -- Calculate average evaluation score for each player in this season
    INSERT INTO temp_sorted_players (player_id, sort_score)
    SELECT 
        p.id,
        COALESCE(AVG(e.score), 0) as avg_score
    FROM players p
    LEFT JOIN evaluations e ON p.id = e.player_id
    -- Only include evaluations from sessions in this season
    LEFT JOIN sessions s ON e.session_id = s.id AND s.season_id = v_season_id
    WHERE p.cohort_id = v_cohort_id 
      AND p.season_id = v_season_id 
      AND p.status = 'active'
    GROUP BY p.id
    ORDER BY avg_score DESC, p.last_name ASC, p.first_name ASC;

  ELSIF p_algorithm = 'previous_level_grouped' OR p_algorithm = 'previous_level_balanced' THEN
    -- Sort by Previous Level Rank (or Name), then Name
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
      -- No active players to distribute, stop
      RETURN;
  END IF;


  -- 6. Distribute Players
  v_player_cursor := 0;

  FOR v_player_records IN SELECT player_id FROM temp_sorted_players ORDER BY row_num
  LOOP
      v_player_id := v_player_records.player_id;
      v_player_cursor := v_player_cursor + 1;

      -- Calculate Target Session Index (1-based)
      IF p_algorithm = 'previous_level_grouped' THEN
          -- Chunked Distribution
          v_session_idx := floor((v_player_cursor - 1.0) * v_session_count / v_total_players) + 1;
          IF v_session_idx > v_session_count THEN v_session_idx := v_session_count; END IF;
      
      ELSIF p_algorithm = 'current_ranking' THEN
          -- Snake Draft Distribution
          -- Round 0: 1 -> N
          -- Round 1: N -> 1
          -- Round 2: 1 -> N
          
          v_round := floor((v_player_cursor - 1) / v_session_count);
          v_slot_in_round := (v_player_cursor - 1) % v_session_count; -- 0 to (N-1)
          
          IF (v_round % 2) = 0 THEN
              -- Even Round (0, 2...): Standard Order (1, 2, ..., N)
              -- v_slot 0 -> Session 1
              v_session_idx := v_slot_in_round + 1;
          ELSE
              -- Odd Round (1, 3...): Reverse Order (N, N-1, ..., 1)
              -- v_slot 0 -> Session N
              -- v_slot 1 -> Session N-1
              v_session_idx := v_session_count - v_slot_in_round;
          END IF;

      ELSE 
          -- Round Robin (Alphabetical, Random, balanced)
          -- 1, 2, ..., N, 1, 2...
          v_session_idx := ((v_player_cursor - 1) % v_session_count) + 1;
      END IF;

      -- Get Session ID
      v_current_session_id := v_sessions[v_session_idx];

      -- Calculate Team Number
      -- Balanced distribution within the session
      
      IF p_algorithm = 'previous_level_grouped' THEN
         -- Simple sequential fill within the chunk assigned to the session
         v_team_idx := ((v_player_cursor - 1) % p_teams_per_session) + 1;
      ELSE
         -- For other algorithms, we distribute evenly across teams within the session.
         -- Calculate which "player number" this is for this specific session to determine team.
         -- For Round Robin: 
         --   Player 1 (Global 1) -> Session 1, Team 1
         --   Player N+1 (Global N+1) -> Session 1, Team 2
         
         -- Calculate how many players have been assigned to THIS session so far (including this one)
         -- Approximately: v_player_rank_in_session = floor((cursor-1) / sessions) + 1
         
         v_player_rank_in_session := floor((v_player_cursor - 1) / v_session_count) + 1;
         
         -- Assign to team based on order of arrival in this session
         v_team_idx := ((v_player_rank_in_session - 1) % p_teams_per_session) + 1;
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

  END LOOP;

  -- 7. Update Wave Status
  UPDATE waves 
  SET 
      distribution_algorithm = p_algorithm,
      teams_per_session = p_teams_per_session,
      updated_at = NOW(),
      status = 'ready'
  WHERE id = p_wave_id;

END;
$$;
