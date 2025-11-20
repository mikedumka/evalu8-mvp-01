import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type AssociationRow = Database["public"]["Tables"]["associations"]["Row"] & {
  sport_type?: {
    id: string;
    name: string;
  } | null;
};

interface AssociationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  association: AssociationRow | null;
  onSubmit: (data: {
    name: string;
    abbreviation: string;
    contactEmail: string;
    sportTypeId?: string;
  }) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function AssociationDialog({
  open,
  onOpenChange,
  association,
  onSubmit,
  submitting,
  error,
}: AssociationDialogProps) {
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sportTypeId, setSportTypeId] = useState("");

  const [sportTypes, setSportTypes] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loadingSports, setLoadingSports] = useState(false);

  useEffect(() => {
    if (open) {
      setName(association?.name ?? "");
      setAbbreviation(association?.abbreviation ?? "");
      setContactEmail(association?.contact_email ?? "");
      setSportTypeId(association?.sport_type_id ?? "");

      if (!association) {
        // Load sports for create mode
        void loadSportTypes();
      }
    }
  }, [open, association]);

  const loadSportTypes = async () => {
    setLoadingSports(true);
    const { data } = await supabase
      .from("sport_types")
      .select("id, name")
      .eq("status", "active")
      .order("name");

    if (data) {
      setSportTypes(data);
      if (data.length > 0 && !sportTypeId) {
        setSportTypeId(data[0].id);
      }
    }
    setLoadingSports(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      abbreviation,
      contactEmail,
      sportTypeId: association ? undefined : sportTypeId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {association ? "Edit Association" : "Create Association"}
          </DialogTitle>
          <DialogDescription>
            {association
              ? "Update the association details below."
              : "Create a new association and assign yourself as the initial administrator."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Association Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Moose Jaw Minor Hockey"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="abbreviation">Abbreviation</Label>
            <Input
              id="abbreviation"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              placeholder="e.g. MJMH"
              maxLength={8}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Optional short code for quick reference.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@example.com"
              required
              disabled={submitting}
            />
          </div>

          {!association && (
            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Select
                value={sportTypeId}
                onValueChange={setSportTypeId}
                disabled={submitting || loadingSports}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingSports ? "Loading..." : "Select a sport"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sportTypes.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {association && association.sport_type && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Sport Type:</span>{" "}
                {association.sport_type.name}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Subdomain:</span>{" "}
                {association.slug ?? "—"}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {association ? "Save Changes" : "Create Association"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
