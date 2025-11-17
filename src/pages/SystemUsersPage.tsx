import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  UserCheck,
  UserMinus,
} from "lucide-react";

import { Login } from "@/components/Login";
import { AdminPage } from "@/components/layout/AdminPage";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const SYSTEM_ROLE_OPTIONS = ["System Administrator", "Support"] as const;
const ASSOCIATION_ROLE_OPTIONS = [
  "Administrator",
  "Evaluator",
  "Intake Personnel",
] as const;

type AssociationRole = (typeof ASSOCIATION_ROLE_OPTIONS)[number];

type AssociationOption = {
  id: string;
  name: string;
  abbreviation: string | null;
  status: string;
};

type SystemUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: "active" | "inactive";
  system_roles: string[];
  created_at: string;
  last_login_at: string | null;
  association_count: number;
  active_association_count: number;
};

type InviteFunctionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  invitationStatus?: "invited" | "existing";
};

type ColumnKey =
  | "name"
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
  getDisplayValue: (row: SystemUserRow) => string;
  getSortValue?: (
    row: SystemUserRow
  ) => string | number | Date | null | undefined;
}

type SortDirection = "asc" | "desc";

interface SortState {
  columnKey: ColumnKey;
  direction: SortDirection;
}

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

type StatusAction = "deactivate" | "reactivate";

interface StatusDialogState {
  open: boolean;
  user: SystemUserRow | null;
  action: StatusAction | null;
  submitting: boolean;
  error: string | null;
}

interface EditDialogState {
  open: boolean;
  user: SystemUserRow | null;
  fullName: string;
  systemRoles: string[];
  submitting: boolean;
  error: string | null;
}

interface CreateDialogState {
  open: boolean;
  email: string;
  firstName: string;
  lastName: string;
  systemRoles: string[];
  associationId: string | null;
  associationRoles: AssociationRole[];
  submitting: boolean;
  error: string | null;
}

