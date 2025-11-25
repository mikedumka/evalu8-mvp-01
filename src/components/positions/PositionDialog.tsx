import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import type { Database } from "@/types/database.types";

type PositionTypeRow = Database["public"]["Tables"]["position_types"]["Row"];

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: PositionTypeRow | null;
  onSuccess: (message: string) => void;
}

export function PositionDialog({
  open,
  onOpenChange,
  position,
  onSuccess,
}: PositionDialogProps) {
  const { currentAssociation } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(position?.name ?? "");
      setError(null);
      setSubmitting(false);
    }
  }, [open, position]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Position name is required.");

    setSubmitting(true);

    try {
      if (position) {
        // Update
        const { error } = await supabase
          .from("position_types")
          .update({ name: name.trim() })
          .eq("id", position.id);

        if (error) throw error;
        onSuccess("Position type updated successfully.");
      } else {
        if (!currentAssociation) throw new Error("No active association");

        // Create
        const { error } = await supabase.from("position_types").insert({
          association_id: currentAssociation.association_id,
          name: name.trim(),
          status: "active",
        });

        if (error) throw error;
        onSuccess("Position type created successfully.");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save position type:", err);
      // Check for unique constraint violation
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "23505"
      ) {
        setError("A position type with this name already exists.");
      } else {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {position ? "Edit Position Type" : "Add Position Type"}
          </DialogTitle>
          <DialogDescription>
            {position
              ? "Update the name of the position type."
              : "Create a new position type for your sport (e.g., Forward, Defense)."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Forward"
              disabled={submitting}
            />
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
              {submitting
                ? "Saving..."
                : position
                ? "Save Changes"
                : "Add Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
