import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import { UsersRound, RefreshCw } from "lucide-react";
import type { Database } from "../../types/database.types";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type PlayerRow = Pick<
  Database["public"]["Tables"]["players"]["Row"],
  "id" | "cohort_id"
>;

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

interface FormState {
  name: string;
  description: string;
}

const emptyForm: FormState = {
  name: "",
  description: "",
};

export function CohortManager() {
  const { currentAssociation, hasRole } = useAuth();
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<Pick<
    SeasonRow,
    "id" | "name"
  > | null>(null);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});

  const canManage = Boolean(currentAssociation && hasRole("Administrator"));

  const activeCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.status === "active"),
    [cohorts]
  );
  const inactiveCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.status === "inactive"),
    [cohorts]
  );

  useEffect(() => {
    setCohorts([]);
    setPlayerCounts({});
    setActiveSeason(null);
    setFeedback(null);
    setErrorMessage(null);
    setFormState(emptyForm);
    setFormMode("create");
    setEditingId(null);

    if (currentAssociation && canManage) {
      void fetchCohorts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAssociation?.association_id, canManage]);

  const fetchCohorts = async () => {
    if (!currentAssociation) {
      return;
    }

    setLoading(true);
    setFeedback(null);
    setErrorMessage(null);
    setPlayerCounts({});
    setActiveSeason(null);

    try {
      const { data, error } = await supabase
        .from("cohorts")
        .select(
          "id, association_id, name, description, status, created_at, updated_at"
        )
        .eq("association_id", currentAssociation.association_id)
        .order("status", { ascending: false })
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to load cohorts", error.message);
        setErrorMessage("Unable to load cohorts. Please refresh.");
        setCohorts([]);
        return;
      }

      const loadedCohorts = data ?? [];
      setCohorts(loadedCohorts);

      const { data: seasonData, error: seasonError } = await supabase
        .from("seasons")
        .select("id, name, status")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (seasonError) {
        console.error("Failed to load active season", seasonError.message);
      }

      const currentSeason =
        seasonData && seasonData.length > 0
          ? { id: seasonData[0].id, name: seasonData[0].name }
          : null;
      setActiveSeason(currentSeason);

      if (!currentSeason || loadedCohorts.length === 0) {
        setPlayerCounts({});
        return;
      }

      const cohortIds = loadedCohorts.map((cohort) => cohort.id);
      if (cohortIds.length === 0) {
        setPlayerCounts({});
        return;
      }

      const { data: playerData, error: playersError } = await supabase
        .from("players")
        .select("id, cohort_id")
        .eq("season_id", currentSeason.id)
        .in("cohort_id", cohortIds);

      if (playersError) {
        console.error("Failed to load player counts", playersError.message);
        setPlayerCounts({});
        return;
      }

      const playerRows = (playerData ?? []) as PlayerRow[];
      const counts = playerRows.reduce<Record<string, number>>(
        (acc, player) => {
          if (player.cohort_id) {
            acc[player.cohort_id] = (acc[player.cohort_id] ?? 0) + 1;
          }
          return acc;
        },
        {}
      );

      setPlayerCounts(counts);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const startCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setFormState(emptyForm);
    setFeedback(null);
  };

  const startEdit = (cohort: CohortRow) => {
    setFormMode("edit");
    setEditingId(cohort.id);
    setFormState({
      name: cohort.name,
      description: cohort.description ?? "",
    });
    setFeedback(null);
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingId(null);
    setFormMode("create");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSubmitting(true);
    setFeedback(null);

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim(),
    };

    if (!payload.name) {
      setFeedback({ type: "error", message: "Cohort name is required." });
      setFormSubmitting(false);
      return;
    }

    if (!currentAssociation) {
      setFeedback({
        type: "error",
        message: "Select an association before managing cohorts.",
      });
      setFormSubmitting(false);
      return;
    }

    try {
      if (formMode === "create") {
        const { error } = await supabase.from("cohorts").insert({
          association_id: currentAssociation.association_id,
          name: payload.name,
          description: payload.description || null,
          status: "active",
        });

        if (error) {
          console.error("Failed to create cohort", error.message);
          const message =
            error.code === "23505"
              ? `Cohort '${payload.name}' already exists.`
              : error.message || "Unable to create cohort. Please try again.";
          setFeedback({ type: "error", message });
        } else {
          setFeedback({
            type: "success",
            message: "Cohort created successfully",
          });
          resetForm();
          await fetchCohorts();
        }
      } else if (formMode === "edit" && editingId) {
        const { error } = await supabase
          .from("cohorts")
          .update({
            association_id: currentAssociation.association_id,
            name: payload.name,
            description: payload.description || null,
          })
          .eq("id", editingId);

        if (error) {
          console.error("Failed to update cohort", error.message);
          const message =
            error.code === "23505"
              ? `Another cohort already uses the name '${payload.name}'.`
              : error.message || "Unable to update cohort. Please try again.";
          setFeedback({ type: "error", message });
        } else {
          setFeedback({
            type: "success",
            message: "Cohort updated successfully",
          });
          resetForm();
          await fetchCohorts();
        }
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (
    event: MouseEvent<HTMLButtonElement>,
    cohort: CohortRow
  ) => {
    event.stopPropagation();

    const nextStatus = cohort.status === "active" ? "inactive" : "active";

    if (
      nextStatus === "inactive" &&
      !window.confirm(
        `Deactivate ${cohort.name}? Players remain assigned but the cohort will be hidden when creating new sessions.`
      )
    ) {
      return;
    }

    setFeedback(null);
    const { error } = await supabase
      .from("cohorts")
      .update({ status: nextStatus })
      .eq("id", cohort.id);

    if (error) {
      console.error("Failed to update cohort status", error.message);
      setFeedback({
        type: "error",
        message: error.message || "Unable to update cohort status.",
      });
      return;
    }

    setFeedback({
      type: "success",
      message:
        nextStatus === "active"
          ? "Cohort reactivated successfully"
          : "Cohort deactivated successfully",
    });
    await fetchCohorts();
  };

  if (!currentAssociation) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <UsersRound className="h-5 w-5 text-primary" />
          Cohort Management
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Select an association to view cohorts.
        </p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <UsersRound className="h-5 w-5 text-primary" />
          Cohort Management
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          You need Administrator privileges to manage cohorts for this
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
            <UsersRound className="h-5 w-5 text-primary" />
            Cohort Management
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, update, and activate cohorts across seasons.
          </p>
          <p className="text-xs text-muted-foreground">
            {activeSeason
              ? `Player counts reflect ${activeSeason.name}.`
              : "No active season. Player counts show 0 until a season is activated."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchCohorts()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
          disabled={loading || formSubmitting}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
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

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}

      <form
        className="mt-6 grid gap-4 rounded-xl border border-border bg-muted/40 p-6"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">
            {formMode === "create" ? "Create Cohort" : "Edit Cohort"}
          </h3>
          {formMode === "edit" && (
            <button
              type="button"
              onClick={startCreate}
              className="text-xs text-muted-foreground transition hover:text-foreground"
              disabled={formSubmitting}
            >
              Cancel Edit
            </button>
          )}
        </div>
        <label className="grid gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Name</span>
          <input
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            name="name"
            value={formState.name}
            onChange={handleInputChange}
            placeholder="e.g. U11"
            disabled={formSubmitting}
            autoFocus
          />
        </label>
        <label className="grid gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Description</span>
          <textarea
            className="min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            name="description"
            value={formState.description}
            onChange={handleInputChange}
            placeholder="Optional description (e.g. 11 and under players)"
            disabled={formSubmitting}
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-muted hover:text-foreground"
            disabled={formSubmitting}
          >
            Clear
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
              ? "Create Cohort"
              : "Save Changes"}
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Active Cohorts
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeCohorts.length} active
              </p>
            </div>
          </header>
          {loading ? (
            <div className="mt-4 flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading cohorts…
            </div>
          ) : activeCohorts.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No active cohorts yet.
            </div>
          ) : (
            <ul className="mt-4 grid gap-3">
              {activeCohorts.map((cohort) => {
                const players = playerCounts[cohort.id] ?? 0;
                return (
                  <li key={cohort.id}>
                    <article className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {cohort.name}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(cohort)}
                              className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
                              disabled={formSubmitting}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(event) =>
                                handleToggleStatus(event, cohort)
                              }
                              className="inline-flex items-center rounded-full border border-muted-foreground/40 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={formSubmitting}
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                        <p>{cohort.description || "No description"}</p>
                        <p className="text-[11px] uppercase text-muted-foreground">
                          Players this season:
                          <span className="ml-1 text-foreground">
                            {players}
                          </span>
                        </p>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Inactive Cohorts
              </h3>
              <p className="text-xs text-muted-foreground">
                {inactiveCohorts.length} inactive
              </p>
            </div>
          </header>
          {loading ? (
            <div className="mt-4 flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading cohorts…
            </div>
          ) : inactiveCohorts.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No inactive cohorts.
            </div>
          ) : (
            <ul className="mt-4 grid gap-3">
              {inactiveCohorts.map((cohort) => {
                const players = playerCounts[cohort.id] ?? 0;
                return (
                  <li key={cohort.id}>
                    <article className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {cohort.name}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(cohort)}
                              className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
                              disabled={formSubmitting}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(event) =>
                                handleToggleStatus(event, cohort)
                              }
                              className="inline-flex items-center rounded-full border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={formSubmitting}
                            >
                              Activate
                            </button>
                          </div>
                        </div>
                        <p>{cohort.description || "No description"}</p>
                        <p className="text-[11px] uppercase text-muted-foreground">
                          Players this season:
                          <span className="ml-1 text-foreground">
                            {players}
                          </span>
                        </p>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
