import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: {
    name: string;
    city: string;
    province_state: string;
    address: string;
    postal_code: string;
    google_maps_link: string;
  };
  onSubmit: (data: {
    name: string;
    city: string;
    province_state: string;
    address: string;
    postal_code: string;
    google_maps_link: string;
  }) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function LocationDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  submitting,
  error,
}: LocationDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    province_state: "",
    address: "",
    postal_code: "",
    google_maps_link: "",
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          name: "",
          city: "",
          province_state: "",
          address: "",
          postal_code: "",
          google_maps_link: "",
        });
      }
    }
  }, [open, mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Location" : "Edit Location"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new location for evaluations."
              : "Update location details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Main Arena"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, city: e.target.value }))
              }
              placeholder="e.g. Moose Jaw"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="province_state">Province/State</Label>
            <Input
              id="province_state"
              value={formData.province_state}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  province_state: e.target.value,
                }))
              }
              placeholder="e.g. SK"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="e.g. 123 Main St"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              value={formData.postal_code}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  postal_code: e.target.value,
                }))
              }
              placeholder="e.g. S6H 1A1"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="google_maps_link">Google Maps Link</Label>
            <Input
              id="google_maps_link"
              value={formData.google_maps_link}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  google_maps_link: e.target.value,
                }))
              }
              placeholder="https://maps.google.com/..."
              disabled={submitting}
            />
          </div>

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
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
