import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
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
import { SeasonDialog } from "./SeasonDialog";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

type ColumnKey = "name" | "status" | "config" | "createdAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: SeasonRow) => React.ReactNode;
  getSortValue?: (row: SeasonRow) => string | number | Date | null;
}

const SEASON_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => <span className="font-medium">{row.name}</span>,
    getSortValue: (row) => row.name,
  },
  {
    key: "status",
    label: "Status",
    getDisplayValue: (row) => {
      const variant =
        row.status === "active"
          ? "default"
          : row.status === "completed"
          ? "secondary"
          : "outline";

      return (
        <Badge
          variant={variant}
          className={cn(
            "capitalize",
            row.status === "active" &&
              "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
            row.status === "draft" &&
              "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
          )}
        >
          {row.status}
        </Badge>
      );
    },
    getSortValue: (row) => row.status,
  },
  {
    key: "config",
    label: "Configuration",
    getDisplayValue: (row) => (
      <div className="flex flex-col text-xs text-muted-foreground">
        <span>
          QA: {row.outlier_threshold_percent}% /{" "}
          {row.minimum_evaluators_per_athlete} evals
        </span>
        <span>
          Sched: {row.minimum_sessions_per_athlete} sessions /{" "}
          {row.session_capacity} cap
        </span>
      </div>
    ),
    getSortValue: (row) => row.session_capacity,
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
  rows: SeasonRow[],
  column: ColumnConfig,
  direction: SortDirection
): SeasonRow[] {
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

export function SeasonsTable() {
  const { currentAssociation, hasRole } = useAuth();
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortState, setSortState] = useState<SortState>({
    columnKey: "createdAt",
    direction: "desc",
  });

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogState, setEditDialogState] = useState<{
    open: boolean;
    season: SeasonRow | null;
  }>({
    open: false,
    season: null,
  });

  const [activateDialogState, setActivateDialogState] = useState<{
    open: boolean;
    season: SeasonRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    season: null,
    submitting: false,
    error: null,
  });

  const [completeDialogState, setCompleteDialogState] = useState<{
    open: boolean;
    season: SeasonRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    season: null,
    submitting: false,
    error: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    season: SeasonRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    season: null,
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

  const fetchSeasons = useCallback(async () => {
    if (!currentAssociation) return;
    setFetching(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSeasons(data || []);
    } catch (err) {
      console.error("Error fetching seasons:", err);
      setFetchError("Failed to load seasons.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    void fetchSeasons();
  }, [fetchSeasons]);

  // Filtering & Sorting
  const filteredSeasons = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return seasons;
    return seasons.filter((s) => s.name.toLowerCase().includes(term));
  }, [seasons, searchTerm]);

  const sortedSeasons = useMemo(() => {
    const column = SEASON_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredSeasons;
    return sortRows(filteredSeasons, column, sortState.direction);
  }, [filteredSeasons, sortState]);

  const handleActivateSeason = async () => {
    const { season } = activateDialogState;
    if (!season) return;

    setActivateDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const { error } = await supabase.rpc("activate_season", {
        p_season_id: season.id,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: `Season "${season.name}" is now active.`,
      });
      await fetchSeasons();
      setActivateDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      let message = "Failed to activate season.";
      if (err instanceof Error) message = err.message;
      setActivateDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleCompleteSeason = async () => {
    const { season } = completeDialogState;
    if (!season) return;

    setCompleteDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const { error } = await supabase.rpc("complete_season", {
        p_season_id: season.id,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: `Season "${season.name}" marked as completed.`,
      });
      await fetchSeasons();
      setCompleteDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      let message = "Failed to complete season.";
      if (err instanceof Error) message = err.message;
      setCompleteDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleDeleteSeason = async () => {
    const { season } = deleteDialogState;
    if (!season) return;

    setDeleteDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const { error } = await supabase.rpc("delete_season", {
        p_season_id: season.id,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Season deleted successfully.",
      });
      await fetchSeasons();
      setDeleteDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      let message = "Failed to delete season.";
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
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search seasons..."
          className="md:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" /> Create Season
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchSeasons()}
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
        ) : seasons.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No seasons found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground">
                <tr>
                  {SEASON_COLUMNS.map((col) => (
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
                {sortedSeasons.map((season) => (
                  <tr key={season.id} className="hover:bg-muted/30">
                    {SEASON_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.getDisplayValue(season)}
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
                              setEditDialogState({
                                open: true,
                                season,
                              })
                            }
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {season.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() =>
                                setActivateDialogState({
                                  open: true,
                                  season,
                                  submitting: false,
                                  error: null,
                                })
                              }
                            >
                              <PlayCircle className="mr-2 size-4" /> Activate
                            </DropdownMenuItem>
                          )}
                          {season.status === "active" && (
                            <>
                              <DropdownMenuItem disabled className="opacity-50">
                                <CheckCircle2 className="mr-2 size-4" /> Active
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setCompleteDialogState({
                                    open: true,
                                    season,
                                    submitting: false,
                                    error: null,
                                  })
                                }
                              >
                                <CheckCircle2 className="mr-2 size-4" />{" "}
                                Complete
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={season.status === "active"}
                            onClick={() =>
                              setDeleteDialogState({
                                open: true,
                                season,
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
      <SeasonDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        season={null}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchSeasons();
        }}
      />

      <SeasonDialog
        open={editDialogState.open}
        onOpenChange={(open) =>
          setEditDialogState((prev) => ({ ...prev, open }))
        }
        season={editDialogState.season}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchSeasons();
        }}
      />

      <AlertDialog
        open={activateDialogState.open}
        onOpenChange={(open) =>
          setActivateDialogState((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Season?</AlertDialogTitle>
            <AlertDialogDescription>
              Activating <strong>{activateDialogState.season?.name}</strong>{" "}
              will remove the ability to configure any options other than name
              until a season is complete. This action cannot be undone. Do you
              want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {activateDialogState.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {activateDialogState.error}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activateDialogState.submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={activateDialogState.submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleActivateSeason();
              }}
            >
              {activateDialogState.submitting ? "Activating..." : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={completeDialogState.open}
        onOpenChange={(open) =>
          setCompleteDialogState((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Season?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark{" "}
              <strong>{completeDialogState.season?.name}</strong> as completed?
              This will make the season read-only and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {completeDialogState.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {completeDialogState.error}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completeDialogState.submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={completeDialogState.submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleCompleteSeason();
              }}
            >
              {completeDialogState.submitting ? "Completing..." : "Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogState.open}
        onOpenChange={(open) =>
          setDeleteDialogState((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteDialogState.season?.name}</strong>? This action
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
                void handleDeleteSeason();
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
