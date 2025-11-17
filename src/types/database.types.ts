export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      association_users: {
        Row: {
          association_id: string;
          created_at: string;
          id: string;
          invitation_expires_at: string | null;
          invited_at: string | null;
          invited_by: string | null;
          joined_at: string | null;
          roles: string[];
          status: string;
          user_id: string;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          id?: string;
          invitation_expires_at?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          joined_at?: string | null;
          roles: string[];
          status?: string;
          user_id: string;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          id?: string;
          invitation_expires_at?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          joined_at?: string | null;
          roles?: string[];
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "association_users_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "association_users_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "association_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      associations: {
        Row: {
          abbreviation: string | null;
          contact_email: string;
          created_at: string;
          id: string;
          last_activity_at: string | null;
          name: string;
          sport: string | null;
          slug: string;
          sport_type_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          abbreviation: string;
          contact_email: string;
          created_at?: string;
          id?: string;
          last_activity_at?: string | null;
          name: string;
          sport: string;
          slug: string;
          sport_type_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          abbreviation?: string | null;
          contact_email?: string;
          created_at?: string;
          id?: string;
          last_activity_at?: string | null;
          name?: string;
          sport?: string | null;
          slug?: string;
          sport_type_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "associations_sport_type_id_fkey";
            columns: ["sport_type_id"];
            isOneToOne: false;
            referencedRelation: "sport_types";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          association_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          ip_address: unknown;
          metadata: Json | null;
          resource_id: string | null;
          resource_type: string | null;
          status: string;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          association_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          resource_id?: string | null;
          resource_type?: string | null;
          status: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          association_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          resource_id?: string | null;
          resource_type?: string | null;
          status?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      cohorts: {
        Row: {
          association_id: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohorts_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          }
        ];
      };
      drills: {
        Row: {
          association_id: string;
          created_at: string;
          criteria: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          criteria: string;
          description?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          criteria?: string;
          description?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drills_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          }
        ];
      };
      evaluations: {
        Row: {
          association_id: string;
          created_at: string;
          drill_id: string;
          evaluator_id: string;
          id: string;
          is_outlier: boolean;
          player_id: string;
          score: number;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          drill_id: string;
          evaluator_id: string;
          id?: string;
          is_outlier?: boolean;
          player_id: string;
          score: number;
          session_id: string;
          updated_at?: string;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          drill_id?: string;
          evaluator_id?: string;
          id?: string;
          is_outlier?: boolean;
          player_id?: string;
          score?: number;
          session_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluations_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_drill_id_fkey";
            columns: ["drill_id"];
            isOneToOne: false;
            referencedRelation: "drills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_evaluator_id_fkey";
            columns: ["evaluator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      player_sessions: {
        Row: {
          association_id: string;
          checked_in: boolean;
          checked_in_at: string | null;
          created_at: string;
          id: string;
          jersey_color: string | null;
          jersey_number: number | null;
          no_show: boolean;
          player_id: string;
          session_id: string;
          team_number: number | null;
          updated_at: string;
        };
        Insert: {
          association_id: string;
          checked_in?: boolean;
          checked_in_at?: string | null;
          created_at?: string;
          id?: string;
          jersey_color?: string | null;
          jersey_number?: number | null;
          no_show?: boolean;
          player_id: string;
          session_id: string;
          team_number?: number | null;
          updated_at?: string;
        };
        Update: {
          association_id?: string;
          checked_in?: boolean;
          checked_in_at?: string | null;
          created_at?: string;
          id?: string;
          jersey_color?: string | null;
          jersey_number?: number | null;
          no_show?: boolean;
          player_id?: string;
          session_id?: string;
          team_number?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_sessions_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_sessions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_sessions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      players: {
        Row: {
          association_id: string;
          birth_year: number;
          cohort_id: string | null;
          created_at: string;
          first_name: string;
          id: string;
          last_name: string;
          notes: string | null;
          position_type_id: string;
          previous_level_id: string | null;
          season_id: string;
          status: string;
          status_reason: string | null;
          updated_at: string;
        };
        Insert: {
          association_id: string;
          birth_year: number;
          cohort_id?: string | null;
          created_at?: string;
          first_name: string;
          id?: string;
          last_name: string;
          notes?: string | null;
          position_type_id: string;
          previous_level_id?: string | null;
          season_id: string;
          status?: string;
          status_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          association_id?: string;
          birth_year?: number;
          cohort_id?: string | null;
          created_at?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          notes?: string | null;
          position_type_id?: string;
          previous_level_id?: string | null;
          season_id?: string;
          status?: string;
          status_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_position_type_id_fkey";
            columns: ["position_type_id"];
            isOneToOne: false;
            referencedRelation: "position_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_previous_level_id_fkey";
            columns: ["previous_level_id"];
            isOneToOne: false;
            referencedRelation: "previous_levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          }
        ];
      };
      position_types: {
        Row: {
          association_id: string;
          created_at: string;
          id: string;
          name: string;
          status: string;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "position_types_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          }
        ];
      };
      previous_levels: {
        Row: {
          association_id: string;
          created_at: string;
          id: string;
          name: string;
          rank_order: number;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          id?: string;
          name: string;
          rank_order: number;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          rank_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "previous_levels_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          }
        ];
      };
      reconciliation_decisions: {
        Row: {
          association_id: string;
          created_at: string;
          decided_at: string;
          decided_by: string;
          decision_reason: string;
          decision_type: string;
          drill_id: string | null;
          id: string;
          player_id: string;
          reversed_at: string | null;
          reversed_by: string | null;
          session_id: string;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          decided_at?: string;
          decided_by: string;
          decision_reason: string;
          decision_type: string;
          drill_id?: string | null;
          id?: string;
          player_id: string;
          reversed_at?: string | null;
          reversed_by?: string | null;
          session_id: string;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          decided_at?: string;
          decided_by?: string;
          decision_reason?: string;
          decision_type?: string;
          drill_id?: string | null;
          id?: string;
          player_id?: string;
          reversed_at?: string | null;
          reversed_by?: string | null;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reconciliation_decisions_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_decisions_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_decisions_drill_id_fkey";
            columns: ["drill_id"];
            isOneToOne: false;
            referencedRelation: "drills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_decisions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_decisions_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reconciliation_decisions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      seasons: {
        Row: {
          activated_at: string | null;
          association_id: string;
          completed_at: string | null;
          created_at: string;
          id: string;
          minimum_evaluators_per_athlete: number;
          minimum_sessions_per_athlete: number;
          name: string;
          outlier_threshold_percent: number;
          session_capacity: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          activated_at?: string | null;
          association_id: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          minimum_evaluators_per_athlete: number;
          minimum_sessions_per_athlete: number;
          name: string;
          outlier_threshold_percent: number;
          session_capacity: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          activated_at?: string | null;
          association_id?: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          minimum_evaluators_per_athlete?: number;
          minimum_sessions_per_athlete?: number;
          name?: string;
          outlier_threshold_percent?: number;
          session_capacity?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          }
        ];
      };
      session_drills: {
        Row: {
          applies_to_positions: string[];
          association_id: string;
          created_at: string;
          drill_id: string;
          id: string;
          session_id: string;
          weight_percent: number;
        };
        Insert: {
          applies_to_positions: string[];
          association_id: string;
          created_at?: string;
          drill_id: string;
          id?: string;
          session_id: string;
          weight_percent: number;
        };
        Update: {
          applies_to_positions?: string[];
          association_id?: string;
          created_at?: string;
          drill_id?: string;
          id?: string;
          session_id?: string;
          weight_percent?: number;
        };
        Relationships: [
          {
            foreignKeyName: "session_drills_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_drills_drill_id_fkey";
            columns: ["drill_id"];
            isOneToOne: false;
            referencedRelation: "drills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_drills_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      session_evaluators: {
        Row: {
          association_id: string;
          created_at: string;
          finalization_incomplete: boolean;
          finalization_reason: string | null;
          finalized_at: string | null;
          id: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          finalization_incomplete?: boolean;
          finalization_reason?: string | null;
          finalized_at?: string | null;
          id?: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          finalization_incomplete?: boolean;
          finalization_reason?: string | null;
          finalized_at?: string | null;
          id?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_evaluators_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_evaluators_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_evaluators_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      session_intake_personnel: {
        Row: {
          association_id: string;
          created_at: string;
          id: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          association_id: string;
          created_at?: string;
          id?: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          association_id?: string;
          created_at?: string;
          id?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_intake_personnel_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_intake_personnel_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_intake_personnel_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      sessions: {
        Row: {
          association_id: string;
          cohort_id: string | null;
          created_at: string;
          drill_config_locked: boolean;
          id: string;
          location: string;
          name: string;
          scheduled_date: string;
          scheduled_time: string;
          season_id: string;
          status: string;
          updated_at: string;
          wave_id: string | null;
        };
        Insert: {
          association_id: string;
          cohort_id?: string | null;
          created_at?: string;
          drill_config_locked?: boolean;
          id?: string;
          location: string;
          name: string;
          scheduled_date: string;
          scheduled_time: string;
          season_id: string;
          status?: string;
          updated_at?: string;
          wave_id?: string | null;
        };
        Update: {
          association_id?: string;
          cohort_id?: string | null;
          created_at?: string;
          drill_config_locked?: boolean;
          id?: string;
          location?: string;
          name?: string;
          scheduled_date?: string;
          scheduled_time?: string;
          season_id?: string;
          status?: string;
          updated_at?: string;
          wave_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_wave_id_fkey";
            columns: ["wave_id"];
            isOneToOne: false;
            referencedRelation: "waves";
            referencedColumns: ["id"];
          }
        ];
      };
      sport_types: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          auth_provider: string;
          auth_provider_id: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          last_login_at: string | null;
          status: string;
          system_roles: string[];
        };
        Insert: {
          auth_provider?: string;
          auth_provider_id?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id?: string;
          last_login_at?: string | null;
          status?: string;
          system_roles?: string[];
        };
        Update: {
          auth_provider?: string;
          auth_provider_id?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          last_login_at?: string | null;
          status?: string;
          system_roles?: string[];
        };
        Relationships: [];
      };
      waves: {
        Row: {
          association_id: string;
          cohort_id: string;
          created_at: string;
          custom_wave_name: string | null;
          distribution_algorithm: string | null;
          id: string;
          season_id: string;
          status: string;
          teams_per_session: number | null;
          updated_at: string;
          wave_number: number | null;
          wave_type: string;
        };
        Insert: {
          association_id: string;
          cohort_id: string;
          created_at?: string;
          custom_wave_name?: string | null;
          distribution_algorithm?: string | null;
          id?: string;
          season_id: string;
          status?: string;
          teams_per_session?: number | null;
          updated_at?: string;
          wave_number?: number | null;
          wave_type: string;
        };
        Update: {
          association_id?: string;
          cohort_id?: string;
          created_at?: string;
          custom_wave_name?: string | null;
          distribution_algorithm?: string | null;
          id?: string;
          season_id?: string;
          status?: string;
          teams_per_session?: number | null;
          updated_at?: string;
          wave_number?: number | null;
          wave_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waves_association_id_fkey";
            columns: ["association_id"];
            isOneToOne: false;
            referencedRelation: "associations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waves_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waves_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_association_member_by_email: {
        Args: { p_association_id: string; p_email: string; p_roles: string[] };
        Returns: {
          association_id: string;
          created_at: string;
          id: string;
          invitation_expires_at: string | null;
          invited_at: string | null;
          invited_by: string | null;
          joined_at: string | null;
          roles: string[];
          status: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "association_users";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      add_session_drill: {
        Args: {
          p_drill_id: string;
          p_position_ids: string[];
          p_session_id: string;
          p_weight_percent: number;
        };
        Returns: {
          applies_to_positions: string[];
          association_id: string;
          created_at: string;
          drill_id: string;
          id: string;
          session_id: string;
          weight_percent: number;
        };
        SetofOptions: {
          from: "*";
          to: "session_drills";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_association_with_admin: {
        Args: {
          p_abbreviation: string;
          p_contact_email: string;
          p_name: string;
          p_sport: string;
          p_sport_type_id: string;
        };
        Returns: {
          abbreviation: string | null;
          contact_email: string;
          created_at: string;
          id: string;
          last_activity_at: string | null;
          name: string;
          sport: string | null;
          slug: string;
          sport_type_id: string;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "associations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_drill: {
        Args: { p_criteria: string; p_description: string; p_name: string };
        Returns: {
          association_id: string;
          created_at: string;
          criteria: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "drills";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_association_id: { Args: never; Returns: string };
      remove_session_drill: {
        Args: { p_session_drill_id: string };
        Returns: string;
      };
      set_association_context: {
        Args: { association: string };
        Returns: undefined;
      };
      set_drill_status: {
        Args: { p_drill_id: string; p_status: string };
        Returns: {
          association_id: string;
          created_at: string;
          criteria: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "drills";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_drill: {
        Args: {
          p_criteria: string;
          p_description: string;
          p_drill_id: string;
          p_name: string;
        };
        Returns: {
          association_id: string;
          created_at: string;
          criteria: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "drills";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_session_drill: {
        Args: {
          p_position_ids: string[];
          p_session_drill_id: string;
          p_weight_percent: number;
        };
        Returns: {
          applies_to_positions: string[];
          association_id: string;
          created_at: string;
          drill_id: string;
          id: string;
          session_id: string;
          weight_percent: number;
        };
        SetofOptions: {
          from: "*";
          to: "session_drills";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      system_list_users: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string;
          email: string;
          full_name: string | null;
          status: string;
          system_roles: string[];
          created_at: string;
          last_login_at: string | null;
          association_count: number;
          active_association_count: number;
        }>;
      };
      system_upsert_user: {
        Args: {
          p_email: string;
          p_full_name: string | null;
          p_system_roles: string[];
          p_status: string;
          p_association_id: string | null;
          p_association_roles: string[];
        };
        Returns: unknown;
      };
      system_update_user_profile: {
        Args: {
          p_user_id: string;
          p_full_name: string | null;
          p_system_roles: string[];
        };
        Returns: unknown;
      };
      system_update_user_status: {
        Args: { p_user_id: string; p_status: string };
        Returns: unknown;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
