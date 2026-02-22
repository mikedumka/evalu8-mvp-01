import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Waves,
  CheckCircle,
  Activity,
} from "lucide-react";
import type { Database } from "@/types/database.types";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  location?: { name: string } | null;
  wave_number?: number | null;
  counts?: {
    drills: number;
    evaluators: number;
    intake: number;
    players: number;
  };
};

interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRow | null;
}

interface AssignedPlayer {
  team_number: number | null;
  jersey_number: number | null;
  jersey_color: string | null;
  player: {
    first_name: string;
    last_name: string;
  } | null;
}

export function SessionSummaryDialog({
  open,
  onOpenChange,
  session,
}: SessionSummaryDialogProps) {
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayer[]>([]);

  useEffect(() => {
    if (open && session) {
      const fetchPlayers = async () => {
        const { data, error } = await supabase
          .from("player_sessions")
          .select(
            `
            team_number,
            jersey_number,
            jersey_color,
            player:players (
              first_name,
              last_name
            )
          `,
          )
          .eq("session_id", session.id)
          .order("team_number", { ascending: true }) // Sort by team
          .order("player(last_name)", { ascending: true }); // Then by name

        if (error) {
          console.error("Error fetching players:", error);
        } else {
          // data is typed as any[] by supabase client sometimes if query is complex, or needs explicit casting
          setAssignedPlayers(data as unknown as AssignedPlayer[]);
        }
      };

      fetchPlayers();
    } else {
      setAssignedPlayers([]);
    }
  }, [open, session]);

  if (!session) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-";
    if (timeString.includes("T")) {
      return new Date(timeString).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return timeString.split(":").slice(0, 2).join(":");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Session Summary</DialogTitle>
          <DialogDescription>
            Details and configuration status for this session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{session.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge
                  variant={
                    session.status === "completed" ? "default" : "outline"
                  }
                >
                  {session.status.replace("_", " ")}
                </Badge>
                {session.wave_number && (
                  <Badge variant="secondary">Wave {session.wave_number}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatDate(session.scheduled_date)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatTime(session.scheduled_time)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {session.location?.name || "No Location"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {session.duration_minutes || 60} min
              </span>
            </div>
          </div>

          {/* Configuration Stats */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Configuration Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-blue-500" />
                  <span>Wave Assigned</span>
                </div>
                {session.wave_id ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>

              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>Players</span>
                </div>
                <span className="font-medium">
                  {session.counts?.players || 0}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  <span>Drills</span>
                </div>
                <span className="font-medium">
                  {session.counts?.drills || 0}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span>Evaluators</span>
                </div>
                <span className="font-medium">
                  {session.counts?.evaluators || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Players */}
          {session.counts?.players && session.counts.players > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">
                Assigned Players ({assignedPlayers.length})
              </h4>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="space-y-4">
                  {Object.entries(
                    assignedPlayers.reduce(
                      (acc: Record<string, AssignedPlayer[]>, player) => {
                        const team =
                          player.team_number?.toString() || "Unassigned";
                        if (!acc[team]) acc[team] = [];
                        acc[team].push(player);
                        return acc;
                      },
                      {} as Record<string, AssignedPlayer[]>,
                    ),
                  ).map(([team, players]) => (
                    <div key={team}>
                      <h5 className="mb-2 text-sm font-medium text-muted-foreground">
                        {team === "Unassigned"
                          ? "No Team Assigned"
                          : `Team ${team}`}
                      </h5>
                      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        {players.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded bg-muted/50 p-2"
                          >
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="font-medium">
                              {p.player?.last_name}, {p.player?.first_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
