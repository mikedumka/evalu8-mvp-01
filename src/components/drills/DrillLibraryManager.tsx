import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import type { Database } from "../../types/database.types";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

type DrillRow = Database["public"]["Tables"]["drills"]["Row"];

interface FormState {
  name: string;
  description: string;
  criteria: string;
}

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

const emptyForm: FormState = {
  name: "",
  description: "",
  criteria: "",
};

function sortDrills(drills: DrillRow[]): DrillRow[] {
  return [...drills].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "active" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function DrillLibraryManager() {
  const { currentAssociation, hasRole } = useAuth();
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loadingUsageId, setLoadingUsageId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedDrills = useMemo(() => sortDrills(drills), [drills]);
  const selectedDrill = useMemo(
    () => sortedDrills.find((drill) => drill.id === selectedDrillId) ?? null,
    [sortedDrills, selectedDrillId]
  );
  const selectedDrillMeta = useMemo(() => {
    if (!selectedDrill) {
      return null;
    }

    const createdDate = new Date(selectedDrill.created_at);
    const updatedDate = new Date(
      selectedDrill.updated_at ?? selectedDrill.created_at
    );

    const createdDisplay = Number.isNaN(createdDate.getTime())
      ? "—"
      : createdDate.toLocaleDateString();
    const updatedDisplay = Number.isNaN(updatedDate.getTime())
      ? "—"
      : updatedDate.toLocaleString();

    const usageDisplay =
      loadingUsageId === selectedDrill.id &&
      usageCounts[selectedDrill.id] === undefined
        ? "Loading…"
        : usageCounts[selectedDrill.id] ?? 0;

    return {
      createdDisplay,
      updatedDisplay,
      usageDisplay,
    };
  }, [selectedDrill, loadingUsageId, usageCounts]);

  const canManage = Boolean(currentAssociation && hasRole("Administrator"));

  useEffect(() => {
    setDrills([]);
    setSelectedDrillId(null);
    setUsageCounts({});
    setErrorMessage(null);
    if (currentAssociation && canManage) {
      void fetchDrills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAssociation?.association_id, canManage]);

  const fetchDrills = async () => {
    setLoading(true);
    setFeedback(null);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("drills")
      .select(
        "id, association_id, name, description, criteria, status, created_at, updated_at"
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load drills", error.message);
      setErrorMessage("Unable to load drills. Please refresh.");
      setDrills([]);
    } else {
      setDrills(data ?? []);
    }

    setLoading(false);
  };

  const ensureUsageCount = async (drillId: string) => {
    if (usageCounts[drillId] !== undefined) {
      return;
    }

    const { count, error } = await supabase
      .from("session_drills")
      .select("id", { count: "exact", head: true })
      .eq("drill_id", drillId);

    if (error) {
      console.error("Failed to load drill usage", error.message);
      return;
    }

    if (typeof count === "number") {
      setUsageCounts((prev) => ({ ...prev, [drillId]: count }));
    }
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setFormState(emptyForm);
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleEdit = (drill: DrillRow) => {
    setFormMode("edit");
    setEditingId(drill.id);
    setFormState({
      name: drill.name,
      description: drill.description ?? "",
      criteria: drill.criteria ?? "",
    });
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setFormState(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSubmitting(true);
    setFeedback(null);

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim(),
      criteria: formState.criteria.trim(),
    };

    try {
      if (!payload.name || !payload.description || !payload.criteria) {
        setFeedback({ type: "error", message: "All fields are required." });
        setFormSubmitting(false);
        return;
      }

      if (formMode === "create") {
        const { data, error } = await supabase.rpc("create_drill", {
          p_name: payload.name,
          p_description: payload.description,
          p_criteria: payload.criteria,
        });

        if (error) {
          console.error("Failed to create drill", error.message);
          setFeedback({ type: "error", message: error.message });
        } else if (data) {
          setDrills((prev) => sortDrills([...prev, data]));
          setFeedback({
            type: "success",
            message: `Drill "${data.name}" created.`,
          });
          setIsFormOpen(false);
          setFormState(emptyForm);
        }
      } else if (formMode === "edit" && editingId) {
        const { data, error } = await supabase.rpc("update_drill", {
          p_drill_id: editingId,
          p_name: payload.name,
          p_description: payload.description,
          p_criteria: payload.criteria,
        });

        if (error) {
          console.error("Failed to update drill", error.message);
          setFeedback({ type: "error", message: error.message });
        } else if (data) {
          setDrills((prev) =>
            sortDrills(prev.map((item) => (item.id === data.id ? data : item)))
          );
          setFeedback({
            type: "success",
            message: `Drill "${data.name}" updated.`,
          });
          setIsFormOpen(false);
          setFormState(emptyForm);
          setEditingId(null);
        }
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (drill: DrillRow) => {
    const nextStatus = drill.status === "active" ? "inactive" : "active";
    setFeedback(null);
    const { data, error } = await supabase.rpc("set_drill_status", {
      p_drill_id: drill.id,
      p_status: nextStatus,
    });

    if (error) {
      console.error("Failed to update drill status", error.message);
      setFeedback({ type: "error", message: error.message });
      return;
    }

    if (data) {
      setDrills((prev) =>
        sortDrills(prev.map((item) => (item.id === data.id ? data : item)))
      );
      setFeedback({
        type: "success",
        message:
          data.status === "active"
            ? `Drill "${data.name}" reactivated.`
            : `Drill "${data.name}" deactivated.`,
      });
    }
  };

  const handleSelectDrill = async (drillId: string) => {
    setSelectedDrillId(drillId);
    if (usageCounts[drillId] === undefined) {
      setLoadingUsageId(drillId);
      await ensureUsageCount(drillId);
      setLoadingUsageId(null);
    }
  };

  const handleRowKeyDown = async (
    event: KeyboardEvent<HTMLDivElement>,
    drillId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      await handleSelectDrill(drillId);
    }
  };

  const handleEditClick = (
    event: MouseEvent<HTMLButtonElement>,
    drill: DrillRow
  ) => {
    event.stopPropagation();
    handleEdit(drill);
  };

  const handleStatusClick = (
    event: MouseEvent<HTMLButtonElement>,
    drill: DrillRow
  ) => {
    event.stopPropagation();
    void handleToggleStatus(drill);
  };

  if (!currentAssociation) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ClipboardList className="h-5 w-5 text-primary" />
          Drill Library
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Select an association to manage its drill library.
        </p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ClipboardList className="h-5 w-5 text-primary" />
          Drill Library
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          You need Administrator privileges to manage drills for this
          association.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 text-foreground shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ClipboardList className="h-5 w-5 text-primary" />
            Drill Library
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reusable drills, descriptions, and evaluation criteria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchDrills()}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Add Drill
          </button>
        </div>
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

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}

      {isFormOpen && (
        <form
          className="mt-6 grid gap-4 rounded-xl border border-border bg-muted/40 p-6"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {formMode === "create" ? "Create Drill" : "Edit Drill"}
            </h3>
          </div>
          <label className="grid gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Name</span>
            <input
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              name="name"
              value={formState.name}
              onChange={handleInputChange}
              placeholder="e.g. Skating Speed"
              autoFocus
              disabled={formSubmitting}
            />
          </label>
          <label className="grid gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Short Description
            </span>
            <textarea
              className="min-h-[72px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              name="description"
              value={formState.description}
              onChange={handleInputChange}
              placeholder="Summarize what this drill measures"
              disabled={formSubmitting}
            />
          </label>
          <label className="grid gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Evaluation Criteria
            </span>
            <textarea
              className="min-h-[120px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              name="criteria"
              value={formState.criteria}
              onChange={handleInputChange}
              placeholder="Detail the scoring expectations evaluators should follow"
              disabled={formSubmitting}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelForm}
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-muted hover:text-foreground"
              disabled={formSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={formSubmitting}
            >
              {formSubmitting
                ? formMode === "create"
                  ? "Creating..."
                  : "Saving..."
                : formMode === "create"
                ? "Create Drill"
                : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Loading drills…
            </div>
          ) : sortedDrills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No drills found. Add your first drill to get started.
            </div>
          ) : (
            <ul className="grid gap-3">
              {sortedDrills.map((drill) => {
                const isSelected = drill.id === selectedDrillId;
                const updatedDate = new Date(
                  drill.updated_at ?? drill.created_at
                );
                const updatedDisplay = Number.isNaN(updatedDate.getTime())
                  ? "—"
                  : updatedDate.toLocaleString();
                return (
                  <li key={drill.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => void handleSelectDrill(drill.id)}
                      onKeyDown={(event) =>
                        void handleRowKeyDown(event, drill.id)
                      }
                      className={`flex flex-col gap-3 rounded-xl border px-4 py-4 transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground shadow-sm"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {drill.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                            drill.status === "active"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-amber-500/15 text-amber-200"
                          }`}
                        >
                          {drill.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {drill.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                        <span>Updated {updatedDisplay}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          type="button"
                          onClick={(event) => handleEditClick(event, drill)}
                          className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleStatusClick(event, drill)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
                            drill.status === "active"
                              ? "border border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                              : "border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                          }`}
                        >
                          {drill.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside className="rounded-xl border border-border bg-card p-5">
          {selectedDrill && selectedDrillMeta ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {selectedDrill.name}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                    selectedDrill.status === "active"
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-amber-500/15 text-amber-200"
                  }`}
                >
                  {selectedDrill.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {selectedDrill.description}
              </p>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  Evaluation Criteria
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {selectedDrill.criteria}
                </p>
              </div>
              <dl className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <dt>Times Used</dt>
                  <dd className="text-foreground">
                    {selectedDrillMeta.usageDisplay}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Created</dt>
                  <dd className="text-foreground">
                    {selectedDrillMeta.createdDisplay}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Last Updated</dt>
                  <dd className="text-foreground">
                    {selectedDrillMeta.updatedDisplay}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Select a drill to view details, criteria, and usage.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
