import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Database } from "@/types/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

interface SessionStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRow | null;
  onStatusChange?: () => void;
}

export function SessionStatusDialog({
  open,
  onOpenChange,
  session,
}: SessionStatusDialogProps) {
  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Session Status</DialogTitle>
          <DialogDescription>
            Change the status for {session.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center text-muted-foreground">
          Status management coming soon.
        </div>
      </DialogContent>
    </Dialog>
  );
}
