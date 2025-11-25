import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldOff,
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
import { PositionDialog } from "./PositionDialog";

type PositionTypeRow = Database["public"]["Tables"]["position_types"]["Row"] & {
  player_count?: number;
};

type ColumnKey = "name" | "status" | "usage" | "createdAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: PositionTypeRow) => ReactNode;
  getSortValue?: (row: PositionTypeRow) => string | number | Date | null;
}

const POSITION_COLUMNS: ColumnConfig[] = [
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
    key: "usage",
    label: "Players",
    align: "center",
    getDisplayValue: (row) => (
      <span className="text-muted-foreground">
        {row.player_count !== undefined ? `${row.player_count} players` : "—"}
      </span>
    ),
    getSortValue: (row) => row.player_count ?? 0,
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
  rows: PositionTypeRow[],
  column: ColumnConfig,
  direction: SortDirection
): PositionTypeRow[] {
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

export function PositionsTable() {
  const { currentAssociation, hasRole } = useAuth();
  const [positions, setPositions] = useState<PositionTypeRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortState, setSortState] = useState<SortState>({
    columnKey: "name",
    direction: "asc",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogState, setEditDialogState] = useState<{
    open: boolean;
    position: PositionTypeRow | null;
  }>({
    open: false,
    position: null,
  });

  const [statusDialogState, setStatusDialogState] = useState<{
    open: boolean;
    position: PositionTypeRow | null;
    action: "deactivate" | "reactivate" | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    position: null,
    action: null,
    submitting: false,
    error: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    position: PositionTypeRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    position: null,
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

  const fetchPositions = useCallback(async () => {
    if (!currentAssociation) return;
    setFetching(true);
    setFetchError(null);

    try {
      // Fetch positions
      const { data: positionsData, error: positionsError } = await supabase
        .from("position_types")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .order("created_at", { ascending: false });

      if (positionsError) throw positionsError;

      // Fetch usage counts (players)
      const positionIds = positionsData.map((p) => p.id);
      const { data: usageData, error: usageError } = await supabase
        .from("players")
        .select("position_type_id")
        .in("position_type_id", positionIds);

      if (usageError) throw usageError;

      const usageMap = new Map<string, number>();
      usageData.forEach((item) => {
        usageMap.set(
          item.position_type_id,
          (usageMap.get(item.position_type_id) || 0) + 1
        );
      });

      const positionsWithUsage = positionsData.map((pos) => ({
        ...pos,
        player_count: usageMap.get(pos.id) || 0,
      }));

      setPositions(positionsWithUsage);
    } catch (err) {
      console.error("Error fetching positions:", err);
      setFetchError("Failed to load position types.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    void fetchPositions();
  }, [fetchPositions]);

  // Filtering & Sorting
  const filteredPositions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return positions;
    return positions.filter((p) =>
      [p.name, p.status].join(" ").toLowerCase().includes(term)
    );
  }, [positions, searchTerm]);

  const sortedPositions = useMemo(() => {
    const column = POSITION_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredPositions;
    return sortRows(filteredPositions, column, sortState.direction);
  }, [filteredPositions, sortState]);

  // Selection Logic
  const visibleIds = useMemo(
    () => sortedPositions.map((p) => p.id),
    [sortedPositions]
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

  const handleStatusChange = async () => {
    const { position, action } = statusDialogState;
    if (!position || !action) return;

    setStatusDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const nextStatus = action === "deactivate" ? "inactive" : "active";
      const { error } = await supabase
        .from("position_types")
        .update({ status: nextStatus })
        .eq("id", position.id);

      if (error) throw error;

      setFeedback({
        type: "success",
        message: `Position type ${
          action === "deactivate" ? "deactivated" : "reactivated"
        } successfully.`,
      });
      await fetchPositions();
      setStatusDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      let message = "Failed to update status.";
      if (err instanceof Error) message = err.message;
      setStatusDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleDeletePosition = async () => {
    const { position } = deleteDialogState;
    if (!position) return;

    setDeleteDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const { error } = await supabase.rpc("delete_position_type", {
        p_position_type_id: position.id,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Position type deleted successfully.",
      });
      await fetchPositions();
      setDeleteDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      let message = "Failed to delete position type.";
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
          placeholder="Search positions..."
          className="md:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" /> Add Position
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchPositions()}
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
        ) : sortedPositions.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No position types found.
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
                  {POSITION_COLUMNS.map((col) => (
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
                {sortedPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.includes(position.id)}
                        onChange={() => handleSelectRow(position.id)}
                      />
                    </td>
                    {POSITION_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.getDisplayValue(position)}
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
                                position,
                              })
                            }
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {position.status === "active" ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setStatusDialogState({
                                  open: true,
                                  position,
                                  action: "deactivate",
                                  submitting: false,
                                  error: null,
                                })
                              }
                            >
                              <ShieldOff className="mr-2 size-4" /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatusDialogState({
                                  open: true,
                                  position,
                                  action: "reactivate",
                                  submitting: false,
                                  error: null,
                                })
                              }
                            >
                              <RotateCcw className="mr-2 size-4" /> Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setDeleteDialogState({
                                open: true,
                                position,
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
      <PositionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        position={null}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchPositions();
        }}
      />

      <PositionDialog
        open={editDialogState.open}
        onOpenChange={(open) =>
          setEditDialogState((prev) => ({ ...prev, open }))
        }
        position={editDialogState.position}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchPositions();
        }}
      />

      <AlertDialog
        open={statusDialogState.open}
        onOpenChange={(open) =>
          setStatusDialogState((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusDialogState.action === "deactivate"
                ? "Deactivate Position?"
                : "Reactivate Position?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialogState.action === "deactivate"
                ? "The position type will be hidden from new player registrations but will remain in historical records."
                : "The position type will become available for player registration."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {statusDialogState.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {statusDialogState.error}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusDialogState.submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                statusDialogState.action === "deactivate"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              )}
              disabled={statusDialogState.submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleStatusChange();
              }}
            >
              {statusDialogState.submitting
                ? "Updating..."
                : statusDialogState.action === "deactivate"
                ? "Deactivate"
                : "Reactivate"}
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
            <AlertDialogTitle>Delete Position Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The position type will be
              permanently deleted from the database.
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
                void handleDeletePosition();
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
