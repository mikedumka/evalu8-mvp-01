import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

interface SeasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season: SeasonRow | null;
  onSuccess: (message: string) => void;
}

export function SeasonDialog({
  open,
  onOpenChange,
  season,
  onSuccess,
}: SeasonDialogProps) {
  const { currentAssociation } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [outlierThreshold, setOutlierThreshold] = useState(25);
  const [minEvaluators, setMinEvaluators] = useState(3);

  useEffect(() => {
    if (open) {
      setError(null);
      setSubmitting(false);
      if (season) {
        setName(season.name);
        setOutlierThreshold(season.outlier_threshold_percent);
        setMinEvaluators(season.minimum_evaluators_per_athlete);
      } else {
        // Defaults for new season
        setName("");
        setOutlierThreshold(25);
        setMinEvaluators(3);
      }
    }
  }, [open, season]);

  const isConfigLocked = season && season.status !== "draft";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssociation) return;

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        outlier_threshold_percent: outlierThreshold,
        minimum_evaluators_per_athlete: minEvaluators,
      };

      if (season) {
        // Update
        const { error } = await supabase
          .from("seasons")
          .update(payload)
          .eq("id", season.id);

        if (error) throw error;
        onSuccess("Season updated successfully.");
      } else {
        // Create
        const { error } = await supabase.from("seasons").insert({
          association_id: currentAssociation.association_id,
          status: "draft",
          ...payload,
        });

        if (error) throw error;
        onSuccess("Season created successfully.");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save season:", err);
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "23505"
      ) {
        setError("A season with this name already exists.");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{season ? "Edit Season" : "Create Season"}</DialogTitle>
          <DialogDescription>
            {season
              ? "Update season configuration."
              : "Set up a new evaluation season."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Season Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2025-2026 Season"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outlierThreshold">Outlier Threshold (%)</Label>
              <Input
                id="outlierThreshold"
                type="number"
                min={10}
                max={50}
                value={outlierThreshold}
                onChange={(e) => setOutlierThreshold(Number(e.target.value))}
                required
                disabled={submitting || !!isConfigLocked}
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Deviation to flag (10-50%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minEvaluators">Min Evaluators</Label>
              <Input
                id="minEvaluators"
                type="number"
                min={1}
                max={10}
                value={minEvaluators}
                onChange={(e) => setMinEvaluators(Number(e.target.value))}
                required
                disabled={submitting || !!isConfigLocked}
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Per athlete (1-10)
              </p>
            </div>
          </div>

          {isConfigLocked && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Configuration parameters are locked because this season is{" "}
              {season.status}.
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
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {season ? "Save Changes" : "Create Season"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
