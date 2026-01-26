import { useState } from "react";
import { Copy, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

interface CloneSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRow | null;
  onSuccess?: () => void;
}

export function CloneSessionDialog({
  open,
  onOpenChange,
  session,
  onSuccess,
}: CloneSessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!session) return null;

  const handleClone = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.rpc("clone_session_drills", {
        p_source_session_id: session.id,
      });

      if (error) throw error;

      setSuccessMessage(
        `Drill configuration cloned to ${data} other sessions in the wave.`
      );
      if (onSuccess) onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Session Configuration</DialogTitle>
          <DialogDescription>
            Clone drill configuration from{" "}
            <span className="font-medium">{session.name}</span> to all other
            sessions in the same wave.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will <strong>overwrite</strong> any existing drill
              configurations on all other sessions in this wave. This action
              cannot be undone.
            </AlertDescription>
          </Alert>

          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-600 dark:text-emerald-400">
              {successMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {successMessage ? "Close" : "Cancel"}
          </Button>
          {!successMessage && (
            <Button
              onClick={handleClone}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Confirm Clone
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
