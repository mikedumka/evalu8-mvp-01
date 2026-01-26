import { useEffect, useState } from "react";
import { Loader2, Shuffle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type WaveRow = Database["public"]["Tables"]["waves"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

interface WaveDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wave: WaveRow;  
  onSuccess: (message: string) => void;
}

export function WaveDistributionDialog({
  open,
  onOpenChange,
  wave,
  onSuccess,
}: WaveDistributionDialogProps) {
  const { currentAssociation } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [algorithm, setAlgorithm] = useState<string>("alphabetical");
  const [teamsPerSession, setTeamsPerSession] = useState<number>(2);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && wave) {
        fetchWaveSessions();
        // Set initial values from wave if available
        if (wave.distribution_algorithm) setAlgorithm(wave.distribution_algorithm);
        if (wave.teams_per_session) setTeamsPerSession(wave.teams_per_session);
    }
  }, [open, wave]);

  const fetchWaveSessions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("wave_id", wave.id)
      .order("scheduled_date")
      .order("scheduled_time");
    setSessions(data || []);
    setLoading(false);
  };

  const handleDistribute = async () => {
    if (!currentAssociation) return;
    setDistributing(true);
    setError(null);

    try {
      // 1. Update wave configuration first
      const { error: updateError } = await supabase
        .from("waves")
        .update({
            // @ts-ignore
            distribution_algorithm: algorithm,
            teams_per_session: teamsPerSession
        })
        .eq("id", wave.id);

      if (updateError) throw updateError;
      
      // 2. Call distribution RPC
      const { error: rpcError } = await supabase.rpc("distribute_wave_players", {
        p_wave_id: wave.id,
        p_algorithm: algorithm,
        p_teams_per_session: teamsPerSession
      });

      if (rpcError) throw rpcError;

      onSuccess("Players distributed successfully.");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Distribution error:", err);
      setError(err.message || "Failed to distribute players.");
    } finally {
      setDistributing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Distribute Players</DialogTitle>
          <DialogDescription>
            Configure how players effectively assigned to sessions in Wave {wave.wave_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
            {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                 <div className="grid gap-2">
                    <Label htmlFor="algorithm">Distribution Algorithm</Label>
                    <Select value={algorithm} onValueChange={setAlgorithm}>
                        <SelectTrigger id="algorithm">
                            <SelectValue placeholder="Select algorithm" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="alphabetical">Alphabetical</SelectItem>
                            <SelectItem value="random">Random</SelectItem>
                            <SelectItem value="previous_level">Previous Level (Balanced)</SelectItem>
                         </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Method used to assign players to sessions and teams.
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="teams">Teams per Session</Label>
                    <Input 
                        id="teams"
                        type="number" 
                        min={1} 
                        max={6} 
                        value={teamsPerSession} 
                        onChange={(e) => setTeamsPerSession(parseInt(e.target.value))} 
                    />
                    <p className="text-xs text-muted-foreground">
                        Number of teams to create within each session (1-6).
                    </p>
                </div>

                {sessions.length > 0 && (
                    <div className="rounded-md bg-muted p-3 text-sm">
                        <p className="font-medium">Scope:</p>
                        <ul className="list-disc list-inside mt-1 text-muted-foreground">
                            <li>{sessions.length} sessions in this wave</li>
                            <li>Players from Cohort will be distributed</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDistribute} disabled={distributing}>
            {distributing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Shuffle className="mr-2 h-4 w-4" />
            Distribute Players
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
