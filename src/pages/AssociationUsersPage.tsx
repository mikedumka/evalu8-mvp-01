import { AdminPage } from "@/components/layout/AdminPage";
import { AssociationUsersTable } from "@/components/users/AssociationUsersTable";

export default function AssociationUsersPage() {
  return (
    <AdminPage
      title="Association Users"
      description="Manage users and their roles within your association."
    >
      <AssociationUsersTable />
    </AdminPage>
  );
}
