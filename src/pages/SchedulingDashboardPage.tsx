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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SessionBulkImportDialog } from "@/components/sessions/SessionBulkImportDialog";
import { WaveDistributionDialog } from "@/components/waves/WaveDistributionDialog";

type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type WaveRow = Database["public"]["Tables"]["waves"]["Row"];
// Define the session type with the related counts we need.
// Note: Supabase returns count as an array of objects like [{ count: 123 }]
type SessionRowWithCounts = Database["public"]["Tables"]["sessions"]["Row"] & {
  location?: { name: string } | null;
  session_drills: { count: number }[];
  session_evaluators: { count: number }[];
  session_intake_personnel: { count: number }[];
  player_sessions: { count: number }[];
};

export function SchedulingDashboardPage() {
  const { currentAssociation } = useAuth();
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [activeSeason, setActiveSeason] = useState<SeasonRow | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
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
    else setSessions((sessionsData as unknown as SessionRowWithCounts[]) || []);
    
    setCohortLoading(false);
  };

  const selectedCohort = cohorts.find((c) => c.id === selectedCohortId);
  
  // Wave Management UI Calculations
  const sessionsPerWave =
    selectedCohort && selectedCohort.session_capacity > 0
      ? Math.ceil(playerCount / selectedCohort.session_capacity)
      : 0;

  // Helper to extract count safely
  const getCount = (arr: { count: number }[] | undefined) => {
    if (!arr || arr.length === 0) return 0;
    return arr[0].count;
  };

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time helper
  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-";
    // Check if it's already HH:MM format or full date
    if (timeString.includes("T")) {
        return new Date(timeString).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    // Assuming HH:MM:SS from database time column
    return timeString.split(':').slice(0, 2).join(':');
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Scheduling Dashboard</h1>
          <p className="text-muted-foreground">
            Manage evaluations, waves, and session configurations.
          </p>
        </div>
        <div className="w-full md:w-[300px]">
          <Select
            value={selectedCohortId}
            onValueChange={setSelectedCohortId}
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

          {/* Session Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-semibold tracking-tight">Session Schedule</h2>
                 {sessions.length > 0 && (
                    <Button onClick={() => setImportOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Import Schedule
                    </Button>
                 )}
            </div>

            {sessions.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20">
                    <div className="text-center">
                        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium">No Sessions Scheduled</h3>
                        <p className="mb-4 text-muted-foreground">
                            There are no evaluation sessions scheduled for this cohort yet.
                        </p>
                         <Button variant="outline" onClick={() => setImportOpen(true)}>
                            Import Schedule
                         </Button>
                    </div>
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[18%] text-left">Session Name</TableHead>
                                <TableHead className="w-[18%] text-left">Date & Location</TableHead>
                                <TableHead className="w-[18%] text-left">Status</TableHead>
                                <TableHead className="w-[18%] text-left">Wave</TableHead>
                                <TableHead className="w-[28%] text-right">Configuration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.map((session) => {
                                // Extract counts
                                const drillCount = getCount(session.session_drills);
                                const evaluatorCount = getCount(session.session_evaluators);
                                const intakeCount = getCount(session.session_intake_personnel);
                                const playerCount = getCount(session.player_sessions);

                                // Find wave number if available. 
                                // session table has distinct wave_id but displaying wave number might require joining logic or using logic from SessionRow
                                // However, in our fetch we are not joining 'waves' table to get wave number directly on session row yet.
                                // Let's check session structure. It has 'wave_id'. Use 'waves' state to find number.
                                const waveNumber = session.wave_id
                                    ? waves.find(w => w.id === session.wave_id)?.wave_number
                                    : null;


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
                                                    <MapPin className="h-3 w-3" />
                                                    {session.location?.name || "No Location"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <Badge variant={
                                                session.status === "completed" ? "default" : 
                                                session.status === "in_progress" ? "secondary" : 
                                                "outline" // Default is usually outline, but we want 'draft' specifically styled
                                            } className={cn( "capitalize",
                                                // Specific styling for 'draft' or 'not_started' if that's the status
                                                // Assuming 'not_started' maps to outline/draft
                                                (session.status === "not_started" || session.status === "draft") && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200"
                                            )}>
                                                {session.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            {waveNumber ? (
                                              <Badge className="bg-black text-white hover:bg-black/90">Wave {waveNumber}</Badge>
                                            ) : (
                                              <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-top text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <TooltipProvider>
                                                    {/* Wave Icon */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                                                                <Waves className="h-4 w-4" />
                                                                <span className="text-xs">{waveNumber || 0}</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Wave Assignment</TooltipContent>
                                                    </Tooltip>

                                                    {/* Drill Icon */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" className={cn("h-8 gap-1 px-2", drillCount === 0 && "text-muted-foreground")}>
                                                                <Drill className="h-4 w-4" />
                                                                <span className="text-xs">{drillCount}</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Assigned Drills</TooltipContent>
                                                    </Tooltip>

                                                    {/* Evaluator Icon */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" className={cn("h-8 gap-1 px-2", evaluatorCount === 0 && "text-muted-foreground")}>
                                                                <IdCardLanyard className="h-4 w-4" />
                                                                <span className="text-xs">{evaluatorCount}</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Assigned Evaluators</TooltipContent>
                                                    </Tooltip>

                                                    {/* Intake Icon */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" className={cn("h-8 gap-1 px-2", intakeCount === 0 && "text-muted-foreground")}>
                                                                <ClipboardCheck className="h-4 w-4" />
                                                                <span className="text-xs">{intakeCount}</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Assigned Intake Personnel</TooltipContent>
                                                    </Tooltip>

                                                    {/* Assigned Players Icon */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" className={cn("h-8 gap-1 px-2", playerCount === 0 && "text-muted-foreground")}>
                                                                <Users className="h-4 w-4" />
                                                                <span className="text-xs">{playerCount}</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Assigned Players</TooltipContent>
                                                    </Tooltip>
                                                    
                                                     {/* Summary Icon */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                </div>
            )}
            
            <SessionBulkImportDialog 
                open={importOpen} 
                onOpenChange={setImportOpen} 
                onSuccess={(msg) => {
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
                seasonId={activeSeason?.id || ""}
                cohortId={selectedCohortId}
                onSuccess={fetchCohortData}
                />
            )}
          </div>
        </>
      )}
    </div>
  );
}
