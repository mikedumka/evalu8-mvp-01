import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import {
  Loader2,
  Waves,
  Users,
  Drill,
  IdCardLanyard,
  ClipboardCheck,
  LayoutDashboard,
  Calendar,
  MapPin,
  Clock,
  Plus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SessionBulkImportDialog } from "@/components/sessions/SessionBulkImportDialog";
import { WaveDistributionDialog } from "@/components/waves/WaveDistributionDialog";
import { SessionSummaryDialog } from "@/components/sessions/SessionSummaryDialog";
import { DrillConfigurationDialog } from "@/components/sessions/DrillConfigurationDialog";
import { SessionEvaluatorManagementDialog } from "@/components/sessions/SessionEvaluatorManagementDialog";
import { SessionIntakePersonnelManagementDialog } from "@/components/sessions/SessionIntakePersonnelManagementDialog";
import { SessionPlayerManagementDialog } from "@/components/sessions/SessionPlayerManagementDialog";

type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type WaveRow = Database["public"]["Tables"]["waves"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
// Define the session type with the related counts we need.
// Note: Supabase returns count as an array of objects like [{ count: 123 }]
type SessionRowWithCounts = Database["public"]["Tables"]["sessions"]["Row"] & {
  location: { name: string } | null;
  cohort: { name: string } | null;
  wave_number?: number | null;
  session_drills: { count: number }[];
  session_evaluators: { count: number }[];
  session_intake_personnel: { count: number }[];
  player_sessions: { count: number }[];
  // Added optional counts for compatibility with summary dialog
  counts?: {
    drills: number;
    evaluators: number;
    intake: number;
    players: number;
  };
};

type SessionFetchRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  location: { name: string } | null;
  session_drills: { count: number }[];
  session_evaluators: { count: number }[];
  session_intake_personnel: { count: number }[];
  player_sessions: { count: number }[];
};

type WaveAssignmentRow = {
  player_id: string;
  session: {
    wave_id: string | null;
    cohort_id: string;
  };
};

type PlayerForCustomWave = PlayerRow & {
  position_types?: { name: string } | { name: string }[] | null;
  previous_levels?:
    | { name: string; rank_order?: number }
    | { name: string; rank_order?: number }[]
    | null;
};

type CustomWaveAlgorithm =
  | "alphabetical"
  | "random"
  | "previous_level_grouped"
  | "previous_level_balanced"
  | "current_ranking";

