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
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  Copy,
  Loader2,
} from "lucide-react";

interface IntakePersonnel {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  full_name: string | null;
}

interface SessionIntakePersonnelManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  onUpdate: () => void;
}

export function SessionIntakePersonnelManagementDialog({
  open,
  onOpenChange,
  session,
  onUpdate,
}: SessionIntakePersonnelManagementDialogProps) {
  const { toast } = useToast();
  const [availableIntake, setAvailableIntake] = useState<IntakePersonnel[]>([]);
  const [assignedIntake, setAssignedIntake] = useState<IntakePersonnel[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && session) {
      fetchIntakePersonnel();
    }
  }, [open, session]);

  const fetchIntakePersonnel = async () => {
    if (!session) return;
    setLoading(true);
    try {
      // 1. Fetch all users with 'Intake' role in this association
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

      const allIntake: IntakePersonnel[] = (associationUsers || [])
        .filter(
          (au: any) =>
            au.roles &&
            (au.roles.includes("Intake") ||
              au.roles.includes("intake") ||
              au.roles.includes("Intake Personnel")), // Cover potential variations
        )
        .map((au: any) => ({
          id: au.user.id,
          email: au.user.email,
          full_name: au.user.full_name,
          first_name: au.user.full_name?.split(" ")[0] || "",
          last_name: au.user.full_name?.split(" ").slice(1).join(" ") || "",
        }))
        .filter((u) => u.id); // Valid users only

      // 2. Fetch currently assigned intake personnel for this session
      const { data: sessionIntake, error: sessionError } = await supabase
        .from("session_intake_personnel")
        .select("user_id")
        .eq("session_id", session.id);

      if (sessionError) throw sessionError;

      const assignedIds = new Set(sessionIntake?.map((si) => si.user_id));

      const assigned = allIntake.filter((i) => assignedIds.has(i.id));
      const available = allIntake.filter((i) => !assignedIds.has(i.id));

      setAssignedIntake(assigned);
      setAvailableIntake(available);
    } catch (err: any) {
      console.error("Error fetching intake personnel:", err);
      toast({
        title: "Error",
        description: "Failed to load intake personnel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (person: IntakePersonnel) => {
    // Validation: Only allow 1 intake personnel per session
    if (assignedIntake.length >= 1) {
      toast({
        title: "Limit Reached",
        description: "Only 1 intake personnel can be assigned per session.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("session_intake_personnel").insert({
        session_id: session.id,
        user_id: person.id,
        association_id: session.association_id,
      });

      if (error) throw error;

      setAvailableIntake((prev) => prev.filter((p) => p.id !== person.id));
      setAssignedIntake((prev) => [...prev, person]);
      onUpdate();

      toast({
        title: "Intake Personnel Assigned",
        description: `${person.full_name || person.email} added to session.`,
      });
    } catch (err: any) {
      console.error("Error assigning intake personnel:", err);
      toast({
        title: "Error",
        description: "Failed to assign intake personnel.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (person: IntakePersonnel) => {
    try {
      const { error } = await supabase
        .from("session_intake_personnel")
        .delete()
        .eq("session_id", session.id)
        .eq("user_id", person.id);

      if (error) throw error;

      setAssignedIntake((prev) => prev.filter((p) => p.id !== person.id));
      setAvailableIntake((prev) => [...prev, person]);
      onUpdate();

      toast({
        title: "Intake Personnel Removed",
        description: `${person.full_name || person.email} removed from session.`,
      });
    } catch (err: any) {
      console.error("Error removing intake personnel:", err);
      toast({
        title: "Error",
        description: "Failed to remove intake personnel.",
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

    if (assignedIntake.length === 0) {
      toast({
        title: "No Staff",
        description: "Assign intake personnel to this session first.",
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        "This will OVERWRITE assigned intake personnel for all other sessions in this wave. Are you sure?",
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

      // 2. Delete existing intake for target sessions
      const { error: deleteError } = await supabase
        .from("session_intake_personnel")
        .delete()
        .in("session_id", targetSessionIds);

      if (deleteError) throw deleteError;

      // 3. Insert new intake
      const newIntake = [];
      for (const targetId of targetSessionIds) {
        for (const person of assignedIntake) {
          newIntake.push({
            session_id: targetId,
            user_id: person.id,
            association_id: session.association_id,
          });
        }
      }

      const { error: insertError } = await supabase
        .from("session_intake_personnel")
        .insert(newIntake);

      if (insertError) throw insertError;

      toast({
        title: "Intake Cloned",
        description: `Successfully copied intake personnel to ${targetSessionIds.length} other sessions in this wave.`,
      });
    } catch (error) {
      console.error("Error cloning intake:", error);
      toast({
        title: "Clone Failed",
        description: "Could not copy intake personnel.",
        variant: "destructive",
      });
    } finally {
      setCloning(false);
    }
  };

  const filteredAvailable = availableIntake.filter(
    (i) =>
      i.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <DialogTitle>Manage Intake Personnel</DialogTitle>
            <DialogDescription>
              Assign or remove intake staff for{" "}
              {session?.name || "this session"}.
            </DialogDescription>
          </div>
          {session?.wave_id && assignedIntake.length > 0 && (
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
              Available Staff
              <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                {filteredAvailable.length}
              </span>
            </h3>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="h-64 pr-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  {searchQuery
                    ? "No matching staff found"
                    : "No intake personnel found"}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredAvailable.map((person) => (
                    <div
                      key={person.id}
                      className="group flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm border border-transparent hover:border-border transition-colors"
                    >
                      <div className="flex flex-col overflow-hidden max-w-[160px]">
                        <span className="font-medium truncate">
                          {person.full_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {person.email}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleAssign(person)}
                      >
                        <UserPlus className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Column: Assigned */}
          <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/10">
            <h3 className="font-medium text-sm text-foreground mb-2 flex items-center justify-between">
              Assigned Staff
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                {assignedIntake.length}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mb-2 px-1">
              These users can check players in.
            </p>

            <ScrollArea className="h-64 pr-2">
              {assignedIntake.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed rounded-md m-1">
                  No intake personnel assigned
                </div>
              ) : (
                <div className="space-y-1">
                  {assignedIntake.map((person) => (
                    <div
                      key={person.id}
                      className="group flex items-center justify-between p-2 rounded-md bg-background border shadow-sm text-sm"
                    >
                      <div className="flex flex-col overflow-hidden max-w-[160px]">
                        <span className="font-medium truncate">
                          {person.full_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {person.email}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(person)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
