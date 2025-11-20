import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const SYSTEM_ROLE_OPTIONS = ["System Administrator", "Support"] as const;
const ASSOCIATION_ROLE_OPTIONS = [
  "Administrator",
  "Evaluator",
  "Intake Personnel",
] as const;

type AssociationRole = (typeof ASSOCIATION_ROLE_OPTIONS)[number];

export type AssociationOption = {
  id: string;
  name: string;
  abbreviation: string | null;
  status: string;
};

type InviteFunctionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  invitationStatus?: "invited" | "existing";
};

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function UserDialog({ open, onOpenChange, onSuccess }: UserDialogProps) {
  const { user, hasRole } = useAuth();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [systemRoles, setSystemRoles] = useState<string[]>([]);
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [associationRoles, setAssociationRoles] = useState<AssociationRole[]>(
    []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [associationOptions, setAssociationOptions] = useState<
    AssociationOption[]
  >([]);
  const [associationsLoading, setAssociationsLoading] = useState(false);
  const [associationsError, setAssociationsError] = useState<string | null>(
    null
  );

  const isSystemAdmin = hasRole("System Administrator");

  // Load associations
  useEffect(() => {
    if (!open || !user || !isSystemAdmin) return;

    let isCancelled = false;

    const loadAssociations = async () => {
      setAssociationsLoading(true);
      setAssociationsError(null);

      const { data, error } = await supabase
        .from("associations")
        .select("id, name, abbreviation, status")
        .eq("status", "active")
        .order("name", { ascending: true });

      if (isCancelled) return;

      if (error) {
        console.error("Failed to load associations", error);
        setAssociationsError("Unable to load associations.");
        setAssociationOptions([]);
      } else {
        setAssociationOptions(
          (data ?? []).map((r) => ({
            id: r.id,
            name: r.name,
            abbreviation: r.abbreviation,
            status: r.status,
          }))
        );
      }

      setAssociationsLoading(false);
    };

    void loadAssociations();

    return () => {
      isCancelled = true;
    };
  }, [open, user, isSystemAdmin]);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setSystemRoles([]);
      setAssociationId(null);
      setAssociationRoles([]);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const selectedAssociation = associationOptions.find(
    (a) => a.id === associationId
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Email is required.");
    if (!firstName.trim()) return setError("First name is required.");
    if (!lastName.trim()) return setError("Last name is required.");
    if (!associationId) return setError("Association selection is required.");
    if (associationRoles.length === 0)
      return setError("Select at least one association role.");

    setSubmitting(true);

    try {
      const { data, error: invokeError } =
        await supabase.functions.invoke<InviteFunctionResponse>(
          "invite-system-user",
          {
            body: {
              email: email.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              systemRoles,
              associationId,
              associationRoles,
            },
          }
        );

      if (invokeError) throw invokeError;

      if (!data?.success) {
        throw new Error(
          data?.message || data?.error || "Unable to invite user."
        );
      }

      onSuccess(data.message ?? "Invitation sent successfully.");
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to invite user:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add system user</DialogTitle>
          <DialogDescription>
            Invite an existing Supabase-authenticated user to receive
            system-level access controls.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              The user will receive an email invitation to sign in with Google.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last name
              </label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First name
              </label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jordan"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Association</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={submitting || associationsLoading}
                >
                  <span className="truncate">
                    {selectedAssociation
                      ? selectedAssociation.name
                      : "Select association"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
                {associationOptions.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {associationsLoading
                      ? "Loading..."
                      : "No active associations found."}
                  </div>
                ) : (
                  associationOptions.map((assoc) => (
                    <DropdownMenuItem
                      key={assoc.id}
                      onSelect={() => setAssociationId(assoc.id)}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{assoc.name}</span>
                      {associationId === assoc.id && (
                        <Check className="ml-2 size-4" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {associationsError && (
              <p className="text-xs text-destructive">{associationsError}</p>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Association roles</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={submitting}
                >
                  <span className="truncate">
                    {associationRoles.length > 0
                      ? associationRoles.join(", ")
                      : "Select association roles"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {ASSOCIATION_ROLE_OPTIONS.map((role) => (
                  <DropdownMenuCheckboxItem
                    key={role}
                    checked={associationRoles.includes(role)}
                    onCheckedChange={(checked) => {
                      if (checked)
                        setAssociationRoles([...associationRoles, role]);
                      else
                        setAssociationRoles(
                          associationRoles.filter((r) => r !== role)
                        );
                    }}
                  >
                    {role}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">System roles (Optional)</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={submitting}
                >
                  <span className="truncate">
                    {systemRoles.length > 0
                      ? systemRoles.join(", ")
                      : "Select system roles"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {SYSTEM_ROLE_OPTIONS.map((role) => (
                  <DropdownMenuCheckboxItem
                    key={role}
                    checked={systemRoles.includes(role)}
                    onCheckedChange={(checked) => {
                      if (checked) setSystemRoles([...systemRoles, role]);
                      else
                        setSystemRoles(systemRoles.filter((r) => r !== role));
                    }}
                  >
                    {role}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