export function SchedulingDashboardPage() {
  const { currentAssociation } = useAuth();
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [activeSeason, setActiveSeason] = useState<SeasonRow | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [withdrawnPlayerCount, setWithdrawnPlayerCount] = useState<number>(0);
  const [waveAssignedCounts, setWaveAssignedCounts] = useState<
    Map<string, number>
  >(new Map());
  // We keep wave state if needed for reference, but mainly we need sessions
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [sessions, setSessions] = useState<SessionRowWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [distributionDialogState, setDistributionDialogState] = useState<{
    open: boolean;
    wave: WaveRow | null;
  }>({
    open: false,
    wave: null,
  });

  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWave, setFilterWave] = useState<string>("all");

  // Summary and Config Dialogs
  const [summaryDialogState, setSummaryDialogState] = useState<{
    open: boolean;
    session: SessionRowWithCounts | null;
  }>({
    open: false,
    session: null,
  });
  const [drillDialogState, setDrillDialogState] = useState<{
    open: boolean;
    session: SessionRowWithCounts | null;
  }>({
    open: false,
    session: null,
  });
  const [evaluatorDialogState, setEvaluatorDialogState] = useState<{
    open: boolean;
    session: SessionRowWithCounts | null;
  }>({
    open: false,
    session: null,
  });
  const [intakeDialogState, setIntakeDialogState] = useState<{
    open: boolean;
    session: SessionRowWithCounts | null;
  }>({
    open: false,
    session: null,
  });
  const [playerDialogState, setPlayerDialogState] = useState<{
    open: boolean;
    session: SessionRowWithCounts | null;
  }>({
    open: false,
    session: null,
  });
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [cleanupWaveId, setCleanupWaveId] = useState<string>("");
  const [cleanupOptions, setCleanupOptions] = useState({
    removeEvaluations: false,
    removeDrills: false,
    removeEvaluators: false,
    removeIntake: false,
    removePlayers: false,
    removeSchedule: false,
  });
  const [customWaveDialogOpen, setCustomWaveDialogOpen] = useState(false);
  const [customWaveStep, setCustomWaveStep] = useState(1);
  const [creatingCustomWave, setCreatingCustomWave] = useState(false);
  const [customWaveName, setCustomWaveName] = useState("");
  const [customWaveSessionCount, setCustomWaveSessionCount] = useState(1);
  const [customWaveTeamsPerSession, setCustomWaveTeamsPerSession] = useState(2);
  const [customWaveAlgorithm, setCustomWaveAlgorithm] =
    useState<CustomWaveAlgorithm>("alphabetical");
  const [customWaveSessions, setCustomWaveSessions] = useState<
    { date: string; time: string; locationId: string; duration: number }[]
  >([]);
  const [customWaveLocations, setCustomWaveLocations] = useState<
    { id: string; name: string }[]
  >([]);
  const [customWavePlayerSearch, setCustomWavePlayerSearch] = useState("");
  const [customWaveStatusFilter, setCustomWaveStatusFilter] =
    useState<string>("active");
  const [customWavePositionFilter, setCustomWavePositionFilter] =
    useState<string>("all");
  const [customWaveLevelFilter, setCustomWaveLevelFilter] =
    useState<string>("all");
  const [customWavePlayers, setCustomWavePlayers] = useState<
    PlayerForCustomWave[]
  >([]);
  const [customWaveSelectedPlayerIds, setCustomWaveSelectedPlayerIds] =
    useState<Set<string>>(new Set());

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "message" in error) {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
        return maybeMessage;
      }
    }
    return fallback;
  };

  useEffect(() => {
    if (currentAssociation) {
      fetchInitialData();
    }
  }, [currentAssociation]);

  useEffect(() => {
    if (selectedCohortId && activeSeason) {
      fetchCohortData();
    }
  }, [selectedCohortId, activeSeason]);

  useEffect(() => {
    if (customWaveDialogOpen && selectedCohortId && activeSeason) {
      void fetchCustomWavePlayers();
    }
  }, [customWaveDialogOpen, selectedCohortId, activeSeason]);

  const fetchInitialData = async () => {
    if (!currentAssociation) return;
    setLoading(true);

    // Fetch Cohorts
    const { data: cohortsData, error: cohortsError } = await supabase
      .from("cohorts")
      .select("*")
      .eq("association_id", currentAssociation.association_id)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("name");

    if (cohortsError) console.error("Error fetching cohorts:", cohortsError);
    else setCohorts(cohortsData || []);

    // Fetch Active Season
    const { data: seasonData, error: seasonError } = await supabase
      .from("seasons")
      .select("*")
      .eq("association_id", currentAssociation.association_id)
      .eq("status", "active")
      .single();

    if (seasonError && seasonError.code !== "PGRST116") {
      console.error("Error fetching active season:", seasonError);
    } else {
      setActiveSeason(seasonData);
    }

    setLoading(false);
  };

  const fetchCohortData = async () => {
    if (!selectedCohortId || !activeSeason) return;
    setCohortLoading(true);

    // Fetch Player Count
    const { count, error: countError } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("cohort_id", selectedCohortId)
      .eq("season_id", activeSeason.id)
      .eq("status", "active");

    if (countError) console.error("Error fetching player count:", countError);
    else setPlayerCount(count || 0);

    // Fetch Waves
    const { data: wavesData, error: wavesError } = await supabase
      .from("waves")
      .select("*")
      .eq("cohort_id", selectedCohortId)
      .eq("season_id", activeSeason.id)
      .order("wave_number", { ascending: true });

    if (wavesError) console.error("Error fetching waves:", wavesError);
    else setWaves(wavesData || []);

    // Fetch Sessions with counts and location
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select(
        "*, location:locations(name), session_drills(count), session_evaluators(count), session_intake_personnel(count), player_sessions(count)",
      )
      .eq("cohort_id", selectedCohortId)
      .eq("season_id", activeSeason.id)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (sessionsError) console.error("Error fetching sessions:", sessionsError);
    else {
      // Map wave number to session if possible
      const mappedSessions = ((sessionsData || []) as SessionFetchRow[]).map(
        (s) => ({
          ...s,
          location: s.location || null, // Ensure explicit null if undefined
          cohort: selectedCohort ? { name: selectedCohort.name } : null, // Add cohort info
          wave_number: s.wave_id
            ? wavesData?.find((w) => w.id === s.wave_id)?.wave_number
            : null,
        }),
      );
      setSessions((mappedSessions as unknown as SessionRowWithCounts[]) || []);
    }

    // Fetch Withdrawn Player Count
    const { count: withdrawnCount, error: withdrawnError } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("cohort_id", selectedCohortId)
      .eq("season_id", activeSeason.id)
      .eq("status", "withdrawn");

    if (withdrawnError)
      console.error("Error fetching withdrawn count:", withdrawnError);
    else setWithdrawnPlayerCount(withdrawnCount || 0);

    // Fetch Wave Assignments via sessions to determine unique player count per wave
    const { data: assignments, error: assignmentError } = await supabase
      .from("player_sessions")
      .select(
        `
        player_id,
        session:sessions!inner (
          wave_id,
          cohort_id
        )
      `,
      )
      .not("session.wave_id", "is", null)
      .eq("session.cohort_id", selectedCohortId);

    if (assignmentError)
      console.error("Error fetching wave assignments:", assignmentError);
    else {
      const counts = new Map<string, number>();
      const processed = new Map<string, Set<string>>(); // waveId -> Set<playerId>

      (assignments as WaveAssignmentRow[] | null)?.forEach((a) => {
        const waveId = a.session.wave_id;
        if (waveId) {
          if (!processed.has(waveId)) {
            processed.set(waveId, new Set());
          }
          processed.get(waveId)?.add(a.player_id);
        }
      });

      processed.forEach((playerSet, waveId) => {
        counts.set(waveId, playerSet.size);
      });
      setWaveAssignedCounts(counts);
    }

    setCohortLoading(false);
  };

  const sessionsPerWave = selectedCohort?.session_capacity
    ? Math.ceil((playerCount || 0) / selectedCohort.session_capacity)
    : 0;

  const totalSessionsNeeded =
    sessionsPerWave * (selectedCohort?.sessions_per_cohort || 0);

  // Helper to extract count safely
  const getCount = (arr: { count: number }[] | undefined) => {
    if (!arr || arr.length === 0) return 0;
    return arr[0].count;
  };

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time helper
  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-";
    // Check if it's already HH:MM format or full date
    if (timeString.includes("T")) {
      return new Date(timeString).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    // Assuming HH:MM:SS from database time column
    return timeString.split(":").slice(0, 2).join(":");
  };

  const resetCleanupState = () => {
    setCleanupWaveId("");
    setCleanupOptions({
      removeEvaluations: false,
      removeDrills: false,
      removeEvaluators: false,
      removeIntake: false,
      removePlayers: false,
      removeSchedule: false,
    });
  };

  const getWaveLabel = (waveId: string) => {
    const wave = waves.find((w) => w.id === waveId);
    if (!wave) return "Selected Wave";

    if (wave.wave_type === "standard") {
      return `Wave ${wave.wave_number}`;
    }

    return wave.custom_wave_name || `Wave ${wave.wave_number}`;
  };

  const openCleanupDialog = () => {
    const preselectedWave =
      filterWave !== "all" && filterWave !== "unassigned" ? filterWave : "";

    resetCleanupState();
    setCleanupWaveId(preselectedWave);
    setCleanupDialogOpen(true);
  };

  const resetCustomWaveState = () => {
    setCustomWaveStep(1);
    setCustomWaveName("");
    setCustomWaveSessionCount(1);
    setCustomWaveTeamsPerSession(2);
    setCustomWaveAlgorithm("alphabetical");
    setCustomWaveSessions([]);
    setCustomWavePlayerSearch("");
    setCustomWaveStatusFilter("active");
    setCustomWavePositionFilter("all");
    setCustomWaveLevelFilter("all");
    setCustomWaveSelectedPlayerIds(new Set());
  };

  const openCustomWaveDialog = async () => {
    if (!selectedCohortId || !activeSeason) {
      toast({
        title: "Select cohort first",
        description: "Please select a cohort with an active season.",
        variant: "destructive",
      });
      return;
    }
    resetCustomWaveState();

    // Fetch locations for session step
    if (currentAssociation?.association_id) {
      const { data } = await supabase
        .from("locations")
        .select("id, name")
        .eq("association_id", currentAssociation.association_id)
        .order("name");
      setCustomWaveLocations(data ?? []);
    }

    setCustomWaveDialogOpen(true);
  };

  const initCustomWaveSessions = () => {
    const today = new Date().toISOString().slice(0, 10);
    setCustomWaveSessions(
      Array.from({ length: customWaveSessionCount }, () => ({
        date: today,
        time: "18:00",
        locationId: "",
        duration: 90,
      })),
    );
  };

  const getCustomWaveSessionName = (index: number) => {
    const cohortPrefix = (selectedCohort?.name ?? "CUSTOM")
      .toUpperCase()
      .replace(/\s+/g, "-");
    const waveSuffix = customWaveName
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-");
    const num = (index + 1).toString().padStart(2, "0");
    return `${cohortPrefix}-${waveSuffix}-${num}`;
  };

  const getPositionName = (player: PlayerForCustomWave) =>
    (Array.isArray(player.position_types)
      ? player.position_types[0]?.name
      : player.position_types?.name) || "-";

  const getPreviousLevelName = (player: PlayerForCustomWave) =>
    (Array.isArray(player.previous_levels)
      ? player.previous_levels[0]?.name
      : player.previous_levels?.name) || "-";

  const getPreviousLevelRank = (player: PlayerForCustomWave) =>
    (Array.isArray(player.previous_levels)
      ? player.previous_levels[0]?.rank_order
      : player.previous_levels?.rank_order) ?? 999;

  const fetchCustomWavePlayers = async () => {
    if (!selectedCohortId || !activeSeason) return;

    const { data, error } = await supabase
      .from("players")
      .select(
        `
          *,
          position_types(name),
          previous_levels(name, rank_order)
        `,
      )
      .eq("cohort_id", selectedCohortId)
      .eq("season_id", activeSeason.id)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error fetching custom wave players:", error);
      toast({
        title: "Error",
        description: "Unable to load players for custom wave creation.",
        variant: "destructive",
      });
      return;
    }

    setCustomWavePlayers((data as PlayerForCustomWave[]) || []);
  };

  const filteredCustomWavePlayers = customWavePlayers.filter((player) => {
    const fullName = `${player.last_name}, ${player.first_name}`.toLowerCase();
    const searchMatch =
      !customWavePlayerSearch ||
      fullName.includes(customWavePlayerSearch.toLowerCase());

    const statusMatch =
      customWaveStatusFilter === "all" ||
      player.status === customWaveStatusFilter;

    const positionName = getPositionName(player);
    const positionMatch =
      customWavePositionFilter === "all" ||
      positionName === customWavePositionFilter;

    const levelName = getPreviousLevelName(player);
    const levelMatch =
      customWaveLevelFilter === "all" || levelName === customWaveLevelFilter;

    return searchMatch && statusMatch && positionMatch && levelMatch;
  });

  const customWavePositions = Array.from(
    new Set(
      customWavePlayers.map((p) => getPositionName(p)).filter((p) => p !== "-"),
    ),
  ).sort();

  const customWaveLevels = Array.from(
    new Set(
      customWavePlayers
        .map((p) => getPreviousLevelName(p))
        .filter((l) => l !== "-"),
    ),
  ).sort();

  const toggleCustomWavePlayer = (playerId: string) => {
    setCustomWaveSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const selectAllFilteredPlayers = () => {
    setCustomWaveSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      filteredCustomWavePlayers.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const clearFilteredPlayers = () => {
    setCustomWaveSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      filteredCustomWavePlayers.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const sortPlayersForAlgorithm = (
    selectedPlayers: PlayerForCustomWave[],
    algorithm: CustomWaveAlgorithm,
  ) => {
    const list = [...selectedPlayers];

    if (algorithm === "random") {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }

    if (
      algorithm === "previous_level_grouped" ||
      algorithm === "previous_level_balanced"
    ) {
      return list.sort((a, b) => {
        const rankDiff = getPreviousLevelRank(a) - getPreviousLevelRank(b);
        if (rankDiff !== 0) return rankDiff;
        const last = a.last_name.localeCompare(b.last_name);
        if (last !== 0) return last;
        return a.first_name.localeCompare(b.first_name);
      });
    }

    // alphabetical + current_ranking fallback
    return list.sort((a, b) => {
      const last = a.last_name.localeCompare(b.last_name);
      if (last !== 0) return last;
      return a.first_name.localeCompare(b.first_name);
    });
  };

  const assignPlayersToTeamsSnakeByLevel = (
    players: PlayerForCustomWave[],
    teamsPerSession: number,
  ) => {
    const safeTeamCount = Math.max(1, teamsPerSession);
    const orderedByLevel = [...players].sort((a, b) => {
      const rankDiff = getPreviousLevelRank(a) - getPreviousLevelRank(b);
      if (rankDiff !== 0) return rankDiff;
      const levelDiff = getPreviousLevelName(a).localeCompare(
        getPreviousLevelName(b),
      );
      if (levelDiff !== 0) return levelDiff;
      const last = a.last_name.localeCompare(b.last_name);
      if (last !== 0) return last;
      return a.first_name.localeCompare(b.first_name);
    });

    const levelGroups = new Map<string, PlayerForCustomWave[]>();
    orderedByLevel.forEach((player) => {
      const key = `${getPreviousLevelRank(player)}::${getPreviousLevelName(player)}`;
      if (!levelGroups.has(key)) levelGroups.set(key, []);
      levelGroups.get(key)!.push(player);
    });

    const teamBuckets: PlayerForCustomWave[][] = Array.from(
      { length: safeTeamCount },
      () => [],
    );

    let teamPointer = 0;
    let teamDirection: 1 | -1 = 1;

    for (const [, groupPlayers] of levelGroups) {
      for (const player of groupPlayers) {
        teamBuckets[teamPointer].push(player);
        if (safeTeamCount > 1) {
          if (teamDirection === 1) {
            if (teamPointer === safeTeamCount - 1) {
              teamDirection = -1;
            } else {
              teamPointer += 1;
            }
          } else {
            if (teamPointer === 0) {
              teamDirection = 1;
            } else {
              teamPointer -= 1;
            }
          }
        }
      }
    }

    return teamBuckets;
  };

  const distributePlayersAcrossSessions = (
    selectedPlayers: PlayerForCustomWave[],
    sessionIds: string[],
    teamsPerSession: number,
    algorithm: CustomWaveAlgorithm,
  ) => {
    const assignments: Array<{
      player_id: string;
      session_id: string;
      team_number: number;
    }> = [];

    if (selectedPlayers.length === 0 || sessionIds.length === 0)
      return assignments;

    if (algorithm === "previous_level_balanced") {
      const levelSortedPlayers = [...selectedPlayers].sort((a, b) => {
        const rankDiff = getPreviousLevelRank(a) - getPreviousLevelRank(b);
        if (rankDiff !== 0) return rankDiff;
        const levelDiff = getPreviousLevelName(a).localeCompare(
          getPreviousLevelName(b),
        );
        if (levelDiff !== 0) return levelDiff;
        const last = a.last_name.localeCompare(b.last_name);
        if (last !== 0) return last;
        return a.first_name.localeCompare(b.first_name);
      });

      const levelGroups = new Map<string, PlayerForCustomWave[]>();
      levelSortedPlayers.forEach((player) => {
        const key = `${getPreviousLevelRank(player)}::${getPreviousLevelName(player)}`;
        if (!levelGroups.has(key)) levelGroups.set(key, []);
        levelGroups.get(key)!.push(player);
      });

      const sessionBuckets: PlayerForCustomWave[][] = Array.from(
        { length: sessionIds.length },
        () => [],
      );

      let sessionPointer = 0;
      let sessionDirection: 1 | -1 = 1;

      let remaining = levelSortedPlayers.length;
      while (remaining > 0) {
        for (const [, players] of levelGroups) {
          const nextPlayer = players.shift();
          if (!nextPlayer) continue;
          sessionBuckets[sessionPointer].push(nextPlayer);
          remaining -= 1;

          if (sessionIds.length > 1) {
            if (sessionDirection === 1) {
              if (sessionPointer === sessionIds.length - 1) {
                sessionDirection = -1;
              } else {
                sessionPointer += 1;
              }
            } else {
              if (sessionPointer === 0) {
                sessionDirection = 1;
              } else {
                sessionPointer -= 1;
              }
            }
          }
        }
      }

      sessionBuckets.forEach((playersInSession, sessionIndex) => {
        const teams = assignPlayersToTeamsSnakeByLevel(
          playersInSession,
          teamsPerSession,
        );
        teams.forEach((teamPlayers, teamIndex) => {
          teamPlayers.forEach((player) => {
            assignments.push({
              player_id: player.id,
              session_id: sessionIds[sessionIndex],
              team_number: teamIndex + 1,
            });
          });
        });
      });

      return assignments;
    }

    const sortedPlayers = sortPlayersForAlgorithm(selectedPlayers, algorithm);

    const totalPlayers = sortedPlayers.length;
    const sessionCount = sessionIds.length;
    const base = Math.floor(totalPlayers / sessionCount);
    const remainder = totalPlayers % sessionCount;

    let cursor = 0;

    sessionIds.forEach((sessionId, index) => {
      const playersInSession = base + (index < remainder ? 1 : 0);

      for (let i = 0; i < playersInSession; i++) {
        const player = sortedPlayers[cursor++];
        if (!player) continue;
        const teamNumber = (i % Math.max(1, teamsPerSession)) + 1;
        assignments.push({
          player_id: player.id,
          session_id: sessionId,
          team_number: teamNumber,
        });
      }
    });

    return assignments;
  };

  const handleCreateCustomWave = async () => {
    if (!currentAssociation || !activeSeason || !selectedCohortId) return;

    const trimmedName = customWaveName.trim();
    if (!trimmedName) {
      toast({
        title: "Custom wave name required",
        description: "Please provide a descriptive custom wave name.",
        variant: "destructive",
      });
      return;
    }

    if (customWaveSessionCount < 1) {
      toast({
        title: "Invalid session count",
        description: "Custom wave must have at least one session.",
        variant: "destructive",
      });
      return;
    }

    const selectedPlayers = customWavePlayers.filter((p) =>
      customWaveSelectedPlayerIds.has(p.id),
    );

    if (selectedPlayers.length === 0) {
      toast({
        title: "No players selected",
        description: "Select at least one player for this custom wave.",
        variant: "destructive",
      });
      return;
    }

    setCreatingCustomWave(true);

    try {
      const { data: existingWaveName, error: existingWaveError } =
        await supabase
          .from("waves")
          .select("id")
          .eq("cohort_id", selectedCohortId)
          .eq("season_id", activeSeason.id)
          .eq("wave_type", "custom")
          .eq("custom_wave_name", trimmedName)
          .maybeSingle();

      if (existingWaveError) throw existingWaveError;
      if (existingWaveName) {
        toast({
          title: "Duplicate custom wave name",
          description: "A custom wave with this name already exists.",
          variant: "destructive",
        });
        return;
      }

      const { data: insertedWave, error: waveInsertError } = await supabase
        .from("waves")
        .insert({
          association_id: currentAssociation.association_id,
          season_id: activeSeason.id,
          cohort_id: selectedCohortId,
          wave_type: "custom",
          wave_number: null,
          custom_wave_name: trimmedName,
          status: "ready",
          teams_per_session: customWaveTeamsPerSession,
          distribution_algorithm: customWaveAlgorithm,
        })
        .select("id")
        .single();

      if (waveInsertError || !insertedWave) throw waveInsertError;

      const newSessions = customWaveSessions.map((s, index) => ({
        association_id: currentAssociation.association_id,
        season_id: activeSeason.id,
        cohort_id: selectedCohortId,
        wave_id: insertedWave.id,
        name: getCustomWaveSessionName(index),
        scheduled_date: s.date,
        scheduled_time: s.time + ":00",
        location_id: s.locationId || null,
        status: "ready",
        drill_config_locked: false,
        duration_minutes: s.duration,
      }));

      const { data: insertedSessions, error: sessionInsertError } =
        await supabase.from("sessions").insert(newSessions).select("id");

      if (sessionInsertError || !insertedSessions?.length)
        throw sessionInsertError;

      const sessionIds = insertedSessions.map((s) => s.id);
      const assignments = distributePlayersAcrossSessions(
        selectedPlayers,
        sessionIds,
        customWaveTeamsPerSession,
        customWaveAlgorithm,
      );

      const playerSessionRows = assignments.map((a) => ({
        association_id: currentAssociation.association_id,
        player_id: a.player_id,
        session_id: a.session_id,
        team_number: a.team_number,
      }));

      const { error: assignmentError } = await supabase
        .from("player_sessions")
        .insert(playerSessionRows);

      if (assignmentError) throw assignmentError;

      toast({
        title: "Custom wave created",
        description: `${trimmedName} created with ${customWaveSessionCount} sessions and ${selectedPlayers.length} selected players.`,
      });

      setCustomWaveDialogOpen(false);
      resetCustomWaveState();
      await fetchCohortData();
    } catch (error: unknown) {
      console.error("Error creating custom wave:", error);
      toast({
        title: "Failed to create custom wave",
        description: getErrorMessage(
          error,
          "An unexpected error occurred creating custom wave.",
        ),
        variant: "destructive",
      });
    } finally {
      setCreatingCustomWave(false);
    }
  };

  const setCleanupOption = (
    key: keyof typeof cleanupOptions,
    checked: boolean,
  ) => {
    setCleanupOptions((prev) => ({ ...prev, [key]: checked }));
  };

  const hasCleanupSelection = Object.values(cleanupOptions).some(Boolean);

  const handleWaveCleanup = async () => {
    if (!selectedCohortId || !activeSeason) return;

    if (!cleanupWaveId) {
      toast({
        title: "Wave required",
        description: "Select a wave before running data cleanup.",
        variant: "destructive",
      });
      return;
    }

    if (!hasCleanupSelection) {
      toast({
        title: "Cleanup option required",
        description: "Select at least one cleanup option.",
        variant: "destructive",
      });
      return;
    }

    const targetSessions = sessions.filter((s) => s.wave_id === cleanupWaveId);
    const sessionIds = targetSessions.map((s) => s.id);

    if (sessionIds.length === 0) {
      toast({
        title: "No sessions found",
        description: `${getWaveLabel(cleanupWaveId)} has no sessions to clean up.`,
        variant: "destructive",
      });
      return;
    }

    setCleanupInProgress(true);

    try {
      // Dependent cleanup ordering:
      // - Evaluations must be removed before player/session assignment deletions
      // - Schedule removal implies child cleanup first
      const shouldRemoveEvaluations =
        cleanupOptions.removeEvaluations ||
        cleanupOptions.removePlayers ||
        cleanupOptions.removeSchedule;
      const shouldRemoveDrills =
        cleanupOptions.removeDrills || cleanupOptions.removeSchedule;
      const shouldRemoveEvaluators =
        cleanupOptions.removeEvaluators || cleanupOptions.removeSchedule;
      const shouldRemoveIntake =
        cleanupOptions.removeIntake || cleanupOptions.removeSchedule;
      const shouldRemovePlayers =
        cleanupOptions.removePlayers || cleanupOptions.removeSchedule;

      if (shouldRemoveEvaluations) {
        const { error } = await supabase
          .from("evaluations")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (shouldRemoveDrills) {
        const { error } = await supabase
          .from("session_drills")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (shouldRemoveEvaluators) {
        const { error } = await supabase
          .from("session_evaluators")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (shouldRemoveIntake) {
        const { error } = await supabase
          .from("session_intake_personnel")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (shouldRemovePlayers) {
        const { error } = await supabase
          .from("player_sessions")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (cleanupOptions.removeSchedule) {
        const { error } = await supabase
          .from("sessions")
          .delete()
          .in("id", sessionIds);
        if (error) throw error;
      }

      toast({
        title: "Data cleanup complete",
        description: `Cleanup completed for ${getWaveLabel(cleanupWaveId)}.`,
      });

      setCleanupDialogOpen(false);
      resetCleanupState();
      await fetchCohortData();
    } catch (error: unknown) {
      console.error("Error during wave cleanup:", error);
      toast({
        title: "Cleanup failed",
        description: getErrorMessage(
          error,
          "Unable to complete selected cleanup actions.",
        ),
        variant: "destructive",
      });
    } finally {
      setCleanupInProgress(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesName =
      !filterName ||
      session.name.toLowerCase().includes(filterName.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || session.status === filterStatus;
    const matchesWave =
      filterWave === "all" ||
      (filterWave === "unassigned"
        ? !session.wave_id
        : session.wave_id === filterWave);
    return matchesName && matchesStatus && matchesWave;
  });

  const uniqueStatuses = Array.from(new Set(sessions.map((s) => s.status)));
  // Extract unique wave IDs and map to wave objects for the dropdown
  const availableWaves = waves.filter((w) =>
    sessions.some((s) => s.wave_id === w.id),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Scheduling Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage evaluations, waves, and session configurations.
          </p>
        </div>
        <div className="w-full md:w-[300px]">
          <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a cohort" />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map((cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedCohortId ? (
        <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center text-muted-foreground">
            <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <h3 className="text-lg font-medium">No Cohort Selected</h3>
            <p>Please select a cohort to manage scheduling.</p>
          </div>
        </div>
      ) : cohortLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Wave Management UI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Athletes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{playerCount}</div>
                <p className="text-xs text-muted-foreground">
                  Registered in {selectedCohort?.name}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Required Waves
                </CardTitle>
                <Waves className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedCohort?.sessions_per_cohort || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Min. sessions per athlete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Session Capacity
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedCohort?.session_capacity || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Athletes per session
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessions Per Wave
                </CardTitle>
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sessionsPerWave}</div>
                <p className="text-xs text-muted-foreground">
                  Calculated based on capacity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sessions
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSessionsNeeded}</div>
                <p className="text-xs text-muted-foreground">
                  Required to complete evaluations
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Waves List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Waves</CardTitle>
                <CardDescription>
                  Manage evaluation waves for this cohort.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={openCustomWaveDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Wave
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {waves.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No waves configured.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wave #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Algorithm</TableHead>
                      <TableHead>Teams/Session</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waves.map((wave) => (
                      <TableRow key={wave.id}>
                        <TableCell className="font-medium">
                          {wave.wave_type === "standard"
                            ? `Wave ${wave.wave_number}`
                            : wave.custom_wave_name}
                        </TableCell>
                        <TableCell className="capitalize">
                          {wave.wave_type}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {wave.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {wave.distribution_algorithm === "previous_level" ||
                          wave.distribution_algorithm ===
                            "previous_level_grouped"
                            ? "Previous Level (Grouped)"
                            : wave.distribution_algorithm ===
                                "previous_level_balanced"
                              ? "Previous Level (Balanced)"
                              : wave.distribution_algorithm?.replace("_", " ")}
                        </TableCell>
                        <TableCell>{wave.teams_per_session}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div
                              className="flex items-center gap-1"
                              title="Assigned Players"
                            >
                              <UserCheck className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-semibold text-green-600">
                                {waveAssignedCounts.get(wave.id) || 0}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-1"
                              title="Unassigned Players"
                            >
                              <Users className="h-4 w-4 text-red-500" />
                              <span className="text-sm font-semibold text-red-600">
                                {Math.max(
                                  0,
                                  playerCount -
                                    (waveAssignedCounts.get(wave.id) || 0),
                                )}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-1"
                              title="Withdrawn Players"
                            >
                              <UserX className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-semibold text-yellow-600">
                                {withdrawnPlayerCount}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={wave.wave_type === "custom"}
                            onClick={() => {
                              if (wave.wave_type === "custom") {
                                toast({
                                  title: "Custom wave already distributed",
                                  description:
                                    "Custom wave player distribution is set during custom wave creation.",
                                });
                                return;
                              }
                              setDistributionDialogState({ open: true, wave });
                            }}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Session Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Session Schedule</CardTitle>
                <CardDescription>
                  Manage individual evaluation sessions for this cohort.
                </CardDescription>
              </div>
              {sessions.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={openCleanupDialog}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Data Cleanup
                  </Button>
                  <Button onClick={() => setImportOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Import Schedule
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Filters */}
              {sessions.length > 0 && (
                <div className="mb-4 flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">
                      Search Session
                    </label>
                    <Input
                      placeholder="Filter by name..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="max-w-[300px]"
                    />
                  </div>
                  <div className="w-full space-y-2 md:w-[200px]">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {uniqueStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            <span className="capitalize">
                              {status.replace("_", " ")}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full space-y-2 md:w-[200px]">
                    <label className="text-sm font-medium">Wave</label>
                    <Select value={filterWave} onValueChange={setFilterWave}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Waves" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Waves</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {availableWaves.map((wave) => (
                          <SelectItem key={wave.id} value={wave.id}>
                            {wave.wave_type === "custom"
                              ? (wave.custom_wave_name ?? "Custom Wave")
                              : `Wave ${wave.wave_number}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {filteredSessions.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20">
                  <div className="text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium">
                      {sessions.length === 0
                        ? "No Sessions Scheduled"
                        : "No Matches Found"}
                    </h3>
                    <p className="mb-4 text-muted-foreground">
                      {sessions.length === 0
                        ? "There are no evaluation sessions scheduled for this cohort yet."
                        : "Try adjusting your filters to see more results."}
                    </p>
                    {sessions.length === 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setImportOpen(true)}
                      >
                        Import Schedule
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session Name</TableHead>
                      <TableHead>Date & Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Wave</TableHead>
                      <TableHead className="text-right">
                        Configuration
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => {
                      // Extract counts
                      const drillCount = getCount(session.session_drills);
                      const evaluatorCount = getCount(
                        session.session_evaluators,
                      );
                      const intakeCount = getCount(
                        session.session_intake_personnel,
                      );
                      const playerCount = getCount(session.player_sessions);

                      const waveNumber = session.wave_id
                        ? waves.find((w) => w.id === session.wave_id)
                            ?.wave_number
                        : null;

                      // Configuration validation (simple check: valid if counts > 0)
                      // In a real scenario, this would check specific rules (e.g. min drills, min evaluators)
                      const isDrillConfigured = drillCount > 0;

                      return (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium align-top">
                            {session.name}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col text-sm">
                              <span className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {formatDate(session.scheduled_date)}
                              </span>
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatTime(session.scheduled_time)}
                              </span>
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {session.location?.name || "No Location"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge
                              variant={
                                session.status === "completed"
                                  ? "default"
                                  : session.status === "in_progress"
                                    ? "secondary"
                                    : "outline"
                              }
                              className={cn(
                                "capitalize",
                                (session.status === "not_started" ||
                                  session.status === "draft") &&
                                  "border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
                              )}
                            >
                              {session.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            {waveNumber ? (
                              <Badge
                                className="cursor-pointer bg-black text-white hover:bg-black/90"
                                onClick={() =>
                                  setSummaryDialogState({
                                    open: true,
                                    session: {
                                      ...session,
                                      counts: {
                                        drills: drillCount,
                                        evaluators: evaluatorCount,
                                        intake: intakeCount,
                                        players: playerCount,
                                      },
                                    },
                                  })
                                }
                              >
                                Wave {waveNumber}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <div className="flex items-center justify-end gap-2">
                              <TooltipProvider>
                                {/* Drill Icon - Config */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-8 gap-1 px-2 border",
                                        isDrillConfigured
                                          ? "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 border-green-200"
                                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border-slate-200",
                                      )}
                                      onClick={() =>
                                        setDrillDialogState({
                                          open: true,
                                          session: {
                                            ...session,
                                            // Ensure location is not undefined
                                            location: session.location || null,
                                            // Inject cohort
                                            cohort: selectedCohort
                                              ? { name: selectedCohort.name }
                                              : null,
                                          },
                                        })
                                      }
                                    >
                                      <Drill className="h-4 w-4" />
                                      <span className="text-xs">
                                        {drillCount}
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Manage Drill Configuration
                                  </TooltipContent>
                                </Tooltip>

                                {/* Evaluator Icon */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-8 gap-1 px-2 border",
                                        evaluatorCount > 0
                                          ? "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 border-green-200"
                                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border-slate-200",
                                      )}
                                      onClick={() =>
                                        setEvaluatorDialogState({
                                          open: true,
                                          session: {
                                            ...session,
                                            location: session.location || null,
                                            cohort: selectedCohort
                                              ? { name: selectedCohort.name }
                                              : null,
                                          },
                                        })
                                      }
                                    >
                                      <IdCardLanyard className="h-4 w-4" />
                                      <span className="text-xs">
                                        {evaluatorCount}
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Assigned Evaluators
                                  </TooltipContent>
                                </Tooltip>

                                {/* Intake Icon */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-8 gap-1 px-2 border",
                                        intakeCount > 0
                                          ? "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 border-green-200"
                                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border-slate-200",
                                      )}
                                      onClick={() =>
                                        setIntakeDialogState({
                                          open: true,
                                          session: {
                                            ...session,
                                            location: session.location || null,
                                            cohort: selectedCohort
                                              ? { name: selectedCohort.name }
                                              : null,
                                          },
                                        })
                                      }
                                    >
                                      <ClipboardCheck className="h-4 w-4" />
                                      <span className="text-xs">
                                        {intakeCount}
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Assigned Intake Personnel
                                  </TooltipContent>
                                </Tooltip>

                                {/* Assigned Players Icon */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-8 gap-1 px-2 border",
                                        playerCount > 0
                                          ? "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 border-green-200"
                                          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border-slate-200",
                                      )}
                                      onClick={() =>
                                        setPlayerDialogState({
                                          open: true,
                                          session: {
                                            ...session,
                                            counts: {
                                              drills: drillCount,
                                              evaluators: evaluatorCount,
                                              intake: intakeCount,
                                              players: playerCount,
                                            },
                                          },
                                        })
                                      }
                                    >
                                      <Users className="h-4 w-4" />
                                      <span className="text-xs">
                                        {playerCount}
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Manage Players
                                  </TooltipContent>
                                </Tooltip>

                                {/* Summary Icon - Also opens summary */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500 hover:text-slate-700"
                                      onClick={() =>
                                        setSummaryDialogState({
                                          open: true,
                                          session: {
                                            ...session,
                                            counts: {
                                              drills: drillCount,
                                              evaluators: evaluatorCount,
                                              intake: intakeCount,
                                              players: playerCount,
                                            },
                                          },
                                        })
                                      }
                                    >
                                      <LayoutDashboard className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Summary</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <SessionBulkImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            autoGenerateNames={true}
            onSuccess={() => {
              fetchCohortData();
            }}
          />

          <AlertDialog
            open={cleanupDialogOpen}
            onOpenChange={(open) => {
              setCleanupDialogOpen(open);
              if (!open && !cleanupInProgress) resetCleanupState();
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Data Cleanup</AlertDialogTitle>
                <AlertDialogDescription>
                  Select a wave and choose what to remove. Cleanup actions apply
                  only to sessions in the selected wave.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Wave selection</div>
                  <Select
                    value={cleanupWaveId}
                    onValueChange={setCleanupWaveId}
                    disabled={cleanupInProgress}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select wave" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWaves.map((wave) => (
                        <SelectItem key={wave.id} value={wave.id}>
                          {getWaveLabel(wave.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Cleanup options</div>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cleanupOptions.removeEvaluations}
                      onCheckedChange={(checked) =>
                        setCleanupOption("removeEvaluations", Boolean(checked))
                      }
                      disabled={cleanupInProgress}
                    />
                    <span>Remove Evaluations</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cleanupOptions.removeDrills}
                      onCheckedChange={(checked) =>
                        setCleanupOption("removeDrills", Boolean(checked))
                      }
                      disabled={cleanupInProgress}
                    />
                    <span>Remove Drills</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cleanupOptions.removeEvaluators}
                      onCheckedChange={(checked) =>
                        setCleanupOption("removeEvaluators", Boolean(checked))
                      }
                      disabled={cleanupInProgress}
                    />
                    <span>Remove Evaluators</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cleanupOptions.removeIntake}
                      onCheckedChange={(checked) =>
                        setCleanupOption("removeIntake", Boolean(checked))
                      }
                      disabled={cleanupInProgress}
                    />
                    <span>Remove Intake</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cleanupOptions.removePlayers}
                      onCheckedChange={(checked) =>
                        setCleanupOption("removePlayers", Boolean(checked))
                      }
                      disabled={cleanupInProgress}
                    />
                    <span>Remove Players</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <Checkbox
                      checked={cleanupOptions.removeSchedule}
                      onCheckedChange={(checked) =>
                        setCleanupOption("removeSchedule", Boolean(checked))
                      }
                      disabled={cleanupInProgress}
                    />
                    <span>Remove Schedule</span>
                  </label>
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={cleanupInProgress}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleWaveCleanup}
                  disabled={
                    cleanupInProgress || !cleanupWaveId || !hasCleanupSelection
                  }
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {cleanupInProgress ? "Cleaning..." : "Run Cleanup"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog
            open={customWaveDialogOpen}
            onOpenChange={(open) => {
              setCustomWaveDialogOpen(open);
              if (!open && !creatingCustomWave) resetCustomWaveState();
            }}
          >
            <DialogContent className={customWaveStep <= 2 ? "max-w-lg" : "max-w-5xl"}>
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {["Configure", "Sessions", "Players", "Confirm"].map((label, i) => (
                  <span key={label} className="flex items-center gap-1">
                    {i > 0 && <span className="mx-1 text-muted-foreground">—</span>}
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${customWaveStep === i + 1 ? "bg-violet-600 text-white" : customWaveStep > i + 1 ? "bg-violet-200 text-violet-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <span className={customWaveStep === i + 1 ? "font-medium text-foreground" : ""}>{label}</span>
                  </span>
                ))}
              </div>

              {/* ── Step 1: Configure ──────────────────────────────── */}
              {customWaveStep === 1 && (
                <>
                  <DialogHeader>
                    <DialogTitle>Create Custom Wave</DialogTitle>
                    <DialogDescription>
                      Configure the custom wave settings.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-wave-name">Custom Wave Name</Label>
                      <Input
                        id="custom-wave-name"
                        value={customWaveName}
                        onChange={(e) => setCustomWaveName(e.target.value)}
                        placeholder="e.g. Goalie Evaluation"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-wave-sessions">
                        Number of Sessions
                      </Label>
                      <Input
                        id="custom-wave-sessions"
                        type="number"
                        min={1}
                        max={20}
                        value={customWaveSessionCount}
                        onChange={(e) =>
                          setCustomWaveSessionCount(
                            Math.max(1, Math.min(20, Number(e.target.value || 1))),
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-wave-algorithm">
                        Distribution Algorithm
                      </Label>
                      <Select
                        value={customWaveAlgorithm}
                        onValueChange={(value: CustomWaveAlgorithm) =>
                          setCustomWaveAlgorithm(value)
                        }
                      >
                        <SelectTrigger id="custom-wave-algorithm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alphabetical">Alphabetical</SelectItem>
                          <SelectItem value="random">Random</SelectItem>
                          <SelectItem value="previous_level_grouped">
                            Previous Level (Grouped)
                          </SelectItem>
                          <SelectItem value="previous_level_balanced">
                            Previous Level (Balanced)
                          </SelectItem>
                          <SelectItem value="current_ranking">
                            Current Ranking
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-wave-teams">Teams Per Session</Label>
                      <Select
                        value={String(customWaveTeamsPerSession)}
                        onValueChange={(value) =>
                          setCustomWaveTeamsPerSession(Number(value))
                        }
                      >
                        <SelectTrigger id="custom-wave-teams">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomWaveDialogOpen(false);
                        resetCustomWaveState();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-violet-600 hover:bg-violet-700"
                      disabled={!customWaveName.trim()}
                      onClick={() => {
                        initCustomWaveSessions();
                        setCustomWaveStep(2);
                      }}
                    >
                      Next: Add Sessions
                    </Button>
                  </DialogFooter>
                </>
              )}

              {/* ── Step 2: Add Sessions ──────────────────────────── */}
              {customWaveStep === 2 && (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      Add Sessions — {customWaveName}
                    </DialogTitle>
                    <DialogDescription>
                      Configure the {customWaveSessionCount} session{customWaveSessionCount !== 1 ? "s" : ""} for this custom wave.
                      Names are auto-generated.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 max-h-[400px] overflow-auto">
                    {customWaveSessions.map((session, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-border p-3 space-y-3"
                      >
                        <div className="text-sm font-medium text-foreground">
                          {getCustomWaveSessionName(index)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Date</Label>
                            <Input
                              type="date"
                              value={session.date}
                              onChange={(e) => {
                                const updated = [...customWaveSessions];
                                updated[index] = { ...updated[index], date: e.target.value };
                                setCustomWaveSessions(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Time</Label>
                            <Input
                              type="time"
                              value={session.time}
                              onChange={(e) => {
                                const updated = [...customWaveSessions];
                                updated[index] = { ...updated[index], time: e.target.value };
                                setCustomWaveSessions(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Location</Label>
                            <Select
                              value={session.locationId || "none"}
                              onValueChange={(value) => {
                                const updated = [...customWaveSessions];
                                updated[index] = { ...updated[index], locationId: value === "none" ? "" : value };
                                setCustomWaveSessions(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select location..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No location</SelectItem>
                                {customWaveLocations.map((loc) => (
                                  <SelectItem key={loc.id} value={loc.id}>
                                    {loc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Duration (min)</Label>
                            <Input
                              type="number"
                              min={15}
                              max={300}
                              value={session.duration}
                              onChange={(e) => {
                                const updated = [...customWaveSessions];
                                updated[index] = { ...updated[index], duration: Math.max(15, Number(e.target.value || 90)) };
                                setCustomWaveSessions(updated);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCustomWaveStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomWaveDialogOpen(false);
                        resetCustomWaveState();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-violet-600 hover:bg-violet-700"
                      onClick={() => setCustomWaveStep(3)}
                    >
                      Next: Select Players
                    </Button>
                  </DialogFooter>
                </>
              )}

              {/* ── Step 3: Select Players ────────────────────────── */}
              {customWaveStep === 3 && (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      Select Players — {customWaveName}
                    </DialogTitle>
                    <DialogDescription>
                      Choose which players to include in this custom wave.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={customWavePlayerSearch}
                        onChange={(e) => setCustomWavePlayerSearch(e.target.value)}
                        placeholder="Search players by last name, first name"
                        className="w-full md:w-80"
                      />

                      <Select
                        value={customWaveStatusFilter}
                        onValueChange={setCustomWaveStatusFilter}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={customWavePositionFilter}
                        onValueChange={setCustomWavePositionFilter}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Positions</SelectItem>
                          {customWavePositions.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={customWaveLevelFilter}
                        onValueChange={setCustomWaveLevelFilter}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Previous Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Previous Levels</SelectItem>
                          {customWaveLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllFilteredPlayers}
                      >
                        Select Filtered
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilteredPlayers}
                      >
                        Clear Filtered
                      </Button>
                    </div>

                    <div className="rounded-md border max-h-72 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">Pick</TableHead>
                            <TableHead>Last Name</TableHead>
                            <TableHead>First Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Previous Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCustomWavePlayers.map((player) => {
                            const checked = customWaveSelectedPlayerIds.has(
                              player.id,
                            );
                            return (
                              <TableRow
                                key={player.id}
                                className={checked ? "bg-violet-50/50" : ""}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      toggleCustomWavePlayer(player.id)
                                    }
                                  />
                                </TableCell>
                                <TableCell>{player.last_name}</TableCell>
                                <TableCell>{player.first_name}</TableCell>
                                <TableCell>{player.status}</TableCell>
                                <TableCell>{getPositionName(player)}</TableCell>
                                <TableCell>
                                  {getPreviousLevelName(player)}
                                </TableCell>
                              </TableRow>
                            );
                          })}

                          {filteredCustomWavePlayers.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-center text-muted-foreground"
                              >
                                No players match current filters.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Selected players: {customWaveSelectedPlayerIds.size}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCustomWaveStep(2)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomWaveDialogOpen(false);
                        resetCustomWaveState();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-violet-600 hover:bg-violet-700"
                      disabled={customWaveSelectedPlayerIds.size === 0}
                      onClick={() => setCustomWaveStep(4)}
                    >
                      Next: Review
                    </Button>
                  </DialogFooter>
                </>
              )}

              {/* ── Step 4: Confirm ───────────────────────────────── */}
              {customWaveStep === 4 && (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      Confirm — {customWaveName}
                    </DialogTitle>
                    <DialogDescription>
                      Review the custom wave configuration before creating.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Wave config summary */}
                    <div className="rounded-lg border border-border p-4 space-y-2">
                      <h4 className="text-sm font-semibold">Wave Configuration</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">Name</span>
                        <span>{customWaveName}</span>
                        <span className="text-muted-foreground">Algorithm</span>
                        <span className="capitalize">{customWaveAlgorithm.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">Teams per session</span>
                        <span>{customWaveTeamsPerSession}</span>
                        <span className="text-muted-foreground">Players selected</span>
                        <span>{customWaveSelectedPlayerIds.size}</span>
                      </div>
                    </div>

                    {/* Sessions summary */}
                    <div className="rounded-lg border border-border p-4 space-y-2">
                      <h4 className="text-sm font-semibold">Sessions ({customWaveSessions.length})</h4>
                      <div className="rounded-md border max-h-48 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Session Name</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customWaveSessions.map((s, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium text-sm">{getCustomWaveSessionName(i)}</TableCell>
                                <TableCell className="text-sm">{s.date}</TableCell>
                                <TableCell className="text-sm">{s.time}</TableCell>
                                <TableCell className="text-sm">
                                  {s.locationId
                                    ? customWaveLocations.find((l) => l.id === s.locationId)?.name ?? "—"
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-sm">{s.duration} min</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCustomWaveStep(3)}
                      disabled={creatingCustomWave}
                    >
                      Back
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomWaveDialogOpen(false);
                        resetCustomWaveState();
                      }}
                      disabled={creatingCustomWave}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-violet-600 hover:bg-violet-700"
                      onClick={handleCreateCustomWave}
                      disabled={creatingCustomWave}
                    >
                      {creatingCustomWave ? "Creating..." : "Create Custom Wave"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          {distributionDialogState.wave && (
            <WaveDistributionDialog
              open={distributionDialogState.open}
              onOpenChange={(open) =>
                setDistributionDialogState((prev) => ({ ...prev, open }))
              }
              wave={distributionDialogState.wave}
              onSuccess={() => fetchCohortData()}
            />
          )}

          {summaryDialogState.session && (
            <SessionSummaryDialog
              open={summaryDialogState.open}
              onOpenChange={(open) =>
                setSummaryDialogState((prev) => ({ ...prev, open }))
              }
              session={summaryDialogState.session}
            />
          )}

          {drillDialogState.session && (
            <DrillConfigurationDialog
              open={drillDialogState.open}
              onOpenChange={(open) =>
                setDrillDialogState((prev) => ({ ...prev, open }))
              }
              session={drillDialogState.session}
            />
          )}

          {evaluatorDialogState.session && (
            <SessionEvaluatorManagementDialog
              open={evaluatorDialogState.open}
              onOpenChange={(open) =>
                setEvaluatorDialogState((prev) => ({ ...prev, open }))
              }
              session={evaluatorDialogState.session}
              minEvaluators={activeSeason?.minimum_evaluators_per_athlete || 0}
              onUpdate={fetchCohortData}
            />
          )}

          {intakeDialogState.session && (
            <SessionIntakePersonnelManagementDialog
              open={intakeDialogState.open}
              onOpenChange={(open) =>
                setIntakeDialogState((prev) => ({ ...prev, open }))
              }
              session={intakeDialogState.session}
              onUpdate={fetchCohortData}
            />
          )}

          {playerDialogState.session && (
            <SessionPlayerManagementDialog
              open={playerDialogState.open}
              onOpenChange={(open) =>
                setPlayerDialogState((prev) => ({ ...prev, open }))
              }
              session={playerDialogState.session}
              onUpdate={fetchCohortData}
            />
          )}
        </>
      )}
    </div>
  );
}
