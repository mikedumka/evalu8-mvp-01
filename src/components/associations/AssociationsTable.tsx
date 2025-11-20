import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AssociationDialog } from "./AssociationDialog";

type AssociationRow = Database["public"]["Tables"]["associations"]["Row"] & {
  sport_type: {
    id: string;
    name: string;
    status: string;
  } | null;
};

type ColumnKey =
  | "name"
  | "abbreviation"
  | "sport"
  | "status"
  | "contactEmail"
  | "createdAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: AssociationRow) => React.ReactNode;
  getSortValue?: (row: AssociationRow) => string | number | Date | null;
}

const ASSOCIATION_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => <span className="font-medium">{row.name}</span>,
    getSortValue: (row) => row.name,
  },
  {
    key: "abbreviation",
    label: "Abbreviation",
    getDisplayValue: (row) => row.abbreviation?.toUpperCase() ?? "—",
    getSortValue: (row) => row.abbreviation,
  },
  {
    key: "sport",
    label: "Sport",
    getDisplayValue: (row) => row.sport_type?.name ?? "—",
    getSortValue: (row) => row.sport_type?.name ?? "",
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
    key: "contactEmail",
    label: "Contact Email",
    getDisplayValue: (row) => row.contact_email,
    getSortValue: (row) => row.contact_email,
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
  rows: AssociationRow[],
  column: ColumnConfig,
  direction: SortDirection
): AssociationRow[] {
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

export function AssociationsTable() {
  const { hasRole } = useAuth();
  const [associations, setAssociations] = useState<AssociationRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "name",
    "abbreviation",
    "sport",
    "status",
    "contactEmail",
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
    association: AssociationRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    association: null,
    submitting: false,
    error: null,
  });

  const [statusDialogState, setStatusDialogState] = useState<{
    open: boolean;
    association: AssociationRow | null;
    action: "deactivate" | "reactivate" | null;
    submitting: boolean;
    stats: {
      activeUserCount: number | null;
      activeSeasonCount: number | null;
    } | null;
    statsLoading: boolean;
    error: string | null;
  }>({
    open: false,
    association: null,
    action: null,
    submitting: false,
    stats: null,
    statsLoading: false,
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

  const fetchAssociations = useCallback(async () => {
    setFetching(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from("associations")
        .select(
          `id, name, abbreviation, slug, status, contact_email, created_at, sport_type_id, sport_type:sport_types!associations_sport_type_id_fkey ( id, name, status )`
        )
        .order("name", { ascending: true });

      if (error) throw error;

      setAssociations((data ?? []) as AssociationRow[]);
    } catch (err) {
      console.error("Error fetching associations:", err);
      setFetchError("Failed to load associations.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void fetchAssociations();
  }, [fetchAssociations]);

  // Filtering & Sorting
  const filteredAssociations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return associations;
    return associations.filter((a) =>
      [
        a.name,
        a.abbreviation ?? "",
        a.contact_email ?? "",
        a.status,
        a.sport_type?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [associations, searchTerm]);

  const sortedAssociations = useMemo(() => {
    const column = ASSOCIATION_COLUMNS.find(
      (c) => c.key === sortState.columnKey
    );
    if (!column) return filteredAssociations;
    return sortRows(filteredAssociations, column, sortState.direction);
  }, [filteredAssociations, sortState]);

  // Selection Logic
  const visibleIds = useMemo(
    () => sortedAssociations.map((a) => a.id),
    [sortedAssociations]
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
  const handleCreate = async (data: {
    name: string;
    abbreviation: string;
    contactEmail: string;
    sportTypeId?: string;
  }) => {
    setCreateDialogState((prev) => ({
      ...prev,
      submitting: true,
      error: null,
    }));

    try {
      const payload = {
        p_name: data.name.trim(),
        p_sport_type_id: data.sportTypeId!,
        p_contact_email: data.contactEmail.trim() || null,
      };

      const { data: result, error } = await supabase.rpc(
        "create_association_with_admin",
        payload
      );

      if (error) throw error;

      if (result?.id && data.abbreviation.trim()) {
        await supabase
          .from("associations")
          .update({ abbreviation: data.abbreviation.trim().toUpperCase() })
          .eq("id", result.id);
      }

      setFeedback({
        type: "success",
        message: "Association created successfully.",
      });
      setCreateDialogState({ open: false, submitting: false, error: null });
      await fetchAssociations();
    } catch (err) {
      let message = "Failed to create association.";
      if (err instanceof Error) message = err.message;
      setCreateDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleUpdate = async (data: {
    name: string;
    abbreviation: string;
    contactEmail: string;
  }) => {
    if (!editDialogState.association) return;

    setEditDialogState((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      const { error } = await supabase
        .from("associations")
        .update({
          name: data.name.trim(),
          contact_email: data.contactEmail.trim(),
          abbreviation: data.abbreviation.trim()
            ? data.abbreviation.trim().toUpperCase()
            : null,
        })
        .eq("id", editDialogState.association.id);

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Association updated successfully.",
      });
      setEditDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
      await fetchAssociations();
    } catch (err) {
      let message = "Failed to update association.";
      if (err instanceof Error) message = err.message;
      setEditDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: message,
      }));
    }
  };

  const handleOpenStatusDialog = (
    association: AssociationRow,
    action: "deactivate" | "reactivate"
  ) => {
    setStatusDialogState({
      open: true,
      association,
      action,
      submitting: false,
      stats: null,
      statsLoading: true,
      error: null,
    });

    // Load stats
    void (async () => {
      try {
        const [usersResult, seasonsResult] = await Promise.all([
          supabase
            .from("association_users")
            .select("id", { count: "exact", head: true })
            .eq("association_id", association.id)
            .eq("status", "active"),
          supabase
            .from("seasons")
            .select("id", { count: "exact", head: true })
            .eq("association_id", association.id)
            .eq("status", "active"),
        ]);

        setStatusDialogState((prev) => ({
          ...prev,
          statsLoading: false,
          stats: {
            activeUserCount: usersResult.count ?? null,
            activeSeasonCount: seasonsResult.count ?? null,
          },
        }));
      } catch (err) {
        console.error("Failed to load stats", err);
        setStatusDialogState((prev) => ({
          ...prev,
          statsLoading: false,
          error: "Failed to load usage details.",
        }));
      }
    })();
  };

  const handleStatusChange = async () => {
    const { association, action } = statusDialogState;
    if (!association || !action) return;

    setStatusDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const nextStatus = action === "deactivate" ? "inactive" : "active";
      const { error } = await supabase
        .from("associations")
        .update({ status: nextStatus })
        .eq("id", association.id);

      if (error) throw error;

      setFeedback({
        type: "success",
        message: `Association ${
          action === "deactivate" ? "deactivated" : "reactivated"
        } successfully.`,
      });
      await fetchAssociations();
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

  const visibleColumnConfigs = useMemo(
    () => ASSOCIATION_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
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

  if (!hasRole("System Administrator")) {
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
          placeholder="Search associations..."
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
            <Plus className="mr-2 size-4" /> Add Association
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchAssociations()}
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
              {ASSOCIATION_COLUMNS.map((col) => (
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
        ) : sortedAssociations.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No associations found.
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
                {sortedAssociations.map((association) => (
                  <tr key={association.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.includes(association.id)}
                        onChange={() => handleSelectRow(association.id)}
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
                        {col.getDisplayValue(association)}
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
                                association,
                                submitting: false,
                                error: null,
                              })
                            }
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {association.status === "active" ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                handleOpenStatusDialog(
                                  association,
                                  "deactivate"
                                )
                              }
                            >
                              <ShieldOff className="mr-2 size-4" /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                handleOpenStatusDialog(
                                  association,
                                  "reactivate"
                                )
                              }
                            >
                              <RotateCcw className="mr-2 size-4" /> Reactivate
                            </DropdownMenuItem>
                          )}
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
      <AssociationDialog
        open={createDialogState.open}
        onOpenChange={(open) =>
          setCreateDialogState((prev) => ({ ...prev, open }))
        }
        association={null}
        onSubmit={handleCreate}
        submitting={createDialogState.submitting}
        error={createDialogState.error}
      />

      <AssociationDialog
        open={editDialogState.open}
        onOpenChange={(open) =>
          setEditDialogState((prev) => ({ ...prev, open }))
        }
        association={editDialogState.association}
        onSubmit={handleUpdate}
        submitting={editDialogState.submitting}
        error={editDialogState.error}
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
                ? "Deactivate Association?"
                : "Reactivate Association?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {statusDialogState.action === "deactivate"
                    ? "The association will move to the inactive state. Administrators retain read-only access while evaluators, coaches, and season administrators lose access immediately. Active seasons pause until reactivation."
                    : "The association will return to the active state. Previous administrators and evaluators regain access to existing seasons."}
                </p>

                {statusDialogState.statsLoading && (
                  <p className="text-xs text-muted-foreground">
                    Loading usage details...
                  </p>
                )}

                {statusDialogState.stats && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {statusDialogState.stats.activeUserCount !== null && (
                      <li>
                        {statusDialogState.stats.activeUserCount} active users
                        will{" "}
                        {statusDialogState.action === "deactivate"
                          ? "lose access"
                          : "regain access"}
                        .
                      </li>
                    )}
                    {statusDialogState.stats.activeSeasonCount !== null && (
                      <li>
                        {statusDialogState.stats.activeSeasonCount} active
                        seasons will{" "}
                        {statusDialogState.action === "deactivate"
                          ? "be paused"
                          : "remain available"}
                        .
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
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
    </div>
  );
}
