import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bell,
  ClipboardCheck,
  ChevronsUpDown,
  Building2,
  History,
  IdCardLanyard,
  LineChart,
  LogOut,
  Settings2,
  Users,
  UserCog,
  Shirt,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { CreateAssociationForm } from "@/components/sidebar/CreateAssociationForm";
import { SidebarAssociationSwitcher } from "@/components/sidebar/SidebarAssociationSwitcher";
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  disabled?: boolean;
}

const adminNavItems: NavItem[] = [
  {
    id: "previous-levels",
    label: "Previous Levels",
    icon: History,
    to: "/previous-levels",
  },
  {
    id: "cohort-management",
    label: "Cohort Management",
    icon: Users,
    to: "/cohort-management",
  },
  {
    id: "position-types",
    label: "Position Types",
    icon: Shirt,
    to: "/position-types",
  },
  {
    id: "drill-library",
    label: "Drill Library",
    icon: ClipboardCheck,
    to: "/drill-library",
  },
  {
    id: "session-drill-configuration",
    label: "Session Drill Configuration",
    icon: Settings2,
    to: "/session-drill-configuration",
  },
];

const navigationSections: Array<{
  id: string;
  label: string;
  items: NavItem[];
}> = [
  {
    id: "administration",
    label: "Administration",
    items: adminNavItems,
  },
  {
    id: "check-in",
    label: "Check-in",
    items: [
      {
        id: "check-in-placeholder",
        label: "Check-in",
        icon: ClipboardCheck,
        disabled: true,
      },
    ],
  },
  {
    id: "evaluations",
    label: "Evaluations",
    items: [
      {
        id: "evaluations-placeholder",
        label: "Evaluations",
        icon: BadgeCheck,
        disabled: true,
      },
    ],
  },
  {
    id: "reporting",
    label: "Reporting",
    items: [
      {
        id: "reporting-placeholder",
        label: "Reporting",
        icon: LineChart,
        disabled: true,
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    user,
    associations,
    currentAssociation,
    setCurrentAssociationId,
    refreshAssociations,
    hasAnyRole,
    signOut,
  } = useAuth();
  const { isMobile, state } = useSidebar();
  const isCollapsed = !isMobile && state === "collapsed";

  const location = useLocation();
  const [isAddAssociationDialogOpen, setIsAddAssociationDialogOpen] =
    useState(false);

  const userDetails = useMemo(() => {
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaFirst =
      typeof metadata.first_name === "string"
        ? metadata.first_name.trim()
        : undefined;
    const metaLast =
      typeof metadata.last_name === "string"
        ? metadata.last_name.trim()
        : undefined;
    const metaFull =
      typeof metadata.full_name === "string"
        ? metadata.full_name.trim()
        : undefined;

    let firstName = metaFirst && metaFirst.length > 0 ? metaFirst : undefined;
    let lastName = metaLast && metaLast.length > 0 ? metaLast : undefined;

    if (metaFull && (!firstName || !lastName)) {
      const parts = metaFull.split(/\s+/).filter(Boolean);
      if (parts.length > 0 && !firstName) {
        firstName = parts[0];
      }
      if (parts.length > 1 && !lastName) {
        lastName = parts.slice(1).join(" ");
      }
    }

    const displayName =
      [firstName, lastName].filter(Boolean).join(" ") ||
      metaFull ||
      user?.email ||
      "";

    return {
      firstName,
      lastName,
      displayName,
      email: user?.email ?? "",
    };
  }, [user]);

  const currentAssociationId = currentAssociation?.association_id ?? null;

  const canManageAssociations = hasAnyRole([
    "Administrator",
    "System Administrator",
  ]);
  const canCreateAssociation =
    canManageAssociations || associations.length === 0;

  const primaryName =
    [userDetails.firstName, userDetails.lastName].filter(Boolean).join(" ") ||
    userDetails.displayName ||
    "Evaluation Admin";
  const userEmail = userDetails.email || "admin@evalu8.app";

  const handleAssociationChange = (associationId: string) => {
    void setCurrentAssociationId(associationId);
  };

  const handleAddAssociation = () => {
    setIsAddAssociationDialogOpen(true);
  };

  const handleCloseAddAssociationDialog = (open: boolean) => {
    setIsAddAssociationDialogOpen(open);
  };

  const handleAssociationCreated = async (associationId: string) => {
    try {
      await setCurrentAssociationId(associationId);
      await refreshAssociations();
    } catch (error) {
      console.error("Failed to refresh associations after creation", error);
    } finally {
      setIsAddAssociationDialogOpen(false);
    }
  };

  const showSystemSection = hasAnyRole(["System Administrator"]);

  const sections = useMemo(() => {
    if (!showSystemSection) {
      return navigationSections;
    }

    return [
      {
        id: "system",
        label: "System",
        items: [
          {
            id: "system-associations",
            label: "Associations",
            icon: Building2,
            to: "/system/associations",
          },
          {
            id: "system-users",
            label: "Users",
            icon: UserCog,
            to: "/system/users",
          },
        ],
      },
      ...navigationSections,
    ];
  }, [showSystemSection]);

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="p-2">
          <SidebarAssociationSwitcher
            associations={associations}
            currentAssociationId={currentAssociationId}
            onSelect={handleAssociationChange}
            onAddAssociation={
              canCreateAssociation ? handleAddAssociation : undefined
            }
            canManageAssociations={canCreateAssociation}
          />
        </SidebarHeader>
        <SidebarContent>
          {sections.map((section) => (
            <SidebarGroup key={section.id}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive =
                    !!item.to && location.pathname.startsWith(item.to);

                  if (item.to && !item.disabled) {
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className="flex items-center gap-2"
                        >
                          <NavLink
                            to={item.to}
                            className="flex items-center gap-2"
                          >
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        disabled
                        className="flex items-center gap-2 text-sidebar-foreground/50"
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0",
                      isCollapsed && "justify-center gap-0"
                    )}
                  >
                    <div
                      className={cn(
                        "flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground transition-colors",
                        "group-data-[collapsible=icon]:bg-sidebar-primary group-data-[collapsible=icon]:text-sidebar-primary-foreground"
                      )}
                    >
                      <IdCardLanyard className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-semibold">
                        {primaryName}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        {userEmail}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg"
                  align="start"
                  side={isMobile ? "bottom" : "right"}
                  sideOffset={6}
                >
                  <DropdownMenuLabel className="flex items-center gap-3 px-2 py-1.5 text-xs text-muted-foreground">
                    <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary/15 text-sidebar-primary">
                      <IdCardLanyard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {primaryName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {userEmail}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 p-2"
                    onSelect={(event) => event.preventDefault()}
                  >
                    <IdCardLanyard className="h-4 w-4" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 p-2"
                    onSelect={(event) => event.preventDefault()}
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 p-2 text-red-600 focus:text-red-600"
                    onSelect={(event) => {
                      event.preventDefault();
                      void signOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <Dialog
        open={isAddAssociationDialogOpen}
        onOpenChange={handleCloseAddAssociationDialog}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Association</DialogTitle>
            <DialogDescription>
              Create a new association and you will be added as an Administrator
              automatically.
            </DialogDescription>
          </DialogHeader>
          <CreateAssociationForm
            open={isAddAssociationDialogOpen}
            onCreated={handleAssociationCreated}
            onCancel={() => handleCloseAddAssociationDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
