import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/Login";
import { LocationsTable } from "@/components/locations/LocationsTable";
import { AdminPage } from "@/components/layout/AdminPage";

export default function LocationsPage() {
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
      title="Locations"
      description="Manage locations for evaluation sessions."
    >
      <LocationsTable />
    </AdminPage>
  );
}
