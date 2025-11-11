import { useMemo } from "react";
import {
  Building2,
  ClipboardList,
  LogOut,
  Medal,
  Settings2,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AssociationSwitcher } from "@/components/AssociationSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const adminNavItems = [
  {
    id: "cohort-management",
    label: "Cohort Management",
    icon: Users,
  },
  {
    id: "previous-levels",
    label: "Previous Levels",
    icon: Medal,
  },
  {
    id: "drill-library",
    label: "Drill Library",
    icon: ClipboardList,
  },
  {
    id: "session-drill-configuration",
    label: "Session Drill Configuration",
    icon: Settings2,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    user,
    associations,
    currentAssociation,
    setCurrentAssociationId,
    signOut,
  } = useAuth();

  const currentAssociationId = currentAssociation?.association_id ?? null;

  const displayName = useMemo(() => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name as string;
    }
    return user?.email ?? "";
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/40 px-3 py-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary/20">
            <Building2 className="size-5" />
          </div>
          <div className="flex flex-col text-sm">
            <span className="font-semibold">Evalu8 Platform</span>
            <span className="text-xs text-sidebar-foreground/70">
              {currentAssociation?.association.name ?? "Select an association"}
            </span>
          </div>
        </div>
        {associations.length > 0 ? (
          <div className="px-1">
            <AssociationSwitcher
              associations={associations}
              currentAssociationId={currentAssociationId}
              onChange={(associationId) =>
                void setCurrentAssociationId(associationId)
              }
            />
          </div>
        ) : (
          <p className="px-1 text-xs text-sidebar-foreground/60">
            No associations found.
          </p>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Association Administration</SidebarGroupLabel>
          <SidebarMenu>
            {adminNavItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild>
                  <a href={`#${item.id}`} className="flex items-center gap-2">
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto cursor-default flex-col items-start gap-0 text-left text-xs text-sidebar-foreground/70">
              <span className="text-sm font-medium text-sidebar-foreground">
                {displayName}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {user?.email}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => void signOut()}>
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
