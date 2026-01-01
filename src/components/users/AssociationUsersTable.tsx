import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SlidersHorizontal,
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
import { InviteAssociationUserDialog } from "./InviteAssociationUserDialog";

type AssociationUserRow = {
  id: string; // association_user id
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  status: string;
  invited_at: string | null;
  joined_at: string | null;
};

type ColumnKey =
  | "lastName"
  | "firstName"
  | "email"
  | "roles"
  | "status"
  | "joinedAt";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: "left" | "right" | "center";
  getDisplayValue: (row: AssociationUserRow) => React.ReactNode;
  getSortValue?: (
    row: AssociationUserRow
  ) => string | number | Date | null | undefined;
}

const USER_COLUMNS: ColumnConfig[] = [
  {
    key: "lastName",
    label: "Last Name",
    getDisplayValue: (row) => {
      const fullName = (row.full_name || "").trim();
      // Handle "Last, First" format
      if (fullName.includes(",")) {
        return fullName.split(",")[0].trim();
      }
      // Handle "First Last" format
      const parts = fullName.split(" ");
      // If multiple parts, everything after the first is the last name
      return parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || "—";
    },
    getSortValue: (row) => {
      const fullName = (row.full_name || "").trim();
      if (fullName.includes(",")) {
        return fullName.split(",")[0].trim().toLowerCase();
      }
      const parts = fullName.split(" ");
      return (
        parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || ""
      ).toLowerCase();
    },
  },
  {
    key: "firstName",
    label: "First Name",
    getDisplayValue: (row) => {
      const fullName = (row.full_name || "").trim();
      // Handle "Last, First" format
      if (fullName.includes(",")) {
        const parts = fullName.split(",");
        return parts.length > 1 ? parts[1].trim() : "";
      }
      // Handle "First Last" format
      const parts = fullName.split(" ");
      // First part is the first name
      return parts.length > 0 ? parts[0] : "—";
    },
    getSortValue: (row) => {
      const fullName = (row.full_name || "").trim();
      if (fullName.includes(",")) {
        const parts = fullName.split(",");
        return (parts.length > 1 ? parts[1].trim() : "").toLowerCase();
      }
      const parts = fullName.split(" ");
      return (parts.length > 0 ? parts[0] : "").toLowerCase();
    },
  },
  {
    key: "email",
    label: "Email",
    getDisplayValue: (row) => row.email,
    getSortValue: (row) => row.email.toLowerCase(),
  },
  {
    key: "roles",
    label: "Roles",
    getDisplayValue: (row) =>
      row.roles.length ? (
        <div className="flex flex-col gap-1">
          {row.roles.map((role) => (
            <Badge key={role} variant="secondary" className="w-fit">
              {role}
            </Badge>
          ))}
        </div>
      ) : (
        "—"
      ),
    getSortValue: (row) => row.roles.join(", "),
  },
  {
    key: "status",
    label: "Status",
    getDisplayValue: (row) => (row.status === "active" ? "Active" : "Inactive"),
  },
  {
    key: "joinedAt",
    label: "Joined",
    getDisplayValue: (row) =>
      row.joined_at
        ? new Date(row.joined_at).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : row.invited_at
        ? `Invited ${new Date(row.invited_at).toLocaleDateString()}`
        : "—",
    getSortValue: (row) =>
      row.joined_at
        ? new Date(row.joined_at).getTime()
        : row.invited_at
        ? new Date(row.invited_at).getTime()
        : 0,
  },
];

type SortDirection = "asc" | "desc";

interface SortState {
  columnKey: ColumnKey;
  direction: SortDirection;
}