const USER_COLUMNS: ColumnConfig[] = [
  {
    key: "name",
    label: "Name",
    getDisplayValue: (row) => row.full_name?.trim() || "—",
    getSortValue: (row) => row.full_name?.toLocaleLowerCase() || row.email,
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
      row.system_roles.length ? row.system_roles.join(", ") : "—",
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

function sortRows(
  rows: SystemUserRow[],
  column: ColumnConfig,
  direction: SortDirection
): SystemUserRow[] {
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

export default function SystemUsersPage() {
  const { user, loading, hasRole } = useAuth();
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    USER_COLUMNS.map((column) => column.key)
  );
  const [sortState, setSortState] = useState<SortState | null>({
    columnKey: "name",
    direction: "asc",
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [createDialogState, setCreateDialogState] = useState<CreateDialogState>(
    {
      open: false,
      email: "",
      firstName: "",
      lastName: "",
      systemRoles: [],
      associationId: null,
      associationRoles: [],
      submitting: false,
      error: null,
    }
  );
  const [associationOptions, setAssociationOptions] = useState<
    AssociationOption[]
  >([]);
  const [associationsLoading, setAssociationsLoading] = useState(false);
  const [associationsError, setAssociationsError] = useState<string | null>(
    null
  );
  const selectedAssociation = useMemo(() => {
    if (!createDialogState.associationId) {
      return null;
    }

    return (
      associationOptions.find(
        (option) => option.id === createDialogState.associationId
      ) ?? null
    );
  }, [createDialogState.associationId, associationOptions]);
  const [editDialogState, setEditDialogState] = useState<EditDialogState>({
    open: false,
    user: null,
    fullName: "",
    systemRoles: [],
    submitting: false,
    error: null,
  });
  const [statusDialogState, setStatusDialogState] = useState<StatusDialogState>(
    {
      open: false,
      user: null,
      action: null,
      submitting: false,
      error: null,
    }
  );
  const [supportsSystemManagement, setSupportsSystemManagement] = useState<
    boolean | null
  >(null);
  const [capabilityWarning, setCapabilityWarning] = useState<string | null>(
    null
  );

  const isSystemAdmin = hasRole("System Administrator");

  type FallbackUserRow = {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    last_login_at: string | null;
    association_users: Array<{
      status: string;
      association: {
        status: string;
      } | null;
    }> | null;
  };

  const executeUsersQuery = useCallback(async () => {
    const { data, error } = await supabase.rpc("system_list_users");

    if (!error && data) {
      return {
        rows: data as SystemUserRow[],
        supported: true,
        warning: null,
      } as const;
    }

    if (error) {
      console.warn("system_list_users unavailable, falling back", error);

      const fallbackSelect =
        "id, email, full_name, created_at, last_login_at, association_users:association_users!association_users_user_id_fkey ( status, association:associations ( status ) )";

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("users")
        .select(fallbackSelect)
        .order("created_at", { ascending: false });

      if (fallbackError) {
        console.error("Fallback user query failed", fallbackError);
        throw fallbackError;
      }

      const rows = (fallbackData ?? []).map((row: FallbackUserRow) => {
        const memberships = row.association_users ?? [];
        const activeAssociationCount = memberships.filter(
          (membership) =>
            membership.status === "active" &&
            membership.association?.status === "active"
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

      return {
        rows,
        supported: false,
        warning:
          "Advanced system user management features are not available in this environment. Showing users from associations you manage.",
      } as const;
    }

    return {
      rows: [] as SystemUserRow[],
      supported: null,
      warning: null,
    } as const;
  }, []);

  const refreshUsers = useCallback(async () => {
    setFetching(true);
    setFetchError(null);

    try {
      const { rows, supported, warning } = await executeUsersQuery();
      setSupportsSystemManagement(supported);
      setCapabilityWarning(warning);
      setUsers(rows);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Unknown error";
      console.error("Failed to load users", message);
      setFetchError("Unable to load users. Please try again.");
      setSupportsSystemManagement(null);
      setCapabilityWarning(null);
      setUsers([]);
    } finally {
      setFetching(false);
    }
  }, [executeUsersQuery]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    const loadUsers = async () => {
      setFetching(true);
      setFetchError(null);

      try {
        const { rows, supported, warning } = await executeUsersQuery();
        if (!isMounted) {
          return;
        }
        setSupportsSystemManagement(supported);
        setCapabilityWarning(warning);
        setUsers(rows);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message =
          error && typeof error === "object" && "message" in error
            ? String(error.message)
            : "Unknown error";
        console.error("Failed to load users", message);
        setFetchError("Unable to load users. Please try again.");
        setSupportsSystemManagement(null);
        setCapabilityWarning(null);
        setUsers([]);
      } finally {
        if (isMounted) {
          setFetching(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, [executeUsersQuery, user]);

  useEffect(() => {
    setSelectedUserIds((previous) =>
      previous.filter((id) => users.some((systemUser) => systemUser.id === id))
    );
  }, [users]);

  useEffect(() => {
    if (!user || !isSystemAdmin || supportsSystemManagement === false) {
      setAssociationOptions([]);
      setAssociationsError(null);
      setAssociationsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadAssociations = async () => {
      setAssociationsLoading(true);
      setAssociationsError(null);

      const { data, error } = await supabase
        .from("associations")
        .select("id, name, abbreviation, status")
        .order("name", { ascending: true });

      if (isCancelled) {
        return;
      }

      if (error) {
        console.error("Failed to load associations", error);
        setAssociationsError("Unable to load associations.");
        setAssociationOptions([]);
      } else {
        const options = (data ?? []).map((association: unknown) => {
          const record = association as {
            id: string;
            name: string;
            abbreviation: string | null;
            status: string;
          };

          return {
            id: record.id,
            name: record.name,
            abbreviation: record.abbreviation,
            status: record.status,
          } satisfies AssociationOption;
        });

        setAssociationOptions(
          options.filter((option) => option.status === "active")
        );
      }

      setAssociationsLoading(false);
    };

    void loadAssociations();

    return () => {
      isCancelled = true;
    };
  }, [user, isSystemAdmin, supportsSystemManagement]);

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

  useEffect(() => {
    setCreateDialogState((previous) => {
      if (
        !previous.open ||
        !previous.associationId ||
        associationOptions.some(
          (option) => option.id === previous.associationId
        )
      ) {
        return previous;
      }

      return {
        ...previous,
        associationId: null,
        associationRoles: [],
      };
    });
  }, [associationOptions]);

  const handleColumnToggle = (columnKey: ColumnKey, nextChecked: boolean) => {
    setVisibleColumns((prev) => {
      if (nextChecked) {
        if (prev.includes(columnKey)) {
          return prev;
        }

        const nextColumns = [...prev, columnKey];
        return USER_COLUMNS.filter((column) =>
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
    () => USER_COLUMNS.filter((column) => visibleColumns.includes(column.key)),
    [visibleColumns]
  );

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((systemUser) => {
      const haystack = [
        systemUser.full_name ?? "",
        systemUser.email,
        systemUser.status,
        systemUser.system_roles.join(" "),
        String(systemUser.association_count),
      ]
        .join(" ")
        .toLocaleLowerCase();

      return haystack.includes(term);
    });
  }, [users, searchTerm]);

  const sortedUsers = useMemo(() => {
    if (!sortState) {
      return filteredUsers;
    }

    const column = USER_COLUMNS.find(
      (item) => item.key === sortState.columnKey
    );

    if (!column) {
      return filteredUsers;
    }

    return sortRows(filteredUsers, column, sortState.direction);
  }, [filteredUsers, sortState]);

  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);

  const visibleUserIds = useMemo(
    () => sortedUsers.map((systemUser) => systemUser.id),
    [sortedUsers]
  );

  const selectedVisibleCount = useMemo(
    () => visibleUserIds.filter((id) => selectedUserIds.includes(id)).length,
    [visibleUserIds, selectedUserIds]
  );

  const allVisibleSelected =
    visibleUserIds.length > 0 && selectedVisibleCount === visibleUserIds.length;
  const isIndeterminate =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleUserIds.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectAllVisible = (event: ChangeEvent<HTMLInputElement>) => {
    if (!visibleUserIds.length) {
      return;
    }

    const { checked } = event.target;

    setSelectedUserIds((previous) => {
      if (!checked) {
        return previous.filter((id) => !visibleUserIds.includes(id));
      }

      const merged = new Set(previous);
      visibleUserIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds((previous) => {
      if (previous.includes(userId)) {
        return previous.filter((id) => id !== userId);
      }
      return [...previous, userId];
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

  const handleOpenCreateDialog = () => {
    if (supportsSystemManagement === false) {
      return;
    }
    setCreateDialogState({
      open: true,
      email: "",
      firstName: "",
      lastName: "",
      systemRoles: [],
      associationId: null,
      associationRoles: [],
      submitting: false,
      error: null,
    });
  };

  const handleCreateDialogChange = (open: boolean) => {
    if (!open) {
      setCreateDialogState({
        open: false,
        email: "",
        firstName: "",
        lastName: "",
        systemRoles: [],
        associationId: null,
        associationRoles: [],
        submitting: false,
        error: null,
      });
    } else {
      setCreateDialogState((previous) => ({ ...previous, open: true }));
    }
  };

  const handleCreateRoleToggle = (role: string, checked: boolean) => {
    setCreateDialogState((previous) => {
      const roles = new Set(previous.systemRoles);
      if (checked) {
        roles.add(role);
      } else {
        roles.delete(role);
      }
      return {
        ...previous,
        systemRoles: Array.from(roles),
        error: null,
      };
    });
  };

  const handleCreateAssociationSelect = (association: AssociationOption) => {
    setCreateDialogState((previous) => ({
      ...previous,
      associationId: association.id,
      error: null,
    }));
  };

  const handleCreateAssociationRoleToggle = (
    role: AssociationRole,
    checked: boolean
  ) => {
    setCreateDialogState((previous) => {
      const roles = new Set(previous.associationRoles);
      if (checked) {
        roles.add(role);
      } else {
        roles.delete(role);
      }
      return {
        ...previous,
        associationRoles: Array.from(roles),
        error: null,
      };
    });
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = createDialogState.email.trim();
    const firstName = createDialogState.firstName.trim();
    const lastName = createDialogState.lastName.trim();
    const systemRoles = createDialogState.systemRoles;
    const associationId = createDialogState.associationId;
    const associationRoles = createDialogState.associationRoles;

    if (supportsSystemManagement === false) {
      setCreateDialogState((previous) => ({
        ...previous,
        error:
          "System-wide user management is not available in this environment.",
      }));
      return;
    }

    if (!email) {
      setCreateDialogState((previous) => ({
        ...previous,
        error: "Email is required.",
      }));
      return;
    }

    if (!associationId) {
      setCreateDialogState((previous) => ({
        ...previous,
        error: "Association selection is required.",
      }));
      return;
    }

    if (!associationRoles.length) {
      setCreateDialogState((previous) => ({
        ...previous,
        error: "Select at least one association role.",
      }));
      return;
    }

    if (!lastName) {
      setCreateDialogState((previous) => ({
        ...previous,
        error: "Last name is required.",
      }));
      return;
    }

    if (!firstName) {
      setCreateDialogState((previous) => ({
        ...previous,
        error: "First name is required.",
      }));
      return;
    }

    setCreateDialogState((previous) => ({
      ...previous,
      submitting: true,
      error: null,
    }));

    const { data, error } =
      await supabase.functions.invoke<InviteFunctionResponse>(
        "invite-system-user",
        {
          body: {
            email,
            firstName,
            lastName,
            systemRoles,
            associationId,
            associationRoles,
          },
        }
      );

    if (error) {
      console.error("Failed to invite system user", error);
      setCreateDialogState((previous) => ({
        ...previous,
        submitting: false,
        error:
          "Unable to invite user. Confirm the email address has not already been invited.",
      }));
      return;
    }

    if (!data?.success) {
      const serverMessage =
        (data && "error" in data && data.error) ||
        data?.message ||
        "Unable to invite user. Please try again.";

      setCreateDialogState((previous) => ({
        ...previous,
        submitting: false,
        error: serverMessage,
      }));
      return;
    }

    await refreshUsers();
    setSelectedUserIds([]);
    setFeedback({
      type: "success",
      message: data.message ?? "Invitation sent successfully.",
    });
    handleCreateDialogChange(false);
  };

  const handleOpenEditDialog = (systemUser: SystemUserRow) => {
    if (supportsSystemManagement === false) {
      return;
    }
    setEditDialogState({
      open: true,
      user: systemUser,
      fullName: systemUser.full_name ?? "",
      systemRoles: [...systemUser.system_roles],
      submitting: false,
      error: null,
    });
  };

  const handleEditRoleToggle = (role: string, checked: boolean) => {
    setEditDialogState((previous) => {
      const roles = new Set(previous.systemRoles);
      if (checked) {
        roles.add(role);
      } else {
        roles.delete(role);
      }
      return {
        ...previous,
        systemRoles: Array.from(roles),
        error: null,
      };
    });
  };

  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      setEditDialogState({
        open: false,
        user: null,
        fullName: "",
        systemRoles: [],
        submitting: false,
        error: null,
      });
    } else {
      setEditDialogState((previous) => ({ ...previous, open: true }));
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editDialogState.user) {
      return;
    }

    if (supportsSystemManagement === false) {
      setEditDialogState((previous) => ({
        ...previous,
        error:
          "System-wide user management is not available in this environment.",
      }));
      return;
    }

    const fullName = editDialogState.fullName.trim();
    const roles = editDialogState.systemRoles;

    setEditDialogState((previous) => ({
      ...previous,
      submitting: true,
      error: null,
    }));

    const { error } = await supabase.rpc("system_update_user_profile", {
      p_user_id: editDialogState.user.id,
      p_full_name: fullName || null,
      p_system_roles: roles,
    });

    if (error) {
      console.error("Failed to update system user", error);
      setEditDialogState((previous) => ({
        ...previous,
        submitting: false,
        error: "Unable to save changes. Please try again.",
      }));
      return;
    }

    await refreshUsers();
    setFeedback({
      type: "success",
      message: "User details updated successfully.",
    });
    handleEditDialogChange(false);
  };

  const handleOpenStatusDialog = (
    systemUser: SystemUserRow,
    action: StatusAction
  ) => {
    if (supportsSystemManagement === false) {
      return;
    }
    setStatusDialogState({
      open: true,
      user: systemUser,
      action,
      submitting: false,
      error: null,
    });
  };

  const handleStatusDialogChange = (open: boolean) => {
    if (!open) {
      setStatusDialogState({
        open: false,
        user: null,
        action: null,
        submitting: false,
        error: null,
      });
    } else {
      setStatusDialogState((previous) => ({ ...previous, open: true }));
    }
  };

  const handleConfirmStatusChange = async () => {
    const systemUser = statusDialogState.user;
    const action = statusDialogState.action;

    if (!systemUser || !action) {
      return;
    }

    if (supportsSystemManagement === false) {
      return;
    }

    setStatusDialogState((previous) => ({
      ...previous,
      submitting: true,
      error: null,
    }));

    const nextStatus = action === "deactivate" ? "inactive" : "active";

    const { error } = await supabase.rpc("system_update_user_status", {
      p_user_id: systemUser.id,
      p_status: nextStatus,
    });

    if (error) {
      console.error("Failed to update user status", error);
      setStatusDialogState((previous) => ({
        ...previous,
        submitting: false,
        error: "Unable to update user status. Please try again.",
      }));
      return;
    }

    await refreshUsers();
    setFeedback({
      type: "success",
      message:
        action === "deactivate"
          ? `${systemUser.full_name ?? systemUser.email} has been deactivated.`
          : `${systemUser.full_name ?? systemUser.email} has been reactivated.`,
    });
    handleStatusDialogChange(false);
  };

  const handleCreateFieldChange = (
    field: "email" | "firstName" | "lastName",
    value: string
  ) => {
    setCreateDialogState((previous) => ({
      ...previous,
      [field]: value,
      error: null,
    }));
  };

  const handleEditFieldChange = (value: string) => {
    setEditDialogState((previous) => ({
      ...previous,
      fullName: value,
      error: null,
    }));
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

  const canManageSystemUsers = supportsSystemManagement !== false;

  return (
    <AdminPage
      title="System Users"
      badgeLabel={null}
      showAssociationInfo={false}
      description="Manage system-level user access across Evalu8."
    >
      {!isSystemAdmin ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          You need System Administrator privileges to view system users.
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
          {capabilityWarning ? (
            <div className="rounded-md border border-yellow-300/70 bg-yellow-100/60 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-100">
              {capabilityWarning}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users"
              className="md:max-w-xs"
              aria-label="Search system users"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleOpenCreateDialog}
                disabled={!canManageSystemUsers}
                title={
                  canManageSystemUsers
                    ? undefined
                    : "System-wide user management is unavailable in this environment."
                }
              >
                <Plus className="mr-2 size-4" /> Add user
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
                  {USER_COLUMNS.map((column) => (
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
              {selectedUserIds.length ? (
                <span className="text-sm font-medium text-foreground">
                  {selectedUserIds.length} selected
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">
                {sortedUsers.length} result
                {sortedUsers.length === 1 ? "" : "s"}
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
                        <label className="flex items-center">
                          <span className="sr-only">Select all users</span>
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
                    {sortedUsers.map((systemUser) => (
                      <tr key={systemUser.id} className="hover:bg-muted/30">
                        <td className="w-12 px-4 py-3">
                          <label className="flex items-center">
                            <span className="sr-only">
                              Select {systemUser.full_name ?? systemUser.email}
                            </span>
                            <input
                              type="checkbox"
                              className="size-4 rounded border border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              checked={selectedUserIds.includes(systemUser.id)}
                              onChange={() => handleSelectUser(systemUser.id)}
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
                            {column.getDisplayValue(systemUser)}
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
                                disabled={!canManageSystemUsers}
                                title={
                                  canManageSystemUsers
                                    ? undefined
                                    : "System-wide user management is unavailable in this environment."
                                }
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">
                                  Open user actions
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                disabled={!canManageSystemUsers}
                                onSelect={() =>
                                  handleOpenEditDialog(systemUser)
                                }
                              >
                                <Pencil className="mr-2 size-4" /> Edit details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {systemUser.status === "active" ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  disabled={!canManageSystemUsers}
                                  onSelect={() =>
                                    handleOpenStatusDialog(
                                      systemUser,
                                      "deactivate"
                                    )
                                  }
                                >
                                  <UserMinus className="mr-2 size-4" />{" "}
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  disabled={!canManageSystemUsers}
                                  onSelect={() =>
                                    handleOpenStatusDialog(
                                      systemUser,
                                      "reactivate"
                                    )
                                  }
                                >
                                  <UserCheck className="mr-2 size-4" />{" "}
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
          <Dialog
            open={createDialogState.open}
            onOpenChange={handleCreateDialogChange}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add system user</DialogTitle>
                <DialogDescription>
                  Invite an existing Supabase-authenticated user to receive
                  system-level access controls.
                </DialogDescription>
              </DialogHeader>
              {createDialogState.error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createDialogState.error}
                </div>
              ) : null}
              <form className="space-y-4" onSubmit={handleCreateSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="create-user-email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <Input
                    id="create-user-email"
                    type="email"
                    value={createDialogState.email}
                    onChange={(event) =>
                      handleCreateFieldChange("email", event.target.value)
                    }
                    placeholder="name@example.com"
                    required
                    disabled={createDialogState.submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    The user will receive an email invitation to sign in with
                    Google and finish setting up their profile.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="create-user-last-name"
                        className="text-sm font-medium text-foreground"
                      >
                        Last name
                      </label>
                      <Input
                        id="create-user-last-name"
                        value={createDialogState.lastName}
                        onChange={(event) =>
                          handleCreateFieldChange(
                            "lastName",
                            event.target.value
                          )
                        }
                        placeholder="Doe"
                        autoComplete="family-name"
                        required
                        disabled={createDialogState.submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="create-user-first-name"
                        className="text-sm font-medium text-foreground"
                      >
                        First name
                      </label>
                      <Input
                        id="create-user-first-name"
                        value={createDialogState.firstName}
                        onChange={(event) =>
                          handleCreateFieldChange(
                            "firstName",
                            event.target.value
                          )
                        }
                        placeholder="Jordan"
                        autoComplete="given-name"
                        required
                        disabled={createDialogState.submitting}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We will store the display name as "Last, First" to match
                    association rosters.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Association
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        disabled={
                          createDialogState.submitting || associationsLoading
                        }
                      >
                        <span className="truncate text-left">
                          {selectedAssociation
                            ? selectedAssociation.name
                            : associationsLoading
                            ? "Loading associations..."
                            : "Select association"}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-full min-w-[20rem] max-h-72 overflow-y-auto"
                    >
                      {associationOptions.length ? (
                        associationOptions.map((association) => {
                          const isSelected =
                            selectedAssociation?.id === association.id;
                          const abbreviation = association.abbreviation
                            ? association.abbreviation.toUpperCase()
                            : null;

                          return (
                            <DropdownMenuItem
                              key={association.id}
                              className={cn(
                                "flex items-center justify-between gap-3",
                                isSelected &&
                                  "bg-muted text-foreground focus:bg-muted"
                              )}
                              onSelect={(event) => {
                                event.preventDefault();
                                handleCreateAssociationSelect(association);
                              }}
                            >
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-medium">
                                  {association.name}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {abbreviation ?? association.id}
                                </span>
                              </div>
                              {isSelected ? (
                                <Check className="size-4 text-primary" />
                              ) : null}
                            </DropdownMenuItem>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {associationsLoading
                            ? "Loading associations..."
                            : "No associations available."}
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {associationsError ? (
                    <p className="text-xs text-destructive">
                      {associationsError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Assign the user to their primary association.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Association roles
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        disabled={createDialogState.submitting}
                      >
                        <span className="truncate text-left">
                          {createDialogState.associationRoles.length
                            ? createDialogState.associationRoles.join(", ")
                            : "Select association roles"}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-full min-w-[20rem]"
                    >
                      {ASSOCIATION_ROLE_OPTIONS.map((role) => (
                        <DropdownMenuCheckboxItem
                          key={role}
                          checked={createDialogState.associationRoles.includes(
                            role
                          )}
                          onCheckedChange={(checked) =>
                            handleCreateAssociationRoleToggle(
                              role,
                              checked === true
                            )
                          }
                          disabled={createDialogState.submitting}
                        >
                          {role}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <p className="text-xs text-muted-foreground">
                    These roles control association-level permissions.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    System roles
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        disabled={createDialogState.submitting}
                      >
                        <span className="truncate text-left">
                          {createDialogState.systemRoles.length
                            ? createDialogState.systemRoles.join(", ")
                            : "Select system roles"}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-full min-w-[20rem]"
                    >
                      {SYSTEM_ROLE_OPTIONS.map((role) => (
                        <DropdownMenuCheckboxItem
                          key={role}
                          checked={createDialogState.systemRoles.includes(role)}
                          onCheckedChange={(checked) =>
                            handleCreateRoleToggle(role, checked === true)
                          }
                          disabled={createDialogState.submitting}
                        >
                          {role}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <p className="text-xs text-muted-foreground">
                    Optional elevated access across Evalu8 (leave empty for
                    association-only users).
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCreateDialogChange(false)}
                    disabled={createDialogState.submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDialogState.submitting}>
                    {createDialogState.submitting
                      ? "Sending invitation..."
                      : "Send invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={editDialogState.open}
            onOpenChange={handleEditDialogChange}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit user</DialogTitle>
                <DialogDescription>
                  Update profile details and system-level roles for this user.
                </DialogDescription>
              </DialogHeader>
              {editDialogState.error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {editDialogState.error}
                </div>
              ) : null}
              <form className="space-y-4" onSubmit={handleEditSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="edit-user-email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <Input
                    id="edit-user-email"
                    value={editDialogState.user?.email ?? ""}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="edit-user-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Full name
                  </label>
                  <Input
                    id="edit-user-name"
                    value={editDialogState.fullName}
                    onChange={(event) =>
                      handleEditFieldChange(event.target.value)
                    }
                    placeholder="Optional"
                    disabled={editDialogState.submitting}
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    System roles
                  </span>
                  <div className="space-y-1.5">
                    {SYSTEM_ROLE_OPTIONS.map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-2 text-sm font-medium text-foreground"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          checked={editDialogState.systemRoles.includes(role)}
                          onChange={(event) =>
                            handleEditRoleToggle(role, event.target.checked)
                          }
                          disabled={editDialogState.submitting}
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
                {editDialogState.user ? (
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        Active associations:
                      </span>{" "}
                      {editDialogState.user.active_association_count} of{" "}
                      {editDialogState.user.association_count}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-foreground">
                        Status:
                      </span>{" "}
                      {editDialogState.user.status === "active"
                        ? "Active"
                        : "Inactive"}
                    </p>
                  </div>
                ) : null}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEditDialogChange(false)}
                    disabled={editDialogState.submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editDialogState.submitting}>
                    {editDialogState.submitting ? "Saving..." : "Save changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={statusDialogState.open}
            onOpenChange={handleStatusDialogChange}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {statusDialogState.action === "deactivate"
                    ? "Deactivate user"
                    : "Reactivate user"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {statusDialogState.action === "deactivate"
                    ? "The user will lose access to all associations immediately. You can reactivate access later."
                    : "The user will regain access based on their association roles."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {statusDialogState.error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {statusDialogState.error}
                </div>
              ) : null}
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
