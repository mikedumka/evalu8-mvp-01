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
import { PlayerDialog } from "./PlayerDialog";
import { BulkImportDialog } from "./BulkImportDialog";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"] & {
  position_type: { name: string } | null;
  cohort: { name: string } | null;
  previous_level: { name: string } | null;
};

type ColumnKey =
  | "name"
  | "birthDate"
  | "gender"
  | "position"
  | "cohort"
  | "previousLevel"
  | "status"
  | "createdAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: PlayerRow) => React.ReactNode;
  getSortValue?: (row: PlayerRow) => string | number | Date | null;
}

const PLAYER_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.last_name}, {row.first_name}
          </span>
          {row.notes && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {row.notes}
            </span>
          )}
        </div>
      );
    },
    getSortValue: (row) => `${row.last_name}, ${row.first_name}`,
  },
  {
    key: "birthDate",
    label: "Birthdate",
    getDisplayValue: (row) => row.birth_date || "-",
    getSortValue: (row) => row.birth_date || "",
  },
  {
    key: "gender",
    label: "Gender",
    getDisplayValue: (row) => row.gender || "-",
    getSortValue: (row) => row.gender || "",
  },
  {
    key: "position",
    label: "Position",
    getDisplayValue: (row) => row.position_type?.name || "Unknown",
    getSortValue: (row) => row.position_type?.name || "",
  },
  {
    key: "cohort",
    label: "Cohort",
    getDisplayValue: (row) => row.cohort?.name || "-",
    getSortValue: (row) => row.cohort?.name || "",
  },
  {
    key: "previousLevel",
    label: "Previous Level",
    getDisplayValue: (row) => row.previous_level?.name || "-",
    getSortValue: (row) => row.previous_level?.name || "",
  },
  {
    key: "status",
    label: "Status",
    getDisplayValue: (row) => {
      const variant =
        row.status === "active"
          ? "default"
          : row.status === "withdrawn"
          ? "destructive"
          : "secondary";

      return (
        <div className="flex items-center gap-2">
          <Badge
            variant={variant}
            className={cn(
              "capitalize",
              row.status === "active" &&
                "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
              row.status === "other" &&
                "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
            )}
          >
            {row.status}
          </Badge>
          {row.status === "other" && row.status_reason && (
            <span className="text-xs text-muted-foreground">
              ({row.status_reason})
            </span>
          )}
        </div>
      );
    },
    getSortValue: (row) => row.status,
  },
];

type SortDirection = "asc" | "desc";

interface SortState {
  columnKey: ColumnKey;
  direction: SortDirection;
}

