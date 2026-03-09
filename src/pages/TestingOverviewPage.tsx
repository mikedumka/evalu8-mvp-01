import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Database,
  AlertCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { CohortSwitcher } from "@/components/cohorts/CohortSwitcher";

interface Wave {
  id: string;
  wave_number: number | null;
  custom_wave_name: string | null;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position_type_id: string;
  previous_level_id: string;
  position_types?: { name: string };
  previous_levels?: { name: string };
}

interface Session {
  id: string;
  name: string;
  scheduled_date: string;
  scheduled_time: string;
  location_id: string | null;
  locations?: { name: string };
  wave_id: string | null;
}

interface Evaluation {
  player_id: string;
  session_id: string;
  drill_id: string;
  evaluator_id: string;
  score: number;
}

interface SessionDrill {
  session_id: string;
  drill_id: string;
  weight_percent: number;
  applies_to_positions: string[];
}

interface PlayerSession {
  player_id: string;
  session_id: string;
  checked_in: boolean;
  no_show: boolean;
  jersey_number?: number | null;
  jersey_color?: string | null;
}

interface SessionEvaluator {
  session_id: string;
  user_id: string;
}

type SortConfig = {
  key: string;
  direction: "asc" | "desc" | null;
};

type FilterConfig = {
  last_name: string;
  first_name: string;
  position: string;
  level: string;
};

type ClearOptions = {
  removeEvaluations: boolean;
  resetCheckIn: boolean;
  resetSessionStatus: boolean;
  removeDrills: boolean;
  removeEvaluators: boolean;
  removeIntake: boolean;
  removePlayers: boolean;
};

export default function TestingOverviewPage() {
  const { currentAssociation } = useAuth();
  const { toast } = useToast();
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedWaveId, setSelectedWaveId] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [generateWaveId, setGenerateWaveId] = useState<string>("");
  const [clearWaveId, setClearWaveId] = useState<string>("");
  const [clearOptions, setClearOptions] = useState<ClearOptions>({
    removeEvaluations: true,
    resetCheckIn: true,
    resetSessionStatus: true,
    removeDrills: false,
    removeEvaluators: false,
    removeIntake: false,
    removePlayers: false,
  });

  // Data State
  const [waves, setWaves] = useState<Wave[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Sorting and Filtering
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "last_name",
    direction: "asc",
  });
  const [filters, setFilters] = useState<FilterConfig>({
    last_name: "",
    first_name: "",
    position: "",
    level: "",
  });

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [sessionDrills, setSessionDrills] = useState<SessionDrill[]>([]);
  const [playerSessions, setPlayerSessions] = useState<PlayerSession[]>([]);
  const [sessionEvaluators, setSessionEvaluators] = useState<
    SessionEvaluator[]
  >([]);

  useEffect(() => {
    if (selectedCohortId) {
      fetchData();
    }
  }, [selectedCohortId]);

  const getWaveLabel = (waveId: string) => {
    const wave = waves.find((w) => w.id === waveId);
    if (!wave) return "Selected wave";

    const waveText =
      wave.wave_number !== null ? `Wave ${wave.wave_number}` : "Custom Wave";

    return wave.custom_wave_name
      ? `${waveText} (${wave.custom_wave_name})`
      : waveText;
  };

  const getPositionName = (player: Player) =>
    (Array.isArray(player.position_types)
      ? (player.position_types[0] as any)?.name
      : player.position_types?.name) || "";

  const getApplicableDrillsForPlayer = (
    player: Player,
    sessionId: string,
    sourceDrills: SessionDrill[],
  ) => {
    const positionName = getPositionName(player);

    const matched = sourceDrills.filter(
      (sd) =>
        sd.session_id === sessionId &&
        (sd.applies_to_positions.includes(player.position_type_id) ||
          (!!positionName && sd.applies_to_positions.includes(positionName))),
    );

    // De-duplicate by drill_id in case position matching paths overlap
    const seen = new Set<string>();
    return matched.filter((d) => {
      if (seen.has(d.drill_id)) return false;
      seen.add(d.drill_id);
      return true;
    });
  };

  const generatePreflight = useMemo(() => {
    if (!generateWaveId) {
      return {
        waveSessions: 0,
        distributedAssignments: 0,
        distributedPlayers: 0,
        sessionsWithDrills: 0,
        sessionsWithEvaluators: 0,
        canGenerate: false,
      };
    }

    const waveSessions = sessions.filter((s) => s.wave_id === generateWaveId);
    const waveSessionIds = new Set(waveSessions.map((s) => s.id));

    const distributedAssignments = playerSessions.filter((ps) =>
      waveSessionIds.has(ps.session_id),
    );

    const distributedPlayers = new Set(
      distributedAssignments.map((ps) => ps.player_id),
    ).size;

    const sessionsWithDrills = new Set(
      sessionDrills
        .filter((sd) => waveSessionIds.has(sd.session_id))
        .map((sd) => sd.session_id),
    ).size;

    const sessionsWithEvaluators = new Set(
      sessionEvaluators
        .filter((se) => waveSessionIds.has(se.session_id))
        .map((se) => se.session_id),
    ).size;

    return {
      waveSessions: waveSessions.length,
      distributedAssignments: distributedAssignments.length,
      distributedPlayers,
      sessionsWithDrills,
      sessionsWithEvaluators,
      canGenerate: waveSessions.length > 0 && distributedAssignments.length > 0,
    };
  }, [
    generateWaveId,
    sessions,
    playerSessions,
    sessionDrills,
    sessionEvaluators,
  ]);

  const hasClearSelection = Object.values(clearOptions).some(Boolean);

  const resetClearOptions = () => {
    setClearOptions({
      removeEvaluations: true,
      resetCheckIn: true,
      resetSessionStatus: true,
      removeDrills: false,
      removeEvaluators: false,
      removeIntake: false,
      removePlayers: false,
    });
  };

  const setClearOption = (key: keyof ClearOptions, checked: boolean) => {
    setClearOptions((prev) => ({ ...prev, [key]: checked }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 0. Fetch Players with linked names
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select(
          `
            id, first_name, last_name, position_type_id, previous_level_id,
            position_types (name),
            previous_levels (name)
        `,
        )
        .eq("cohort_id", selectedCohortId)
        .order("last_name");

      if (playersError) throw playersError;
      if (playersData) setPlayers(playersData as any);

      // 1. Fetch Waves
      const { data: wavesData } = await supabase
        .from("waves")
        .select("id, wave_number, custom_wave_name")
        .eq("cohort_id", selectedCohortId)
        .order("wave_number", { ascending: true });
      if (wavesData) setWaves(wavesData);

      // 2. Fetch Sessions linked to Locations
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select(
          "id, name, scheduled_date, scheduled_time, wave_id, location_id, locations (name)",
        )
        .eq("cohort_id", selectedCohortId)
        .order("scheduled_date");

      if (sessionsError) throw sessionsError;

      // Fix types for locations join
      const formattedSessions =
        sessionsData?.map((s) => ({
          ...s,
          locations: s.locations as any as { name: string } | undefined,
        })) || [];

      setSessions(formattedSessions);

      if (formattedSessions.length > 0) {
        const sessionIds = formattedSessions.map((s) => s.id);

        // 3. Fetch Evaluations
        // Fetch in chunks to avoid row-limit truncation on larger cohorts/waves.
        const sessionIdChunks: string[][] = [];
        const chunkSize = 5;
        for (let i = 0; i < sessionIds.length; i += chunkSize) {
          sessionIdChunks.push(sessionIds.slice(i, i + chunkSize));
        }

        const allEvaluations: Evaluation[] = [];
        for (const sessionIdChunk of sessionIdChunks) {
          const { data: evalChunk, error: evalError } = await supabase
            .from("evaluations")
            .select("player_id, session_id, drill_id, evaluator_id, score")
            .in("session_id", sessionIdChunk);

          if (evalError) throw evalError;
          if (evalChunk?.length) {
            allEvaluations.push(...(evalChunk as Evaluation[]));
          }
        }

        setEvaluations(allEvaluations);

        // 4. Fetch Session Drills (Weights)
        const { data: drillData } = await supabase
          .from("session_drills")
          .select("session_id, drill_id, weight_percent, applies_to_positions")
          .in("session_id", sessionIds);
        if (drillData) setSessionDrills(drillData);

        // 5. Fetch Player Sessions (Attendance)
        const { data: psData } = await supabase
          .from("player_sessions")
          .select(
            "player_id, session_id, checked_in, no_show, jersey_number, jersey_color",
          )
          .in("session_id", sessionIds);
        if (psData) setPlayerSessions(psData);

        // 6. Fetch Evaluators
        const { data: seData } = await supabase
          .from("session_evaluators")
          .select("session_id, user_id")
          .in("session_id", sessionIds);
        if (seData) setSessionEvaluators(seData);
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error fetching data",
        description: e.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTestScores = async (waveId: string) => {
    if (!selectedCohortId || sessions.length === 0) return;
    if (!waveId) {
      toast({
        title: "Wave required",
        description: "Please select a wave before generating test data.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setShowGenerateDialog(false);

    try {
      const targetSessions = sessions.filter((s) => s.wave_id === waveId);

      if (targetSessions.length === 0) {
        toast({
          title: "No sessions found",
          description: `${getWaveLabel(waveId)} has no sessions configured.`,
          variant: "destructive",
        });
        return;
      }

      const targetSessionIds = new Set(targetSessions.map((s) => s.id));
      const distributedPlayersForWave = playerSessions.filter((ps) =>
        targetSessionIds.has(ps.session_id),
      );

      if (distributedPlayersForWave.length === 0) {
        toast({
          title: "No distributed players in wave",
          description:
            "Distribute players to sessions for this wave in the Scheduling Dashboard before generating test data.",
          variant: "destructive",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      let scoresCreated = 0;
      const currentUserId = userData?.user?.id;
      let workingSessionDrills = [...sessionDrills];
      const existingEvaluationKeys = new Set(
        evaluations
          .filter((e) => e.evaluator_id === currentUserId)
          .map(
            (e) =>
              `${e.session_id}|${e.player_id}|${e.drill_id}|${e.evaluator_id}`,
          ),
      );

      let skippedNoEvaluators = 0;
      let skippedNoPlayers = 0;
      let skippedNoDrills = 0;
      let skippedInsertFailures = 0;
      const sessionDiagnostics: Array<{
        sessionName: string;
        evaluatorCount: number;
        tempEvaluatorAdded: boolean;
        assignedPlayers: number;
        playersWithApplicableDrills: number;
        playersWithoutApplicableDrills: number;
        drillConfigRows: number;
        preparedRows: number;
        skippedExistingRows: number;
        insertedRows: number;
        status: string;
        insertError: string | null;
      }> = [];

      if (!currentUserId || !currentAssociation?.association_id) {
        toast({
          title: "Cannot generate test data",
          description:
            "You must be logged in with an active association context to seed evaluations.",
          variant: "destructive",
        });
        return;
      }

      console.log(`Generating data for ${targetSessions.length} sessions`);

      // Loop through each session
      for (const session of targetSessions) {
        // Find evaluators (display/diagnostic only)
        const evaluators = sessionEvaluators.filter(
          (se) => se.session_id === session.id,
        );
        console.log(
          `Session ${session.name} has ${evaluators.length} evaluators`,
        );

        // RLS-safe generation path: seed as the current user.
        // If policies require evaluator assignment, add temporary assignment for this session,
        // seed, then remove it to avoid changing configured evaluator counts.
        const alreadyAssignedAsEvaluator = evaluators.some(
          (e) => e.user_id === currentUserId,
        );

        let temporaryEvaluatorAssigned = false;
        if (!alreadyAssignedAsEvaluator) {
          const { error: addEvaluatorError } = await supabase
            .from("session_evaluators")
            .insert({
              session_id: session.id,
              user_id: currentUserId,
              association_id: currentAssociation.association_id,
            });

          if (addEvaluatorError) {
            skippedNoEvaluators++;
            sessionDiagnostics.push({
              sessionName: session.name,
              evaluatorCount: evaluators.length,
              tempEvaluatorAdded: false,
              assignedPlayers: 0,
              playersWithApplicableDrills: 0,
              playersWithoutApplicableDrills: 0,
              drillConfigRows: 0,
              preparedRows: 0,
              skippedExistingRows: 0,
              insertedRows: 0,
              status: "skipped_no_evaluator_context",
              insertError: addEvaluatorError.message || null,
            });
            console.warn(
              `Skipping session ${session.name} - Unable to assign temporary evaluator context:`,
              addEvaluatorError,
            );
            continue;
          }

          temporaryEvaluatorAssigned = true;
        }

        // Find players assigned TO THIS SESSION
        const assignedPlayers = distributedPlayersForWave.filter(
          (ps) => ps.session_id === session.id,
        );
        console.log(
          `Session ${session.name} has ${assignedPlayers.length} assigned players`,
        );

        if (assignedPlayers.length === 0) {
          skippedNoPlayers++;
          sessionDiagnostics.push({
            sessionName: session.name,
            evaluatorCount: evaluators.length,
            tempEvaluatorAdded: temporaryEvaluatorAssigned,
            assignedPlayers: 0,
            playersWithApplicableDrills: 0,
            playersWithoutApplicableDrills: 0,
            drillConfigRows: 0,
            preparedRows: 0,
            skippedExistingRows: 0,
            insertedRows: 0,
            status: "skipped_no_assigned_players",
            insertError: null,
          });
          console.warn(
            `Skipping session ${session.name} - No players assigned. Distribute players via Scheduling Dashboard first.`,
          );
          continue;
        }

        let drillsForSession = workingSessionDrills.filter(
          (sd) => sd.session_id === session.id,
        );

        // Fallback for testing flow: if this session has no drill config, clone from a configured session.
        if (
          drillsForSession.length === 0 &&
          currentAssociation?.association_id &&
          workingSessionDrills.length > 0
        ) {
          const templateSessionId =
            workingSessionDrills.find(
              (sd) => !targetSessionIds.has(sd.session_id),
            )?.session_id || workingSessionDrills[0]?.session_id;

          const templateDrills = workingSessionDrills.filter(
            (sd) => sd.session_id === templateSessionId,
          );

          if (templateDrills.length > 0) {
            const clonedDrills = templateDrills.map((sd) => ({
              session_id: session.id,
              drill_id: sd.drill_id,
              weight_percent: sd.weight_percent,
              applies_to_positions: sd.applies_to_positions,
              association_id: currentAssociation.association_id,
            }));

            const { error: cloneError } = await supabase
              .from("session_drills")
              .upsert(clonedDrills, { onConflict: "session_id,drill_id" });

            if (!cloneError) {
              workingSessionDrills = [
                ...workingSessionDrills,
                ...clonedDrills.map((cd) => ({
                  ...cd,
                  id: crypto.randomUUID(),
                  created_at: new Date().toISOString(),
                })),
              ];
              drillsForSession = workingSessionDrills.filter(
                (sd) => sd.session_id === session.id,
              );
            }
          }
        }

        if (drillsForSession.length === 0) {
          skippedNoDrills++;
          sessionDiagnostics.push({
            sessionName: session.name,
            evaluatorCount: evaluators.length,
            tempEvaluatorAdded: temporaryEvaluatorAssigned,
            assignedPlayers: assignedPlayers.length,
            playersWithApplicableDrills: 0,
            playersWithoutApplicableDrills: assignedPlayers.length,
            drillConfigRows: 0,
            preparedRows: 0,
            skippedExistingRows: 0,
            insertedRows: 0,
            status: "skipped_no_drill_configuration",
            insertError: null,
          });
          console.warn(
            `Skipping session ${session.name} - No drill configuration found for generation.`,
          );
          continue;
        }

        const sessionEvaluationsToInsert: any[] = [];
        let playersWithApplicableDrills = 0;
        let playersWithoutApplicableDrills = 0;
        let skippedExistingRows = 0;

        for (const ps of assignedPlayers) {
          // Find player details (for position)
          const player = players.find((p) => p.id === ps.player_id);
          if (!player) continue;

          const applicableDrills = getApplicableDrillsForPlayer(
            player,
            session.id,
            drillsForSession,
          );

          if (applicableDrills.length === 0) {
            playersWithoutApplicableDrills++;
          } else {
            playersWithApplicableDrills++;
          }

          // For testing overview seeding, score all session drills for every assigned player.
          // This avoids position-mapping drift between generation and display status checks.
          const finalDrills = drillsForSession;

          // Ensure checked in
          if (!ps.checked_in && !ps.no_show) {
            await supabase
              .from("player_sessions")
              .update({ checked_in: true })
              .match({ player_id: ps.player_id, session_id: session.id });
          }

          // Generate score for each drill for the current evaluator only (RLS-safe)
          for (const drill of finalDrills) {
            const evalKey = `${session.id}|${player.id}|${drill.drill_id}|${currentUserId}`;

            // Skip if already exists (from DB snapshot or current run)
            if (existingEvaluationKeys.has(evalKey)) {
              skippedExistingRows++;
              continue;
            }

            // Random Integer Score: 6 to 9 (inclusive)
            const score = Math.floor(Math.random() * 4) + 6;

            sessionEvaluationsToInsert.push({
              session_id: session.id,
              player_id: player.id,
              drill_id: drill.drill_id,
              evaluator_id: currentUserId,
              score: score,
              association_id: currentAssociation.association_id,
            });
            existingEvaluationKeys.add(evalKey);
          }
        }

        if (sessionEvaluationsToInsert.length > 0) {
          const { error: sessionInsertError } = await supabase
            .from("evaluations")
            .upsert(sessionEvaluationsToInsert, {
              onConflict: "player_id, session_id, drill_id, evaluator_id",
            });

          if (sessionInsertError) {
            skippedInsertFailures++;
            sessionDiagnostics.push({
              sessionName: session.name,
              evaluatorCount: evaluators.length,
              tempEvaluatorAdded: temporaryEvaluatorAssigned,
              assignedPlayers: assignedPlayers.length,
              playersWithApplicableDrills,
              playersWithoutApplicableDrills,
              drillConfigRows: drillsForSession.length,
              preparedRows: sessionEvaluationsToInsert.length,
              skippedExistingRows,
              insertedRows: 0,
              status: "insert_error",
              insertError: sessionInsertError.message || null,
            });
            console.error(
              `Error seeding evaluations for session ${session.name}:`,
              sessionInsertError,
            );
          } else {
            scoresCreated += sessionEvaluationsToInsert.length;
            sessionDiagnostics.push({
              sessionName: session.name,
              evaluatorCount: evaluators.length,
              tempEvaluatorAdded: temporaryEvaluatorAssigned,
              assignedPlayers: assignedPlayers.length,
              playersWithApplicableDrills,
              playersWithoutApplicableDrills,
              drillConfigRows: drillsForSession.length,
              preparedRows: sessionEvaluationsToInsert.length,
              skippedExistingRows,
              insertedRows: sessionEvaluationsToInsert.length,
              status: "seeded",
              insertError: null,
            });
          }
        } else {
          sessionDiagnostics.push({
            sessionName: session.name,
            evaluatorCount: evaluators.length,
            tempEvaluatorAdded: temporaryEvaluatorAssigned,
            assignedPlayers: assignedPlayers.length,
            playersWithApplicableDrills,
            playersWithoutApplicableDrills,
            drillConfigRows: drillsForSession.length,
            preparedRows: 0,
            skippedExistingRows,
            insertedRows: 0,
            status: "no_new_rows",
            insertError: null,
          });
        }

        if (temporaryEvaluatorAssigned) {
          console.log(
            `Session ${session.name}: added evaluator context for test-data seeding.`,
          );
        }
      }

      const diagnosticsTotals = {
        sessionsProcessed: sessionDiagnostics.length,
        sessionsSeeded: sessionDiagnostics.filter((d) => d.insertedRows > 0)
          .length,
        sessionsWithInsertErrors: sessionDiagnostics.filter(
          (d) => d.status === "insert_error",
        ).length,
        playersWithoutApplicableDrills: sessionDiagnostics.reduce(
          (sum, d) => sum + d.playersWithoutApplicableDrills,
          0,
        ),
        preparedRows: sessionDiagnostics.reduce((sum, d) => sum + d.preparedRows, 0),
        insertedRows: sessionDiagnostics.reduce((sum, d) => sum + d.insertedRows, 0),
        skippedExistingRows: sessionDiagnostics.reduce(
          (sum, d) => sum + d.skippedExistingRows,
          0,
        ),
      };

      console.group(`Test Data Diagnostics - ${getWaveLabel(waveId)}`);
      console.table(sessionDiagnostics);
      console.log("Totals:", diagnosticsTotals);
      console.groupEnd();

      const hasDiagnosticIssues =
        diagnosticsTotals.sessionsWithInsertErrors > 0 ||
        diagnosticsTotals.playersWithoutApplicableDrills > 0;

      toast({
        title: hasDiagnosticIssues
          ? "Generation diagnostics (issues found)"
          : "Generation diagnostics",
        description: `Sessions seeded: ${diagnosticsTotals.sessionsSeeded}/${diagnosticsTotals.sessionsProcessed}. Inserted rows: ${diagnosticsTotals.insertedRows}. Skipped existing rows: ${diagnosticsTotals.skippedExistingRows}. Players without applicable drills: ${diagnosticsTotals.playersWithoutApplicableDrills}. See console table for details.`,
        ...(hasDiagnosticIssues ? { variant: "destructive" as const } : {}),
      });

      if (scoresCreated === 0) {
        const reasons = [
          skippedNoEvaluators > 0
            ? `${skippedNoEvaluators} session(s) had no evaluator context`
            : null,
          skippedNoPlayers > 0
            ? `${skippedNoPlayers} session(s) had no distributed players`
            : null,
          skippedNoDrills > 0
            ? `${skippedNoDrills} session(s) had no drill configuration`
            : null,
          skippedInsertFailures > 0
            ? `${skippedInsertFailures} session(s) failed to insert evaluations`
            : null,
        ]
          .filter(Boolean)
          .join("; ");

        toast({
          title: "No test scores generated",
          description:
            reasons ||
            "No eligible drill/player/evaluator combinations were found for the selected wave.",
          variant: "destructive",
        });
        return;
      }

      // Automatically mark processed sessions as 'completed' to unblock subsequent waves
      const processedSessionIds = targetSessions.map((s) => s.id);
      if (processedSessionIds.length > 0) {
        const { error: completeError } = await supabase
          .from("sessions")
          .update({ status: "completed" })
          .in("id", processedSessionIds);

        if (completeError) {
          console.error("Error marking sessions complete:", completeError);
          toast({
            title: "Warning",
            description:
              "Scores generated, but failed to mark sessions as 'completed'.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Test Data Generated",
        description: `${getWaveLabel(waveId)}: Generated ${scoresCreated} new scores and marked ${processedSessionIds.length} sessions as completed.${
          skippedInsertFailures > 0
            ? ` ${skippedInsertFailures} session(s) encountered insert issues.`
            : ""
        }`,
      });
      await fetchData();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error generating data",
        description: e.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const clearTestData = async (waveId: string, options: ClearOptions) => {
    if (!selectedCohortId || sessions.length === 0) return;
    if (!waveId) {
      toast({
        title: "Wave required",
        description: "Please select a wave to clear.",
        variant: "destructive",
      });
      return;
    }

    if (!Object.values(options).some(Boolean)) {
      toast({
        title: "Select at least one cleanup option",
        description: "Choose at least one item to clear for the selected wave.",
        variant: "destructive",
      });
      return;
    }

    setClearing(true);
    setShowClearDialog(false);

    try {
      const targetSessions = sessions.filter((s) => s.wave_id === waveId);

      if (targetSessions.length === 0) {
        toast({
          title: "No sessions found",
          description: `${getWaveLabel(waveId)} has no sessions to clear.`,
          variant: "destructive",
        });
        return;
      }

      const sessionIds = targetSessions.map((s) => s.id);

      if (options.removeEvaluations) {
        const { error } = await supabase
          .from("evaluations")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (options.removeDrills) {
        const { error } = await supabase
          .from("session_drills")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (options.removeEvaluators) {
        const { error } = await supabase
          .from("session_evaluators")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (options.removeIntake) {
        const { error } = await supabase
          .from("session_intake_personnel")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (options.removePlayers) {
        const { error } = await supabase
          .from("player_sessions")
          .delete()
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (options.resetCheckIn && !options.removePlayers) {
        const { error } = await supabase
          .from("player_sessions")
          .update({ checked_in: false })
          .in("session_id", sessionIds);
        if (error) throw error;
      }

      if (options.resetSessionStatus) {
        const { error } = await supabase
          .from("sessions")
          .update({ status: "ready" })
          .in("id", sessionIds);
        if (error) throw error;
      }

      const summaryParts = [
        options.removeEvaluations ? "evaluations removed" : null,
        options.removeDrills ? "drills removed" : null,
        options.removeEvaluators ? "evaluators removed" : null,
        options.removeIntake ? "intake personnel removed" : null,
        options.removePlayers
          ? "player assignments removed"
          : options.resetCheckIn
            ? "check-in reset"
            : null,
        options.resetSessionStatus ? "session status reset to ready" : null,
      ].filter(Boolean);

      toast({
        title: "Test Data Cleared",
        description: `${getWaveLabel(waveId)}: ${summaryParts.join(", ")}.`,
      });

      await fetchData();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error clearing data",
        description: e.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const getStatus = (player: Player, session: Session) => {
    const attendance = playerSessions.find(
      (ps) => ps.player_id === player.id && ps.session_id === session.id,
    );

    // Not in this session
    if (!attendance) return { status: "not-assigned" as const };

    // Marked No Show
    if (attendance.no_show) return { status: "no-show" as const };

    // Find drills for this player's position using same matching logic as generator
    const applicableDrills = getApplicableDrillsForPlayer(
      player,
      session.id,
      sessionDrills,
    );

    if (applicableDrills.length === 0) return { status: "no-drills" as const };

    // Check completeness: Have ALL evaluators scored ALL drills?
    let evaluatorsForSession = sessionEvaluators.filter(
      (se) => se.session_id === session.id,
    );

    if (evaluatorsForSession.length === 0) {
      // If NO evaluators are assigned, auto-assign current user logic for complete display too?
      // No, 'no-evaluators' status is correct if they truly haven't assigned any.
      // But for TEST data generation, we auto-assign one.
      // If data IS generated, there ARE evaluations.
      // Let's check evaluations first.
      const evaluationsForSession = evaluations.filter(
        (e) => e.session_id === session.id && e.player_id === player.id,
      );
      if (evaluationsForSession.length > 0) {
        // Evaluators existed when data was generated but maybe removed? Or just rely on eval data.
        // Actually, we can derive evaluators from the evaluations themselves if session_evaluators is empty!
        const evaluatorIds = Array.from(
          new Set(evaluationsForSession.map((e) => e.evaluator_id)),
        );
        if (evaluatorIds.length > 0) {
          evaluatorsForSession = evaluatorIds.map((id) => ({
            session_id: session.id,
            user_id: id,
          }));
        } else {
          return { status: "no-evaluators" as const };
        }
      } else {
        return { status: "no-evaluators" as const };
      }
    }

    let completedDrills = 0;
    const totalRequiredDrills = applicableDrills.length;
    let missingCount = 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Check each drill
    for (const drill of applicableDrills) {
      // Get all evaluations for this drill/player/session
      const drillEvals = evaluations.filter(
        (e) =>
          e.session_id === session.id &&
          e.player_id === player.id &&
          e.drill_id === drill.drill_id,
      );

      // If there are ANY evaluations, use them.
      if (drillEvals.length > 0) {
        completedDrills++;
        // Calculate average for this drill (avg of all evaluators present)
        const drillSum = drillEvals.reduce((sum, e) => sum + e.score, 0);
        const drillAvg = drillSum / drillEvals.length;

        totalWeightedScore += drillAvg * drill.weight_percent;
        totalWeight += drill.weight_percent;
      } else {
        missingCount++;
      }
    }

    const isComplete =
      attendance.checked_in && completedDrills === totalRequiredDrills;

    // Calculate final score (scaled 0-100)
    // Weighted score is sum of (avg_score * weight). Weight is percent (e.g. 20).
    // Max score is 10. Max weight sum is 100. Max total is 1000.
    // We want 0-100. So divide by 10.
    const finalScore =
      totalWeight > 0 ? (totalWeightedScore / 10).toFixed(2) : "0.00";

    if (isComplete) {
      return { status: "complete" as const, score: finalScore };
    } else if (attendance.checked_in) {
      return { status: "incomplete" as const, missing: missingCount };
    } else {
      return { status: "not-checked-in" as const };
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    try {
      const [hours, minutes] = timeString.split(":");
      const h = parseInt(hours, 10);
      const suffix = h >= 12 ? "PM" : "AM";
      const formattedH = h % 12 || 12;
      return `${formattedH}:${minutes} ${suffix}`;
    } catch (e) {
      return timeString;
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Process data for display and sorting
  const processedData = useMemo(() => {
    if (!players.length) return [];

    return players.map((player) => {
      // Calculate per-wave outcomes
      const waveData = waves.reduce(
        (acc, w) => {
          const session = sessions.find(
            (s) =>
              s.wave_id === w.id &&
              playerSessions.some(
                (ps) => ps.player_id === player.id && ps.session_id === s.id,
              ),
          );
          let scoreVal = -1; // Default for sort (incomplete/missing < complete)
          let displayElement = (
            <div className="flex h-full items-center justify-start">
              <Badge variant="destructive">n/a</Badge>
            </div>
          );

          if (session) {
            const result = getStatus(player, session);
            const locationName = session.locations?.name || "TBD";
            const timeStr = formatTime(session.scheduled_time);

            // Extract score
            let scoreBadge = <Badge variant="destructive">n/a</Badge>;

            if (result.status === "complete") {
              scoreVal = parseFloat(result.score || "0");
              scoreBadge = (
                <Badge className="bg-green-600 hover:bg-green-700">
                  {result.score}%
                </Badge>
              );
            } else if (result.status === "incomplete") {
              scoreBadge = (
                <Badge
                  variant="outline"
                  className="text-red-600 border-red-200 bg-red-50"
                >
                  {result.missing} Missed
                </Badge>
              );
            } else if (result.status === "no-show") {
              scoreBadge = <Badge variant="secondary">No Show</Badge>;
            } else if (result.status === "not-checked-in") {
              scoreBadge = (
                <Badge
                  variant="outline"
                  className="text-blue-500 border-blue-200"
                >
                  Not Checked In
                </Badge>
              );
            }

            displayElement = (
              <div className="flex flex-col gap-1 text-left leading-tight">
                <div className="font-semibold text-primary">{session.name}</div>
                <div className="text-muted-foreground">
                  {new Date(session.scheduled_date).toLocaleDateString()}
                </div>
                <div className="text-muted-foreground">{timeStr}</div>
                <div className="text-muted-foreground">{locationName}</div>
                <div className="h-4"></div>
                <div className="flex justify-start">{scoreBadge}</div>
              </div>
            );
          }

          acc[w.id] = { score: scoreVal, element: displayElement };
          return acc;
        },
        {} as Record<string, { score: number; element: React.ReactNode }>,
      );

      // Calculate Totals
      let sessionsWithScores = 0;
      let totalScoreSum = 0;
      let assignedCount = 0;
      let attendedCount = 0;

      waves.forEach((w) => {
        const session = sessions.find(
          (s) =>
            s.wave_id === w.id &&
            playerSessions.some(
              (ps) => ps.player_id === player.id && ps.session_id === s.id,
            ),
        );
        if (session) {
          assignedCount++;
          const result = getStatus(player, session);
          if (result.status === "complete") {
            sessionsWithScores++;
            totalScoreSum += parseFloat(result.score || "0");
          }
          if (["complete", "incomplete", "no-show"].includes(result.status)) {
            attendedCount++;
          }
        }
      });

      const averageScore =
        sessionsWithScores > 0
          ? parseFloat((totalScoreSum / sessionsWithScores).toFixed(2))
          : -1;
      const displayScore =
        sessionsWithScores > 0
          ? (totalScoreSum / sessionsWithScores).toFixed(2)
          : null;

      const totalsElement = (
        <div className="flex flex-col h-full justify-between gap-4">
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Attended:</span>
              <span>
                {attendedCount} of {waves.length}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Scheduled:</span>
              <span>
                {assignedCount} of {waves.length}
              </span>
            </div>
          </div>
          <div>
            {displayScore ? (
              <Badge className="bg-green-600 hover:bg-green-700">
                {displayScore}%
              </Badge>
            ) : (
              <Badge variant="destructive">n/a</Badge>
            )}
          </div>
        </div>
      );

      return {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        position:
          (Array.isArray(player.position_types)
            ? (player.position_types[0] as any)?.name
            : player.position_types?.name) || "-",
        level:
          (Array.isArray(player.previous_levels)
            ? (player.previous_levels[0] as any)?.name
            : player.previous_levels?.name) || "-",
        waveData,
        averageScore,
        totalsElement,
      };
    });
  }, [players, sessions, evaluations, playerSessions, sessionDrills, waves]);

  const filteredAndSortedData = useMemo(() => {
    let data = [...processedData];

    // Filter
    if (filters.last_name) {
      data = data.filter((p) =>
        p.last_name.toLowerCase().includes(filters.last_name.toLowerCase()),
      );
    }
    if (filters.first_name) {
      data = data.filter((p) =>
        p.first_name.toLowerCase().includes(filters.first_name.toLowerCase()),
      );
    }
    if (filters.position) {
      data = data.filter((p) =>
        p.position.toLowerCase().includes(filters.position.toLowerCase()),
      );
    }
    if (filters.level) {
      data = data.filter((p) =>
        p.level.toLowerCase().includes(filters.level.toLowerCase()),
      );
    }

    // Sort
    if (sortConfig.key && sortConfig.direction) {
      data.sort((a, b) => {
        let aVal: any = "";
        let bVal: any = "";

        if (sortConfig.key.startsWith("wave_")) {
          const waveId = sortConfig.key.replace("wave_", "");
          aVal = a.waveData[waveId]?.score ?? -1;
          bVal = b.waveData[waveId]?.score ?? -1;
        } else if (sortConfig.key === "averageScore") {
          aVal = a.averageScore;
          bVal = b.averageScore;
        } else {
          // @ts-ignore
          aVal = a[sortConfig.key];
          // @ts-ignore
          bVal = b[sortConfig.key];
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [processedData, filters, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey)
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4 text-foreground" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4 text-foreground" />
    );
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Testing Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              Testing Overview
            </h2>
            <p className="text-sm text-muted-foreground">
              Monitor evaluation completeness and generate test data.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="Search players..."
              value={filters.last_name || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, last_name: e.target.value }))
              }
              className="max-w-[250px]"
            />

            <div className="w-[180px]">
              <Select
                value={selectedWaveId}
                onValueChange={setSelectedWaveId}
                disabled={!selectedCohortId || waves.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Wave" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Waves</SelectItem>
                  {waves.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      Wave {w.wave_number}
                      {w.custom_wave_name ? ` (${w.custom_wave_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[300px]">
              <CohortSwitcher
                selectedCohortId={selectedCohortId}
                onCohortChange={setSelectedCohortId}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setClearWaveId(selectedWaveId !== "all" ? selectedWaveId : "");
                resetClearOptions();
                setShowClearDialog(true);
              }}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={
                clearing ||
                generating ||
                !selectedCohortId ||
                sessions.length === 0 ||
                waves.length === 0
              }
            >
              {clearing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Clear Data
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setGenerateWaveId(
                  selectedWaveId !== "all" ? selectedWaveId : "",
                );
                setShowGenerateDialog(true);
              }}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
              disabled={
                clearing ||
                generating ||
                !selectedCohortId ||
                sessions.length === 0 ||
                waves.length === 0
              }
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Generate Test Data
            </Button>
          </div>
        </div>

        <AlertDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Generate test data by wave</AlertDialogTitle>
              <AlertDialogDescription>
                Select the wave to seed. Test data is generated only when the
                selected wave already has distributed players.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2">
              <div className="text-sm font-medium">Wave</div>
              <Select value={generateWaveId} onValueChange={setGenerateWaveId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wave" />
                </SelectTrigger>
                <SelectContent>
                  {waves.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {getWaveLabel(w.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {generateWaveId ? (
              <div className="rounded-md border bg-muted/20 p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sessions in Wave</span>
                  <span className="font-medium">{generatePreflight.waveSessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Distributed Assignments</span>
                  <span className="font-medium">{generatePreflight.distributedAssignments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unique Players Distributed</span>
                  <span className="font-medium">{generatePreflight.distributedPlayers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sessions with Drill Config</span>
                  <span className="font-medium">
                    {generatePreflight.sessionsWithDrills}/{generatePreflight.waveSessions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sessions with Evaluators</span>
                  <span className="font-medium">
                    {generatePreflight.sessionsWithEvaluators}/{generatePreflight.waveSessions}
                  </span>
                </div>
                <div className="pt-1">
                  {generatePreflight.canGenerate ? (
                    <Badge className="bg-green-600 hover:bg-green-700">
                      Ready to generate
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      Not ready: distribute players first
                    </Badge>
                  )}
                </div>
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={generating}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => generateTestScores(generateWaveId)}
                disabled={!generateWaveId || generating || !generatePreflight.canGenerate}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {generating ? "Generating..." : "Generate Data"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showClearDialog}
          onOpenChange={(open) => {
            setShowClearDialog(open);
            if (!open && !clearing) resetClearOptions();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                Select what data to clear for the selected wave. Cleanup is
                limited to sessions in that wave.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="text-sm font-medium">Wave to clear</div>
              <Select value={clearWaveId} onValueChange={setClearWaveId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wave" />
                </SelectTrigger>
                <SelectContent>
                  {waves.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {getWaveLabel(w.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-3">
                <div className="text-sm font-medium">Cleanup options</div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={clearOptions.removeEvaluations}
                    onCheckedChange={(checked) =>
                      setClearOption("removeEvaluations", Boolean(checked))
                    }
                    disabled={clearing}
                  />
                  <span>Remove Evaluations</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={clearOptions.resetCheckIn}
                    onCheckedChange={(checked) =>
                      setClearOption("resetCheckIn", Boolean(checked))
                    }
                    disabled={clearing || clearOptions.removePlayers}
                  />
                  <span>Reset Check-In</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={clearOptions.resetSessionStatus}
                    onCheckedChange={(checked) =>
                      setClearOption("resetSessionStatus", Boolean(checked))
                    }
                    disabled={clearing}
                  />
                  <span>Reset Session Status to Ready</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={clearOptions.removeDrills}
                    onCheckedChange={(checked) =>
                      setClearOption("removeDrills", Boolean(checked))
                    }
                    disabled={clearing}
                  />
                  <span>Remove Drills</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={clearOptions.removeEvaluators}
                    onCheckedChange={(checked) =>
                      setClearOption("removeEvaluators", Boolean(checked))
                    }
                    disabled={clearing}
                  />
                  <span>Remove Evaluators</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={clearOptions.removeIntake}
                    onCheckedChange={(checked) =>
                      setClearOption("removeIntake", Boolean(checked))
                    }
                    disabled={clearing}
                  />
                  <span>Remove Intake Personnel</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Checkbox
                    checked={clearOptions.removePlayers}
                    onCheckedChange={(checked) =>
                      setClearOption("removePlayers", Boolean(checked))
                    }
                    disabled={clearing}
                  />
                  <span>Remove Players Assigned</span>
                </label>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clearTestData(clearWaveId, clearOptions)}
                disabled={!clearWaveId || clearing || !hasClearSelection}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {clearing ? "Clearing..." : "Yes, clear selected wave"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!selectedCohortId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Select a Cohort</AlertTitle>
            <AlertDescription>
              Please select a cohort from the dropdown to view evaluation
              status.
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border flex-1 overflow-auto">
            <Table className="text-xs leading-tight">
              <TableHeader className="sticky top-0 bg-muted/40 z-30 shadow-sm border-b">
                <TableRow>
                  <TableHead className="w-[150px] font-bold text-foreground sticky left-0 bg-muted/40 z-40 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-middle">
                    <div
                      className="flex items-center cursor-pointer hover:bg-muted/50 p-1 rounded whitespace-nowrap"
                      onClick={() => handleSort("last_name")}
                    >
                      Last Name <SortIcon columnKey="last_name" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px] font-bold text-foreground sticky top-0 bg-muted/40 z-40 border-r align-middle">
                    <div
                      className="flex items-center cursor-pointer hover:bg-muted/50 p-1 rounded whitespace-nowrap"
                      onClick={() => handleSort("first_name")}
                    >
                      First Name <SortIcon columnKey="first_name" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px] font-bold text-foreground sticky top-0 bg-muted/40 z-40 border-r align-middle">
                    <div
                      className="flex items-center cursor-pointer hover:bg-muted/50 p-1 rounded whitespace-nowrap"
                      onClick={() => handleSort("position")}
                    >
                      Position <SortIcon columnKey="position" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px] font-bold text-foreground sticky top-0 bg-muted/40 z-40 border-r align-middle">
                    <div
                      className="flex items-center cursor-pointer hover:bg-muted/50 p-1 rounded whitespace-nowrap"
                      onClick={() => handleSort("level")}
                    >
                      Level <SortIcon columnKey="level" />
                    </div>
                  </TableHead>
                  {waves.map((w) => (
                    <TableHead
                      key={w.id}
                      className="min-w-[250px] text-left text-foreground border-r font-bold top-0 z-30 cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap"
                      onClick={() => handleSort(`wave_${w.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        {w.custom_wave_name || `Wave ${w.wave_number}`}
                        <SortIcon columnKey={`wave_${w.id}`} />
                      </div>
                    </TableHead>
                  ))}
                  <TableHead
                    className="min-w-[200px] text-left text-foreground font-bold bg-muted/40 sticky right-0 top-0 z-40 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap"
                    onClick={() => handleSort("averageScore")}
                  >
                    <div className="flex items-center justify-between h-full">
                      Totals
                      <SortIcon columnKey="averageScore" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={waves.length + 5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No players found matching current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((player) => (
                    <TableRow
                      key={player.id}
                      className="group hover:bg-muted/30 transition-colors border-b"
                    >
                      <TableCell className="font-medium sticky left-0 bg-background group-hover:bg-muted/30 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {player.last_name}
                      </TableCell>
                      <TableCell className="font-medium bg-background group-hover:bg-muted/30 border-r">
                        {player.first_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground border-r">
                        {player.position}
                      </TableCell>
                      <TableCell className="text-muted-foreground border-r">
                        {player.level}
                      </TableCell>

                      {waves.map((w) => (
                        <TableCell
                          key={w.id}
                          className="border-r align-top min-w-[200px]"
                        >
                          {player.waveData[w.id]?.element || (
                            <div className="text-center text-muted-foreground leading-tight">
                              -
                            </div>
                          )}
                        </TableCell>
                      ))}

                      <TableCell className="text-left font-medium bg-background group-hover:bg-muted/30 sticky right-0 z-20 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] align-top">
                        {player.totalsElement}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
