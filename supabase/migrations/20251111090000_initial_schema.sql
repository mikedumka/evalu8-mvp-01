-- Initial schema migration for Evalu8 core, session, evaluation, and system tables
-- Generated on 2025-11-11

-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core Tables -------------------------------------------------------------

CREATE TABLE public.sport_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    sport_type_id UUID NOT NULL REFERENCES public.sport_types(id),
    contact_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ
);

CREATE INDEX idx_associations_slug ON public.associations(slug);
CREATE INDEX idx_associations_status ON public.associations(status);

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'google',
    auth_provider_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON public.users(email);

CREATE TABLE public.association_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    roles TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    invited_at TIMESTAMPTZ,
    invited_by UUID REFERENCES public.users(id),
    invitation_expires_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (association_id, user_id)
);

CREATE INDEX idx_association_users_association ON public.association_users(association_id);
CREATE INDEX idx_association_users_user ON public.association_users(user_id);

CREATE TABLE public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    outlier_threshold_percent INTEGER NOT NULL CHECK (outlier_threshold_percent BETWEEN 10 AND 50),
    minimum_evaluators_per_athlete INTEGER NOT NULL CHECK (minimum_evaluators_per_athlete BETWEEN 1 AND 10),
    minimum_sessions_per_athlete INTEGER NOT NULL CHECK (minimum_sessions_per_athlete >= 1),
    session_capacity INTEGER NOT NULL CHECK (session_capacity > 0),
    activated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (association_id, name)
);

CREATE INDEX idx_seasons_association ON public.seasons(association_id);
CREATE INDEX idx_seasons_status ON public.seasons(status);

CREATE TABLE public.cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (association_id, name)
);

CREATE INDEX idx_cohorts_association ON public.cohorts(association_id);
CREATE INDEX idx_cohorts_status ON public.cohorts(status);

CREATE TABLE public.position_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (association_id, name)
);

CREATE INDEX idx_position_types_association ON public.position_types(association_id);
CREATE INDEX idx_position_types_status ON public.position_types(status);

CREATE TABLE public.previous_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rank_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (association_id, name),
    UNIQUE (association_id, rank_order)
);

CREATE INDEX idx_previous_levels_association ON public.previous_levels(association_id);
CREATE INDEX idx_previous_levels_rank_order ON public.previous_levels(association_id, rank_order);

CREATE TABLE public.drills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (association_id, name)
);

CREATE INDEX idx_drills_association ON public.drills(association_id);
CREATE INDEX idx_drills_status ON public.drills(status);

CREATE TABLE public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
    position_type_id UUID NOT NULL REFERENCES public.position_types(id),
    previous_level_id UUID REFERENCES public.previous_levels(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'other')),
    status_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_association ON public.players(association_id);
CREATE INDEX idx_players_season ON public.players(season_id);
CREATE INDEX idx_players_cohort ON public.players(cohort_id);
CREATE INDEX idx_players_status ON public.players(status);
CREATE INDEX idx_players_name ON public.players(association_id, last_name, first_name);

-- Session Tables ---------------------------------------------------------

CREATE TABLE public.waves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
    wave_number INTEGER,
    wave_type TEXT NOT NULL CHECK (wave_type IN ('standard', 'custom')),
    custom_wave_name TEXT,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'ready', 'in_progress', 'completed')),
    teams_per_session INTEGER CHECK (teams_per_session BETWEEN 1 AND 6),
    distribution_algorithm TEXT CHECK (distribution_algorithm IN ('alphabetical', 'random', 'previous_level', 'current_ranking')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waves_association ON public.waves(association_id);
CREATE INDEX idx_waves_season ON public.waves(season_id);
CREATE INDEX idx_waves_cohort ON public.waves(cohort_id);
CREATE INDEX idx_waves_type_number ON public.waves(wave_type, wave_number);

CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
    wave_id UUID REFERENCES public.waves(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'in_progress', 'completed')),
    drill_config_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_association ON public.sessions(association_id);
CREATE INDEX idx_sessions_season ON public.sessions(season_id);
CREATE INDEX idx_sessions_cohort ON public.sessions(cohort_id);
CREATE INDEX idx_sessions_wave ON public.sessions(wave_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_scheduled ON public.sessions(scheduled_date, scheduled_time);

CREATE TABLE public.session_drills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    drill_id UUID NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
    weight_percent INTEGER NOT NULL CHECK (weight_percent BETWEEN 1 AND 100),
    applies_to_positions UUID[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, drill_id)
);

CREATE INDEX idx_session_drills_session ON public.session_drills(session_id);
CREATE INDEX idx_session_drills_drill ON public.session_drills(drill_id);

CREATE TABLE public.session_evaluators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    finalized_at TIMESTAMPTZ,
    finalization_incomplete BOOLEAN NOT NULL DEFAULT FALSE,
    finalization_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, user_id)
);

CREATE INDEX idx_session_evaluators_session ON public.session_evaluators(session_id);
CREATE INDEX idx_session_evaluators_user ON public.session_evaluators(user_id);

CREATE TABLE public.session_intake_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, user_id)
);

CREATE INDEX idx_session_intake_session ON public.session_intake_personnel(session_id);
CREATE INDEX idx_session_intake_user ON public.session_intake_personnel(user_id);

CREATE TABLE public.player_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    team_number INTEGER CHECK (team_number BETWEEN 1 AND 6),
    jersey_color TEXT,
    jersey_number INTEGER CHECK (jersey_number BETWEEN 0 AND 999),
    checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    no_show BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, session_id),
    UNIQUE (session_id, team_number, jersey_number)
);

CREATE INDEX idx_player_sessions_player ON public.player_sessions(player_id);
CREATE INDEX idx_player_sessions_session ON public.player_sessions(session_id);
CREATE INDEX idx_player_sessions_team ON public.player_sessions(session_id, team_number);

-- Evaluation Tables ------------------------------------------------------

CREATE TABLE public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    drill_id UUID NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
    is_outlier BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, player_id, drill_id, evaluator_id)
);

CREATE INDEX idx_evaluations_session ON public.evaluations(session_id);
CREATE INDEX idx_evaluations_player ON public.evaluations(player_id);
CREATE INDEX idx_evaluations_evaluator ON public.evaluations(evaluator_id);
CREATE INDEX idx_evaluations_drill ON public.evaluations(drill_id);
CREATE INDEX idx_evaluations_outlier ON public.evaluations(is_outlier);

CREATE TABLE public.reconciliation_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES public.drills(id) ON DELETE SET NULL,
    decision_type TEXT NOT NULL CHECK (decision_type IN ('partial_averaging', 'mark_drill_invalid', 'exclude_athlete')),
    decision_reason TEXT NOT NULL,
    decided_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_session ON public.reconciliation_decisions(session_id);
CREATE INDEX idx_reconciliation_player ON public.reconciliation_decisions(player_id);
CREATE INDEX idx_reconciliation_drill ON public.reconciliation_decisions(drill_id);

-- System Table -----------------------------------------------------------

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID REFERENCES public.associations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'blocked')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_association ON public.audit_logs(association_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
