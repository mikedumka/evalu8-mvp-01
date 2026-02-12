import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Info, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  cohort: { name: string } | null;
  location: { name: string } | null;
};
type SessionDrillRow = Database["public"]["Tables"]["session_drills"]["Row"];
type PositionTypeRow = Database["public"]["Tables"]["position_types"]["Row"];
type DrillRow = Database["public"]["Tables"]["drills"]["Row"];

type SessionDrillDetail = SessionDrillRow & {
  drill: Pick<DrillRow, "id" | "name" | "status"> | null;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

interface FormState {
  drillId: string;
  weight: string;
  positionIds: string[];
}

const emptyForm: FormState = {
  drillId: "",
  weight: "",
  positionIds: [],
};

interface DrillConfigurationProps {
  session: SessionRow;
}

export function DrillConfiguration({ session }: DrillConfigurationProps) {
  const { currentAssociation } = useAuth();
  const [sessionDrills, setSessionDrills] = useState<SessionDrillDetail[]>([]);
  const [loadingSessionDrills, setLoadingSessionDrills] = useState(false);
  const [positions, setPositions] = useState<PositionTypeRow[]>([]);
  const [activeDrills, setActiveDrills] = useState<DrillRow[]>([]);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [editingSessionDrillId, setEditingSessionDrillId] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);

  const isLocked = Boolean(session?.drill_config_locked);

  const assignedDrillIds = useMemo(() => {
    return new Set(sessionDrills.map((item) => item.drill_id));
  }, [sessionDrills]);

  const availableDrills = useMemo(() => {
    if (editingSessionDrillId) {
      const currentAssignment = sessionDrills.find(
        (item) => item.id === editingSessionDrillId
      );
      if (!currentAssignment) {
        return activeDrills;
      }
      return activeDrills.filter(
        (drill) =>
          drill.id === currentAssignment.drill_id ||
          !assignedDrillIds.has(drill.id)
      );
    }
    return activeDrills.filter((drill) => !assignedDrillIds.has(drill.id));
  }, [activeDrills, assignedDrillIds, editingSessionDrillId, sessionDrills]);

  const positionSummaries = useMemo(() => {
    const summary: Record<string, { weight: number; count: number }> = {};
    positions.forEach((position) => {
      summary[position.id] = { weight: 0, count: 0 };
    });

    sessionDrills.forEach((sessionDrill) => {
      (sessionDrill.applies_to_positions ?? []).forEach((positionId) => {
        const entry = summary[positionId] ?? { weight: 0, count: 0 };
        entry.weight += sessionDrill.weight_percent;
        entry.count += 1;
        summary[positionId] = entry;
      });
    });

    return summary;
  }, [positions, sessionDrills]);

  const isConfigurationComplete = useMemo(() => {
    if (positions.length === 0) return false;
    return positions.every((p) => {
      const s = positionSummaries[p.id];
      return s && s.weight === 100 && s.count > 0 && s.count <= 4;
    });
  }, [positions, positionSummaries]);

  useEffect(() => {
    if (session && currentAssociation) {
      setSessionDrills([]);
      setActiveDrills([]);
      setPositions([]);
      setFeedback(null);
      setFormState(emptyForm);
      setEditingSessionDrillId(null);

      void Promise.all([
        fetchSessionDrills(session.id),
        fetchActiveDrills(),
        fetchPositions(),
      ]);
    }
  }, [session, currentAssociation]);

  const fetchActiveDrills = async () => {
    if (!currentAssociation) return;
    const { data, error } = await supabase
      .from("drills")
      .select("*")
      .eq("association_id", currentAssociation.association_id)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load active drills", error.message);
      setActiveDrills([]);
    } else {
      setActiveDrills(data ?? []);
    }
  };

  const fetchPositions = async () => {
    if (!currentAssociation) return;
    const { data, error } = await supabase
      .from("position_types")
      .select("*")
      .eq("association_id", currentAssociation.association_id)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load positions", error.message);
      setPositions([]);
    } else {
      setPositions(data ?? []);
    }
  };

  const fetchSessionDrills = async (sessionId: string) => {
    setLoadingSessionDrills(true);
    const { data, error } = await supabase
      .from("session_drills")
      .select("*, drill:drills(id, name, status)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load session drills", error.message);
      setSessionDrills([]);
    } else {
      setSessionDrills(data ?? []);
    }

    setLoadingSessionDrills(false);
  };

  const handlePositionToggle = (positionId: string) => {
    setFormState((prev) => {
      const exists = prev.positionIds.includes(positionId);
      return {
        ...prev,
        positionIds: exists
          ? prev.positionIds.filter((id) => id !== positionId)
          : [...prev.positionIds, positionId],
      };
    });
  };

  const handleEditAssignment = (assignment: SessionDrillDetail) => {
    setEditingSessionDrillId(assignment.id);
    setFeedback(null);
    setFormState({
      drillId: assignment.drill_id,
      weight: String(assignment.weight_percent),
      positionIds: assignment.applies_to_positions ?? [],
    });
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingSessionDrillId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) return;

    const weight = Number.parseInt(formState.weight, 10);
    if (Number.isNaN(weight) || weight < 1 || weight > 100) {
      setFeedback({
        type: "error",
        message: "Weight must be between 1 and 100.",
      });
      return;
    }

    if (!formState.positionIds.length) {
      setFeedback({ type: "error", message: "Select at least one position." });
      return;
    }

    if (!editingSessionDrillId && !formState.drillId) {
      setFeedback({ type: "error", message: "Select a drill to assign." });
      return;
    }

    setLoadingRequest(true);
    setFeedback(null);

    try {
      if (editingSessionDrillId) {
        const { error } = await supabase.rpc("update_session_drill", {
          p_session_drill_id: editingSessionDrillId,
          p_weight_percent: weight,
          p_position_ids: formState.positionIds,
        });

        if (error) {
          setFeedback({ type: "error", message: error.message });
          return;
        }

        setFeedback({ type: "success", message: "Session drill updated." });
      } else {
        const { error } = await supabase.rpc("add_session_drill", {
          p_session_id: session.id,
          p_drill_id: formState.drillId,
          p_weight_percent: weight,
          p_position_ids: formState.positionIds,
        });

        if (error) {
          setFeedback({ type: "error", message: error.message });
          return;
        }

        setFeedback({ type: "success", message: "Drill assigned to session." });
      }

      await fetchSessionDrills(session.id);
      resetForm();
    } catch (err) {
      setFeedback({ type: "error", message: (err as Error).message });
    } finally {
      setLoadingRequest(false);
    }
  };

  const handleRemoveAssignment = async (assignment: SessionDrillDetail) => {
    if (!session) return;

    const confirmed = window.confirm(
      `Remove ${assignment.drill?.name ?? "this drill"} from the session?`
    );

    if (!confirmed) return;

    setLoadingRequest(true);
    setFeedback(null);

    try {
      const { error } = await supabase.rpc("remove_session_drill", {
        p_session_drill_id: assignment.id,
      });

      if (error) {
        setFeedback({ type: "error", message: error.message });
        return;
      }

      setFeedback({ type: "success", message: "Drill removed from session." });
      await fetchSessionDrills(session.id);
      resetForm();
    } finally {
      setLoadingRequest(false);
    }
  };

  const handleCloneConfiguration = async () => {
    if (!session || !isConfigurationComplete) return;

    const confirmed = window.confirm(
      "This will overwrite drill configurations for all other sessions in this wave. Continue?"
    );

    if (!confirmed) return;

    setLoadingRequest(true);
    setFeedback(null);

    try {
      // Calls the RPC to clone the current session's drill config to all other sessions in the same wave
      const { error } = await supabase.rpc("clone_session_drills", {
        p_source_session_id: session.id,
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Configuration cloned to wave.",
      });
    } catch (err) {
      setFeedback({ type: "error", message: (err as Error).message });
    } finally {
      setLoadingRequest(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-250px)]">
      {feedback && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {isLocked && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          Drill configuration is locked for this session.
        </div>
      )}

      <div className="flex flex-col gap-6 flex-1 min-h-0">
        <div className="grid gap-6 lg:grid-cols-3 shrink-0">
          {/* Form */}
          <div className="lg:col-span-2 h-full max-h-[500px] overflow-y-auto">
            <form
              className="rounded-xl border border-border bg-muted/40 p-5"
              onSubmit={handleSubmit}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                  {editingSessionDrillId
                    ? "Edit Assignment"
                    : "Add Drill to Session"}
                </h3>
                {editingSessionDrillId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    disabled={loadingRequest}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Drill</Label>
                  <Select
                    value={formState.drillId}
                    onValueChange={(val) =>
                      setFormState((prev) => ({ ...prev, drillId: val }))
                    }
                    disabled={
                      isLocked ||
                      loadingRequest ||
                      Boolean(editingSessionDrillId)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          editingSessionDrillId
                            ? "Drill cannot be changed"
                            : "Select drill"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDrills.map((drill) => (
                        <SelectItem key={drill.id} value={drill.id}>
                          {drill.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Weight (%)</Label>
                  <Input
                    type="number"
                    value={formState.weight}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        weight: e.target.value,
                      }))
                    }
                    min={1}
                    max={100}
                    placeholder="e.g. 40"
                    disabled={isLocked || loadingRequest}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Positions</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {positions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No active positions found.
                      </p>
                    ) : (
                      positions.map((position) => {
                        const summary = positionSummaries[position.id] ?? {
                          weight: 0,
                          count: 0,
                        };
                        const isChecked = formState.positionIds.includes(
                          position.id
                        );
                        const isComplete = summary.weight === 100;

                        return (
                          <div
                            key={position.id}
                            className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition ${
                              isChecked
                                ? "border-primary bg-primary/10"
                                : isComplete
                                ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800"
                                : "border-border bg-card"
                            }`}
                          >
                            <span className="font-medium">{position.name}</span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs ${
                                  isComplete
                                    ? "text-emerald-600 font-bold"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {summary.weight}% ({summary.count}/4)
                              </span>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() =>
                                  handlePositionToggle(position.id)
                                }
                                disabled={isLocked || loadingRequest}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={isLocked || loadingRequest}>
                  {loadingRequest && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingSessionDrillId ? "Save Changes" : "Add Drill"}
                </Button>
              </div>
            </form>
          </div>

          {/* Business Rules */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 h-fit dark:bg-blue-900/20 dark:border-blue-800 overflow-y-auto">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase dark:text-blue-100">
              <Info className="size-4" />
              Business Rules
            </h3>
            <div className="space-y-4 text-sm dark:text-blue-200/80">
              <div className="space-y-1">
                <p className="font-medium dark:text-blue-100">Drill Limits</p>
                <p>Maximum of 4 drills per position per session.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium dark:text-blue-100">Weighting</p>
                <p>Total weight for each position must equal exactly 100%.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium dark:text-blue-100">Locking</p>
                <p>
                  Configuration is locked automatically after the first
                  evaluation score is entered.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium dark:text-blue-100">Cloning</p>
                <p>
                  Once all positions are configured to 100%, you can clone this
                  configuration to all other sessions in the same wave.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignments List - Repositioned to Bottom */}
        <div className="rounded-xl border border-border bg-card p-5 flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Current Assignments
            </h3>
            {isConfigurationComplete && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2"
                onClick={handleCloneConfiguration}
                disabled={isLocked || loadingRequest}
                title="Clone to other sessions in wave"
              >
                <Copy className="h-3.5 w-3.5" />
                Clone
              </Button>
            )}
          </div>

          {loadingSessionDrills ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : sessionDrills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No drills assigned.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sessionDrills.map((assignment) => (
                <li
                  key={assignment.id}
                  className="rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {assignment.drill?.name ?? "Unknown drill"}
                      </span>
                      <Badge variant="secondary">
                        {assignment.weight_percent}%
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(assignment.applies_to_positions ?? [])
                        .map(
                          (id) =>
                            positions.find((p) => p.id === id)?.name ??
                            "Unknown"
                        )
                        .join(", ") || "No positions"}
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleEditAssignment(assignment)}
                        disabled={isLocked || loadingRequest}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleRemoveAssignment(assignment)}
                        disabled={isLocked || loadingRequest}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
