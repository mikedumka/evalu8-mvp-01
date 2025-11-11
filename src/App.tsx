import { AppSidebar } from "@/components/app-sidebar";
import { Login } from "@/components/Login";
import { CohortManager } from "@/components/cohorts/CohortManager";
import { DrillLibraryManager } from "@/components/drills/DrillLibraryManager";
import { PreviousLevelManager } from "@/components/previous-levels/PreviousLevelManager";
import { SessionDrillConfigurator } from "@/components/sessions/SessionDrillConfigurator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

function App() {
  const { user, loading, associations, currentAssociation } = useAuth();

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
    <div className="min-h-svh bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-transparent text-surface-50">
          <div className="flex flex-1 flex-col gap-8 px-4 pb-12 pt-4 sm:px-6 lg:px-10">
            <header className="rounded-3xl border border-white/10 bg-surface-900/70 p-6 shadow-glow backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="text-surface-200 md:hidden" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-200">
                      Evalu8 Platform
                    </p>
                    <h1 className="text-2xl font-semibold text-white">
                      Association Administration
                    </h1>
                  </div>
                </div>
                {currentAssociation ? (
                  <div className="text-sm text-surface-300">
                    Active association:
                    <span className="ml-2 font-medium text-white">
                      {currentAssociation.association.name}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-surface-300">
                    Select an association from the sidebar.
                  </div>
                )}
              </div>
              <p className="mt-4 max-w-3xl text-sm text-surface-300">
                Configure cohorts, maintain previous levels, manage the drill
                library, and set up session drill weighting for your evaluation
                season.
              </p>
            </header>

            <div className="space-y-6">
              {associations.length === 0 ? (
                <section className="rounded-3xl border border-dashed border-white/10 bg-surface-900/60 px-6 py-12 text-center text-sm text-surface-200">
                  No associations found. Create an association to begin
                  configuring drills and sessions.
                </section>
              ) : !currentAssociation ? (
                <section className="rounded-3xl border border-dashed border-white/10 bg-surface-900/60 px-6 py-12 text-center text-sm text-surface-200">
                  Select an association to load drill and session data.
                </section>
              ) : (
                <>
                  <div id="cohort-management" className="scroll-mt-24">
                    <CohortManager />
                  </div>
                  <div id="previous-levels" className="scroll-mt-24">
                    <PreviousLevelManager />
                  </div>
                  <div id="drill-library" className="scroll-mt-24">
                    <DrillLibraryManager />
                  </div>
                  <div
                    id="session-drill-configuration"
                    className="scroll-mt-24"
                  >
                    <SessionDrillConfigurator />
                  </div>
                </>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export default App;
