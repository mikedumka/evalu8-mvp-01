import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import { ArrowDown, ArrowUp, Medal, RefreshCw } from "lucide-react";
import type { Database } from "../../types/database.types";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

type PreviousLevelRow = Database["public"]["Tables"]["previous_levels"]["Row"];
type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type PlayerRow = Pick<
  Database["public"]["Tables"]["players"]["Row"],
  "id" | "previous_level_id"
>;

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

interface FormState {
  name: string;
}

const emptyForm: FormState = {
  name: "",
};

export function PreviousLevelManager() {
  const { currentAssociation, hasRole } = useAuth();
  const [levels, setLevels] = useState<PreviousLevelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [activeSeason, setActiveSeason] = useState<Pick<
    SeasonRow,
    "id" | "name"
  > | null>(null);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});

  const canManage = Boolean(currentAssociation && hasRole("Administrator"));

  const sortedLevels = useMemo(
    () =>
      [...levels].sort((a, b) => {
        if (a.rank_order === b.rank_order) {
          return a.created_at.localeCompare(b.created_at);
        }
        return a.rank_order - b.rank_order;
      }),
    [levels]
  );

  useEffect(() => {
    setLevels([]);
    setPlayerCounts({});
    setActiveSeason(null);
    setFeedback(null);
    setErrorMessage(null);
    setFormState(emptyForm);
    setFormMode("create");
    setEditingId(null);

    if (currentAssociation && canManage) {
      void fetchLevels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAssociation?.association_id, canManage]);

  const fetchLevels = async () => {
    if (!currentAssociation) {
      return;
    }

    setLoading(true);
    setFeedback(null);
    setErrorMessage(null);
    setActiveSeason(null);
    setPlayerCounts({});

    try {
      const { data, error } = await supabase
        .from("previous_levels")
        .select("id, association_id, name, rank_order, created_at")
        .eq("association_id", currentAssociation.association_id)
        .order("rank_order", { ascending: true });

      if (error) {
        console.error("Failed to load previous levels", error.message);
        setErrorMessage("Unable to load previous levels. Please refresh.");
        setLevels([]);
        return;
      }

      const loadedLevels = data ?? [];
      setLevels(loadedLevels);

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

      if (!currentSeason || loadedLevels.length === 0) {
        setPlayerCounts({});
        return;
      }

      const levelIds = loadedLevels.map((level) => level.id);
      if (levelIds.length === 0) {
        setPlayerCounts({});
        return;
      }

      const { data: playerData, error: playersError } = await supabase
        .from("players")
        .select("id, previous_level_id")
        .eq("season_id", currentSeason.id)
        .in("previous_level_id", levelIds);

      if (playersError) {
        console.error(
          "Failed to load previous level usage",
          playersError.message
        );
        setPlayerCounts({});
        return;
      }

      const rows = (playerData ?? []) as PlayerRow[];
      const counts = rows.reduce<Record<string, number>>((acc, player) => {
        if (player.previous_level_id) {
          acc[player.previous_level_id] =
            (acc[player.previous_level_id] ?? 0) + 1;
        }
        return acc;
      }, {});

      setPlayerCounts(counts);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const startCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setFormState(emptyForm);
    setFeedback(null);
  };

  const startEdit = (level: PreviousLevelRow) => {
    setFormMode("edit");
    setEditingId(level.id);
    setFormState({ name: level.name });
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

    const name = formState.name.trim();
    if (!name) {
      setFeedback({ type: "error", message: "Level name is required." });
      setFormSubmitting(false);
      return;
    }

    if (!currentAssociation) {
      setFeedback({ type: "error", message: "Select an association first." });
      setFormSubmitting(false);
      return;
    }

    try {
      if (formMode === "create") {
        const nextRank =
          sortedLevels.reduce(
            (max, level) => Math.max(max, level.rank_order),
            0
          ) + 1;
        const { error } = await supabase.from("previous_levels").insert({
          association_id: currentAssociation.association_id,
          name,
          rank_order: nextRank,
        });

        if (error) {
          console.error("Failed to create previous level", error.message);
          const message =
            error.code === "23505"
              ? `Previous level '${name}' already exists.`
              : error.message || "Unable to create level. Please try again.";
          setFeedback({ type: "error", message });
        } else {
          setFeedback({
            type: "success",
            message: `Previous level '${name}' has been added`,
          });
          resetForm();
          await fetchLevels();
        }
      } else if (formMode === "edit" && editingId) {
        const { error } = await supabase
          .from("previous_levels")
          .update({
            association_id: currentAssociation.association_id,
            name,
          })
          .eq("id", editingId);

        if (error) {
          console.error("Failed to update previous level", error.message);
          const message =
            error.code === "23505"
              ? `Previous level name '${name}' is already in use.`
              : error.message || "Unable to update level. Please try again.";
          setFeedback({ type: "error", message });
        } else {
          setFeedback({
            type: "success",
            message: "Previous level updated successfully",
          });
          resetForm();
          await fetchLevels();
        }
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const swapLevelRanks = async (
    source: PreviousLevelRow,
    target: PreviousLevelRow
  ) => {
    setReordering(true);
    setFeedback(null);

    try {
      const { error: tempError } = await supabase
        .from("previous_levels")
        .update({ rank_order: -1 })
        .eq("id", target.id);

      if (tempError) {
        throw tempError;
      }

      const { error: sourceError } = await supabase
        .from("previous_levels")
        .update({ rank_order: target.rank_order })
        .eq("id", source.id);

      if (sourceError) {
        await supabase
          .from("previous_levels")
          .update({ rank_order: target.rank_order })
          .eq("id", target.id);
        throw sourceError;
      }

      const { error: targetError } = await supabase
        .from("previous_levels")
        .update({ rank_order: source.rank_order })
        .eq("id", target.id);

      if (targetError) {
        await supabase
          .from("previous_levels")
          .update({ rank_order: source.rank_order })
          .eq("id", source.id);
        await supabase
          .from("previous_levels")
          .update({ rank_order: target.rank_order })
          .eq("id", target.id);
        throw targetError;
      }

      setFeedback({ type: "success", message: "Level order updated" });
      await fetchLevels();
    } catch (error) {
      console.error("Failed to reorder levels", (error as Error).message);
      setFeedback({
        type: "error",
        message: "Unable to update level order. Please try again.",
      });
    } finally {
      setReordering(false);
    }
  };

  const handleMove = (
    event: MouseEvent<HTMLButtonElement>,
    level: PreviousLevelRow,
    direction: "up" | "down"
  ) => {
    event.stopPropagation();
    const currentIndex = sortedLevels.findIndex((item) => item.id === level.id);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const targetLevel = sortedLevels[targetIndex];

    if (!targetLevel) {
      return;
    }

    void swapLevelRanks(level, targetLevel);
  };

  if (!currentAssociation) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Medal className="h-5 w-5 text-primary" />
          Previous Levels
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Select an association to manage previous levels.
        </p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-muted-foreground shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Medal className="h-5 w-5 text-primary" />
          Previous Levels
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          You need Administrator privileges to manage previous levels for this
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
            <Medal className="h-5 w-5 text-primary" />
            Previous Levels
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define rankings from prior evaluations and maintain their order.
          </p>
          <p className="text-xs text-muted-foreground">
            {activeSeason
              ? `Player counts reflect ${activeSeason.name}.`
              : "No active season. Player counts show 0 until a season is activated."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLevels()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
          disabled={loading || formSubmitting || reordering}
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
            {formMode === "create"
              ? "Add Previous Level"
              : "Edit Previous Level"}
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
          <span className="font-medium text-foreground">Level Name</span>
          <input
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            name="name"
            value={formState.name}
            onChange={handleInputChange}
            placeholder="e.g. A"
            disabled={formSubmitting}
            autoFocus
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
              ? "Add Level"
              : "Save Changes"}
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading previous levels…
          </div>
        ) : sortedLevels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No previous levels yet. Add your first level to get started.
          </div>
        ) : (
          <ul className="grid gap-3">
            {sortedLevels.map((level, index) => {
              const players = playerCounts[level.id] ?? 0;
              const isFirst = index === 0;
              const isLast = index === sortedLevels.length - 1;
              return (
                <li key={level.id}>
                  <article className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                            #{level.rank_order}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {level.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(level)}
                            className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
                            disabled={formSubmitting || reordering}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(event) => handleMove(event, level, "up")}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
                            disabled={isFirst || reordering || formSubmitting}
                          >
                            <ArrowUp className="h-3.5 w-3.5" /> Move Up
                          </button>
                          <button
                            type="button"
                            onClick={(event) =>
                              handleMove(event, level, "down")
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
                            disabled={isLast || reordering || formSubmitting}
                          >
                            <ArrowDown className="h-3.5 w-3.5" /> Move Down
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] uppercase text-muted-foreground">
                        Players this season:
                        <span className="ml-1 text-foreground">{players}</span>
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
