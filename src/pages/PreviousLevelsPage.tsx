import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/Login";
import { PreviousLevelsTable } from "@/components/previous-levels/PreviousLevelsTable";
import { AdminPage } from "@/components/layout/AdminPage";

export default function PreviousLevelsPage() {
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
      title="Previous Levels"
      description="Maintain previous level rankings used for distribution balancing."
    >
      <PreviousLevelsTable />
    </AdminPage>
  );
}
