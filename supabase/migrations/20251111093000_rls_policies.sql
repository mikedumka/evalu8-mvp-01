-- Enable Row-Level Security policies for Evalu8
-- Generated on 2025-11-11

-- Helper note: application code must set app.current_association_id for multi-tenant filtering

-- =========================================================================
-- Sport Types
-- =========================================================================
ALTER TABLE public.sport_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY sport_types_select_authenticated
  ON public.sport_types
  FOR SELECT
  TO authenticated
  USING (true);

-- =========================================================================
-- Associations
-- =========================================================================
ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY associations_select_member
  ON public.associations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT association_id
      FROM public.association_users
      WHERE user_id = auth.uid()
    )
  );

-- =========================================================================
-- Users
-- =========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_self
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_update_self
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY users_select_association_members
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au_self
      JOIN public.association_users au_other
        ON au_self.association_id = au_other.association_id
      WHERE au_self.user_id = auth.uid()
        AND au_other.user_id = public.users.id
    )
  );

-- =========================================================================
-- Association Users
-- =========================================================================
ALTER TABLE public.association_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY association_users_select_self
  ON public.association_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY association_users_select_association
  ON public.association_users
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id
      FROM public.association_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY association_users_manage_admin
  ON public.association_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = association_users.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY association_users_update_admin
  ON public.association_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = association_users.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = association_users.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY association_users_delete_admin
  ON public.association_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = association_users.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- Seasons
-- =========================================================================
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY seasons_select_association
  ON public.seasons
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY seasons_insert_admin
  ON public.seasons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY seasons_update_admin
  ON public.seasons
  FOR UPDATE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY seasons_delete_admin
  ON public.seasons
  FOR DELETE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.seasons.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- Cohorts
-- =========================================================================
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY cohorts_select_association
  ON public.cohorts
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY cohorts_insert_admin
  ON public.cohorts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY cohorts_update_admin
  ON public.cohorts
  FOR UPDATE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY cohorts_delete_admin
  ON public.cohorts
  FOR DELETE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.cohorts.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- Position Types
-- =========================================================================
ALTER TABLE public.position_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY position_types_select_association
  ON public.position_types
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.position_types.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY position_types_insert_admin
  ON public.position_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.position_types.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY position_types_update_admin
  ON public.position_types
  FOR UPDATE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.position_types.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.position_types.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY position_types_delete_admin
  ON public.position_types
  FOR DELETE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.position_types.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- Previous Levels
-- =========================================================================
ALTER TABLE public.previous_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY previous_levels_select_association
  ON public.previous_levels
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY previous_levels_insert_admin
  ON public.previous_levels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY previous_levels_update_admin
  ON public.previous_levels
  FOR UPDATE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY previous_levels_delete_admin
  ON public.previous_levels
  FOR DELETE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.previous_levels.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- Drills
-- =========================================================================
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY drills_select_association
  ON public.drills
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.drills.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY drills_insert_admin
  ON public.drills
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.drills.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY drills_update_admin
  ON public.drills
  FOR UPDATE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.drills.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.drills.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY drills_delete_admin
  ON public.drills
  FOR DELETE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.drills.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- Players
-- =========================================================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY players_select_association
  ON public.players
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
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
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
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
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.players.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
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
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.players.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- Waves
-- =========================================================================
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;

CREATE POLICY waves_select_association
  ON public.waves
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY waves_insert_admin
  ON public.waves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY waves_update_admin
  ON public.waves
  FOR UPDATE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY waves_delete_admin
  ON public.waves
  FOR DELETE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.waves.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- Sessions
-- =========================================================================
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_select_association
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.sessions.association_id
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY sessions_insert_admin
  ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.sessions.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY sessions_update_admin
  ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.sessions.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.sessions.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY sessions_delete_admin
  ON public.sessions
  FOR DELETE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.sessions.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY sessions_update_assigned_staff
  ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND (
      EXISTS (
        SELECT 1
        FROM public.session_evaluators se
        WHERE se.session_id = public.sessions.id
          AND se.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.session_intake_personnel sip
        WHERE sip.session_id = public.sessions.id
          AND sip.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND (
      EXISTS (
        SELECT 1
        FROM public.session_evaluators se
        WHERE se.session_id = public.sessions.id
          AND se.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.session_intake_personnel sip
        WHERE sip.session_id = public.sessions.id
          AND sip.user_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- Session Drills
-- =========================================================================
ALTER TABLE public.session_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_drills_select_association
  ON public.session_drills
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
        )
    )
  );

CREATE POLICY session_drills_manage_admin
  ON public.session_drills
  FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

CREATE POLICY session_drills_update_admin
  ON public.session_drills
  FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

CREATE POLICY session_drills_delete_admin
  ON public.session_drills
  FOR DELETE
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

-- =========================================================================
-- Session Evaluators
-- =========================================================================
ALTER TABLE public.session_evaluators ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_evaluators_select_association
  ON public.session_evaluators
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
        )
    )
  );

