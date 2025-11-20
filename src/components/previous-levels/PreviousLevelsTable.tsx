import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";
import { PreviousLevelDialog } from "./PreviousLevelDialog";

type PreviousLevelRow = Database["public"]["Tables"]["previous_levels"]["Row"];
type PlayerRow = Pick<
  Database["public"]["Tables"]["players"]["Row"],
  "id" | "previous_level_id"
>;

type LevelWithCounts = PreviousLevelRow & {
  playerCount: number;
};

type ColumnKey = "rank" | "name" | "playerCount" | "createdAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: LevelWithCounts) => string | number;
  getSortValue?: (row: LevelWithCounts) => string | number | Date | null;
}

const LEVEL_COLUMNS: ColumnConfig[] = [
  {
    key: "rank",
    label: "Rank",
    align: "left",
    getDisplayValue: (row) => row.rank_order,
  },
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => row.name,
  },
  {
    key: "playerCount",
    label: "Players (Active Season)",
    align: "left",
    getDisplayValue: (row) => row.playerCount,
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
  rows: LevelWithCounts[],
  column: ColumnConfig,
  direction: SortDirection
): LevelWithCounts[] {
  const modifier = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const getValue = column.getSortValue ?? column.getDisplayValue;
    const aValue = getValue(a);
    const bValue = getValue(b);

    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1 * modifier;
    if (bValue === null || bValue === undefined) return -1 * modifier;

    if (aValue < bValue) return -1 * modifier;
    if (aValue > bValue) return 1 * modifier;
    return 0;
  });
}

