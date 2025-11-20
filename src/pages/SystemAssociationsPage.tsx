import { Login } from "@/components/Login";
import { AdminPage } from "@/components/layout/AdminPage";
import { AssociationsTable } from "@/components/associations/AssociationsTable";
import { useAuth } from "@/hooks/useAuth";

export default function SystemAssociationsPage() {
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
      title="Associations"
      badgeLabel={null}
      showAssociationInfo={false}
      description="Review all associations across the Evalu8 platform."
    >
      <AssociationsTable />
    </AdminPage>
  );
}
