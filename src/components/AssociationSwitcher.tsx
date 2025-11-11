import type { ChangeEvent } from "react";
import type { AssociationUser } from "../context/AuthContext";

interface AssociationSwitcherProps {
  associations: AssociationUser[];
  currentAssociationId: string | null;
  onChange: (associationId: string) => void;
}

export function AssociationSwitcher({
  associations,
  currentAssociationId,
  onChange,
}: AssociationSwitcherProps) {
  if (!associations.length) {
    return null;
  }

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value) {
      onChange(value);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-medium text-sidebar-foreground/80"
        htmlFor="association-selector"
      >
        Association
      </label>
      <select
        id="association-selector"
        className="h-9 w-full rounded-md border border-sidebar-border bg-sidebar px-3 text-sm text-sidebar-foreground shadow-sm transition hover:border-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        value={currentAssociationId ?? ""}
        onChange={handleChange}
      >
        {associations.map((membership) => (
          <option
            key={membership.association_id}
            value={membership.association_id}
            className="bg-popover text-popover-foreground"
          >
            {membership.association.name}
          </option>
        ))}
      </select>
    </div>
  );
}
