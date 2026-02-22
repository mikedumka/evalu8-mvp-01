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

export function SchedulingDashboardPage() {
  const { currentAssociation } = useAuth();
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

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);

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
      const mappedSessions = (sessionsData as any[]).map((s) => ({
        ...s,
        location: s.location || null, // Ensure explicit null if undefined
        cohort: selectedCohort ? { name: selectedCohort.name } : null, // Add cohort info
        wave_number: s.wave_id
          ? wavesData?.find((w) => w.id === s.wave_id)?.wave_number
          : null,
      }));
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

      assignments?.forEach((a: any) => {
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

  const handleClearCohortSchedule = async () => {
    if (!selectedCohortId || !activeSeason) return;

    if (
      !window.confirm(
        "Are you sure you want to DELETE ALL sessions and waves for this cohort? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      // 1. Delete Sessions for this cohort
      const { error: sessErr } = await supabase
        .from("sessions")
        .delete()
        .eq("cohort_id", selectedCohortId)
        .eq("season_id", activeSeason.id);

      if (sessErr) {
        console.error("Error deleting sessions", sessErr);
        throw sessErr;
      }

      // 2. Delete Waves for this cohort (only standard ones or all?)
      // Assuming all waves for this cohort in this season
      const { error: waveErr } = await supabase
        .from("waves")
        .delete()
        .eq("cohort_id", selectedCohortId)
        .eq("season_id", activeSeason.id);

      if (waveErr) {
        console.error("Error deleting waves", waveErr);
        throw waveErr;
      }

      void fetchCohortData();
    } catch (err) {
      console.error("Error clearing schedule:", err);
      alert("Failed to clear schedule. Check console for details.");
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
                <Button variant="outline">
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
                            onClick={() =>
                              setDistributionDialogState({ open: true, wave })
                            }
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
                    onClick={handleClearCohortSchedule}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Schedule
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
                            Wave {wave.wave_number}:{" "}
                            {wave.custom_wave_name || "Standard"}
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
