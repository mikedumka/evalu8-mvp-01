import { useEffect, useState, type FormEvent } from "react";

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
import { supabase } from "@/lib/supabase";
import type { SystemUserRow } from "./types";

const SYSTEM_ROLE_OPTIONS = ["System Administrator", "Support"] as const;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SystemUserRow | null;
  onSuccess: (message: string) => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [systemRoles, setSystemRoles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      const parts = (user.full_name ?? "").split(",");
      setLastName(parts[0]?.trim() || "");
      setFirstName(parts[1]?.trim() || "");
      setSystemRoles([...user.system_roles]);
      setError(null);
      setSubmitting(false);
    }
  }, [open, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);

    const fullName =
      lastName.trim() || firstName.trim()
        ? `${lastName.trim()}, ${firstName.trim()}`
        : null;

    try {
      const { error: updateError } = await supabase.rpc(
        "system_update_user_profile",
        {
          p_user_id: user.id,
          p_full_name: fullName,
          p_system_roles: systemRoles,
        }
      );

      if (updateError) throw updateError;

      onSuccess("User details updated successfully.");
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update user:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save changes. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleToggle = (role: string, checked: boolean) => {
    if (checked) {
      setSystemRoles((prev) => [...prev, role]);
    } else {
      setSystemRoles((prev) => prev.filter((r) => r !== role));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update profile details and system-level roles for this user.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="edit-email"
              value={user?.email ?? ""}
              disabled
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="edit-lastName" className="text-sm font-medium">
                Last name
              </label>
              <Input
                id="edit-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-firstName" className="text-sm font-medium">
                First name
              </label>
              <Input
                id="edit-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jordan"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">System roles</span>
            <div className="space-y-1.5">
              {SYSTEM_ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border border-border text-primary focus:ring-primary"
                    checked={systemRoles.includes(role)}
                    onChange={(e) => handleRoleToggle(role, e.target.checked)}
                    disabled={submitting}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>

          {user && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  Active associations:
                </span>{" "}
                {user.active_association_count} of {user.association_count}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Status:</span>{" "}
                {user.status === "active" ? "Active" : "Inactive"}
              </p>
            </div>
          )}

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
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