function sortRows(
  rows: AssociationUserRow[],
  column: ColumnConfig,
  direction: SortDirection
): AssociationUserRow[] {
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

export function AssociationUsersTable() {
  const { currentAssociation } = useAuth();
  const [users, setUsers] = useState<AssociationUserRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    "lastName",
    "firstName",
    "email",
    "roles",
    "status",
    "joinedAt",
  ]);
  const [sortState, setSortState] = useState<SortState>({
    columnKey: "lastName",
    direction: "asc",
  });

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<AssociationUserRow | null>(
    null
  );

  const fetchUsers = useCallback(async () => {
    if (!currentAssociation) return;

    setFetching(true);
    setFetchError(null);

    try {
      const { data, error } = await supabase
        .from("association_users")
        .select(
          `
          id,
          user_id,
          roles,
          status,
          invited_at,
          joined_at,
          users:users!association_users_user_id_fkey (
            email,
            full_name
          )
        `
        )
        .eq("association_id", currentAssociation.association_id);

      if (error) throw error;

      const formattedUsers: AssociationUserRow[] = (data || []).map(
        (record: any) => ({
          id: record.id,
          user_id: record.user_id,
          email: record.users?.email || "",
          full_name: record.users?.full_name || "",
          roles: record.roles || [],
          status: record.status,
          invited_at: record.invited_at,
          joined_at: record.joined_at,
        })
      );

      setUsers(formattedUsers);
    } catch (err) {
      console.error("Error fetching association users:", err);
      setFetchError("Failed to load users.");
    } finally {
      setFetching(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRemoveUser = async () => {
    if (!userToRemove || !currentAssociation) return;

    try {
      const { error } = await supabase
        .from("association_users")
        .delete()
        .eq("id", userToRemove.id);

      if (error) throw error;

      await fetchUsers();
    } catch (err) {
      console.error("Error removing user:", err);
      // You might want to show a toast here
    } finally {
      setUserToRemove(null);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(lowerTerm) ||
          (user.full_name && user.full_name.toLowerCase().includes(lowerTerm))
      );
    }

    const column = USER_COLUMNS.find((c) => c.key === sortState.columnKey);
    if (column) {
      result = sortRows(result, column, sortState.direction);
    }

    return result;
  }, [users, searchTerm, sortState]);

  const toggleSort = (key: ColumnKey) => {
    setSortState((prev) => ({
      columnKey: key,
      direction:
        prev.columnKey === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
          className="md:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsInviteDialogOpen(true)}>
            <Plus className="mr-2 size-4" /> Invite User
          </Button>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw
              className={cn("mr-2 size-4", fetching && "animate-spin")}
            />{" "}
            Refresh
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
              {USER_COLUMNS.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns.includes(column.key)}
                  onCheckedChange={() => toggleColumn(column.key)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              {USER_COLUMNS.filter((col) =>
                visibleColumns.includes(col.key)
              ).map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    "cursor-pointer select-none hover:text-foreground"
                  )}
                  onClick={() => toggleSort(column.key)}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      column.align === "right" && "justify-end",
                      column.align === "center" && "justify-center"
                    )}
                  >
                    {column.label}
                    {sortState.columnKey === column.key ? (
                      sortState.direction === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-50" />
                    )}
                  </div>
                </th>
              ))}
              <th className="h-10 w-[50px] px-4 text-left align-middle font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {fetching ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  {visibleColumns.map((key) => (
                    <td key={key} className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                  <td className="p-4">
                    <Skeleton className="size-8 rounded-md" />
                  </td>
                </tr>
              ))
            ) : fetchError ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="h-24 text-center text-destructive"
                >
                  {fetchError}
                </td>
              </tr>
            ) : filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filteredAndSortedUsers.map((row) => (
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  {USER_COLUMNS.filter((col) =>
                    visibleColumns.includes(col.key)
                  ).map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "p-4 align-middle",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center"
                      )}
                    >
                      {column.getDisplayValue(row)}
                    </td>
                  ))}
                  <td className="p-4 align-middle">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="size-8 p-0 data-[state=open]:bg-muted"
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setUserToRemove(row)}
                        >
                          <UserMinus className="mr-2 size-4" />
                          Remove User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InviteAssociationUserDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onSuccess={fetchUsers}
      />

      <AlertDialog
        open={!!userToRemove}
        onOpenChange={(open) => !open && setUserToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {userToRemove?.full_name || userToRemove?.email}
              </span>{" "}
              from this association? They will lose all access to this
              association's data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
