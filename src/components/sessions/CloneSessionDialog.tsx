import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Database } from "@/types/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

interface CloneSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRow | null;
}

export function CloneSessionDialog({
  open,
  onOpenChange,
  session,
}: CloneSessionDialogProps) {
  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Session Configuration</DialogTitle>
          <DialogDescription>
            Clone drill configuration from {session.name} to other sessions.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center text-muted-foreground">
          Clone functionality coming soon.
        </div>
      </DialogContent>
    </Dialog>
  );
}
