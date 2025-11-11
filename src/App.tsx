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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-svh bg-background">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background text-foreground">
          <div className="flex flex-1 flex-col gap-8 px-4 pb-12 pt-4 sm:px-6 lg:px-10">
            <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <SidebarTrigger className="text-muted-foreground md:hidden" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
                      Evalu8 Platform
                    </p>
                    <h1 className="text-2xl font-semibold text-foreground">
                      Association Administration
                    </h1>
                  </div>
                </div>
                {currentAssociation ? (
                  <div className="text-sm text-muted-foreground">
                    Active association:
                    <span className="ml-2 font-medium text-foreground">
                      {currentAssociation.association.name}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Select an association from the sidebar.
                  </div>
                )}
              </div>
              <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
                Configure cohorts, maintain previous levels, manage the drill
                library, and set up session drill weighting for your evaluation
                season.
              </p>
            </header>

            <div className="space-y-6">
              {associations.length === 0 ? (
                <section className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                  No associations found. Create an association to begin
                  configuring drills and sessions.
                </section>
              ) : !currentAssociation ? (
                <section className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
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
