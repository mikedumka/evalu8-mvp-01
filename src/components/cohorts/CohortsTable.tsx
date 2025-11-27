import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  PencilRuler,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { CohortDialog } from "./CohortDialog";

type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type PlayerRow = Pick<
  Database["public"]["Tables"]["players"]["Row"],
  "id" | "cohort_id"
>;

type CohortWithCounts = CohortRow & {
  playerCount: number;
};

type ColumnKey =
  | "name"
  | "status"
  | "config"
  | "playerCount"
  | "sessionsRequired"
  | "sessionsScheduled"
  | "createdAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: CohortWithCounts) => React.ReactNode;
  getSortValue?: (row: CohortWithCounts) => string | number | Date | null;
}

const COHORT_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => <span className="font-medium">{row.name}</span>,
    getSortValue: (row) => row.name,
  },
  {
    key: "status",
    label: "Status",
    getDisplayValue: (row) => (
      <Badge
        variant={row.status === "active" ? "default" : "secondary"}
        className={cn(
          "capitalize",
          row.status === "active"
            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
        )}
      >
        {row.status}
      </Badge>
    ),
    getSortValue: (row) => row.status,
  },
  {
    key: "config",
    label: "Configuration",
    getDisplayValue: (row) => (
      <div className="flex flex-col text-xs text-muted-foreground">
        <span>Sessions: {row.sessions_per_cohort}</span>
        <span>Capacity: {row.session_capacity}</span>
      </div>
    ),
    getSortValue: (row) => row.session_capacity,
  },
  {
    key: "playerCount",
    label: "Players",
    align: "left",
    getDisplayValue: (row) => row.playerCount,
  },
  {
    key: "sessionsRequired",
    label: "Sessions Required",
    align: "left",
    getDisplayValue: (row) => {
      const required =
        Math.ceil(row.playerCount / row.session_capacity) *
        row.sessions_per_cohort;
      return <span>{required}</span>;
    },
    getSortValue: (row) =>
      Math.ceil(row.playerCount / row.session_capacity) *
      row.sessions_per_cohort,
  },
  {
    key: "sessionsScheduled",
    label: "Sessions Scheduled",
    align: "left",
    getDisplayValue: () => <span className="text-muted-foreground">-</span>,
    getSortValue: () => 0,
  },
  {
    key: "createdAt",
    label: "Created",
    getDisplayValue: (row) =>
      new Date(row.created_at).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    getSortValue: (row) => new Date(row.created_at).getTime(),
  },
];

type SortDirection = "asc" | "desc";

interface SortState {
  columnKey: ColumnKey;
  direction: SortDirection;
}

