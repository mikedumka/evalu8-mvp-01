export type SystemUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: "active" | "inactive";
  system_roles: string[];
  created_at: string;
  last_login_at: string | null;
  association_count: number;
  active_association_count: number;
};
