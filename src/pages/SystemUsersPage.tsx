import { AdminPage } from "@/components/layout/AdminPage";
import { UsersTable } from "@/components/users/UsersTable";

export default function SystemUsersPage() {
  return (
    <AdminPage
      title="System Users"
      badgeLabel={null}
      showAssociationInfo={false}
      description="Manage system-level user access across Evalu8."
    >
      <UsersTable />
    </AdminPage>
  );
}
