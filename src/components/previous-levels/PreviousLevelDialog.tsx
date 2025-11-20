import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Database } from "@/types/database.types";

type PreviousLevelRow = Database["public"]["Tables"]["previous_levels"]["Row"];

interface PreviousLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: PreviousLevelRow | null;
  onSubmit: (name: string) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function PreviousLevelDialog({
  open,
  onOpenChange,
  level,
  onSubmit,
  submitting,
  error,
}: PreviousLevelDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(level?.name ?? "");
    }
  }, [open, level]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {level ? "Edit Previous Level" : "Add Previous Level"}
          </DialogTitle>
          <DialogDescription>
            {level
              ? "Update the name of this previous level."
              : "Create a new previous level ranking."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="level-name"
              className="text-sm font-medium text-foreground"
            >
              Level Name
            </label>
            <Input
              id="level-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. A, B, House, Rep"
              required
              disabled={submitting}
              autoFocus
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
              {submitting ? "Saving..." : level ? "Save Changes" : "Add Level"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
