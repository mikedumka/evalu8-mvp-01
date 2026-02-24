import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Copy,
  Loader2,
} from "lucide-react";

interface Evaluator {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  full_name: string | null;
}

interface SessionEvaluatorManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any; // Type lazily for now, can perform better typing later
  minEvaluators?: number;
  onUpdate: () => void;
}

export function SessionEvaluatorManagementDialog({
  open,
  onOpenChange,
  session,
  minEvaluators = 0,
  onUpdate,
}: SessionEvaluatorManagementDialogProps) {
  const { toast } = useToast();
  const [availableEvaluators, setAvailableEvaluators] = useState<Evaluator[]>(
    [],
  );
  const [assignedEvaluators, setAssignedEvaluators] = useState<Evaluator[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && session) {
      fetchEvaluators();
    }
  }, [open, session]);

  const fetchEvaluators = async () => {
    if (!session) return;
    setLoading(true);
    try {
      // 1. Fetch all users with 'Evaluator' role in this association
      // Explicitly specify the relationship to avoid ambiguity with invited_by
      // Fetch ANY user in association first, then filter in JS to be safe about role casing
      const { data: associationUsers, error: assocError } = await supabase
        .from("association_users")
        .select(
          `
          user_id,
          roles,
          user:users!association_users_user_id_fkey (
            id,
            email,
            full_name
          )
        `,
        )
        .eq("association_id", session.association_id);

      if (assocError) throw assocError;

      const allEvaluators: Evaluator[] = (associationUsers || [])
        .filter(
          (au: any) =>
            au.roles &&
            (au.roles.includes("Evaluator") || au.roles.includes("evaluator")),
        )
        .map((au: any) => ({
          id: au.user.id,
          email: au.user.email,
          full_name: au.user.full_name,
          first_name: au.user.full_name?.split(" ")[0] || "",
          last_name: au.user.full_name?.split(" ").slice(1).join(" ") || "",
        }))
        .filter((u) => u.id); // Valid users only

      // 2. Fetch currently assigned evaluators for this session
      const { data: sessionEvaluators, error: sessionError } = await supabase
        .from("session_evaluators")
        .select("user_id")
        .eq("session_id", session.id);

      if (sessionError) throw sessionError;

      const assignedIds = new Set(sessionEvaluators?.map((se) => se.user_id));

      const assigned = allEvaluators.filter((e) => assignedIds.has(e.id));
      const available = allEvaluators.filter((e) => !assignedIds.has(e.id));

      setAssignedEvaluators(assigned);
      setAvailableEvaluators(available);
    } catch (err: any) {
      console.error("Error fetching evaluators:", err);
      toast({
        title: "Error",
        description: "Failed to load evaluators.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (evaluator: Evaluator) => {
    // Validation: Check against minEvaluators from season settings
    // If minEvaluators > 0, we treat it as the maximum number allowed as per request
    if (minEvaluators > 0 && assignedEvaluators.length >= minEvaluators) {
      toast({
        title: "Limit Reached",
        description: `This session is limited to ${minEvaluators} evaluators based on season settings.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("session_evaluators").insert({
        session_id: session.id,
        user_id: evaluator.id,
        association_id: session.association_id,
      });

      if (error) throw error;

      setAvailableEvaluators((prev) =>
        prev.filter((e) => e.id !== evaluator.id),
      );
      setAssignedEvaluators((prev) => [...prev, evaluator]);
      onUpdate(); // Trigger parent refresh

      toast({
        title: "Evaluator Assigned",
        description: `${evaluator.full_name || evaluator.email} added to session.`,
      });
    } catch (err: any) {
      console.error("Error assigning evaluator:", err);
      toast({
        title: "Error",
        description: "Failed to assign evaluator.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (evaluator: Evaluator) => {
    try {
      const { error } = await supabase
        .from("session_evaluators")
        .delete()
        .eq("session_id", session.id)
        .eq("user_id", evaluator.id);

      if (error) throw error;

      setAssignedEvaluators((prev) =>
        prev.filter((e) => e.id !== evaluator.id),
      );
      setAvailableEvaluators((prev) => [...prev, evaluator]);
      onUpdate(); // Trigger parent refresh

      toast({
        title: "Evaluator Removed",
        description: `${evaluator.full_name || evaluator.email} removed from session.`,
      });
    } catch (err: any) {
      console.error("Error removing evaluator:", err);
      toast({
        title: "Error",
        description: "Failed to remove evaluator.",
        variant: "destructive",
      });
    }
  };

  const handleCloneToWave = async () => {
    if (!session.wave_id) {
      toast({
        title: "No Wave Assigned",
        description: "This session is not part of a wave.",
        variant: "destructive",
      });
      return;
    }

    if (assignedEvaluators.length === 0) {
      toast({
        title: "No Evaluators",
        description: "Assign evaluators to this session first.",
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        "This will OVERWRITE assigned evaluators for all other sessions in this wave. Are you sure?",
      )
    ) {
      return;
    }

    setCloning(true);
    try {
      // 1. Get target sessions in the same wave
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

      // 2. Delete existing evaluators for target sessions
      const { error: deleteError } = await supabase
        .from("session_evaluators")
        .delete()
        .in("session_id", targetSessionIds);

      if (deleteError) throw deleteError;

      // 3. Insert new evaluators
      const newEvaluators = [];
      for (const targetId of targetSessionIds) {
        for (const evaluator of assignedEvaluators) {
          newEvaluators.push({
            session_id: targetId,
            user_id: evaluator.id,
            association_id: session.association_id,
          });
        }
      }

      const { error: insertError } = await supabase
        .from("session_evaluators")
        .insert(newEvaluators);

      if (insertError) throw insertError;

      toast({
        title: "Evaluators Cloned",
        description: `Successfully copied evaluators to ${targetSessionIds.length} other sessions in this wave.`,
      });

      // No need to trigger parent refresh here as it only affects other sessions
    } catch (error) {
      console.error("Error cloning evaluators:", error);
      toast({
        title: "Clone Failed",
        description: "Could not copy evaluators.",
        variant: "destructive",
      });
    } finally {
      setCloning(false);
    }
  };

  const filteredAvailable = availableEvaluators.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <DialogTitle>Manage Session Evaluators</DialogTitle>
            <DialogDescription>
              Assign or remove evaluators for {session?.name || "this session"}.
            </DialogDescription>
          </div>
          {session?.wave_id && assignedEvaluators.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloneToWave}
              disabled={cloning}
              className="ml-4"
            >
              {cloning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Clone to Wave
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 py-4">
          {/* Left Column: Available */}
          <div className="flex flex-col gap-2 border rounded-md p-3">
            <h3 className="font-medium text-sm text-muted-foreground mb-2 flex items-center justify-between">
              Available Evaluators
              <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                {filteredAvailable.length}
              </span>
            </h3>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <ScrollArea className="flex-1 -mx-3 px-3">
              <div className="space-y-1">
                {loading ? (
                  <div className="text-xs text-muted-foreground p-2">
                    Loading...
                  </div>
                ) : filteredAvailable.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2 text-center italic">
                    {searchQuery
                      ? "No matches found"
                      : "No available evaluators"}
                  </div>
                ) : (
                  filteredAvailable.map((evaluator) => (
                    <div
                      key={evaluator.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted group transition-colors"
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">
                          {evaluator.full_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {evaluator.email}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleAssign(evaluator)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Column: Assigned */}
          <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/30">
            <h3 className="font-medium text-sm text-muted-foreground mb-2 flex items-center justify-between">
              Assigned to Session
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                {assignedEvaluators.length}
              </span>
            </h3>

            <ScrollArea className="flex-1 -mx-3 px-3 mt-10">
              {/* Added margin top to match alignment with search bar on left roughly if desired, or just list */}
              <div className="space-y-1">
                {loading ? (
                  <div className="text-xs text-muted-foreground p-2">
                    Loading...
                  </div>
                ) : assignedEvaluators.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2 text-center italic">
                    No evaluators assigned yet
                  </div>
                ) : (
                  assignedEvaluators.map((evaluator) => (
                    <div
                      key={evaluator.id}
                      className="flex items-center justify-between p-2 rounded-md bg-background border shadow-sm group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-100 text-blue-700 p-1.5 rounded-full">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate">
                            {evaluator.full_name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {evaluator.email}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemove(evaluator)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
