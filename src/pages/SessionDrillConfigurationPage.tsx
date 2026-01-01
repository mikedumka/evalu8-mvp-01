import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/Login";
import { SessionDrillConfigurationTable } from "@/components/sessions/SessionDrillConfigurationTable";
import { AdminPage } from "@/components/layout/AdminPage";

export default function SessionDrillConfigurationPage() {
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
      title="Session Drill Configuration"
      description="Assign drills with weights to positions for each evaluation session."
    >
      <SessionDrillConfigurationTable />
    </AdminPage>
  );
}