CREATE POLICY session_evaluators_insert_admin
  ON public.session_evaluators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

CREATE POLICY session_evaluators_update_self
  ON public.session_evaluators
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
    )
  );

CREATE POLICY session_evaluators_update_admin
  ON public.session_evaluators
  FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

CREATE POLICY session_evaluators_delete_admin
  ON public.session_evaluators
  FOR DELETE
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

-- =========================================================================
-- Session Intake Personnel
-- =========================================================================
ALTER TABLE public.session_intake_personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_intake_select_association
  ON public.session_intake_personnel
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
        )
    )
  );

CREATE POLICY session_intake_insert_admin
  ON public.session_intake_personnel
  FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

CREATE POLICY session_intake_update_admin
  ON public.session_intake_personnel
  FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

CREATE POLICY session_intake_delete_admin
  ON public.session_intake_personnel
  FOR DELETE
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

-- =========================================================================
-- Player Sessions
-- =========================================================================
ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY player_sessions_select_association
  ON public.player_sessions
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
        )
    )
  );

CREATE POLICY player_sessions_insert_admin
  ON public.player_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

CREATE POLICY player_sessions_update_admin
  ON public.player_sessions
  FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

CREATE POLICY player_sessions_update_intake
  ON public.player_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_intake_personnel sip
      WHERE sip.session_id = public.player_sessions.session_id
        AND sip.user_id = auth.uid()
    )
    AND public.player_sessions.session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_intake_personnel sip
      WHERE sip.session_id = public.player_sessions.session_id
        AND sip.user_id = auth.uid()
    )
    AND public.player_sessions.session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
    )
  );

CREATE POLICY player_sessions_delete_admin
  ON public.player_sessions
  FOR DELETE
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

-- =========================================================================
-- Evaluations
-- =========================================================================
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY evaluations_select_association
  ON public.evaluations
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
        )
    )
  );

CREATE POLICY evaluations_insert_evaluator
  ON public.evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluator_id = auth.uid()
    AND session_id IN (
      SELECT se.session_id
      FROM public.session_evaluators se
      JOIN public.sessions s ON s.id = se.session_id
      WHERE se.user_id = auth.uid()
        AND s.association_id = current_setting('app.current_association_id', true)::uuid
    )
  );

CREATE POLICY evaluations_update_evaluator
  ON public.evaluations
  FOR UPDATE
  TO authenticated
  USING (
    evaluator_id = auth.uid()
    AND session_id IN (
      SELECT se.session_id
      FROM public.session_evaluators se
      JOIN public.sessions s ON s.id = se.session_id
      WHERE se.user_id = auth.uid()
        AND s.association_id = current_setting('app.current_association_id', true)::uuid
    )
  )
  WITH CHECK (
    evaluator_id = auth.uid()
    AND session_id IN (
      SELECT se.session_id
      FROM public.session_evaluators se
      JOIN public.sessions s ON s.id = se.session_id
      WHERE se.user_id = auth.uid()
        AND s.association_id = current_setting('app.current_association_id', true)::uuid
    )
  );

CREATE POLICY evaluations_manage_admin
  ON public.evaluations
  FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

-- =========================================================================
-- Reconciliation Decisions
-- =========================================================================
ALTER TABLE public.reconciliation_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reconciliation_select_association
  ON public.reconciliation_decisions
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
        )
    )
  );

CREATE POLICY reconciliation_manage_admin
  ON public.reconciliation_decisions
  FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id
      FROM public.sessions s
      WHERE s.association_id = current_setting('app.current_association_id', true)::uuid
        AND EXISTS (
          SELECT 1
          FROM public.association_users au
          WHERE au.association_id = s.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    )
  );

-- =========================================================================
-- Audit Logs
-- =========================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select_admin
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    association_id = current_setting('app.current_association_id', true)::uuid
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.audit_logs.association_id
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );
