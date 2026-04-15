import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/Login";
import { AdminPage } from "@/components/layout/AdminPage";
import { CohortSwitcher } from "@/components/cohorts/CohortSwitcher";
import { supabase } from "@/lib/supabase";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── types ──────────────────────────────────────────────────────────────────

interface Evaluation {
  session_id: string;
  player_id: string;
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

interface Session {
  id: string;
  name: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  location_id: string | null;
}

interface PlayerSession {
  player_id: string;
  session_id: string;
  checked_in: boolean;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: number;
  position_type_id: string;
  previous_level_id: string | null;
}

interface DrillDetail {
  drillName: string;
  score: number;
  weight: number;
  drillRank: number;
  drillPositionRank: number;
  evaluatorCount: number;
  totalEvaluators: number;
}

interface SessionDetail {
  sessionId: string;
  sessionName: string;
  scheduledDate: string;
  scheduledTime: string;
  locationName: string;
  sessionScore: number;
  sessionRank: number;
  sessionPositionRank: number;
  drillDetails: DrillDetail[];
}

interface PlayerRanking {
  playerId: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  positionId: string;
  positionName: string;
  previousLevelName: string;
  overallScore: number;
  overallRank: number;
  positionRank: number;
  sessionCount: number;
  totalSessions: number;
  sessionDetails: SessionDetail[];
}

type SortKey = "score" | "name" | "rank" | "positionRank" | "sessions";
type SortDir = "asc" | "desc";

// ── component ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user, loading: authLoading, currentAssociation } = useAuth();

  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [positionFilter, setPositionFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [modalSession, setModalSession] = useState<{
    player: PlayerRanking;
    session: SessionDetail;
  } | null>(null);

  // ── fetch & compute ────────────────────────────────────────────────────

  const computeRankings = useCallback(
    async (cohortId: string) => {
      if (!currentAssociation?.association_id || !cohortId) return;

      setLoading(true);
      setError(null);

      try {
        const associationId = currentAssociation.association_id;

        // Batch 1: independent lookups
        const [
          sessionsRes,
          playersRes,
          drillsRes,
          positionsRes,
          previousLevelsRes,
          locationsRes,
        ] = await Promise.all([
          supabase
            .from("sessions")
            .select(
              "id, name, status, scheduled_date, scheduled_time, location_id",
            )
            .eq("association_id", associationId)
            .eq("cohort_id", cohortId),
          supabase
            .from("players")
            .select(
              "id, first_name, last_name, birth_year, position_type_id, previous_level_id",
            )
            .eq("association_id", associationId)
            .eq("cohort_id", cohortId)
            .eq("status", "active"),
          supabase
            .from("drills")
            .select("id, name")
            .eq("association_id", associationId),
          supabase
            .from("position_types")
            .select("id, name")
            .eq("association_id", associationId),
          supabase
            .from("previous_levels")
            .select("id, name, rank_order")
            .eq("association_id", associationId),
          supabase
            .from("locations")
            .select("id, name")
            .eq("association_id", associationId),
        ]);

        const sessions: Session[] = sessionsRes.data ?? [];
        const players: Player[] = playersRes.data ?? [];
        const drillsList = drillsRes.data ?? [];
        const positionsList = positionsRes.data ?? [];
        const previousLevels = previousLevelsRes.data ?? [];
        const locationsList = locationsRes.data ?? [];

        setPositions(positionsList);

        if (sessions.length === 0 || players.length === 0) {
          setRankings([]);
          setLoading(false);
          return;
        }

        const sessionIds = sessions.map((s) => s.id);

        // Batch 2: session-scoped data (evaluations fetched with pagination to avoid 1000-row server limit)
        const [sessionDrillsRes, sessionEvalsRes] =
          await Promise.all([
            supabase
              .from("session_drills")
              .select("session_id, drill_id, weight_percent, applies_to_positions")
              .eq("association_id", associationId)
              .in("session_id", sessionIds),
            supabase
              .from("session_evaluators")
              .select("session_id, user_id")
              .eq("association_id", associationId)
              .in("session_id", sessionIds),
          ]);

        // Fetch evaluations per session to stay within row limits
        const evaluations: Evaluation[] = [];
        for (const sid of sessionIds) {
          let from = 0;
          const pageSize = 500;
          while (true) {
            const { data } = await supabase
              .from("evaluations")
              .select("session_id, player_id, drill_id, evaluator_id, score")
              .eq("association_id", associationId)
              .eq("session_id", sid)
              .range(from, from + pageSize - 1);
            if (!data || data.length === 0) break;
            evaluations.push(...(data as Evaluation[]));
            if (data.length < pageSize) break;
            from += pageSize;
          }
        }

        // Fetch player_sessions with pagination
        const playerSessions: PlayerSession[] = [];
        {
          let from = 0;
          const pageSize = 500;
          while (true) {
            const { data } = await supabase
              .from("player_sessions")
              .select("player_id, session_id, checked_in")
              .eq("association_id", associationId)
              .in("session_id", sessionIds)
              .range(from, from + pageSize - 1);
            if (!data || data.length === 0) break;
            playerSessions.push(...(data as PlayerSession[]));
            if (data.length < pageSize) break;
            from += pageSize;
          }
        }

        const sessionDrills: SessionDrill[] = sessionDrillsRes.data ?? [];

        // Build lookup maps
        const positionMap = new Map(positionsList.map((p) => [p.id, p.name]));
        const levelMap = new Map(previousLevels.map((l) => [l.id, l.name]));
        const drillMap = new Map(drillsList.map((d) => [d.id, d.name]));
        const locationMap = new Map(locationsList.map((l) => [l.id, l.name]));
        const sessionMap = new Map(sessions.map((s) => [s.id, s]));

        // Total evaluators per session
        const sessionEvaluatorCount = new Map<string, number>();
        const seBySession = new Map<string, Set<string>>();
        for (const se of sessionEvalsRes.data ?? []) {
          const set = seBySession.get(se.session_id) ?? new Set();
          set.add(se.user_id);
          seBySession.set(se.session_id, set);
        }
        for (const [sid, set] of seBySession) {
          sessionEvaluatorCount.set(sid, set.size);
        }

        // Group session_drills by session
        const sessionDrillMap = new Map<string, SessionDrill[]>();
        for (const sd of sessionDrills) {
          const list = sessionDrillMap.get(sd.session_id) ?? [];
          list.push(sd);
          sessionDrillMap.set(sd.session_id, list);
        }

        // Group evaluations by session+player+drill
        const mkKey = (sid: string, pid: string, did: string) =>
          `${sid}|${pid}|${did}`;
        const evalMap = new Map<string, Evaluation[]>();
        for (const e of evaluations) {
          const k = mkKey(e.session_id, e.player_id, e.drill_id);
          const list = evalMap.get(k) ?? [];
          list.push(e);
          evalMap.set(k, list);
        }

        // Group player_sessions by player
        const playerSessionMap = new Map<string, PlayerSession[]>();
        for (const ps of playerSessions) {
          const list = playerSessionMap.get(ps.player_id) ?? [];
          list.push(ps);
          playerSessionMap.set(ps.player_id, list);
        }

        // Player map for quick lookup
        const playerMap = new Map(players.map((p) => [p.id, p]));

        // ── Step 1: compute per-player per-session scores and per-drill averages ──

        // Structure: sessionId -> playerId -> { score, drills: Map<drillId, { avg, weight, evalCount }> }
        interface PlayerSessionScore {
          score: number;
          drills: Map<
            string,
            { avg: number; weight: number; evalCount: number }
          >;
        }
        const sessionPlayerScores = new Map<
          string,
          Map<string, PlayerSessionScore>
        >();

        for (const player of players) {
          const pSessions = playerSessionMap.get(player.id) ?? [];
          const checkedIn = pSessions.filter((ps) => ps.checked_in);

          for (const ps of checkedIn) {
            const drillsForSession =
              sessionDrillMap.get(ps.session_id) ?? [];
            const applicable = drillsForSession.filter(
              (sd) =>
                !sd.applies_to_positions ||
                sd.applies_to_positions.length === 0 ||
                sd.applies_to_positions.includes(player.position_type_id),
            );
            if (applicable.length === 0) continue;

            let totalWeighted = 0;
            let totalWeight = 0;
            const drillScores = new Map<
              string,
              { avg: number; weight: number; evalCount: number }
            >();

            for (const sd of applicable) {
              const evals =
                evalMap.get(
                  mkKey(ps.session_id, player.id, sd.drill_id),
                ) ?? [];
              if (evals.length > 0) {
                const avg =
                  evals.reduce((s, e) => s + e.score, 0) / evals.length;
                totalWeighted += avg * sd.weight_percent;
                totalWeight += sd.weight_percent;
                drillScores.set(sd.drill_id, {
                  avg,
                  weight: sd.weight_percent,
                  evalCount: evals.length,
                });
              }
            }

            if (totalWeight > 0) {
              const sessionScore = totalWeighted / 10;
              let playerScores = sessionPlayerScores.get(ps.session_id);
              if (!playerScores) {
                playerScores = new Map();
                sessionPlayerScores.set(ps.session_id, playerScores);
              }
              playerScores.set(player.id, {
                score: sessionScore,
                drills: drillScores,
              });
            }
          }
        }

        // ── Step 2: compute session ranks and drill ranks ──

        // For each session, rank all players by session score
        // sessionRanks: sessionId -> playerId -> { rank, positionRank }
        const sessionRanks = new Map<
          string,
          Map<string, { rank: number; positionRank: number }>
        >();
        // drillRanks: sessionId -> drillId -> playerId -> { rank, positionRank }
        const drillRanks = new Map<
          string,
          Map<string, Map<string, { rank: number; positionRank: number }>>
        >();

        for (const [sessionId, playerScores] of sessionPlayerScores) {
          // Session-level ranks
          const entries = [...playerScores.entries()].map(([pid, ps]) => ({
            pid,
            score: ps.score,
            positionId: playerMap.get(pid)?.position_type_id ?? "",
          }));

          // Overall session rank
          entries.sort((a, b) => b.score - a.score);
          const sRanks = new Map<
            string,
            { rank: number; positionRank: number }
          >();
          entries.forEach((e, i) => {
            sRanks.set(e.pid, { rank: i + 1, positionRank: 0 });
          });

          // Position ranks within session
          const byPosition = new Map<string, typeof entries>();
          for (const e of entries) {
            const list = byPosition.get(e.positionId) ?? [];
            list.push(e);
            byPosition.set(e.positionId, list);
          }
          for (const posEntries of byPosition.values()) {
            posEntries.sort((a, b) => b.score - a.score);
            posEntries.forEach((e, i) => {
              const r = sRanks.get(e.pid)!;
              r.positionRank = i + 1;
            });
          }
          sessionRanks.set(sessionId, sRanks);

          // Drill-level ranks
          const allDrillIds = new Set<string>();
          for (const ps of playerScores.values()) {
            for (const did of ps.drills.keys()) allDrillIds.add(did);
          }

          const sessionDrillRanks = new Map<
            string,
            Map<string, { rank: number; positionRank: number }>
          >();

          for (const drillId of allDrillIds) {
            const drillEntries: {
              pid: string;
              avg: number;
              positionId: string;
            }[] = [];
            for (const [pid, ps] of playerScores) {
              const d = ps.drills.get(drillId);
              if (d) {
                drillEntries.push({
                  pid,
                  avg: d.avg,
                  positionId: playerMap.get(pid)?.position_type_id ?? "",
                });
              }
            }
            drillEntries.sort((a, b) => b.avg - a.avg);
            const dRanks = new Map<
              string,
              { rank: number; positionRank: number }
            >();
            drillEntries.forEach((e, i) => {
              dRanks.set(e.pid, { rank: i + 1, positionRank: 0 });
            });
            // Position rank per drill
            const dByPos = new Map<string, typeof drillEntries>();
            for (const e of drillEntries) {
              const list = dByPos.get(e.positionId) ?? [];
              list.push(e);
              dByPos.set(e.positionId, list);
            }
            for (const posEntries of dByPos.values()) {
              posEntries.sort((a, b) => b.avg - a.avg);
              posEntries.forEach((e, i) => {
                const r = dRanks.get(e.pid)!;
                r.positionRank = i + 1;
              });
            }
            sessionDrillRanks.set(drillId, dRanks);
          }
          drillRanks.set(sessionId, sessionDrillRanks);
        }

        // ── Step 3: assemble per-player rankings with session details ──

        const playerRankings: PlayerRanking[] = [];

        for (const player of players) {
          const pSessions = playerSessionMap.get(player.id) ?? [];
          const checkedIn = pSessions.filter((ps) => ps.checked_in);
          if (checkedIn.length === 0) continue;

          const sessionDetails: SessionDetail[] = [];
          const sessionScores: number[] = [];

          for (const ps of checkedIn) {
            const playerScores = sessionPlayerScores.get(ps.session_id);
            const pScore = playerScores?.get(player.id);
            if (!pScore) continue;

            const session = sessionMap.get(ps.session_id);
            if (!session) continue;

            const sRank = sessionRanks.get(ps.session_id)?.get(player.id);
            const totalEvalsForSession =
              sessionEvaluatorCount.get(ps.session_id) ?? 0;

            const drillDetails: DrillDetail[] = [];
            const sessionDrillRanksMap = drillRanks.get(ps.session_id);

            for (const [drillId, drillData] of pScore.drills) {
              const dRank = sessionDrillRanksMap
                ?.get(drillId)
                ?.get(player.id);
              drillDetails.push({
                drillName: drillMap.get(drillId) ?? "Unknown",
                score: drillData.avg,
                weight: drillData.weight,
                drillRank: dRank?.rank ?? 0,
                drillPositionRank: dRank?.positionRank ?? 0,
                evaluatorCount: drillData.evalCount,
                totalEvaluators: totalEvalsForSession,
              });
            }

            sessionScores.push(pScore.score);
            sessionDetails.push({
              sessionId: ps.session_id,
              sessionName: session.name,
              scheduledDate: session.scheduled_date,
              scheduledTime: session.scheduled_time,
              locationName: session.location_id
                ? (locationMap.get(session.location_id) ?? "—")
                : "—",
              sessionScore: pScore.score,
              sessionRank: sRank?.rank ?? 0,
              sessionPositionRank: sRank?.positionRank ?? 0,
              drillDetails,
            });
          }

          if (sessionScores.length === 0) continue;

          const overallScore =
            sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length;

          // Sort session details by date
          sessionDetails.sort((a, b) =>
            a.scheduledDate.localeCompare(b.scheduledDate),
          );

          playerRankings.push({
            playerId: player.id,
            firstName: player.first_name,
            lastName: player.last_name,
            birthYear: player.birth_year,
            positionId: player.position_type_id,
            positionName: positionMap.get(player.position_type_id) ?? "Unknown",
            previousLevelName: player.previous_level_id
              ? (levelMap.get(player.previous_level_id) ?? "—")
              : "—",
            overallScore,
            overallRank: 0, // set below
            positionRank: 0, // set below
            sessionCount: checkedIn.length,
            totalSessions: pSessions.length,
            sessionDetails,
          });
        }

        // ── Step 4: compute overall ranks and position ranks ──

        playerRankings.sort((a, b) => b.overallScore - a.overallScore);
        playerRankings.forEach((r, i) => {
          r.overallRank = i + 1;
        });

        // Position ranks
        const byPosition = new Map<string, PlayerRanking[]>();
        for (const r of playerRankings) {
          const list = byPosition.get(r.positionId) ?? [];
          list.push(r);
          byPosition.set(r.positionId, list);
        }
        for (const posRankings of byPosition.values()) {
          posRankings.sort((a, b) => b.overallScore - a.overallScore);
          posRankings.forEach((r, i) => {
            r.positionRank = i + 1;
          });
        }

        setRankings(playerRankings);
      } catch (err) {
        console.error("Error computing rankings:", err);
        setError("Failed to compute rankings. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [currentAssociation?.association_id],
  );

  useEffect(() => {
    if (selectedCohortId) {
      computeRankings(selectedCohortId);
    } else {
      setRankings([]);
    }
  }, [selectedCohortId, computeRankings]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [positionFilter, pageSize, sortKey, sortDir]);

  // ── derived data ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (positionFilter === "all") return rankings;
    return rankings.filter((r) => r.positionId === positionFilter);
  }, [rankings, positionFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "score":
          return (a.overallScore - b.overallScore) * dir;
        case "rank":
          return (a.overallRank - b.overallRank) * dir;
        case "positionRank":
          return (a.positionRank - b.positionRank) * dir;
        case "name":
          return (
            `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`,
            ) * dir
          );
        case "sessions":
          return (a.sessionCount - b.sessionCount) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  // ── sort helpers ─────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "score" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3" />
    );
  };

  const SortableHead = ({
    col,
    label,
    className,
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap hover:text-foreground ${className ?? ""}`}
      onClick={() => handleSort(col)}
    >
      {label}
      <SortIcon col={col} />
    </TableHead>
  );

  // ── format helpers ───────────────────────────────────────────────────────

  const formatTime = (t: string) => {
    if (!t) return "";
    try {
      const [h, m] = t.split(":");
      const hr = parseInt(h, 10);
      return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
    } catch {
      return t;
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    try {
      const date = new Date(d + "T00:00:00");
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const currentYear = new Date().getFullYear();

  // ── auth guards ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <AdminPage
      title="Rankings Report"
      description="View final player rankings by cohort based on weighted evaluation scores."
    >
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Cohort
          </label>
          <CohortSwitcher
            selectedCohortId={selectedCohortId}
            onCohortChange={(id) => {
              setSelectedCohortId(id);
              setExpandedPlayerId(null);
              setCurrentPage(0);
            }}
            className="w-56"
          />
        </div>

        {rankings.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Position
              </label>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.length} player{filtered.length !== 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>

      {/* Loading / Error / Empty states */}
      {loading && (
        <div className="py-12 text-center text-muted-foreground">
          Computing rankings...
        </div>
      )}
      {error && (
        <div className="py-12 text-center text-destructive">{error}</div>
      )}
      {!loading && !error && selectedCohortId && rankings.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No evaluation data found for this cohort. Ensure sessions have been
          completed and scores entered.
        </div>
      )}
      {!loading && !selectedCohortId && (
        <div className="py-12 text-center text-muted-foreground">
          Select a cohort to view rankings.
        </div>
      )}

      {/* ── Screen 1: Rankings table ─────────────────────────────────────── */}
      {!loading && !error && sorted.length > 0 && (
        <>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead col="name" label="Player Name" />
                  <SortableHead
                    col="score"
                    label="Overall Score"
                    className="text-right"
                  />
                  <SortableHead
                    col="rank"
                    label="Overall Rank"
                    className="text-right"
                  />
                  <SortableHead
                    col="positionRank"
                    label="Position Rank"
                    className="text-right"
                  />
                  <SortableHead
                    col="sessions"
                    label="Sessions Attended"
                    className="text-right"
                  />
                  <TableHead className="w-16 text-center">
                    Additional Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => {
                  const isExpanded = expandedPlayerId === r.playerId;

                  return (
                    <Fragment key={r.playerId}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          setExpandedPlayerId(isExpanded ? null : r.playerId)
                        }
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {r.lastName}, {r.firstName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Position: {r.positionName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Age: {currentYear - r.birthYear}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Previous Level: {r.previousLevelName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {r.overallScore.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {r.overallRank}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.positionRank}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.sessionCount} of {r.totalSessions}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* ── Screen 2: Expanded session details ──────────── */}
                      {isExpanded && (
                        <TableRow key={`${r.playerId}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {r.sessionDetails.map((sd) => (
                                <div
                                  key={sd.sessionId}
                                  className="rounded-lg border border-border bg-background p-3"
                                >
                                  <div className="mb-2 text-sm font-medium">
                                    {sd.sessionName}
                                  </div>
                                  <div className="mb-2 text-xs text-muted-foreground">
                                    {formatDate(sd.scheduledDate)},{" "}
                                    {formatTime(sd.scheduledTime)},{" "}
                                    {sd.locationName}
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div>
                                      Session Score:{" "}
                                      <span className="font-mono font-medium">
                                        {sd.sessionScore.toFixed(1)}
                                      </span>
                                    </div>
                                    <div>
                                      Session Rank:{" "}
                                      <span className="font-medium">
                                        {sd.sessionRank}
                                      </span>
                                    </div>
                                    <div>
                                      Session Position Rank:{" "}
                                      <span className="font-medium">
                                        {sd.sessionPositionRank}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setModalSession({
                                        player: r,
                                        session: sd,
                                      });
                                    }}
                                  >
                                    <Info className="h-3 w-3" />
                                    Additional Session Details
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">
                Rows per page
              </label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Screen 3: Session scores modal ────────────────────────────────── */}
      <Dialog
        open={modalSession !== null}
        onOpenChange={(open) => {
          if (!open) setModalSession(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          {modalSession && (
            <>
              <DialogHeader>
                <DialogTitle>{modalSession.session.sessionName}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(modalSession.session.scheduledDate)},{" "}
                  {formatTime(modalSession.session.scheduledTime)},{" "}
                  {modalSession.session.locationName}
                </p>
              </DialogHeader>

              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drill</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">Rank</TableHead>
                      <TableHead className="text-right">Position</TableHead>
                      <TableHead className="text-right">Evaluated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalSession.session.drillDetails.map((d) => (
                      <TableRow key={d.drillName}>
                        <TableCell>{d.drillName}</TableCell>
                        <TableCell className="text-right font-mono">
                          {d.score.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.weight}%
                        </TableCell>
                        <TableCell className="text-right">
                          {d.drillRank}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.drillPositionRank}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.evaluatorCount} of {d.totalEvaluators}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-1 text-sm">
                <div>
                  Session Score:{" "}
                  <span className="font-mono font-medium">
                    {modalSession.session.sessionScore.toFixed(1)}
                  </span>
                </div>
                <div>
                  Session Rank:{" "}
                  <span className="font-medium">
                    {modalSession.session.sessionRank}
                  </span>
                </div>
                <div>
                  Session Position Rank:{" "}
                  <span className="font-medium">
                    {modalSession.session.sessionPositionRank}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
