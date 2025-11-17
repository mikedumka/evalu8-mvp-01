import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/Login";
import { CohortManager } from "@/components/cohorts/CohortManager";
import { AdminPage } from "@/components/layout/AdminPage";

export default function CohortManagementPage() {
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
    <AdminPage
      title="Cohort Management"
      description="Create, update, and organize cohorts for the current season."
    >
      <CohortManager />
    </AdminPage>
  );
}
