import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface AdminPageProps {
  title: string;
  description?: string;
  showAssociationInfo?: boolean;
  badgeLabel?: string | null;
  children?: ReactNode;
}

export function AdminPage({
  title,
  description,
  showAssociationInfo = true,
  badgeLabel = "Evalu8 Platform",
  children,
}: AdminPageProps) {
  const { currentAssociation } = useAuth();

  const associationAbbreviation = currentAssociation
    ? (currentAssociation.association.abbreviation &&
      currentAssociation.association.abbreviation.trim().length > 0
        ? currentAssociation.association.abbreviation
        : currentAssociation.association.name
            .split(/[\s-]+/)
            .filter(Boolean)
            .map((word) => word[0] ?? "")
            .join("")
      ).toUpperCase()
    : "";

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb className="flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <span className="font-semibold text-foreground">evalu8</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                {currentAssociation ? (
                  <BreadcrumbLink
                    asChild
                    className="font-medium text-foreground"
                  >
                    <Link to="/">{associationAbbreviation}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-muted-foreground">
                    Select association
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {badgeLabel ? (
              <p className="text-xs font-semibold uppercase text-primary">
                {badgeLabel}
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          </div>
          {showAssociationInfo ? (
            currentAssociation ? (
              <div className="text-sm text-muted-foreground">
                Active association:
                <span className="ml-2 font-medium text-foreground">
                  {currentAssociation.association.name}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select an association from the sidebar.
              </div>
            )
          ) : null}
        </div>
        {description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children ? <div className="space-y-6">{children}</div> : null}
      </div>
    </div>
  );
}
