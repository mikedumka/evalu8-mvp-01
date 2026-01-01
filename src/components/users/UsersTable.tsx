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
  UserCheck,
  UserMinus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { UserDialog } from "./UserDialog";
import { EditUserDialog } from "./EditUserDialog";
import type { SystemUserRow } from "./types";

type ColumnKey =
  | "lastName"
  | "firstName"
  | "email"
  | "status"
  | "roles"
  | "associations"
  | "lastLogin"
  | "createdAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: SystemUserRow) => React.ReactNode;
  getSortValue?: (
    row: SystemUserRow
  ) => string | number | Date | null | undefined;
}

const USER_COLUMNS: ColumnConfig[] = [
  {
    key: "lastName",
    label: "Last Name",
    getDisplayValue: (row) => {
      const parts = (row.full_name || "").split(",");
      return parts[0]?.trim() || "—";
    },
    getSortValue: (row) => {
      const parts = (row.full_name || "").split(",");
      return parts[0]?.trim().toLowerCase() || "";
    },
  },
  {
    key: "firstName",
    label: "First Name",
    getDisplayValue: (row) => {
      const parts = (row.full_name || "").split(",");
      return parts[1]?.trim() || "—";
    },
    getSortValue: (row) => {
      const parts = (row.full_name || "").split(",");
      return parts[1]?.trim().toLowerCase() || "";
    },
  },
  {
    key: "email",
    label: "Email",
    getDisplayValue: (row) => row.email,
    getSortValue: (row) => row.email.toLocaleLowerCase(),
  },
  {
    key: "status",
    label: "Status",
    getDisplayValue: (row) => (row.status === "active" ? "Active" : "Inactive"),
  },
  {
    key: "roles",
    label: "System Roles",
    getDisplayValue: (row) =>
      row.system_roles.length ? (
        <div className="flex flex-col gap-1">
          {row.system_roles.map((role) => (
            <Badge key={role} variant="secondary" className="w-fit">
              {role}
            </Badge>
          ))}
        </div>
      ) : (
        "—"
      ),
    getSortValue: (row) => row.system_roles.join(", "),
  },
  {
    key: "associations",
    label: "Associations",
    getDisplayValue: (row) =>
      `${row.active_association_count}/${row.association_count}`,
    getSortValue: (row) => row.association_count,
    align: "center",
  },
  {
    key: "lastLogin",
    label: "Last Login",
    getDisplayValue: (row) =>
      row.last_login_at
        ? new Date(row.last_login_at).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Never",
    getSortValue: (row) =>
      row.last_login_at ? new Date(row.last_login_at).getTime() : 0,
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
  rows: SystemUserRow[],
  column: ColumnConfig,
  direction: SortDirection
): SystemUserRow[] {
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

export function UsersTable() {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "lastName",
    "firstName",
    "email",
    "status",
    "roles",
    "associations",
    "lastLogin",
    "createdAt",
  ]);
  const [sortState, setSortState] = useState<SortState>({
    columnKey: "lastName",
    direction: "asc",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [capabilityWarning, setCapabilityWarning] = useState<string | null>(
    null
  );
  const [supportsSystemManagement, setSupportsSystemManagement] = useState<
    boolean | null
  >(null);

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogState, setEditDialogState] = useState<{
    open: boolean;
    user: SystemUserRow | null;
  }>({
    open: false,
    user: null,
  });
  const [statusDialogState, setStatusDialogState] = useState<{
    open: boolean;
    user: SystemUserRow | null;
    action: "deactivate" | "reactivate" | null;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    user: null,
    action: null,
    submitting: false,
    error: null,
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

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase.rpc("system_list_users");

      if (!error && data) {
        setUsers(data as SystemUserRow[]);
        setSupportsSystemManagement(true);
        setCapabilityWarning(null);
      } else {
        // Fallback logic
        console.warn("system_list_users unavailable, falling back", error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("users")
          .select(
            "id, email, full_name, created_at, last_login_at, association_users:association_users!association_users_user_id_fkey ( status, association:associations ( status ) )"
          )
          .order("created_at", { ascending: false });

        if (fallbackError) throw fallbackError;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (fallbackData ?? []).map((row: any) => {
          const memberships = row.association_users ?? [];

          const activeAssociationCount = memberships.filter(
            (m: any) =>
              m.status === "active" && m.association?.status === "active"
          ).length;

          return {
            id: row.id,
            email: row.email,
            full_name: row.full_name,
            status: "active",
            system_roles: [],
            created_at: row.created_at,
            last_login_at: row.last_login_at,
            association_count: memberships.length,
            active_association_count: activeAssociationCount,
          } satisfies SystemUserRow;
        });

        setUsers(rows);
        setSupportsSystemManagement(false);
        setCapabilityWarning(
          "Advanced system user management features are not available in this environment. Showing users from associations you manage."
        );
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setFetchError("Failed to load users.");
      setUsers([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Filtering & Sorting
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [
        u.full_name ?? "",
        u.email,
        u.status,
        u.system_roles.join(" "),
        String(u.association_count),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [users, searchTerm]);

  const sortedUsers = useMemo(() => {
    const column = USER_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (!column) return filteredUsers;
    return sortRows(filteredUsers, column, sortState.direction);
  }, [filteredUsers, sortState]);

  // Selection
  const visibleIds = useMemo(() => sortedUsers.map((u) => u.id), [sortedUsers]);
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

  const visibleColumnConfigs = useMemo(
    () => USER_COLUMNS.filter((c) => visibleColumns.includes(c.key)),
    [visibleColumns]
  );

  const handleStatusChange = async () => {
    const { user, action } = statusDialogState;
    if (!user || !action) return;

    setStatusDialogState((prev) => ({ ...prev, submitting: true }));

    try {
      const nextStatus = action === "deactivate" ? "inactive" : "active";
      const { error } = await supabase.rpc("system_update_user_status", {
        p_user_id: user.id,
        p_status: nextStatus,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: `User ${
          action === "deactivate" ? "deactivated" : "reactivated"
        } successfully.`,
      });
      await fetchUsers();
      setStatusDialogState((prev) => ({
        ...prev,
        open: false,
        submitting: false,
      }));
    } catch (err) {
      console.error("Failed to update status:", err);
      setStatusDialogState((prev) => ({
        ...prev,
        submitting: false,
        error: "Failed to update user status.",
      }));
    }
  };

  if (!hasRole("System Administrator")) {
    return (
      <div className="p-6 text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  const canManageSystemUsers = supportsSystemManagement !== false;

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

      {capabilityWarning && (
        <div className="rounded-md border border-yellow-300/70 bg-yellow-100/60 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-100">
          {capabilityWarning}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
          className="md:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            disabled={!canManageSystemUsers}
            title={
              !canManageSystemUsers
                ? "Unavailable in this environment"
                : undefined
            }
          >
            <Plus className="mr-2 size-4" /> Add User
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchUsers()}>
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
              {USER_COLUMNS.map((col) => (
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
        ) : sortedUsers.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No users found.
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
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => handleSelectRow(user.id)}
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
                        {col.getDisplayValue(user)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={!canManageSystemUsers}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              setEditDialogState({ open: true, user })
                            }
                          >
                            <Pencil className="mr-2 size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === "active" ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setStatusDialogState({
                                  open: true,
                                  user,
                                  action: "deactivate",
                                  submitting: false,
                                  error: null,
                                })
                              }
                            >
                              <UserMinus className="mr-2 size-4" /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatusDialogState({
                                  open: true,
                                  user,
                                  action: "reactivate",
                                  submitting: false,
                                  error: null,
                                })
                              }
                            >
                              <UserCheck className="mr-2 size-4" /> Reactivate
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
      <UserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchUsers();
        }}
      />

      <EditUserDialog
        open={editDialogState.open}
        onOpenChange={(open) =>
          setEditDialogState((prev) => ({ ...prev, open }))
        }
        user={editDialogState.user}
        onSuccess={(msg) => {
          setFeedback({ type: "success", message: msg });
          void fetchUsers();
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
                ? "Deactivate user?"
                : "Reactivate user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialogState.action === "deactivate"
                ? "The user will lose access to all associations immediately. You can reactivate access later."
                : "The user will regain access based on their association roles."}
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
    </div>
  );
}
