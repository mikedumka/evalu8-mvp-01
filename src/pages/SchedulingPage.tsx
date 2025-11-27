import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/Login";
import { AdminPage } from "@/components/layout/AdminPage";

export default function SchedulingPage() {
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
      title="Scheduling"
      description="Manage evaluation sessions and schedules."
    >
      <div className="p-6 text-muted-foreground">
        Scheduling functionality coming soon.
      </div>
    </AdminPage>
  );
}
