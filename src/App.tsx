import { Building2, LogOut } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { Login } from "./components/Login";
import { AssociationSwitcher } from "./components/AssociationSwitcher";
import { DrillLibraryManager } from "./components/drills/DrillLibraryManager";
import { SessionDrillConfigurator } from "./components/sessions/SessionDrillConfigurator";

function App() {
  const {
    user,
    loading,
    signOut,
    associations,
    currentAssociation,
    setCurrentAssociationId,
  } = useAuth();

  const handleAssociationChange = (associationId: string) => {
    void setCurrentAssociationId(associationId);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
        <div className="text-surface-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 px-4 pb-16 pt-12 text-surface-50">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl border border-white/10 bg-surface-900/70 px-6 py-6 shadow-glow backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-full bg-brand-500/15 p-3 text-brand-200">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-200">
              Evalu8 Platform
            </p>
            <p className="text-sm text-surface-300">
              Signed in as {user.user_metadata?.full_name || user.email}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <AssociationSwitcher
            associations={associations}
            currentAssociationId={currentAssociation?.association_id ?? null}
            onChange={handleAssociationChange}
          />
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-surface-200 transition hover:border-rose-400 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto mt-8 w-full max-w-6xl space-y-6">
        {associations.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-white/10 bg-surface-900/60 px-6 py-12 text-center text-sm text-surface-200">
            No associations found. Create an association to begin configuring drills and sessions.
          </section>
        ) : !currentAssociation ? (
          <section className="rounded-3xl border border-dashed border-white/10 bg-surface-900/60 px-6 py-12 text-center text-sm text-surface-200">
            Select an association to load drill and session data.
          </section>
        ) : (
          <div className="space-y-6">
            <DrillLibraryManager />
            <SessionDrillConfigurator />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