function sortRows(
  rows: PlayerRow[],
  column: ColumnConfig,
  direction: SortDirection
): PlayerRow[] {
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

export function PlayersTable() {
  const { currentAssociation, hasRole } = useAuth();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
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
  const [positionFilter, setPositionFilter] = useState<string[]>([]);
  const [previousLevelFilter, setPreviousLevelFilter] = useState<string[]>([]);

  // Reference data for filters
  const [availableCohorts, setAvailableCohorts] = useState<string[]>([]);
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [availablePreviousLevels, setAvailablePreviousLevels] = useState<
    string[]
  >([]);

  const [sortState, setSortState] = useState<SortState>({
    columnKey: "name",
    direction: "asc",
  });

  // Dialog States
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    player: PlayerRow | null;
  }>({
    open: false,
    player: null,
  });

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    player: PlayerRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    player: null,
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

  const fetchPlayers = useCallback(async () => {
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
        setPlayers([]);
        setFetching(false);
        return;
      }

      setActiveSeason(seasonData);

      // 2. Get Players for Active Season
      const { data, error } = await supabase
        .from("players")
        .select(
          `
          *,
          position_type:position_types(name),
          cohort:cohorts(name),
          previous_level:previous_levels(name)
        `
        )
        .eq("association_id", currentAssociation.association_id)
        .eq("season_id", seasonData.id)
        .order("last_name", { ascending: true });

      if (error) throw error;

      // Cast the data to match our PlayerRow type (Supabase types can be tricky with joins)
      const typedData = (data || []) as unknown as PlayerRow[];
      setPlayers(typedData);

      // Extract unique values for filters
      const cohorts = Array.from(
        new Set(
          typedData.map((p) => p.cohort?.name).filter(Boolean) as string[]
        )
      ).sort();
      const positions = Array.from(
        new Set(
          typedData
            .map((p) => p.position_type?.name)
            .filter(Boolean) as string[]
        )
      ).sort();
      const previousLevels = Array.from(
        new Set(
          typedData
            .map((p) => p.previous_level?.name)
            .filter(Boolean) as string[]
        )
      ).sort();
      setAvailableCohorts(cohorts);
      setAvailablePositions(positions);
      setAvailablePreviousLevels(previousLevels);
    } catch (err) {
      console.error("Error fetching players:", err);
      setFetchError("Failed to load players.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    void fetchPlayers();
  }, [fetchPlayers]);

  // Filtering & Sorting
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      // Search Term
      const searchString = `${p.first_name} ${p.last_name} ${
        p.birth_date || ""
      } ${p.previous_level?.name || ""}`.toLowerCase();
      if (searchTerm && !searchString.includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Status Filter
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) {
        return false;
      }

      // Cohort Filter
      if (cohortFilter.length > 0) {
        const cohortName = p.cohort?.name || "No Cohort";
        if (!cohortFilter.includes(cohortName)) return false;
      }

      // Position Filter
      if (positionFilter.length > 0) {
        const posName = p.position_type?.name || "Unknown";
        if (!positionFilter.includes(posName)) return false;
      }

      // Previous Level Filter
      if (previousLevelFilter.length > 0) {
        const levelName = p.previous_level?.name || "No Level";
        if (!previousLevelFilter.includes(levelName)) return false;
      }

      return true;
    });
  }, [
    players,
    searchTerm,
    statusFilter,
    cohortFilter,
    positionFilter,
    previousLevelFilter,
  ]);

  const sortedPlayers = useMemo(() => {
    const column = PLAYER_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredPlayers;
    return sortRows(filteredPlayers, column, sortState.direction);
  }, [filteredPlayers, sortState]);

  const handleDeletePlayer = async () => {
    const { player } = deleteDialogState;
    if (!player) return;

    setDeleteDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const { error } = await supabase.rpc("delete_player", {
        p_player_id: player.id,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Player deleted successfully.",
      });
      await fetchPlayers();
      setDeleteDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      let message = "Failed to delete player.";
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
            placeholder="Search players..."
            className="max-w-[250px]"
          />

          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-dashed">
                <Filter className="mr-2 size-4" />
                Filters
                {(statusFilter.length > 0 ||
                  cohortFilter.length > 0 ||
                  positionFilter.length > 0 ||
                  previousLevelFilter.length > 0) && (
                  <Badge
                    variant="secondary"
                    className="ml-2 rounded-sm px-1 font-normal lg:hidden"
                  >
                    {statusFilter.length +
                      cohortFilter.length +
                      positionFilter.length +
                      previousLevelFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {["active", "withdrawn", "other"].map((status) => (
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
              <DropdownMenuLabel>Position</DropdownMenuLabel>
              {availablePositions.map((pos) => (
                <DropdownMenuCheckboxItem
                  key={pos}
                  checked={positionFilter.includes(pos)}
                  onCheckedChange={() =>
                    toggleFilter(positionFilter, setPositionFilter, pos)
                  }
                >
                  {pos}
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
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Previous Level</DropdownMenuLabel>
              {availablePreviousLevels.map((level) => (
                <DropdownMenuCheckboxItem
                  key={level}
                  checked={previousLevelFilter.includes(level)}
                  onCheckedChange={() =>
                    toggleFilter(
                      previousLevelFilter,
                      setPreviousLevelFilter,
                      level
                    )
                  }
                >
                  {level}
                </DropdownMenuCheckboxItem>
              ))}
              {(statusFilter.length > 0 ||
                cohortFilter.length > 0 ||
                positionFilter.length > 0 ||
                previousLevelFilter.length > 0) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      setStatusFilter([]);
                      setCohortFilter([]);
                      setPositionFilter([]);
                      setPreviousLevelFilter([]);
                    }}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {(statusFilter.length > 0 ||
            cohortFilter.length > 0 ||
            positionFilter.length > 0 ||
            previousLevelFilter.length > 0) && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter([]);
                setCohortFilter([]);
                setPositionFilter([]);
                setPreviousLevelFilter([]);
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
            onClick={() => setDialogState({ open: true, player: null })}
            disabled={!activeSeason}
          >
            <Plus className="mr-2 size-4" /> Register Player
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            disabled={!activeSeason}
          >
            <ArrowDown className="mr-2 size-4" /> Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchPlayers()}
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
              register players.
            </p>
          </div>
        ) : players.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No players found for the active season. Register one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground">
                <tr>
                  {PLAYER_COLUMNS.map((col) => (
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
                {sortedPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-muted/30">
                    {PLAYER_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.getDisplayValue(player)}
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
                                player,
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
                                player,
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
      <PlayerDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        player={dialogState.player}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchPlayers();
        }}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchPlayers();
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
            <AlertDialogTitle>Delete Player?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {deleteDialogState.player?.first_name}{" "}
                {deleteDialogState.player?.last_name}
              </strong>
              ? This action cannot be undone.
              <br />
              <br />
              <span className="text-xs text-muted-foreground">
                Note: Players with existing evaluations cannot be deleted. You
                should mark them as "Withdrawn" instead.
              </span>
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
                void handleDeletePlayer();
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
