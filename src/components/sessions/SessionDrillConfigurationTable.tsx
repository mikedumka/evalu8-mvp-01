import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Filter,
  X,
  Copy,
  Activity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

import { ConfigureSessionDialog } from "./ConfigureSessionDialog";
import { CloneSessionDialog } from "./CloneSessionDialog";
import { SessionStatusDialog } from "./SessionStatusDialog";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  cohort: { name: string } | null;
  location: { name: string } | null;
  session_drills: {
    drill: { name: string } | null;
    applies_to_positions: string[];
  }[];
  session_intake_personnel: {
    user: { full_name: string | null } | null;
  }[];
  session_evaluators: {
    user: { full_name: string | null } | null;
  }[];
};

type ColumnKey =
  | "name"
  | "cohort"
  | "status"
  | "date"
  | "location"
  | "positions"
  | "drills"
  | "checkin"
  | "evaluators";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: SessionRow) => React.ReactNode;
  getSortValue?: (row: SessionRow) => string | number | Date | null;
}

type SortDirection = "asc" | "desc";

interface SortState {
  columnKey: ColumnKey;
  direction: SortDirection;
}

function sortRows(
  rows: SessionRow[],
  column: ColumnConfig,
  direction: SortDirection
): SessionRow[] {
  const modifier = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const getValue = column.getSortValue ?? column.getDisplayValue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aValue = getValue(a) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bValue = getValue(b) as any;

    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1 * modifier;
    if (bValue === null || bValue === undefined) return -1 * modifier;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * modifier;
    }

    if (aValue < bValue) return -1 * modifier;
    if (aValue > bValue) return 1 * modifier;
    return 0;
  });
}

interface SessionDrillConfigurationTableProps {}

