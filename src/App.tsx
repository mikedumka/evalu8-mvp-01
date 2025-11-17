import { Navigate, Route, Routes } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { Login } from "@/components/Login";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import CohortManagementPage from "@/pages/CohortManagementPage";
import DrillLibraryPage from "@/pages/DrillLibraryPage";
import LandingPage from "@/pages/LandingPage";
import PreviousLevelsPage from "@/pages/PreviousLevelsPage";
import SessionDrillConfigurationPage from "@/pages/SessionDrillConfigurationPage";
import SystemAssociationsPage from "@/pages/SystemAssociationsPage";
import SystemUsersPage from "@/pages/SystemUsersPage";

function App() {
  const { user, loading } = useAuth();

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
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/cohort-management"
              element={<CohortManagementPage />}
            />
            <Route path="/previous-levels" element={<PreviousLevelsPage />} />
            <Route path="/drill-library" element={<DrillLibraryPage />} />
            <Route
              path="/session-drill-configuration"
              element={<SessionDrillConfigurationPage />}
            />
            <Route
              path="/system/associations"
              element={<SystemAssociationsPage />}
            />
            <Route path="/system/users" element={<SystemUsersPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export default App;
