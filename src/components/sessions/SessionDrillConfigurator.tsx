import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import { ListChecks, RotateCw } from "lucide-react";
import type { Database } from "../../types/database.types";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionDrillRow = Database["public"]["Tables"]["session_drills"]["Row"];
type PositionTypeRow = Database["public"]["Tables"]["position_types"]["Row"];
type DrillRow = Database["public"]["Tables"]["drills"]["Row"];

type SessionSummary = {
  id: string;
  name: string;
  status: SessionRow["status"];
  drill_config_locked: boolean;
  scheduled_date: SessionRow["scheduled_date"];
  scheduled_time: SessionRow["scheduled_time"];
  cohort: { id: string; name: string } | null;
};

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

export function SessionDrillConfigurator() {
  const { currentAssociation, hasRole } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
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

  const canManage = Boolean(currentAssociation && hasRole("Administrator"));
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );
  const isLocked = Boolean(selectedSession?.drill_config_locked);

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

  useEffect(() => {
    setSessions([]);
    setSelectedSessionId(null);
    setSessionDrills([]);
    setActiveDrills([]);
    setPositions([]);
    setFeedback(null);

    if (currentAssociation && canManage) {
      void Promise.all([
        fetchSessions(),
        fetchActiveDrills(),
        fetchPositions(),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAssociation?.association_id, canManage]);

  useEffect(() => {
    if (sessions.length && !selectedSessionId) {
      void handleSelectSession(sessions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, selectedSessionId]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, name, status, drill_config_locked, scheduled_date, scheduled_time, cohort:cohorts(id, name)"
      )
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(25);

    if (error) {
      console.error("Failed to load sessions", error.message);
      setSessions([]);
    } else {
      const mappedSessions: SessionSummary[] = (data ?? []).map((session) => ({
        id: session.id,
        name: session.name,
        status: session.status,
        drill_config_locked: session.drill_config_locked,
        scheduled_date: session.scheduled_date,
        scheduled_time: session.scheduled_time,
        cohort: session.cohort ?? null,
      }));
      setSessions(mappedSessions);
    }

    setLoadingSessions(false);
  };

  const fetchActiveDrills = async () => {
    const { data, error } = await supabase
      .from("drills")
      .select(
        "id, association_id, name, description, criteria, status, created_at, updated_at"
      )
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
    const { data, error } = await supabase
      .from("position_types")
      .select("id, association_id, name, status, created_at")
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
      .select(
        "id, association_id, session_id, drill_id, weight_percent, applies_to_positions, created_at, drill:drills(id, name, status)"
      )
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

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setFormState(emptyForm);
    setEditingSessionDrillId(null);
    setFeedback(null);
    await fetchSessionDrills(sessionId);
  };

  const handleFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
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

    if (!selectedSessionId) {
      return;
    }

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
          console.error("Failed to update session drill", error.message);
          setFeedback({ type: "error", message: error.message });
          return;
        }

        setFeedback({ type: "success", message: "Session drill updated." });
      } else {
        const { error } = await supabase.rpc("add_session_drill", {
          p_session_id: selectedSessionId,
          p_drill_id: formState.drillId,
          p_weight_percent: weight,
          p_position_ids: formState.positionIds,
        });

        if (error) {
          console.error("Failed to add session drill", error.message);
          setFeedback({ type: "error", message: error.message });
          return;
        }

        setFeedback({ type: "success", message: "Drill assigned to session." });
      }

      await fetchSessionDrills(selectedSessionId);
      resetForm();
    } finally {
      setLoadingRequest(false);
    }
  };

  const handleRemoveAssignment = async (
    event: MouseEvent<HTMLButtonElement>,
    assignment: SessionDrillDetail
  ) => {
    event.stopPropagation();

    if (!selectedSessionId) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${assignment.drill?.name ?? "this drill"} from the session?`
    );

    if (!confirmed) {
      return;
    }

    setLoadingRequest(true);
    setFeedback(null);

    try {
      const { error } = await supabase.rpc("remove_session_drill", {
        p_session_drill_id: assignment.id,
      });

      if (error) {
        console.error("Failed to remove session drill", error.message);
        setFeedback({ type: "error", message: error.message });
        return;
      }

      setFeedback({ type: "success", message: "Drill removed from session." });
      await fetchSessionDrills(selectedSessionId);
      resetForm();
    } finally {
      setLoadingRequest(false);
    }
  };

  const refreshAll = async () => {
    await fetchSessions();
    if (selectedSessionId) {
      await fetchSessionDrills(selectedSessionId);
    }
    await fetchActiveDrills();
    await fetchPositions();
  };

  if (!currentAssociation) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ListChecks className="h-5 w-5 text-primary" />
          Session Drill Configuration
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Select an association to configure session drills.
        </p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ListChecks className="h-5 w-5 text-primary" />
          Session Drill Configuration
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          You need Administrator privileges to manage session drill assignments.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 text-foreground shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ListChecks className="h-5 w-5 text-primary" />
            Session Drill Configuration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign drills with weights to positions for each evaluation session.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
          disabled={loadingSessions || loadingSessionDrills || loadingRequest}
        >
          <RotateCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">
            Sessions
          </h3>
          {loadingSessions ? (
            <div className="mt-4 flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No sessions found. Create sessions before assigning drills.
            </div>
          ) : (
            <ul className="mt-4 grid gap-3">
              {sessions.map((session) => {
                const isSelected = session.id === selectedSessionId;
                const sessionDate = session.scheduled_date
                  ? new Date(session.scheduled_date).toLocaleDateString()
                  : "Unscheduled";
                return (
                  <li key={session.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => void handleSelectSession(session.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void handleSelectSession(session.id);
                        }
                      }}
                      className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">
                          {session.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {session.cohort ? session.cohort.name : "No Cohort"}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                          {sessionDate} · {session.scheduled_time ?? "--"}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                          Status: {session.status}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-6">
          {isLocked && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Drill configuration is locked for this session. You can review
              existing assignments but cannot make changes.
            </div>
          )}

          <form
            className="rounded-xl border border-border bg-muted/40 p-5"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                {editingSessionDrillId
                  ? "Edit Assignment"
                  : "Add Drill to Session"}
              </h3>
              {editingSessionDrillId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                  disabled={loadingRequest}
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-muted-foreground md:col-span-2">
                <span className="font-medium text-foreground">Drill</span>
                <select
                  name="drillId"
                  value={formState.drillId}
                  onChange={handleFormChange}
                  disabled={
                    isLocked || loadingRequest || Boolean(editingSessionDrillId)
                  }
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {editingSessionDrillId
                      ? "Drill cannot be changed"
                      : "Select drill"}
                  </option>
                  {availableDrills.map((drill) => (
                    <option key={drill.id} value={drill.id}>
                      {drill.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Weight (%)</span>
                <input
                  type="number"
                  name="weight"
                  value={formState.weight}
                  onChange={handleFormChange}
                  min={1}
                  max={100}
                  placeholder="e.g. 40"
                  disabled={isLocked || loadingRequest}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
              <fieldset className="md:col-span-2">
                <legend className="text-sm font-medium text-foreground">
                  Positions
                </legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {positions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No active positions found. Configure position types first.
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
                      return (
                        <label
                          key={position.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                            isChecked
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          <span>{position.name}</span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{summary.weight}%</span>
                            <span>{summary.count}/4</span>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border border-border bg-background text-primary focus:ring-primary"
                              checked={isChecked}
                              onChange={() => handlePositionToggle(position.id)}
                              disabled={isLocked || loadingRequest}
                            />
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </fieldset>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLocked || loadingRequest}
              >
                {loadingRequest
                  ? editingSessionDrillId
                    ? "Saving..."
                    : "Adding..."
                  : editingSessionDrillId
                  ? "Save Changes"
                  : "Add Drill"}
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Current Assignments
            </h3>
            {loadingSessionDrills ? (
              <div className="mt-4 flex items-center justify-center py-8 text-sm text-muted-foreground">
                Loading assignments…
              </div>
            ) : sessionDrills.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No drills assigned to this session yet.
              </div>
            ) : (
              <ul className="mt-4 grid gap-3">
                {sessionDrills.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {assignment.drill?.name ?? "Unknown drill"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Weight: {assignment.weight_percent}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Positions:{" "}
                          {(assignment.applies_to_positions ?? [])
                            .map(
                              (id) =>
                                positions.find((position) => position.id === id)
                                  ?.name ?? "Unknown"
                            )
                            .join(", ") || "--"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditAssignment(assignment)}
                          className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
                          disabled={isLocked || loadingRequest}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) =>
                            handleRemoveAssignment(event, assignment)
                          }
                          className="inline-flex items-center rounded-full border border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isLocked || loadingRequest}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
