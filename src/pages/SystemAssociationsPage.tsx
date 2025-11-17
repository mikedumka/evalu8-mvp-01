import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  SlidersHorizontal,
  Plus,
  MoreHorizontal,
  Pencil,
  ShieldOff,
  RotateCcw,
} from "lucide-react";

import { Login } from "@/components/Login";
import { AdminPage } from "@/components/layout/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CreateAssociationForm } from "@/components/sidebar/CreateAssociationForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

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
  getDisplayValue: (row: AssociationRow) => string;
  getSortValue?: (row: AssociationRow) => string | number | Date | null;
}

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

type StatusAction = "deactivate" | "reactivate";

interface StatusDialogState {
  open: boolean;
  association: AssociationRow | null;
  action: StatusAction | null;
  stats: {
    activeUserCount: number | null;
    activeSeasonCount: number | null;
  } | null;
  statsLoading: boolean;
  submitting: boolean;
  error: string | null;
}

interface EditDialogState {
  open: boolean;
  association: AssociationRow | null;
  name: string;
  abbreviation: string;
  contactEmail: string;
  submitting: boolean;
  error: string | null;
}

const ASSOCIATION_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => row.name,
  },
  {
    key: "abbreviation",
    label: "Abbreviation",
    getDisplayValue: (row) => row.abbreviation?.toUpperCase() ?? "—",
  },
  {
    key: "sport",
    label: "Sport",
    getDisplayValue: (row) => row.sport_type?.name ?? "—",
  },
  {
    key: "status",
    label: "Status",
    getDisplayValue: (row) =>
      row.status.charAt(0).toUpperCase() + row.status.slice(1),
  },
  {
    key: "contactEmail",
    label: "Contact Email",
    getDisplayValue: (row) => row.contact_email,
  },
  {
    key: "createdAt",
    label: "Created",
    getDisplayValue: (row) =>
      new Date(row.created_at).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
    const aValue = getValue(a);
    const bValue = getValue(b);

    const normalizedA =
      typeof aValue === "string"
        ? aValue.toLocaleLowerCase()
        : typeof aValue === "number"
        ? aValue
        : aValue instanceof Date
        ? aValue.getTime()
        : aValue ?? "";
    const normalizedB =
      typeof bValue === "string"
        ? bValue.toLocaleLowerCase()
        : typeof bValue === "number"
        ? bValue
        : bValue instanceof Date
        ? bValue.getTime()
        : bValue ?? "";

    if (normalizedA < normalizedB) {
      return -1 * modifier;
    }
    if (normalizedA > normalizedB) {
      return 1 * modifier;
    }
    return 0;
  });
}

