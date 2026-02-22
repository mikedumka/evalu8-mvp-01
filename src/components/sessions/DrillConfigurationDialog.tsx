import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { DrillConfiguration } from "./DrillConfiguration";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/types/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  cohort: { name: string } | null;
  location: { name: string } | null;
};

interface DrillConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRow | null;
  onSuccess?: () => void;
}

export function DrillConfigurationDialog({
  open,
  onOpenChange,
  session,
  onSuccess,
}: DrillConfigurationDialogProps) {
  const [cloning, setCloning] = useState(false);
  const { toast } = useToast();

  if (!session) return null;

  const handleCloneToWave = async () => {
    if (!session.wave_id) {
      toast({
        title: "No Wave Assigned",
        description: "This session is not part of a wave.",
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        "This will OVERWRITE drill configurations for all other sessions in this wave. Are you sure?",
      )
    ) {
      return;
    }

    setCloning(true);
    try {
      // 1. Get current session drills
      const { data: sourceDrills, error: fetchError } = await supabase
        .from("session_drills")
        .select("*")
        .eq("session_id", session.id);

      if (fetchError) throw fetchError;

      if (!sourceDrills || sourceDrills.length === 0) {
        toast({
          title: "No Drills",
          description: "There are no drills configured to clone.",
          variant: "destructive",
        });
        setCloning(false);
        return;
      }

      // 2. Get target sessions in the same wave
      const { data: targetSessions, error: sessionError } = await supabase
        .from("sessions")
        .select("id")
        .eq("wave_id", session.wave_id)
        .neq("id", session.id); // Exclude current session

      if (sessionError) throw sessionError;

      if (!targetSessions || targetSessions.length === 0) {
        toast({
          title: "No Other Sessions",
          description: "There are no other sessions in this wave.",
        });
        setCloning(false);
        return;
      }

      const targetSessionIds = targetSessions.map((s) => s.id);

      // 3. Delete existing drill configs for target sessions
      const { error: deleteError } = await supabase
        .from("session_drills")
        .delete()
        .in("session_id", targetSessionIds);

      if (deleteError) throw deleteError;

      // 4. Insert new configs
      const newDrills = [];
      for (const targetId of targetSessionIds) {
        for (const drill of sourceDrills) {
          newDrills.push({
            session_id: targetId,
            drill_id: drill.drill_id,
            weight_percent: drill.weight_percent,
            applies_to_positions: drill.applies_to_positions,
            association_id: session.association_id,
          });
        }
      }

      const { error: insertError } = await supabase
        .from("session_drills")
        .insert(newDrills);

      if (insertError) throw insertError;

      toast({
        title: "Configuration Cloned",
        description: `Successfully copied drills to ${targetSessionIds.length} other sessions in this wave.`,
      });
      onSuccess?.();
    } catch (error) {
      console.error("Error cloning drills:", error);
      toast({
        title: "Clone Failed",
        description: "Could not copy drill configuration.",
        variant: "destructive",
      });
    } finally {
      setCloning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <DialogTitle>Drill Configuration</DialogTitle>
            <DialogDescription>
              Manage drills and weights for {session.name}
            </DialogDescription>
          </div>
          <div className="flex gap-2 mr-6">
            {session.wave_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloneToWave}
                disabled={cloning}
              >
                {cloning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Clone to Wave
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-6 -mr-6 pl-1">
          <DrillConfiguration session={session} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
