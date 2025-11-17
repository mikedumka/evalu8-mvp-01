import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/Login";
import { DrillLibraryManager } from "@/components/drills/DrillLibraryManager";
import { AdminPage } from "@/components/layout/AdminPage";

export default function DrillLibraryPage() {
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
      title="Drill Library"
      description="Curate drills and their evaluation criteria for season use."
    >
      <DrillLibraryManager />
    </AdminPage>
  );
}
