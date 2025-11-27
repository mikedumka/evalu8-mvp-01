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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/database.types";

type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];

interface CohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohort: CohortRow | null;
  onSubmit: (
    name: string,
    description: string | null,
    status: "active" | "inactive",
    sessionCapacity: number,
    minSessions: number,
    sessionsPerCohort: number
  ) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function CohortDialog({
  open,
  onOpenChange,
  cohort,
  onSubmit,
  submitting,
  error,
}: CohortDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [sessionCapacity, setSessionCapacity] = useState(20);
  const [minSessions, setMinSessions] = useState(1);
  const [sessionsPerCohort, setSessionsPerCohort] = useState(1);

  useEffect(() => {
    if (open) {
      setName(cohort?.name ?? "");
      setDescription(cohort?.description ?? "");
      setStatus((cohort?.status as "active" | "inactive") ?? "active");
      setSessionCapacity(cohort?.session_capacity ?? 20);
      setMinSessions(cohort?.minimum_sessions_per_athlete ?? 1);
      setSessionsPerCohort(cohort?.sessions_per_cohort ?? 1);
    }
  }, [open, cohort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(
      name,
      description || null,
      status,
      sessionCapacity,
      minSessions,
      sessionsPerCohort
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{cohort ? "Edit Cohort" : "Create Cohort"}</DialogTitle>
          <DialogDescription>
            {cohort
              ? "Update the cohort details below."
              : "Add a new cohort to the association."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. U11"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionCapacity">Session Cap</Label>
              <Input
                id="sessionCapacity"
                type="number"
                min={1}
                value={sessionCapacity}
                onChange={(e) => setSessionCapacity(Number(e.target.value))}
                required
                disabled={submitting}
              />
              <p className="text-[0.7rem] text-muted-foreground">
                Max athletes
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minSessions">Min Sessions</Label>
              <Input
                id="minSessions"
                type="number"
                min={1}
                value={minSessions}
                onChange={(e) => setMinSessions(Number(e.target.value))}
                required
                disabled={submitting}
              />
              <p className="text-[0.7rem] text-muted-foreground">Per athlete</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionsPerCohort">Total Sessions</Label>
              <Input
                id="sessionsPerCohort"
                type="number"
                min={1}
                value={sessionsPerCohort}
                onChange={(e) => setSessionsPerCohort(Number(e.target.value))}
                required
                disabled={submitting}
              />
              <p className="text-[0.7rem] text-muted-foreground">For cohort</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(val: string) =>
                setStatus(val as "active" | "inactive")
              }
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {cohort ? "Save Changes" : "Create Cohort"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