function sortRows(
  rows: CohortWithCounts[],
  column: ColumnConfig,
  direction: SortDirection
): CohortWithCounts[] {
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

export function CohortsTable() {
  const { currentAssociation, hasRole } = useAuth();
  const [cohorts, setCohorts] = useState<CohortWithCounts[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "name",
    "status",
    "config",
    "playerCount",
    "sessionsRequired",
    "sessionsScheduled",
    "createdAt",
  ]);
  const [sortState, setSortState] = useState<SortState>({
    columnKey: "name",
    direction: "asc",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog States
  const [createDialogState, setCreateDialogState] = useState<{
    open: boolean;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    submitting: false,
    error: null,
  });

  const [editDialogState, setEditDialogState] = useState<{
    open: boolean;
    cohort: CohortRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    cohort: null,
    submitting: false,
    error: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    cohort: CohortWithCounts | null;
    submitting: boolean;
  }>({
    open: false,
    cohort: null,
    submitting: false,
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

  const fetchCohorts = useCallback(async () => {
    if (!currentAssociation) return;

    setFetching(true);
    setFetchError(null);

    try {
      // 1. Fetch Cohorts
      const { data: cohortsData, error: cohortsError } = await supabase
        .from("cohorts")
        .select("*")
        .eq("association_id", currentAssociation.association_id);

      if (cohortsError) throw cohortsError;

      // 2. Fetch Active Season
      const { data: seasonData } = await supabase
        .from("seasons")
        .select("id")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .limit(1);

      const activeSeasonId = seasonData?.[0]?.id;
      let counts: Record<string, number> = {};

      // 3. Fetch Player Counts if season exists
      if (activeSeasonId && cohortsData && cohortsData.length > 0) {
        const cohortIds = cohortsData.map((c) => c.id);
        const { data: playerData } = await supabase
          .from("players")
          .select("cohort_id")
          .eq("season_id", activeSeasonId)
          .in("cohort_id", cohortIds);

        if (playerData) {
          counts = (playerData as PlayerRow[]).reduce((acc, p) => {
            if (p.cohort_id) {
              acc[p.cohort_id] = (acc[p.cohort_id] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
        }
      }

      const merged = (cohortsData || []).map((c) => ({
        ...c,
        playerCount: counts[c.id] || 0,
      }));

      setCohorts(merged);
    } catch (err) {
      console.error("Error fetching cohorts:", err);
      setFetchError("Failed to load cohorts.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    void fetchCohorts();
  }, [fetchCohorts]);

  // Filtering & Sorting
  const filteredCohorts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return cohorts;
    return cohorts.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term))
    );
  }, [cohorts, searchTerm]);

  const sortedCohorts = useMemo(() => {
    const column = COHORT_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredCohorts;
    return sortRows(filteredCohorts, column, sortState.direction);
  }, [filteredCohorts, sortState]);

  // Selection Logic
  const visibleIds = useMemo(
    () => sortedCohorts.map((c) => c.id),
    [sortedCohorts]
  );
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedIds.length > 0 && !allSelected;
  const selectCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectCheckboxRef.current) {
      selectCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = Array.from(new Set([...selectedIds, ...visibleIds]));
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Actions
  const handleCreate = async (
    name: string,
    description: string | null,
    status: "active" | "inactive",
    sessionCapacity: number,
    minSessions: number,
    sessionsPerCohort: number
  ) => {
    if (!currentAssociation) return;

    setCreateDialogState((prev) => ({
      ...prev,
      submitting: true,
      error: null,
    }));

    try {
      const { error } = await supabase.from("cohorts").insert({
        association_id: currentAssociation.association_id,
        name,
        description,
        status,
        session_capacity: sessionCapacity,
        minimum_sessions_per_athlete: minSessions,
        sessions_per_cohort: sessionsPerCohort,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("A cohort with this name already exists.");
        }
        throw error;
      }

      setFeedback({ type: "success", message: "Cohort created successfully." });
      setCreateDialogState({ open: false, submitting: false, error: null });
      await fetchCohorts();
    } catch (err) {
      let message = "Failed to create cohort.";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "object" && err !== null && "message" in err) {
        message = String((err as { message: unknown }).message);
      }

      setCreateDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleUpdate = async (
    name: string,
    description: string | null,
    status: "active" | "inactive",
    sessionCapacity: number,
    minSessions: number,
    sessionsPerCohort: number
  ) => {
    if (!editDialogState.cohort) return;

    setEditDialogState((prev) => ({ ...prev, submitting: true, error: null }));

    const { error } = await supabase
      .from("cohorts")
      .update({
        name,
        description,
        status,
        session_capacity: sessionCapacity,
        minimum_sessions_per_athlete: minSessions,
        sessions_per_cohort: sessionsPerCohort,
      })
      .eq("id", editDialogState.cohort.id);

    if (error) {
      const message =
        error.code === "23505"
          ? "A cohort with this name already exists."
          : error.message;

      setEditDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
      return;
    }

    setFeedback({ type: "success", message: "Cohort updated successfully." });
    setEditDialogState((prev) => ({ ...prev, open: false, submitting: false }));
    await fetchCohorts();
  };

  const handleDelete = async () => {
    if (!deleteDialogState.cohort) return;
    setDeleteDialogState((prev) => ({ ...prev, submitting: true }));

    const { error } = await supabase.rpc("delete_cohort", {
      p_cohort_id: deleteDialogState.cohort.id,
    });

    if (error) {
      setFeedback({
        type: "error",
        message: error.message,
      });
    } else {
      setFeedback({ type: "success", message: "Cohort deleted successfully." });
      await fetchCohorts();
    }
    setDeleteDialogState({ open: false, cohort: null, submitting: false });
  };

  const visibleColumnConfigs = useMemo(
    () => COHORT_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
    [visibleColumns]
  );

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

  if (!currentAssociation || !hasRole("Administrator")) {
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
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search cohorts..."
          className="md:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() =>
              setCreateDialogState({
                open: true,
                submitting: false,
                error: null,
              })
            }
          >
            <Plus className="mr-2 size-4" /> Add Cohort
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchCohorts()}
          >
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-2 size-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COHORT_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.includes(col.key)}
                  onCheckedChange={(checked) => {
                    if (checked)
                      setVisibleColumns([...visibleColumns, col.key]);
                    else
                      setVisibleColumns(
                        visibleColumns.filter((c) => c !== col.key)
                      );
                  }}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
        ) : sortedCohorts.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No cohorts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      ref={selectCheckboxRef}
                      type="checkbox"
                      className="size-4 rounded border-border text-primary focus:ring-primary"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  {visibleColumnConfigs.map((col) => (
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
                  <th className="w-24 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {sortedCohorts.map((cohort) => (
                  <tr key={cohort.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.includes(cohort.id)}
                        onChange={() => handleSelectRow(cohort.id)}
                      />
                    </td>
                    {visibleColumnConfigs.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.getDisplayValue(cohort)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setEditDialogState({
                              open: true,
                              cohort,
                              submitting: false,
                              error: null,
                            })
                          }
                        >
                          <PencilRuler className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteDialogState({
                              open: true,
                              cohort,
                              submitting: false,
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CohortDialog
        open={createDialogState.open}
        onOpenChange={(open) =>
          setCreateDialogState((prev) => ({ ...prev, open }))
        }
        cohort={null}
        onSubmit={handleCreate}
        submitting={createDialogState.submitting}
        error={createDialogState.error}
      />

      <CohortDialog
        open={editDialogState.open}
        onOpenChange={(open) =>
          setEditDialogState((prev) => ({ ...prev, open }))
        }
        cohort={editDialogState.cohort}
        onSubmit={handleUpdate}
        submitting={editDialogState.submitting}
        error={editDialogState.error}
      />

      <AlertDialog
        open={deleteDialogState.open}
        onOpenChange={(open) =>
          setDeleteDialogState((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cohort?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteDialogState.cohort?.name}</strong>?
              {deleteDialogState.cohort?.playerCount ? (
                <span className="block mt-2 text-destructive font-semibold">
                  Warning: This cohort is assigned to{" "}
                  {deleteDialogState.cohort.playerCount} players in the active
                  season.
                </span>
              ) : (
                " This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDialogState.submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDialogState.submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
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
