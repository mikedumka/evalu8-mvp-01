import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Filter,
  X,
  ArrowDownToLine,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";
import { SessionDialog } from "./SessionDialog";
import { SessionBulkImportDialog } from "./SessionBulkImportDialog";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  cohort: { name: string } | null;
  location: { name: string } | null;
};

type ColumnKey = "name" | "cohort" | "status" | "date" | "location";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: SessionRow) => React.ReactNode;
  getSortValue?: (row: SessionRow) => string | number | Date | null;
}

const SESSION_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Session Name",
    getDisplayValue: (row) => <span className="font-medium">{row.name}</span>,
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
];

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

export function SessionsTable() {
  const { currentAssociation, hasRole } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<{
    id: string;
    name: string;
  } | null>(null);

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

  // Dialog States
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    session: SessionRow | null;
  }>({
    open: false,
    session: null,
  });

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    session: SessionRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    session: null,
    submitting: false,
    error: null,
  });

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Clear feedback after 6 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 6000);
    return () => clearTimeout(timer);
  }, [feedback]);

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

      // 2. Get Sessions for Active Season
      const { data, error } = await supabase
        .from("sessions")
        .select(
          `
          *,
          cohort:cohorts(name),
          location:locations(name)
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
  }, [filteredSessions, sortState]);

  const handleDeleteSession = async () => {
    const { session } = deleteDialogState;
    if (!session) return;

    setDeleteDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", session.id);

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Session deleted successfully.",
      });
      await fetchSessions();
      setDeleteDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      let message = "Failed to delete session.";
      if (err instanceof Error) message = err.message;
      setDeleteDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleSortToggle = (key: ColumnKey) => {
    setSortState((prev) => {
      if (prev.columnKey === key) {
        return {
          columnKey: key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { columnKey: key, direction: "asc" };
    });
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

  if (!hasRole("Administrator")) {
    return (
      <div className="p-6 text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={cn(
            "rounded-md border px-4 py-3 text-sm",
            feedback.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-600/60 dark:bg-emerald-950/50 dark:text-emerald-100"
              : "border-destructive/60 bg-destructive/10 text-destructive"
          )}
        >
          {feedback.message}
        </div>
      )}

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
            size="sm"
            onClick={() => setDialogState({ open: true, session: null })}
            disabled={!activeSeason}
          >
            <Plus className="mr-2 size-4" /> Create Session
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            disabled={!activeSeason}
          >
            <ArrowDownToLine className="mr-2 size-4" /> Import CSV
          </Button>
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
              create sessions.
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No sessions found for the active season. Create one to get started.
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
                            onClick={() =>
                              setDialogState({
                                open: true,
                                session,
                              })
                            }
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setDeleteDialogState({
                                open: true,
                                session,
                                submitting: false,
                                error: null,
                              })
                            }
                          >
                            <Trash2 className="mr-2 size-4" /> Delete
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
      <SessionDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        session={dialogState.session}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchSessions();
        }}
      />

      <SessionBulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchSessions();
        }}
      />

      <AlertDialog
        open={deleteDialogState.open}
        onOpenChange={(open) =>
          setDeleteDialogState((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteDialogState.session?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteDialogState.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteDialogState.error}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDialogState.submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDialogState.submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteSession();
              }}
            >
              {deleteDialogState.submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