export function PreviousLevelsTable() {
  const { currentAssociation, hasRole } = useAuth();
  const [levels, setLevels] = useState<LevelWithCounts[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    LEVEL_COLUMNS.map((c) => c.key)
  );
  const [sortState, setSortState] = useState<SortState>({
    columnKey: "rank",
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
    level: PreviousLevelRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    level: null,
    submitting: false,
    error: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    level: LevelWithCounts | null;
    submitting: boolean;
  }>({
    open: false,
    level: null,
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

  const fetchLevels = useCallback(async () => {
    if (!currentAssociation) return;

    setFetching(true);
    setFetchError(null);

    try {
      // 1. Fetch Levels
      const { data: levelsData, error: levelsError } = await supabase
        .from("previous_levels")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .order("rank_order", { ascending: true });

      if (levelsError) throw levelsError;

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
      if (activeSeasonId && levelsData && levelsData.length > 0) {
        const levelIds = levelsData.map((l) => l.id);
        const { data: playerData } = await supabase
          .from("players")
          .select("previous_level_id")
          .eq("season_id", activeSeasonId)
          .in("previous_level_id", levelIds);

        if (playerData) {
          counts = (playerData as PlayerRow[]).reduce((acc, p) => {
            if (p.previous_level_id) {
              acc[p.previous_level_id] = (acc[p.previous_level_id] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
        }
      }

      const merged = (levelsData || []).map((l) => ({
        ...l,
        playerCount: counts[l.id] || 0,
      }));

      setLevels(merged);
    } catch (err) {
      console.error("Error fetching levels:", err);
      setFetchError("Failed to load previous levels.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    void fetchLevels();
  }, [fetchLevels]);

  // Filtering & Sorting
  const filteredLevels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return levels;
    return levels.filter((l) => l.name.toLowerCase().includes(term));
  }, [levels, searchTerm]);

  const sortedLevels = useMemo(() => {
    const column = LEVEL_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredLevels;
    return sortRows(filteredLevels, column, sortState.direction);
  }, [filteredLevels, sortState]);

  // Selection Logic
  const visibleIds = useMemo(
    () => sortedLevels.map((l) => l.id),
    [sortedLevels]
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
  const handleCreate = async (name: string) => {
    if (!currentAssociation) return;

    setCreateDialogState((prev) => ({
      ...prev,
      submitting: true,
      error: null,
    }));

    try {
      // Calculate next rank
      const maxRank = levels.reduce((max, l) => Math.max(max, l.rank_order), 0);

      const { error } = await supabase.from("previous_levels").insert({
        association_id: currentAssociation.association_id,
        name,
        rank_order: maxRank + 1,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("A level with this name already exists.");
        }
        throw error;
      }

      setFeedback({ type: "success", message: "Level created successfully." });
      setCreateDialogState({ open: false, submitting: false, error: null });
      await fetchLevels();
    } catch (err) {
      let message = "Failed to create level.";
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

  const handleUpdate = async (name: string) => {
    if (!editDialogState.level) return;

    setEditDialogState((prev) => ({ ...prev, submitting: true, error: null }));

    const { error } = await supabase
      .from("previous_levels")
      .update({ name })
      .eq("id", editDialogState.level.id);

    if (error) {
      const message =
        error.code === "23505"
          ? "A level with this name already exists."
          : error.message;

      setEditDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
      return;
    }

    setFeedback({ type: "success", message: "Level updated successfully." });
    setEditDialogState((prev) => ({ ...prev, open: false, submitting: false }));
    await fetchLevels();
  };

  const handleDelete = async () => {
    if (!deleteDialogState.level) return;
    setDeleteDialogState((prev) => ({ ...prev, submitting: true }));

    const { error } = await supabase
      .from("previous_levels")
      .delete()
      .eq("id", deleteDialogState.level.id);

    if (error) {
      setFeedback({
        type: "error",
        message: "Failed to delete level. It may be in use.",
      });
    } else {
      setFeedback({ type: "success", message: "Level deleted successfully." });
      await fetchLevels();
    }
    setDeleteDialogState({ open: false, level: null, submitting: false });
  };

  const handleMove = async (
    level: LevelWithCounts,
    direction: "up" | "down"
  ) => {
    // Only allow move if sorted by rank asc
    if (sortState.columnKey !== "rank" || sortState.direction !== "asc") {
      setFeedback({
        type: "error",
        message: "Sort by Rank (Ascending) to reorder.",
      });
      return;
    }

    const currentIndex = levels.findIndex((l) => l.id === level.id);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const targetLevel = levels[targetIndex];

    if (!targetLevel) return;

    try {
      const { error } = await supabase.rpc("swap_previous_level_ranks", {
        level_id_1: level.id,
        level_id_2: targetLevel.id,
      });

      if (error) throw error;

      await fetchLevels();
    } catch (err) {
      console.error("Reorder failed", err);
      setFeedback({ type: "error", message: "Failed to reorder levels." });
    }
  };

  const visibleColumnConfigs = useMemo(
    () => LEVEL_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
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
          placeholder="Search levels..."
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
            <Plus className="mr-2 size-4" /> Add Level
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchLevels()}
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
              {LEVEL_COLUMNS.map((col) => (
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
        ) : sortedLevels.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No previous levels found.
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
                  <th className="w-14 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {sortedLevels.map((level, index) => (
                  <tr key={level.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.includes(level.id)}
                        onChange={() => handleSelectRow(level.id)}
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
                        {col.getDisplayValue(level)}
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
                                level,
                                submitting: false,
                                error: null,
                              })
                            }
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={
                              index === 0 ||
                              sortState.columnKey !== "rank" ||
                              sortState.direction !== "asc"
                            }
                            onClick={() => handleMove(level, "up")}
                          >
                            <ArrowUp className="mr-2 size-4" /> Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              index === sortedLevels.length - 1 ||
                              sortState.columnKey !== "rank" ||
                              sortState.direction !== "asc"
                            }
                            onClick={() => handleMove(level, "down")}
                          >
                            <ArrowDown className="mr-2 size-4" /> Move Down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setDeleteDialogState({
                                open: true,
                                level,
                                submitting: false,
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
      <PreviousLevelDialog
        open={createDialogState.open}
        onOpenChange={(open) =>
          setCreateDialogState((prev) => ({ ...prev, open }))
        }
        level={null}
        onSubmit={handleCreate}
        submitting={createDialogState.submitting}
        error={createDialogState.error}
      />

      <PreviousLevelDialog
        open={editDialogState.open}
        onOpenChange={(open) =>
          setEditDialogState((prev) => ({ ...prev, open }))
        }
        level={editDialogState.level}
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
            <AlertDialogTitle>Delete Previous Level?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteDialogState.level?.name}</strong>?
              {deleteDialogState.level?.playerCount ? (
                <span className="block mt-2 text-destructive font-semibold">
                  Warning: This level is assigned to{" "}
                  {deleteDialogState.level.playerCount} players in the active
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
