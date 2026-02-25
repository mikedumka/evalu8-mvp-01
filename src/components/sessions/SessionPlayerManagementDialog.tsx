import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserX, AlertCircle, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/types/database.types";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  wave_number?: number | null;
  counts?: {
    players: number;
  };
  location?: {
    name: string;
  } | null;
  wave?: {
    teams_per_session: number | null;
  } | null;
};

type AssignedPlayer = {
  team_number: number | null;
  jersey_number: number | null;
  jersey_color: string | null;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    previous_level?: {
      name: string;
    } | null;
  } | null;
};
type CohortPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  previous_level?: {
    name: string;
  } | null;
  current_session?: {
    id: string;
    name: string;
  } | null;
};

interface SessionPlayerManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRow | null;
  onUpdate: () => void;
}

export function SessionPlayerManagementDialog({
  open,
  onOpenChange,
  session,
  onUpdate,
}: SessionPlayerManagementDialogProps) {
  const { toast } = useToast();
  const [players, setPlayers] = useState<AssignedPlayer[]>([]);
  // const [otherSessions, setOtherSessions] = useState<WaveSession[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Player State
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<CohortPlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  // Fetch players and other sessions in the wave
  useEffect(() => {
    if (open && session) {
      fetchData();
      fetchTeamCounts();
    }
  }, [open, session]);

  const [teamCounts, setTeamCounts] = useState<{ [key: number]: number }>({});

  const fetchTeamCounts = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from("player_sessions")
        .select("team_number")
        .eq("session_id", session.id);

      if (error) throw error;

      const counts: { [key: number]: number } = {};
      data?.forEach((row) => {
        if (row.team_number) {
          counts[row.team_number] = (counts[row.team_number] || 0) + 1;
        }
      });
      setTeamCounts(counts);
    } catch (error) {
      console.error("Error fetching team counts", error);
    }
  };

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);

    try {
      // 1. Fetch assigned players
      const { data: playerData, error: playerError } = await supabase
        .from("player_sessions")
        .select(
          `
          team_number,
          jersey_number,
          jersey_color,
          player:players (
            id,
            first_name,
            last_name,
            previous_level:previous_levels!previous_level_id (
              name
            )
          )
        `,
        )
        .eq("session_id", session.id)
        .order("team_number", { ascending: true })
        .order("player(last_name)", { ascending: true });

      if (playerError) throw playerError;

      // @ts-ignore - Supabase type inference for nested joins can be tricky
      setPlayers(
        (playerData || []).map((item) => ({
          ...item,
          player: item.player
            ? {
                ...item.player,
                // @ts-ignore
                // Map previous_level (object) directly from query alias
                previous_level: item.player.previous_level,
              }
            : null,
        })),
      );
    } catch (error: any) {
      console.error("Error fetching session data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load session data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlayers = async () => {
    if (!session || !session.cohort_id) return;
    setLoadingAvailable(true);
    try {
      // Get all players in cohort
      const { data: allPlayers, error: playersError } = await supabase
        .from("players")
        .select(
          `
          id,
          first_name,
          last_name,
          previous_level:previous_levels!previous_level_id (
            name
          )
        `,
        )
        .eq("cohort_id", session.cohort_id)
        .eq("status", "active") // Only active players
        .order("last_name");

      if (playersError) throw playersError;

      // Get all assignments for this wave (if applicable)
      // If no wave, we just check against this session

      const assignedMap = new Map<string, { id: string; name: string }>();

      if (session.wave_id) {
        const { data: busyPlayers, error: busyError } = await supabase
          .from("player_sessions")
          .select(
            `
            player_id,
            session:sessions!inner (
               id,
               name,
               wave_id
            )
          `,
          )
          .eq("session.wave_id", session.wave_id);

        if (busyError) throw busyError;

        busyPlayers?.forEach((bp) => {
          // @ts-ignore
          if (bp.session)
            assignedMap.set(bp.player_id, {
              id: bp.session.id,
              name: bp.session.name,
            });
        });
      } else {
        // Just check this session
        const { data: busyPlayers, error: busyError } = await supabase
          .from("player_sessions")
          .select(`player_id`)
          .eq("session_id", session!.id);

        if (busyError) throw busyError;
        busyPlayers?.forEach((bp) => {
          assignedMap.set(bp.player_id, {
            id: session!.id,
            name: session!.name,
          });
        });
      }

      // Merge
      const results: CohortPlayer[] = allPlayers.map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        previous_level: p.previous_level, // now correctly aliased
        current_session: assignedMap.get(p.id) || null,
      }));

      // Filter out players already in THIS session
      setAvailablePlayers(
        results.filter((p) => p.current_session === null), // Only show unassigned
      );
    } catch (error) {
      console.error("Error fetching available players", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load cohort players",
      });
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleAddPlayer = async (
    playerId: string,
    teamNumber: number | null,
  ) => {
    try {
      // Use RPC for safe addition
      // @ts-ignore
      const { error } = await supabase.rpc("add_player_to_session", {
        p_session_id: session!.id,
        p_player_id: playerId,
        p_team_number: teamNumber,
      });

      if (error) throw error;

      toast({ title: "Player Added", description: "Player added to session." });
      await fetchData();
      fetchTeamCounts();
      onUpdate();
      setIsAddPlayerOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!session) return;
    // Optional: Allow removing player from session entirely (unassigning)
    if (
      !confirm(
        "Are you sure you want to remove this player from the session? They will need to be re-assigned manually.",
      )
    )
      return;

    try {
      // Use RPC to remove player (bypasses potential RLS context issues)
      // @ts-ignore
      const { error } = await supabase.rpc("remove_player_from_session", {
        p_session_id: session!.id,
        p_player_id: playerId,
      });

      if (error) throw error;

      toast({
        title: "Player Removed",
        description: "Player removed from this session.",
      });

      await fetchData();
      fetchTeamCounts();
      onUpdate();
    } catch (error: any) {
      console.error("Error removing player:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove player.",
      });
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Session Players</DialogTitle>
          <DialogDescription>
            {session.name}
            {session.wave_number && ` • Wave ${session.wave_number}`}
            {session.location?.name && ` • ${session.location.name}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Assigned Players ({players.length})
            </h3>
            <Button
              size="sm"
              onClick={() => {
                setIsAddPlayerOpen(true);
                fetchAvailablePlayers();
                fetchTeamCounts();
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Player
            </Button>
          </div>

          {!session.wave_id && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This session is not part of a wave. Moving players is disabled.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : players.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground h-24"
                      >
                        No players assigned to this session.
                      </TableCell>
                    </TableRow>
                  ) : (
                    players.map((p) => (
                      <TableRow key={p.player?.id}>
                        <TableCell className="font-medium">
                          {p.player?.last_name}, {p.player?.first_name}
                        </TableCell>
                        <TableCell>
                          {p.player?.previous_level?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {p.team_number ? `Team ${p.team_number}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                              onClick={() =>
                                p.player?.id && handleRemovePlayer(p.player.id)
                              }
                              title="Remove from session"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
        {/* Add Player Dialog */}
        <Dialog open={isAddPlayerOpen} onOpenChange={setIsAddPlayerOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add Player to Session</DialogTitle>
              <DialogDescription>
                Search for players in the cohort to add to this session.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAvailable ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : availablePlayers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-4 text-muted-foreground"
                        >
                          No available players found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      availablePlayers
                        .filter(
                          (p) =>
                            !searchQuery ||
                            p.last_name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            p.first_name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                        )
                        .map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {p.last_name}, {p.first_name}
                              <div className="text-xs text-muted-foreground">
                                {p.previous_level?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-200 bg-green-50"
                              >
                                Unassigned
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Select
                                  onValueChange={(val) => {
                                    if (val)
                                      handleAddPlayer(
                                        p.id,
                                        val === "null" ? null : parseInt(val),
                                      );
                                  }}
                                >
                                  <SelectTrigger className="w-[140px] h-8 text-xs">
                                    <SelectValue placeholder="Add to Team..." />
                                  </SelectTrigger>
                                  <SelectContent align="end">
                                    <SelectItem value="null">
                                      No Team
                                    </SelectItem>
                                    {Array.from({
                                      length:
                                        session?.wave?.teams_per_session || 2,
                                    }).map((_, i) => {
                                      const teamNum = i + 1;
                                      const count = teamCounts[teamNum] || 0;
                                      return (
                                        <SelectItem
                                          key={teamNum}
                                          value={teamNum.toString()}
                                        >
                                          Team {teamNum} ({count})
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>{" "}
      </DialogContent>
    </Dialog>
  );
}
