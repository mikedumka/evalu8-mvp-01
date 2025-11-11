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
    <div className="flex items-center gap-3">
      <label
        className="text-sm font-medium text-surface-300"
        htmlFor="association-selector"
      >
        Association
      </label>
      <select
        id="association-selector"
        className="rounded-lg border border-white/10 bg-surface-900/60 px-3 py-2 text-sm text-surface-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-400"
        value={currentAssociationId ?? ""}
        onChange={handleChange}
      >
        {associations.map((membership) => (
          <option
            key={membership.association_id}
            value={membership.association_id}
          >
            {membership.association.name}
          </option>
        ))}
      </select>
    </div>
  );
}
