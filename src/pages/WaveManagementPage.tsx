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
  Plus,
  Wand2,
  Dumbbell,
  Users,
  ClipboardList,
  Contact,
  Waves,
} from "lucide-react";
import { WaveDistributionDialog } from "@/components/waves/WaveDistributionDialog";

type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type WaveRow = Database["public"]["Tables"]["waves"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  session_drills: { count: number }[];
  session_evaluators: { count: number }[];
  session_intake_personnel: { count: number }[];
  player_sessions: { count: number }[];
};

export function WaveManagementPage() {
  const { currentAssociation } = useAuth();
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [activeSeason, setActiveSeason] = useState<SeasonRow | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [waves, setWaves] = useState<WaveRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [distributionDialogState, setDistributionDialogState] = useState<{
    open: boolean;
    wave: WaveRow | null;
  }>({
    open: false,
    wave: null,
  });

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
      // Ignore no rows found
      console.error("Error fetching active season:", seasonError);
    } else {
      setActiveSeason(seasonData);
    }

    setLoading(false);
  };

  const fetchCohortData = async () => {
    if (!selectedCohortId || !activeSeason) return;

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

    // Fetch Sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select(
        "*, session_drills(count), session_evaluators(count), session_intake_personnel(count), player_sessions(count)"
      )
      .eq("cohort_id", selectedCohortId)
      .eq("season_id", activeSeason.id)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (sessionsError) console.error("Error fetching sessions:", sessionsError);
    else setSessions((sessionsData as unknown as SessionRow[]) || []);
  };

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);
  const sessionsPerWave =
    selectedCohort && selectedCohort.session_capacity > 0
      ? Math.ceil(playerCount / selectedCohort.session_capacity)
      : 0;

  const handleGenerateStandardWaves = async () => {
    if (!selectedCohort || !activeSeason || !currentAssociation) return;

    setGenerating(true);
    const numWaves = selectedCohort.sessions_per_cohort;

    // Check if we need to create more waves
    const existingWaveNumbers = waves.map((w) => w.wave_number);
    const newWaves = [];

    for (let i = 1; i <= numWaves; i++) {
      if (!existingWaveNumbers.includes(i)) {
        newWaves.push({
          association_id: currentAssociation.association_id,
          season_id: activeSeason.id,
          cohort_id: selectedCohort.id,
          wave_number: i,
          wave_type: "standard",
          status: "not_started",
          teams_per_session: 2, // Default
          distribution_algorithm: "alphabetical", // Default
        });
      }
    }

    if (newWaves.length > 0) {
      const { error } = await supabase.from("waves").insert(newWaves);
      if (error) {
        console.error("Error creating waves:", error);
        alert("Failed to create waves");
      } else {
        fetchCohortData();
      }
    }
    setGenerating(false);
  };

  const handleAssignSessions = async () => {
    if (!selectedCohort || !activeSeason || !currentAssociation) return;
    setAssigning(true);

    // Ensure waves exist first
    await handleGenerateStandardWaves();

    // Re-fetch waves to get IDs
    const { data: freshWaves } = await supabase
      .from("waves")
      .select("*")
      .eq("cohort_id", selectedCohortId)
      .eq("season_id", activeSeason.id)
      .order("wave_number", { ascending: true });

    if (!freshWaves) {
      setAssigning(false);
      return;
    }

    // Calculate assignments
    const updates = [];
    sessions.forEach((session, index) => {
      const proposedWaveNumber = Math.floor(index / sessionsPerWave) + 1;
      const wave = freshWaves.find((w) => w.wave_number === proposedWaveNumber);

      if (wave && session.wave_id !== wave.id) {
        updates.push({
          id: session.id,
          wave_id: wave.id,
        });
      }
    });

    if (updates.length > 0) {
      // Process updates in parallel
      await Promise.all(
        updates.map((update) =>
          supabase
            .from("sessions")
            .update({ wave_id: update.wave_id })
            .eq("id", update.id)
        )
      );
      fetchCohortData();
    }

    setAssigning(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Wave Management</h1>
        <div className="w-[250px]">
          <Select
            value={selectedCohortId}
            onValueChange={setSelectedCohortId}
            disabled={loading}
          >
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

      {!activeSeason ? (
        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/50">
          <div className="text-center">
            <h3 className="text-lg font-medium">No Active Season</h3>
            <p className="text-sm text-muted-foreground">
              You need an active season to manage waves.
            </p>
          </div>
        </div>
      ) : !selectedCohort ? (
        <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <h3 className="text-lg font-medium">No Cohort Selected</h3>
            <p className="text-sm text-muted-foreground">
              Select a cohort above to manage its waves and distribution.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Summary Card */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Athletes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{playerCount}</div>
                <p className="text-xs text-muted-foreground">
                  In {selectedCohort.name}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Required Waves
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedCohort.sessions_per_cohort}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on cohort settings
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Session Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedCohort.session_capacity}
                </div>
                <p className="text-xs text-muted-foreground">
                  Max athletes per session
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessions / Wave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sessionsPerWave}</div>
                <p className="text-xs text-muted-foreground">
                  Calculated requirement
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
                        <TableCell>
                          <Badge
                            variant={
                              wave.wave_type === "standard"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {wave.wave_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {wave.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {wave.distribution_algorithm?.replace("_", " ")}
                        </TableCell>
                        <TableCell>{wave.teams_per_session}</TableCell>
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

          {/* Session Assignment Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Session Assignment</CardTitle>
                <CardDescription>
                  Preview and assign sessions to waves based on chronological
                  order.
                </CardDescription>
              </div>
              <Button
                onClick={handleAssignSessions}
                disabled={assigning || sessions.length === 0}
              >
                {assigning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Assign Waves
              </Button>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No sessions found for this cohort.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session Name</TableHead>
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Wave</TableHead>
                      <TableHead>Proposed Wave</TableHead>
                      <TableHead className="text-right">
                        Configuration
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session, index) => {
                      const proposedWaveNumber =
                        Math.floor(index / sessionsPerWave) + 1;
                      const currentWave = waves.find(
                        (w) => w.id === session.wave_id
                      );

                      const drillCount =
                        session.session_drills?.[0]?.count || 0;
                      const evaluatorCount =
                        session.session_evaluators?.[0]?.count || 0;
                      const intakeCount =
                        session.session_intake_personnel?.[0]?.count || 0;
                      const playerCount =
                        session.player_sessions?.[0]?.count || 0;

                      return (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">
                            {session.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>
                                {new Date(
                                  session.scheduled_date
                                ).toLocaleDateString()}
                              </span>
                              <span className="text-muted-foreground">
                                {session.scheduled_time}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
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
                                session.status === "completed" &&
                                  "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
                                session.status === "in_progress" &&
                                  "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                              )}
                            >
                              {session.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {currentWave ? (
                              <Badge variant="outline">
                                Wave {currentWave.wave_number}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              Wave {proposedWaveNumber}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-3">
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  currentWave
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                                )}
                                title={
                                  currentWave
                                    ? "Wave Assigned"
                                    : "No Wave Assigned"
                                }
                              >
                                <Waves className="h-4 w-4" />
                                <span>{currentWave ? 1 : 0}</span>
                              </div>
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  drillCount > 0
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                                )}
                                title={`${drillCount} Drills Assigned`}
                              >
                                <Dumbbell className="h-4 w-4" />
                                <span>{drillCount}</span>
                              </div>
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  evaluatorCount > 0
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                                )}
                                title={`${evaluatorCount} Evaluators Assigned`}
                              >
                                <ClipboardList className="h-4 w-4" />
                                <span>{evaluatorCount}</span>
                              </div>
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  intakeCount > 0
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                                )}
                                title={`${intakeCount} Intake Staff Assigned`}
                              >
                                <Contact className="h-4 w-4" />
                                <span>{intakeCount}</span>
                              </div>
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  playerCount > 0
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                                )}
                                title={`${playerCount} Players Assigned`}
                              >
                                <Users className="h-4 w-4" />
                                <span>{playerCount}</span>
                              </div>
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
        </div>
      )}

      {/* Distribution Dialog */}
      {distributionDialogState.wave && (
        <WaveDistributionDialog
          open={distributionDialogState.open}
          onOpenChange={(open) =>
            setDistributionDialogState((prev) => ({ ...prev, open }))
          }
          wave={distributionDialogState.wave}
          onSuccess={() => {
            fetchCohortData();
          }}
        />
      )}
    </div>
  );
}
