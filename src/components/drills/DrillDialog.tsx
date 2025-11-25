import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap";
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

type DrillRow = Database["public"]["Tables"]["drills"]["Row"];

interface DrillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drill: DrillRow | null;
  onSuccess: (message: string) => void;
}

export function DrillDialog({
  open,
  onOpenChange,
  drill,
  onSuccess,
}: DrillDialogProps) {
  const { currentAssociation } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(drill?.name ?? "");
      setDescription(drill?.description ?? "");
      setCriteria(drill?.criteria ?? "");
      setError(null);
      setSubmitting(false);
    }
  }, [open, drill]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Drill name is required.");
    if (!criteria.trim()) return setError("Evaluation criteria is required.");

    setSubmitting(true);

    try {
      if (drill) {
        // Update
        const { error } = await supabase.rpc("update_drill", {
          p_drill_id: drill.id,
          p_name: name.trim(),
          p_description: description.trim(),
          p_criteria: criteria.trim(),
        });

        if (error) throw error;
        onSuccess("Drill updated successfully.");
      } else {
        if (!currentAssociation) throw new Error("No active association");

        // Create
        const { error } = await supabase.rpc("create_drill", {
          p_association_id: currentAssociation.association_id,
          p_name: name.trim(),
          p_description: description.trim(),
          p_criteria: criteria.trim(),
        });

        if (error) throw error;
        onSuccess("Drill created successfully.");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save drill:", err);
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
          <DialogTitle>{drill ? "Edit Drill" : "Add Drill"}</DialogTitle>
          <DialogDescription>
            {drill
              ? "Update drill details and evaluation criteria."
              : "Create a new drill for use in evaluation sessions."}
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
              placeholder="e.g. Skating Speed"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this drill measures..."
              className="min-h-[80px]"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="criteria" className="text-sm font-medium">
              Evaluation Criteria
            </label>
            <MinimalTiptapEditor
              value={criteria}
              onChange={setCriteria}
              className="min-h-[150px]"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Provide clear guidelines for evaluators on how to score this
              drill.
            </p>
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
              {submitting ? "Saving..." : drill ? "Save Changes" : "Add Drill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
