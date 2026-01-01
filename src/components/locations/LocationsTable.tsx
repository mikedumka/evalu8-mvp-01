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
  MapPin,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { LocationDialog } from "./LocationDialog";

// Define the type manually since it's not in database.types.ts yet
type LocationRow = {
  id: string;
  association_id: string;
  name: string;
  city: string;
  province_state: string;
  address: string;
  postal_code: string;
  google_maps_link: string | null;
  created_at: string;
  updated_at: string;
};

type ColumnKey = "name" | "city" | "address" | "postal_code";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  getDisplayValue: (row: LocationRow) => React.ReactNode;
  getSortValue?: (row: LocationRow) => string;
}

const LOCATION_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => <span className="font-medium">{row.name}</span>,
    getSortValue: (row) => row.name,
  },
  {
    key: "city",
    label: "City",
    getDisplayValue: (row) => (
      <span>
        {row.city}
        {row.province_state ? `, ${row.province_state}` : ""}
      </span>
    ),
    getSortValue: (row) => `${row.city} ${row.province_state}`,
  },
  {
    key: "address",
    label: "Address",
    getDisplayValue: (row) => row.address,
    getSortValue: (row) => row.address,
  },
  {
    key: "postal_code",
    label: "Postal Code",
    getDisplayValue: (row) => row.postal_code,
    getSortValue: (row) => row.postal_code,
  },
];

type SortDirection = "asc" | "desc";

interface SortState {
  columnKey: ColumnKey;
  direction: SortDirection;
}

function sortRows(
  rows: LocationRow[],
  column: ColumnConfig,
  direction: SortDirection
): LocationRow[] {
  const modifier = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const getValue =
      column.getSortValue ?? ((r) => String(column.getDisplayValue(r)));
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

export function LocationsTable() {
  const { currentAssociation, hasRole } = useAuth();
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortState, setSortState] = useState<SortState>({
    columnKey: "name",
    direction: "asc",
  });

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
    location: LocationRow | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    location: null,
    submitting: false,
    error: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean;
    location: LocationRow | null;
    submitting: boolean;
  }>({
    open: false,
    location: null,
    submitting: false,
  });

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 6000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const fetchLocations = useCallback(async () => {
    if (!currentAssociation) return;

    setFetching(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .order("name", { ascending: true });

      if (error) throw error;

      setLocations(data as unknown as LocationRow[]);
    } catch (err) {
      console.error("Error fetching locations:", err);
      setFetchError("Failed to load locations.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const filteredLocations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.city.toLowerCase().includes(term) ||
        l.address.toLowerCase().includes(term)
    );
  }, [locations, searchTerm]);

  const sortedLocations = useMemo(() => {
    const column = LOCATION_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredLocations;
    return sortRows(filteredLocations, column, sortState.direction);
  }, [filteredLocations, sortState]);

  const handleSortToggle = (key: ColumnKey) => {
    setSortState((prev) => ({
      columnKey: key,
      direction:
        prev.columnKey === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleCreate = async (data: {
    name: string;
    city: string;
    province_state: string;
    address: string;
    postal_code: string;
    google_maps_link: string;
  }) => {
    if (!currentAssociation) return;

    setCreateDialogState((prev) => ({
      ...prev,
      submitting: true,
      error: null,
    }));

    try {
      const { error } = await supabase.from("locations").insert({
        association_id: currentAssociation.association_id,
        ...data,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Location created successfully.",
      });
      setCreateDialogState((prev) => ({ ...prev, open: false }));
      void fetchLocations();
    } catch (err: any) {
      console.error("Error creating location:", err);
      setCreateDialogState((prev) => ({
        ...prev,
        error: err.message || "Failed to create location.",
      }));
    } finally {
      setCreateDialogState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleEdit = async (data: {
    name: string;
    city: string;
    province_state: string;
    address: string;
    postal_code: string;
    google_maps_link: string;
  }) => {
    if (!editDialogState.location) return;

    setEditDialogState((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      const { error } = await supabase
        .from("locations")
        .update(data)
        .eq("id", editDialogState.location.id);

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Location updated successfully.",
      });
      setEditDialogState((prev) => ({ ...prev, open: false }));
      void fetchLocations();
    } catch (err: any) {
      console.error("Error updating location:", err);
      setEditDialogState((prev) => ({
        ...prev,
        error: err.message || "Failed to update location.",
      }));
    } finally {
      setEditDialogState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteDialogState.location) return;

    setDeleteDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", deleteDialogState.location.id);

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Location deleted successfully.",
      });
      setDeleteDialogState((prev) => ({ ...prev, open: false }));
      void fetchLocations();
    } catch (err: any) {
      console.error("Error deleting location:", err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to delete location.",
      });
    } finally {
      setDeleteDialogState((prev) => ({ ...prev, submitting: false }));
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
            placeholder="Search locations..."
            className="max-w-[250px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchLocations()}
          >
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
          {hasRole("Administrator") && (
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
              <Plus className="mr-2 size-4" /> Add Location
            </Button>
          )}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            "rounded-md px-4 py-3 text-sm",
            feedback.type === "success"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/15 text-destructive"
          )}
        >
          {feedback.message}
        </div>
      )}

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
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <MapPin className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No Locations</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Get started by adding a location for your evaluations.
            </p>
            {hasRole("Administrator") && (
              <Button
                className="mt-4"
                onClick={() =>
                  setCreateDialogState({
                    open: true,
                    submitting: false,
                    error: null,
                  })
                }
              >
                <Plus className="mr-2 size-4" /> Add Location
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-foreground">
                <tr>
                  {LOCATION_COLUMNS.map((col) => (
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
                {sortedLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-muted/30">
                    {LOCATION_COLUMNS.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.getDisplayValue(location)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      {hasRole("Administrator") && (
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
                                  location,
                                  submitting: false,
                                  error: null,
                                })
                              }
                            >
                              <Pencil className="mr-2 size-4" /> Edit
                            </DropdownMenuItem>
                            {location.google_maps_link && (
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    location.google_maps_link!,
                                    "_blank"
                                  )
                                }
                              >
                                <MapPin className="mr-2 size-4" /> View Map
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setDeleteDialogState({
                                  open: true,
                                  location,
                                  submitting: false,
                                })
                              }
                            >
                              <Trash2 className="mr-2 size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <LocationDialog
        open={createDialogState.open}
        onOpenChange={(open) =>
          setCreateDialogState((prev) => ({ ...prev, open }))
        }
        mode="create"
        onSubmit={handleCreate}
        submitting={createDialogState.submitting}
        error={createDialogState.error}
      />

      <LocationDialog
        open={editDialogState.open}
        onOpenChange={(open) =>
          setEditDialogState((prev) => ({ ...prev, open }))
        }
        mode="edit"
        initialData={
          editDialogState.location
            ? {
                name: editDialogState.location.name,
                city: editDialogState.location.city,
                province_state: editDialogState.location.province_state,
                address: editDialogState.location.address,
                postal_code: editDialogState.location.postal_code,
                google_maps_link:
                  editDialogState.location.google_maps_link || "",
              }
            : undefined
        }
        onSubmit={handleEdit}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the location "
              {deleteDialogState.location?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDialogState.submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleteDialogState.submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDialogState.submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
