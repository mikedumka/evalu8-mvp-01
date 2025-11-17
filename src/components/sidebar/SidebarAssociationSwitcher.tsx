import * as React from "react";
import { ChevronsUpDown, Check, GalleryVerticalEnd, Plus } from "lucide-react";

import type { AssociationUser } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface SidebarAssociationSwitcherProps {
  associations: AssociationUser[];
  currentAssociationId: string | null;
  onSelect: (associationId: string) => void;
  onAddAssociation?: () => void;
  canManageAssociations: boolean;
}

function deriveAbbreviation(name: string): string {
  const fallback = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
  return fallback || name.slice(0, 4).toUpperCase();
}

export function SidebarAssociationSwitcher({
  associations,
  currentAssociationId,
  onSelect,
  onAddAssociation,
  canManageAssociations,
}: SidebarAssociationSwitcherProps) {
  const { isMobile, state } = useSidebar();
  const isCollapsed = !isMobile && state === "collapsed";

  const activeAssociation = React.useMemo(() => {
    if (!associations.length) {
      return null;
    }

    return (
      associations.find(
        (membership) => membership.association_id === currentAssociationId
      ) ?? associations[0]
    );
  }, [associations, currentAssociationId]);

  const activeAbbreviation = activeAssociation
    ? (
        activeAssociation.association.abbreviation ??
        deriveAbbreviation(activeAssociation.association.name)
      ).toUpperCase()
    : "No Association";

  const activeSport = activeAssociation?.association.sport_type?.name ?? null;

  const handleAssociationSelect = React.useCallback(
    (associationId: string) => {
      onSelect(associationId);
    },
    [onSelect]
  );

  const handleAddAssociation = React.useCallback(() => {
    onAddAssociation?.();
  }, [onAddAssociation]);

  return (
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
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold uppercase">
                  {activeAbbreviation}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {activeSport ?? "Select association"}
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
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Associations
            </DropdownMenuLabel>
            {associations.length ? (
              associations.map((membership) => {
                const { association } = membership;
                const abbreviation = (
                  association.abbreviation ??
                  deriveAbbreviation(association.name)
                ).toUpperCase();
                const isActive =
                  membership.association_id ===
                  (activeAssociation?.association_id ?? currentAssociationId);

                return (
                  <DropdownMenuItem
                    key={membership.association_id}
                    onSelect={(event) => {
                      event.preventDefault();
                      if (!isActive) {
                        handleAssociationSelect(membership.association_id);
                      }
                    }}
                    className={cn(
                      "gap-2 p-2",
                      isActive &&
                        "bg-sidebar-accent/40 text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-primary/10 text-sidebar-primary">
                      <GalleryVerticalEnd className="size-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium uppercase">
                        {abbreviation}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {association.name}
                      </div>
                    </div>
                    {isActive ? (
                      <Check className="size-4 text-sidebar-primary" />
                    ) : null}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="px-2 py-6 text-sm text-muted-foreground">
                {canManageAssociations
                  ? "You have no associations yet. Add your first association."
                  : "You do not have any associations assigned."}
              </div>
            )}
            {canManageAssociations ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleAddAssociation();
                  }}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border border-dashed border-sidebar-border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">
                    Add association
                  </div>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
