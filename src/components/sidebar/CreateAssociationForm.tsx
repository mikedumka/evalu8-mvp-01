import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SportType = {
  id: string;
  name: string;
};

interface CreateAssociationFormProps {
  open: boolean;
  onCreated: (associationId: string) => Promise<void> | void;
  onCancel: () => void;
}

export function CreateAssociationForm({
  open,
  onCreated,
  onCancel,
}: CreateAssociationFormProps) {
  const [associationName, setAssociationName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [sportTypeId, setSportTypeId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sportTypes, setSportTypes] = useState<SportType[]>([]);
  const [isLoadingSportTypes, setIsLoadingSportTypes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isSubscribed = true;

    const loadSportTypes = async () => {
      setIsLoadingSportTypes(true);
      setFormError(null);

      try {
        const { data, error } = await supabase
          .from("sport_types")
          .select("id, name")
          .eq("status", "active")
          .order("name");

        if (!isSubscribed) {
          return;
        }

        if (error) {
          console.error("Failed to load sport types", error.message);
          setFormError(
            "We couldn't load sport types. Please try again or contact support."
          );
          setSportTypes([]);
          return;
        }

        const sports = data ?? [];
        setSportTypes(sports);

        if (sports.length && !sportTypeId) {
          setSportTypeId(sports[0]!.id);
        }
      } catch (error) {
        if (!isSubscribed) {
          return;
        }
        console.error("Unexpected error loading sport types", error);
        setFormError(
          "Something went wrong while loading sport types. Please try again."
        );
        setSportTypes([]);
      } finally {
        if (isSubscribed) {
          setIsLoadingSportTypes(false);
        }
      }
    };

    void loadSportTypes();

    return () => {
      isSubscribed = false;
    };
  }, [open, sportTypeId]);

  useEffect(() => {
    if (open) {
      setAssociationName("");
      setAbbreviation("");
      setSportTypeId("");
      setContactEmail("");
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const isSubmitDisabled = useMemo(() => {
    if (isSubmitting || isLoadingSportTypes) {
      return true;
    }

    return !associationName.trim() || !sportTypeId;
  }, [associationName, isLoadingSportTypes, isSubmitting, sportTypeId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!associationName.trim()) {
      setFormError("Association name is required.");
      return;
    }

    if (!sportTypeId) {
      setFormError("Select a sport type to continue.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        p_name: associationName.trim(),
        p_sport_type_id: sportTypeId,
        p_contact_email: contactEmail.trim() || null,
      } as const;

      const { data, error } = await supabase.rpc(
        "create_association_with_admin",
        payload as never
      );

      if (error) {
        console.error("Failed to create association", error.message);
        setFormError(error.message || "Unable to create association.");
        return;
      }

      if (!data?.id) {
        setFormError("Association was created but no identifier was returned.");
        return;
      }

      const trimmedAbbreviation = abbreviation.trim().toUpperCase();

      if (trimmedAbbreviation) {
        const { error: updateError } = await supabase
          .from("associations")
          .update({ abbreviation: trimmedAbbreviation })
          .eq("id", data.id);

        if (updateError) {
          console.error(
            "Association created but abbreviation update failed",
            updateError.message
          );
        }
      }

      await onCreated(data.id);
    } catch (error) {
      console.error("Unexpected error creating association", error);
      setFormError(
        "We ran into a problem creating the association. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">
          Association name
        </label>
        <Input
          value={associationName}
          onChange={(event) => setAssociationName(event.target.value)}
          placeholder="Enter association name"
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">
          Association abbreviation (optional)
        </label>
        <Input
          value={abbreviation}
          onChange={(event) => setAbbreviation(event.target.value)}
          placeholder="Optional abbreviation (e.g., MJMH)"
          maxLength={8}
        />
        <p className="text-xs text-muted-foreground">
          We use the abbreviation for quick references across the app.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Sport</label>
        <select
          value={sportTypeId}
          onChange={(event) => setSportTypeId(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoadingSportTypes}
        >
          <option value="" disabled>
            {isLoadingSportTypes ? "Loading..." : "Select a sport"}
          </option>
          {sportTypes.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">
          Contact email (optional)
        </label>
        <Input
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="contact@yourassociation.org"
        />
      </div>

      {formError ? (
        <p className="text-sm text-destructive">{formError}</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? "Creating..." : "Create association"}
        </Button>
      </div>
    </form>
  );
}