export function SessionDrillConfigurationTable({}: SessionDrillConfigurationTableProps) {
  const { currentAssociation } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [positionMap, setPositionMap] = useState<Record<string, string>>({});

  const SESSION_COLUMNS = useMemo<ColumnConfig[]>(() => {
    return [
      {
        key: "name",
        label: "Session Name",
        getDisplayValue: (row) => (
          <span className="font-medium">{row.name}</span>
        ),
        getSortValue: (row) => row.name,
      },
      {
        key: "cohort",
        label: "Cohort",
        getDisplayValue: (row) => row.cohort?.name || "-",
        getSortValue: (row) => row.cohort?.name || "",
      },
      {
        key: "status",
        label: "Status",
        getDisplayValue: (row) => {
          const variant =
            row.status === "Completed"
              ? "default"
              : row.status === "In Progress"
              ? "secondary"
              : "outline";

          return (
            <Badge
              variant={variant}
              className={cn(
                "capitalize",
                row.status === "Completed" &&
                  "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
                row.status === "In Progress" &&
                  "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
              )}
            >
              {row.status}
            </Badge>
          );
        },
        getSortValue: (row) => row.status,
      },
      {
        key: "date",
        label: "Date / Time",
        getDisplayValue: (row) => (
          <div className="flex flex-col text-xs">
            <span>
              {new Date(row.scheduled_date).toLocaleDateString(undefined, {
                year: "2-digit",
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
            <span className="text-muted-foreground">{row.scheduled_time}</span>
            <span className="text-muted-foreground">
              {row.duration_minutes || 60} min
            </span>
          </div>
        ),
        getSortValue: (row) => `${row.scheduled_date} ${row.scheduled_time}`,
      },
      {
        key: "location",
        label: "Location",
        getDisplayValue: (row) => (
          <div className="flex flex-col text-xs">
            <span>{row.location?.name || "-"}</span>
          </div>
        ),
        getSortValue: (row) => row.location?.name || "",
      },
      {
        key: "positions",
        label: "Positions",
        getDisplayValue: (row) => {
          const posNames = Array.from(
            new Set(row.session_drills.flatMap((sd) => sd.applies_to_positions))
          )
            .map((id) => positionMap[id] || "Unknown")
            .sort();

          if (posNames.length === 0)
            return <span className="text-xs text-muted-foreground">-</span>;

          return (
            <div className="flex flex-col text-xs">
              {posNames.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          );
        },
      },
      {
        key: "drills",
        label: "Drills",
        getDisplayValue: (row) => {
          const drillNames = row.session_drills
            .map((sd) => sd.drill?.name)
            .filter(Boolean)
            .sort();

          if (drillNames.length === 0)
            return <span className="text-xs text-muted-foreground">-</span>;

          return (
            <div className="flex flex-col text-xs">
              {drillNames.map((name, i) => (
                <span key={i}>{name}</span>
              ))}
            </div>
          );
        },
      },
      {
        key: "checkin",
        label: "Check-in",
        getDisplayValue: (row) => {
          const names = row.session_intake_personnel
            .map((p) => p.user?.full_name)
            .filter(Boolean);

          if (names.length === 0)
            return <span className="text-xs text-muted-foreground">-</span>;

          return (
            <div className="flex flex-col text-xs">
              {names.map((name, i) => (
                <span key={i}>{name}</span>
              ))}
            </div>
          );
        },
      },
      {
        key: "evaluators",
        label: "Evaluators",
        getDisplayValue: (row) => {
          const names = row.session_evaluators
            .map((e) => e.user?.full_name)
            .filter(Boolean);

          if (names.length === 0)
            return <span className="text-xs text-muted-foreground">-</span>;

          return (
            <div className="flex flex-col text-xs">
              {names.map((name, i) => (
                <span key={i}>{name}</span>
              ))}
            </div>
          );
        },
      },
    ];
  }, [positionMap]);

  // Dialog State
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(
    null
  );
  const [activeAction, setActiveAction] = useState<
    "configure" | "clone" | "status" | null
  >(null);

  // Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [cohortFilter, setCohortFilter] = useState<string[]>([]);

  // Reference data for filters
  const [availableCohorts, setAvailableCohorts] = useState<string[]>([]);

  const [sortState, setSortState] = useState<SortState>({
    columnKey: "date",
    direction: "asc",
  });

  const fetchSessions = useCallback(async () => {
    if (!currentAssociation) return;
    setFetching(true);
    setFetchError(null);

    try {
      // 1. Get Active Season
      const { data: seasonData, error: seasonError } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .maybeSingle();

      if (seasonError) throw seasonError;

      if (!seasonData) {
        setActiveSeason(null);
        setSessions([]);
        setFetching(false);
        return;
      }

      setActiveSeason(seasonData);

      // 2. Get Position Types for Association
      const { data: posData, error: posError } = await supabase
        .from("position_types")
        .select("id, name")
        .eq("association_id", currentAssociation.association_id);

      if (posError) throw posError;

      const pMap: Record<string, string> = {};
      (posData || []).forEach((p) => {
        pMap[p.id] = p.name;
      });
      setPositionMap(pMap);

      // 3. Get Sessions for Active Season
      const { data, error } = await supabase
        .from("sessions")
        .select(
          `
          *,
          cohort:cohorts(name),
          location:locations(name),
          session_drills (
            drill:drills(name),
            applies_to_positions
          ),
          session_intake_personnel (
            user:users(full_name)
          ),
          session_evaluators (
            user:users(full_name)
          )
        `
        )
        .eq("association_id", currentAssociation.association_id)
        .eq("season_id", seasonData.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      const typedData = (data || []) as unknown as SessionRow[];
      setSessions(typedData);

      // Extract unique values for filters
      const cohorts = Array.from(
        new Set(
          typedData.map((s) => s.cohort?.name).filter(Boolean) as string[]
        )
      ).sort();
      setAvailableCohorts(cohorts);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setFetchError("Failed to load sessions.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Filtering & Sorting
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Search Term
      const searchString = `${s.name} ${s.location?.name || ""}`.toLowerCase();
      if (searchTerm && !searchString.includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Status Filter
      if (statusFilter.length > 0 && !statusFilter.includes(s.status)) {
        return false;
      }

      // Cohort Filter
      if (cohortFilter.length > 0) {
        const cohortName = s.cohort?.name || "No Cohort";
        if (!cohortFilter.includes(cohortName)) return false;
      }

      return true;
    });
  }, [sessions, searchTerm, statusFilter, cohortFilter]);

  const sortedSessions = useMemo(() => {
    const column = SESSION_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredSessions;
    return sortRows(filteredSessions, column, sortState.direction);
  }, [filteredSessions, sortState, SESSION_COLUMNS]);

  const handleSortToggle = (key: ColumnKey) => {
    setSortState((prev) => ({
      columnKey: key,
      direction:
        prev.columnKey === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleFilter = (
    currentFilters: string[],
    setFilters: (filters: string[]) => void,
    value: string
  ) => {
    if (currentFilters.includes(value)) {
      setFilters(currentFilters.filter((f) => f !== value));
    } else {
      setFilters([...currentFilters, value]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sessions..."
            className="max-w-[250px]"
          />
          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-dashed">
                <Filter className="mr-2 size-4" />
                Filters
                {(statusFilter.length > 0 || cohortFilter.length > 0) && (
                  <Badge
                    variant="secondary"
                    className="ml-2 rounded-sm px-1 font-normal lg:hidden"
                  >
                    {statusFilter.length + cohortFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {["Draft", "Ready", "In Progress", "Completed"].map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={() =>
                    toggleFilter(statusFilter, setStatusFilter, status)
                  }
                  className="capitalize"
                >
                  {status}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Cohort</DropdownMenuLabel>
              {availableCohorts.map((cohort) => (
                <DropdownMenuCheckboxItem
                  key={cohort}
                  checked={cohortFilter.includes(cohort)}
                  onCheckedChange={() =>
                    toggleFilter(cohortFilter, setCohortFilter, cohort)
                  }
                >
                  {cohort}
                </DropdownMenuCheckboxItem>
              ))}
              {(statusFilter.length > 0 || cohortFilter.length > 0) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      setStatusFilter([]);
                      setCohortFilter([]);
                    }}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {(statusFilter.length > 0 || cohortFilter.length > 0) && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter([]);
                setCohortFilter([]);
              }}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <X className="ml-2 size-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeSeason ? (
            <div className="mr-2 text-sm text-muted-foreground hidden md:block">
              Season:{" "}
              <span className="font-medium text-foreground">
                {activeSeason.name}
              </span>
            </div>
          ) : (
            <div className="mr-2 text-sm text-amber-600 hidden md:block">
              No Active Season
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchSessions()}
          >
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        {fetching ? (
          <div className="space-y-2 p-6">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-[85%]" />
            <Skeleton className="h-6 w-[90%]" />
          </div>
        ) : fetchError ? (
          <div className="p-6 text-sm text-destructive">{fetchError}</div>
        ) : !activeSeason ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <Filter className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No Active Season</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              You must activate a season in Season Management before you can
              configure sessions.
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No sessions found for the active season.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground">
                <tr>
                  {SESSION_COLUMNS.map((col) => (
                    <th key={col.key} className="px-4 py-3">
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSortToggle(col.key)}
                      >
                        {col.label}
                        {sortState.columnKey === col.key ? (
                          sortState.direction === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="w-14 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {sortedSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-muted/30">
                    {SESSION_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.getDisplayValue(session)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSession(session);
                              setActiveAction("configure");
                            }}
                          >
                            <Pencil className="mr-2 size-4" /> Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSession(session);
                              setActiveAction("clone");
                            }}
                          >
                            <Copy className="mr-2 size-4" /> Clone
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSession(session);
                              setActiveAction("status");
                            }}
                          >
                            <Activity className="mr-2 size-4" /> Status
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedSession && (
        <>
          <ConfigureSessionDialog
            open={activeAction === "configure"}
            onOpenChange={(open) => !open && setActiveAction(null)}
            session={selectedSession}
          />
          <CloneSessionDialog
            open={activeAction === "clone"}
            onOpenChange={(open) => !open && setActiveAction(null)}
            session={selectedSession}
            onSuccess={() => void fetchSessions()}
          />
          <SessionStatusDialog
            open={activeAction === "status"}
            onOpenChange={(open) => !open && setActiveAction(null)}
            session={selectedSession}
            onStatusChange={() => {
              void fetchSessions();
              setActiveAction(null);
            }}
          />
        </>
      )}
    </div>
  );
}
