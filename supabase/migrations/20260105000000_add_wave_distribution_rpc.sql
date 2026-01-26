
-- Function to distribute players for a wave
CREATE OR REPLACE FUNCTION distribute_wave_players(
  p_wave_id UUID,
  p_algorithm TEXT,
  p_teams_per_session INTEGER
) RETURNS VOID AS $$
DECLARE
  v_cohort_id UUID;
  v_session_ids UUID[];
  v_player_ids UUID[];
  v_session_count INTEGER;
  v_player_count INTEGER;
  v_players_per_session INTEGER;
  v_remainder INTEGER;
  v_current_session_idx INTEGER;
  v_current_player_idx INTEGER;
  v_session_id UUID;
  v_player_id UUID;
  v_team_num INTEGER;
  i INTEGER;
  j INTEGER;
BEGIN
  -- 1. Get Wave Info (Sessions)
  SELECT array_agg(id ORDER BY scheduled_date, scheduled_time)
  INTO v_session_ids
  FROM sessions
  WHERE wave_id = p_wave_id
  AND status != 'completed'; -- Only distribute to non-completed sessions

  IF v_session_ids IS NULL THEN
    RAISE EXCEPTION 'No valid sessions found for this wave.';
  END IF;

  v_session_count := array_length(v_session_ids, 1);

  -- 2. Get Cohort ID from wave (via first session, assuming consistency)
  SELECT s.cohort_id INTO v_cohort_id
  FROM sessions s
  WHERE s.id = v_session_ids[1];

  -- 3. Get Players
  -- Check logic based on algorithm
  IF p_algorithm = 'random' THEN
    SELECT array_agg(id ORDER BY random())
    INTO v_player_ids
    FROM players
    WHERE cohort_id = v_cohort_id
    AND status = 'active';
  ELSIF p_algorithm = 'previous_level' THEN
      -- Sort by previous level rank, then random within level
     SELECT array_agg(p.id ORDER BY pl.rank_order NULLS LAST, random())
     INTO v_player_ids
     FROM players p
     LEFT JOIN previous_levels pl ON p.previous_level_id = pl.id
     WHERE p.cohort_id = v_cohort_id
     AND p.status = 'active';
  ELSE -- Default to alphabetical
    SELECT array_agg(id ORDER BY last_name, first_name)
    INTO v_player_ids
    FROM players
    WHERE cohort_id = v_cohort_id
    AND status = 'active';
  END IF;

  IF v_player_ids IS NULL THEN
    RAISE EXCEPTION 'No active players found in cohort.';
  END IF;

  v_player_count := array_length(v_player_ids, 1);

  -- 4. Clear existing player_sessions for these sessions (full reset for the wave)
  DELETE FROM player_sessions
  WHERE session_id = ANY(v_session_ids);

  -- 5. Distribute Loop
  -- Calculate basic distribution
  v_players_per_session := v_player_count / v_session_count;
  v_remainder := v_player_count % v_session_count;
  
  v_current_player_idx := 1;

  FOR i IN 1..v_session_count LOOP
    v_session_id := v_session_ids[i];
    
    -- Determine how many players go to this session
    -- Distribute remainder to first N sessions
    DECLARE
        v_count_for_this_session INTEGER;
        v_player_in_session_idx INTEGER;
    BEGIN
        v_count_for_this_session := v_players_per_session;
        IF i <= v_remainder THEN
            v_count_for_this_session := v_count_for_this_session + 1;
        END IF;

        -- Assign players to this session
        FOR j IN 1..v_count_for_this_session LOOP
            v_player_id := v_player_ids[v_current_player_idx];
            
            -- Assign Team (Simple round robin within session)
            -- e.g. 1, 2, 1, 2...
            v_team_num := ((j - 1) % p_teams_per_session) + 1;

            INSERT INTO player_sessions (player_id, session_id, team_assignment)
            VALUES (v_player_id, v_session_id, v_team_num);

            v_current_player_idx := v_current_player_idx + 1;
        END LOOP;
    END;
  END LOOP;
  
  -- 6. Update Wave Status
  UPDATE waves SET status = 'ready' WHERE id = p_wave_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