export default function SystemAssociationsPage() {
  const { user, loading, hasRole } = useAuth();
  const [associations, setAssociations] = useState<AssociationRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    ASSOCIATION_COLUMNS.map((column) => column.key)
  );
  const [sortState, setSortState] = useState<SortState | null>({
    columnKey: "name",
    direction: "asc",
  });
  const [selectedAssociationIds, setSelectedAssociationIds] = useState<
    string[]
  >([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [editState, setEditState] = useState<EditDialogState>({
    open: false,
    association: null,
    name: "",
    abbreviation: "",
    contactEmail: "",
    submitting: false,
    error: null,
  });
  const [statusDialogState, setStatusDialogState] = useState<StatusDialogState>(
    {
      open: false,
      association: null,
      action: null,
      stats: null,
      statsLoading: false,
      submitting: false,
      error: null,
    }
  );

  const resetEditState = useCallback(() => {
    setEditState({
      open: false,
      association: null,
      name: "",
      abbreviation: "",
      contactEmail: "",
      submitting: false,
      error: null,
    });
  }, []);

  const resetStatusDialogState = useCallback(() => {
    setStatusDialogState({
      open: false,
      association: null,
      action: null,
      stats: null,
      statsLoading: false,
      submitting: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  const executeAssociationQuery = useCallback(async () => {
    const { data, error } = await supabase
      .from("associations")
      .select(
        `id, name, abbreviation, slug, status, contact_email, created_at, sport_type:sport_types!associations_sport_type_id_fkey ( id, name, status )`
      )
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as AssociationRow[];
  }, []);

  useEffect(() => {
    setSelectedAssociationIds((previous) =>
      previous.filter((id) =>
        associations.some((association) => association.id === id)
      )
    );
  }, [associations]);

  useEffect(() => {
    let isMounted = true;

    const loadAssociations = async () => {
      setFetching(true);
      setFetchError(null);

      try {
        const result = await executeAssociationQuery();
        if (!isMounted) {
          return;
        }
        setAssociations(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message =
          error && typeof error === "object" && "message" in error
            ? String(error.message)
            : "Unknown error";
        console.error("Failed to load associations", message);
        setFetchError("Unable to load associations. Please try again.");
        setAssociations([]);
      } finally {
        if (isMounted) {
          setFetching(false);
        }
      }
    };

    void loadAssociations();

    return () => {
      isMounted = false;
    };
  }, [executeAssociationQuery]);

  const refreshAssociations = useCallback(async () => {
    setFetching(true);
    setFetchError(null);

    try {
      const result = await executeAssociationQuery();
      setAssociations(result);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Unknown error";
      console.error("Failed to load associations", message);
      setFetchError("Unable to load associations. Please try again.");
      setAssociations([]);
    } finally {
      setFetching(false);
    }
  }, [executeAssociationQuery]);

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
  };

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleAssociationCreated = async (associationId: string) => {
    await refreshAssociations();
    setSelectedAssociationIds([associationId]);
    setIsCreateDialogOpen(false);
    setFeedback({
      type: "success",
      message: "Association created successfully.",
    });
  };

  const handleColumnToggle = (columnKey: ColumnKey, nextChecked: boolean) => {
    setVisibleColumns((prev) => {
      if (nextChecked) {
        if (prev.includes(columnKey)) {
          return prev;
        }

        const nextColumns = [...prev, columnKey];
        return ASSOCIATION_COLUMNS.filter((column) =>
          nextColumns.includes(column.key)
        ).map((column) => column.key);
      }

      if (prev.length === 1 && prev[0] === columnKey) {
        return prev;
      }

      return prev.filter((key) => key !== columnKey);
    });
  };

  const visibleColumnConfigs = useMemo(
    () =>
      ASSOCIATION_COLUMNS.filter((column) =>
        visibleColumns.includes(column.key)
      ),
    [visibleColumns]
  );

  const handleEditDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetEditState();
      }
    },
    [resetEditState]
  );

  const handleOpenEditDialog = (association: AssociationRow) => {
    setEditState({
      open: true,
      association,
      name: association.name ?? "",
      abbreviation: association.abbreviation ?? "",
      contactEmail: association.contact_email ?? "",
      submitting: false,
      error: null,
    });
  };

  const handleEditFieldChange = (
    field: "name" | "abbreviation" | "contactEmail",
    value: string
  ) => {
    setEditState((previous) => ({
      ...previous,
      [field]: value,
      error: null,
    }));
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editState.association) {
      return;
    }

    const trimmedName = editState.name.trim();
    const trimmedEmail = editState.contactEmail.trim();
    const trimmedAbbreviation = editState.abbreviation.trim();

    if (!trimmedName || !trimmedEmail) {
      setEditState((previous) => ({
        ...previous,
        error: "Association name and contact email are required.",
      }));
      return;
    }

    setEditState((previous) => ({
      ...previous,
      submitting: true,
      error: null,
    }));

    const { error } = await supabase
      .from("associations")
      .update({
        name: trimmedName,
        contact_email: trimmedEmail,
        abbreviation: trimmedAbbreviation ? trimmedAbbreviation : null,
      })
      .eq("id", editState.association.id);

    if (error) {
      console.error("Failed to update association", error);
      setEditState((previous) => ({
        ...previous,
        submitting: false,
        error: "Unable to save changes. Please try again.",
      }));
      return;
    }

    await refreshAssociations();
    setFeedback({
      type: "success",
      message: "Association details updated successfully.",
    });
    resetEditState();
  };

  const handleStatusDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetStatusDialogState();
      }
    },
    [resetStatusDialogState]
  );

  const handleOpenStatusDialog = useCallback(
    (association: AssociationRow, action: StatusAction) => {
      setStatusDialogState({
        open: true,
        association,
        action,
        stats: null,
        statsLoading: true,
        submitting: false,
        error: null,
      });

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

          if (usersResult.error) {
            throw usersResult.error;
          }

          if (seasonsResult.error) {
            throw seasonsResult.error;
          }

          setStatusDialogState((previous) => {
            if (
              !previous.open ||
              previous.association?.id !== association.id ||
              previous.action !== action
            ) {
              return previous;
            }

            return {
              ...previous,
              statsLoading: false,
              stats: {
                activeUserCount: usersResult.count ?? null,
                activeSeasonCount: seasonsResult.count ?? null,
              },
              error: null,
            };
          });
        } catch (statsError) {
          console.error("Failed to load association stats", statsError);
          setStatusDialogState((previous) => ({
            ...previous,
            statsLoading: false,
            error:
              "Unable to load association usage details. You can still continue.",
          }));
        }
      })();
    },
    []
  );

  const handleConfirmStatusChange = async () => {
    const association = statusDialogState.association;
    const action = statusDialogState.action;

    if (!association || !action) {
      return;
    }

    setStatusDialogState((previous) => ({
      ...previous,
      submitting: true,
      error: null,
    }));

    const nextStatus = action === "deactivate" ? "inactive" : "active";

    const { error } = await supabase
      .from("associations")
      .update({ status: nextStatus })
      .eq("id", association.id);

    if (error) {
      console.error("Failed to update association status", error);
      setStatusDialogState((previous) => ({
        ...previous,
        submitting: false,
        error: "Unable to update association status. Please try again.",
      }));
      return;
    }

    await refreshAssociations();

    setFeedback({
      type: "success",
      message:
        action === "deactivate"
          ? `${association.name} has been deactivated.`
          : `${association.name} has been reactivated.`,
    });

    resetStatusDialogState();
  };

  const filteredAssociations = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();

    if (!term) {
      return associations;
    }

    return associations.filter((association) => {
      const haystack = [
        association.name,
        association.abbreviation ?? "",
        association.contact_email ?? "",
        association.status ?? "",
        association.sport_type?.name ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase();

      return haystack.includes(term);
    });
  }, [associations, searchTerm]);

  const sortedAssociations = useMemo(() => {
    if (!sortState) {
      return filteredAssociations;
    }

    const column = ASSOCIATION_COLUMNS.find(
      (item) => item.key === sortState.columnKey
    );

    if (!column) {
      return filteredAssociations;
    }

    return sortRows(filteredAssociations, column, sortState.direction);
  }, [filteredAssociations, sortState]);

  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  const visibleAssociationIds = useMemo(
    () => sortedAssociations.map((association) => association.id),
    [sortedAssociations]
  );

  const selectedVisibleCount = useMemo(
    () =>
      visibleAssociationIds.filter((id) => selectedAssociationIds.includes(id))
        .length,
    [visibleAssociationIds, selectedAssociationIds]
  );

  const allVisibleSelected =
    visibleAssociationIds.length > 0 &&
    selectedVisibleCount === visibleAssociationIds.length;
  const isIndeterminate =
    selectedVisibleCount > 0 &&
    selectedVisibleCount < visibleAssociationIds.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectAllVisible = (event: ChangeEvent<HTMLInputElement>) => {
    if (!visibleAssociationIds.length) {
      return;
    }

    const { checked } = event.target;

    setSelectedAssociationIds((previous) => {
      if (!checked) {
        return previous.filter((id) => !visibleAssociationIds.includes(id));
      }

      const merged = new Set(previous);
      visibleAssociationIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const handleSelectAssociation = (associationId: string) => {
    setSelectedAssociationIds((previous) => {
      if (previous.includes(associationId)) {
        return previous.filter((id) => id !== associationId);
      }
      return [...previous, associationId];
    });
  };

  const handleSortToggle = (columnKey: ColumnKey) => {
    setSortState((previous) => {
      if (!previous || previous.columnKey !== columnKey) {
        return { columnKey, direction: "asc" };
      }

      if (previous.direction === "asc") {
        return { columnKey, direction: "desc" };
      }

      return null;
    });
  };

  const renderSortIcon = (columnKey: ColumnKey) => {
    if (!sortState || sortState.columnKey !== columnKey) {
      return <ArrowUpDown className="ml-2 size-3.5" />;
    }

    return sortState.direction === "asc" ? (
      <ArrowUp className="ml-2 size-3.5" />
    ) : (
      <ArrowDown className="ml-2 size-3.5" />
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isSystemAdmin = hasRole("System Administrator");

  return (
    <AdminPage
      title="Associations"
      badgeLabel={null}
      showAssociationInfo={false}
      description="Review all associations across the Evalu8 platform."
    >
      {!isSystemAdmin ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          You need System Administrator privileges to view system-wide
          associations.
        </div>
      ) : (
        <div className="space-y-4">
          {feedback ? (
            <div
              className={cn(
                "rounded-md border px-4 py-3 text-sm",
                feedback.type === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-600/60 dark:bg-emerald-950/50 dark:text-emerald-100"
                  : "border-destructive/60 bg-destructive/10 text-destructive"
              )}
              role="status"
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search associations"
              className="md:max-w-xs"
              aria-label="Search associations"
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={handleOpenCreateDialog}>
                <Plus className="mr-2 size-4" /> Add association
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 size-4" /> Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48" align="end">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ASSOCIATION_COLUMNS.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={visibleColumns.includes(column.key)}
                      onCheckedChange={(checked) =>
                        handleColumnToggle(column.key, checked === true)
                      }
                      className="capitalize"
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedAssociationIds.length ? (
                <span className="text-sm font-medium text-foreground">
                  {selectedAssociationIds.length} selected
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">
                {sortedAssociations.length} result
                {sortedAssociations.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

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
                        <label className="flex items-center">
                          <span className="sr-only">
                            Select all associations
                          </span>
                          <input
                            ref={selectAllCheckboxRef}
                            type="checkbox"
                            className="size-4 rounded border border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            checked={allVisibleSelected}
                            onChange={handleSelectAllVisible}
                          />
                        </label>
                      </th>
                      {visibleColumnConfigs.map((column) => (
                        <th key={column.key} className="px-4 py-3">
                          <button
                            type="button"
                            className="flex items-center text-xs font-semibold uppercase tracking-wide text-foreground transition hover:text-foreground"
                            onClick={() => handleSortToggle(column.key)}
                          >
                            {column.label}
                            {renderSortIcon(column.key)}
                          </button>
                        </th>
                      ))}
                      <th className="w-14 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-foreground">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {sortedAssociations.map((association) => (
                      <tr key={association.id} className="hover:bg-muted/30">
                        <td className="w-12 px-4 py-3">
                          <label className="flex items-center">
                            <span className="sr-only">
                              Select {association.name}
                            </span>
                            <input
                              type="checkbox"
                              className="size-4 rounded border border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              checked={selectedAssociationIds.includes(
                                association.id
                              )}
                              onChange={() =>
                                handleSelectAssociation(association.id)
                              }
                            />
                          </label>
                        </td>
                        {visibleColumnConfigs.map((column) => (
                          <td
                            key={column.key}
                            className={cn(
                              "px-4 py-3 text-foreground",
                              column.align === "right" && "text-right",
                              column.align === "center" && "text-center"
                            )}
                          >
                            {column.getDisplayValue(association)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">
                                  Open association actions
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onSelect={() =>
                                  handleOpenEditDialog(association)
                                }
                              >
                                <Pencil className="mr-2 size-4" /> Edit details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {association.status === "active" ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() =>
                                    handleOpenStatusDialog(
                                      association,
                                      "deactivate"
                                    )
                                  }
                                >
                                  <ShieldOff className="mr-2 size-4" />{" "}
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    handleOpenStatusDialog(
                                      association,
                                      "reactivate"
                                    )
                                  }
                                >
                                  <RotateCcw className="mr-2 size-4" />{" "}
                                  Reactivate
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
        </div>
      )}
      {isSystemAdmin ? (
        <>
          <Dialog open={editState.open} onOpenChange={handleEditDialogChange}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit association</DialogTitle>
                <DialogDescription>
                  Update the association name or contact email. Sport type and
                  subdomain are locked after creation.
                </DialogDescription>
              </DialogHeader>
              {editState.error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {editState.error}
                </div>
              ) : null}
              <form className="space-y-4" onSubmit={handleEditSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="edit-association-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Association name
                  </label>
                  <Input
                    id="edit-association-name"
                    value={editState.name}
                    onChange={(event) =>
                      handleEditFieldChange("name", event.target.value)
                    }
                    placeholder="Enter association name"
                    required
                    disabled={editState.submitting}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="edit-association-abbreviation"
                    className="text-sm font-medium text-foreground"
                  >
                    Abbreviation
                  </label>
                  <Input
                    id="edit-association-abbreviation"
                    value={editState.abbreviation}
                    onChange={(event) =>
                      handleEditFieldChange("abbreviation", event.target.value)
                    }
                    placeholder="Optional short code (e.g., SMHA)"
                    disabled={editState.submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Displayed in table views and exports.
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="edit-association-contact"
                    className="text-sm font-medium text-foreground"
                  >
                    Contact email
                  </label>
                  <Input
                    id="edit-association-contact"
                    type="email"
                    value={editState.contactEmail}
                    onChange={(event) =>
                      handleEditFieldChange("contactEmail", event.target.value)
                    }
                    placeholder="name@example.com"
                    required
                    disabled={editState.submitting}
                  />
                </div>
                {editState.association ? (
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        Sport type:
                      </span>{" "}
                      {editState.association.sport_type?.name ?? "—"}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-foreground">
                        Subdomain:
                      </span>{" "}
                      {editState.association.slug ?? "—"}
                    </p>
                  </div>
                ) : null}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEditDialogChange(false)}
                    disabled={editState.submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editState.submitting}>
                    {editState.submitting ? "Saving..." : "Save changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={handleCreateDialogChange}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add association</DialogTitle>
                <DialogDescription>
                  Create a new association and assign yourself as the initial
                  administrator.
                </DialogDescription>
              </DialogHeader>
              <CreateAssociationForm
                open={isCreateDialogOpen}
                onCreated={handleAssociationCreated}
                onCancel={() => handleCreateDialogChange(false)}
              />
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={statusDialogState.open}
            onOpenChange={handleStatusDialogOpenChange}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {statusDialogState.action === "deactivate"
                    ? "Deactivate association"
                    : "Reactivate association"}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      {statusDialogState.action === "deactivate"
                        ? "The association will move to the inactive state. Administrators retain read-only access while evaluators, coaches, and season administrators lose access immediately. Active seasons pause until reactivation."
                        : "The association will return to the active state. Previous administrators and evaluators regain access to existing seasons."}
                    </p>
                    {statusDialogState.statsLoading ? (
                      <p className="text-xs text-muted-foreground">
                        Loading association usage details...
                      </p>
                    ) : null}
                    {statusDialogState.stats &&
                    (statusDialogState.stats.activeUserCount !== null ||
                      statusDialogState.stats.activeSeasonCount !== null) ? (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {statusDialogState.stats.activeUserCount !== null ? (
                          <li>
                            {statusDialogState.stats.activeUserCount} active{" "}
                            {statusDialogState.stats.activeUserCount === 1
                              ? "user"
                              : "users"}
                            {statusDialogState.action === "deactivate"
                              ? " will lose access."
                              : " regain access."}
                          </li>
                        ) : null}
                        {statusDialogState.stats.activeSeasonCount !== null ? (
                          <li>
                            {statusDialogState.stats.activeSeasonCount} active{" "}
                            {statusDialogState.stats.activeSeasonCount === 1
                              ? "season"
                              : "seasons"}
                            {statusDialogState.action === "deactivate"
                              ? " will be paused."
                              : " remain available."}
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                    {statusDialogState.error ? (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {statusDialogState.error}
                      </div>
                    ) : null}
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
                  onClick={() => {
                    void handleConfirmStatusChange();
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
        </>
      ) : null}
    </AdminPage>
  );
}
