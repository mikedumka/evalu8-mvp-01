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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";
import { DrillDialog } from "./DrillDialog";

type DrillRow = Database["public"]["Tables"]["drills"]["Row"] & {
  usage_count?: number;
};

type ColumnKey = "name" | "description" | "status" | "usage" | "createdAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: DrillRow) => ReactNode;
  getSortValue?: (row: DrillRow) => string | number | Date | null;
}

const DRILL_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => <span className="font-medium">{row.name}</span>,
    getSortValue: (row) => row.name,
  },
  {
    key: "description",
    label: "Description",
    getDisplayValue: (row) => (
      <span
        className="line-clamp-1 text-muted-foreground"
        title={row.description || ""}
      >
        {row.description || "—"}
      </span>
    ),
    getSortValue: (row) => row.description,
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
    label: "Usage",
    align: "center",
    getDisplayValue: (row) => (
      <span className="text-muted-foreground">
        {row.usage_count !== undefined ? `${row.usage_count} sessions` : "—"}
      </span>
    ),
    getSortValue: (row) => row.usage_count ?? 0,
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
  rows: DrillRow[],
  column: ColumnConfig,
  direction: SortDirection
): DrillRow[] {
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

export function DrillsTable() {
  const { currentAssociation, hasRole } = useAuth();
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "name",
    "description",
    "status",
    "usage",
    "createdAt",
  ]);
  const [sortState, setSortState] = useState<SortState>({
    columnKey: "name",
    direction: "asc",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogState, setEditDialogState] = useState<{
    open: boolean;
    drill: DrillRow | null;
  }>({
    open: false,
    drill: null,
  });

  const [statusDialogState, setStatusDialogState] = useState<{
    open: boolean;
    drill: DrillRow | null;
    action: "deactivate" | "reactivate" | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    drill: null,
    action: null,
    submitting: false,
    error: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    drill: DrillRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    drill: null,
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

  const fetchDrills = useCallback(async () => {
    if (!currentAssociation) return;
    setFetching(true);
    setFetchError(null);

    try {
      // Fetch drills
      const { data: drillsData, error: drillsError } = await supabase
        .from("drills")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .order("created_at", { ascending: false });

      if (drillsError) throw drillsError;

      // Fetch usage counts
      // We can't easily do a join count in one query with the current setup without a view or RPC
      // So we'll fetch counts for all drills
      const drillIds = drillsData.map((d) => d.id);
      const { data: usageData, error: usageError } = await supabase
        .from("session_drills")
        .select("drill_id")
        .in("drill_id", drillIds);

      if (usageError) throw usageError;

      const usageMap = new Map<string, number>();
      usageData.forEach((item) => {
        usageMap.set(item.drill_id, (usageMap.get(item.drill_id) || 0) + 1);
      });

      const drillsWithUsage = drillsData.map((drill) => ({
        ...drill,
        usage_count: usageMap.get(drill.id) || 0,
      }));

      setDrills(drillsWithUsage);
    } catch (err) {
      console.error("Error fetching drills:", err);
      setFetchError("Failed to load drills.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    void fetchDrills();
  }, [fetchDrills]);

  // Filtering & Sorting
  const filteredDrills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return drills;
    return drills.filter((d) =>
      [d.name, d.description ?? "", d.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [drills, searchTerm]);

  const sortedDrills = useMemo(() => {
    const column = DRILL_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredDrills;
    return sortRows(filteredDrills, column, sortState.direction);
  }, [filteredDrills, sortState]);

  // Selection Logic
  const visibleIds = useMemo(
    () => sortedDrills.map((d) => d.id),
    [sortedDrills]
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
    const { drill, action } = statusDialogState;
    if (!drill || !action) return;

    setStatusDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const nextStatus = action === "deactivate" ? "inactive" : "active";
      const { error } = await supabase.rpc("set_drill_status", {
        p_drill_id: drill.id,
        p_status: nextStatus,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: `Drill ${
          action === "deactivate" ? "deactivated" : "reactivated"
        } successfully.`,
      });
      await fetchDrills();
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

  const handleDeleteDrill = async () => {
    const { drill } = deleteDialogState;
    if (!drill) return;

    setDeleteDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const { error } = await supabase.rpc("delete_drill", {
        p_drill_id: drill.id,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Drill deleted successfully.",
      });
      await fetchDrills();
      setDeleteDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      let message = "Failed to delete drill.";
      if (err instanceof Error) message = err.message;
      setDeleteDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const visibleColumnConfigs = useMemo(
    () => DRILL_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
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
          placeholder="Search drills..."
          className="md:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" /> Add Drill
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchDrills()}
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
              {DRILL_COLUMNS.map((col) => (
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
        ) : sortedDrills.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No drills found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
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
                {sortedDrills.map((drill) => (
                  <tr key={drill.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.includes(drill.id)}
                        onChange={() => handleSelectRow(drill.id)}
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
                        {col.getDisplayValue(drill)}
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
                                drill,
                              })
                            }
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {drill.status === "active" ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setStatusDialogState({
                                  open: true,
                                  drill,
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
                                  drill,
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
                                drill,
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
      <DrillDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        drill={null}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchDrills();
        }}
      />

      <DrillDialog
        open={editDialogState.open}
        onOpenChange={(open) =>
          setEditDialogState((prev) => ({ ...prev, open }))
        }
        drill={editDialogState.drill}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchDrills();
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
                ? "Deactivate Drill?"
                : "Reactivate Drill?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialogState.action === "deactivate"
                ? "The drill will be hidden from new sessions but will remain in historical records. This action cannot be performed if the drill is currently in use by active sessions."
                : "The drill will become available for selection in new sessions."}
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
            <AlertDialogTitle>Delete Drill?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The drill will be permanently
              deleted from the database.
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
                void handleDeleteDrill();
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
