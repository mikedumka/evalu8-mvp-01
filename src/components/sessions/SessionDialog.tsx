import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionRow | null;
  onSuccess: (message: string) => void;
}

export function SessionDialog({
  open,
  onOpenChange,
  session,
  onSuccess,
}: SessionDialogProps) {
  const { currentAssociation } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference Data
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [activeSeason, setActiveSeason] = useState<SeasonRow | null>(null);
  const [availableEvaluators, setAvailableEvaluators] = useState<UserOption[]>(
    []
  );
  const [availableIntake, setAvailableIntake] = useState<UserOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Form Fields
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [cohortId, setCohortId] = useState<string | "null">("null");
  const [assignedEvaluatorIds, setAssignedEvaluatorIds] = useState<string[]>(
    []
  );
  const [assignedIntakeIds, setAssignedIntakeIds] = useState<string[]>([]);

  const fetchReferenceData = useCallback(async () => {
    if (!currentAssociation) return;
    setLoadingRefs(true);
    try {
      // Fetch active season
      const { data: seasonData } = await supabase
        .from("seasons")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .maybeSingle();

      setActiveSeason(seasonData);

      // Fetch cohorts
      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .order("name");

      setCohorts(cohortData || []);

      // Fetch locations
      const { data: locationData } = await supabase
        .from("locations")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .order("name");

      setLocations(locationData || []);

      // Fetch association users with roles
      const { data: usersData, error: usersError } = await supabase
        .from("association_users")
        .select(
          `
          user_id,
          roles,
          users:users!association_users_user_id_fkey (
            id,
            full_name,
            email
          )
        `
        )
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active");

      if (usersError) throw usersError;

      const evaluators: UserOption[] = [];
      const intake: UserOption[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usersData?.forEach((u: any) => {
        const user = u.users;
        if (!user) return;
        const userOption = {
          id: user.id,
          name: user.full_name || user.email,
          email: user.email,
        };

        if (u.roles && u.roles.includes("Evaluator")) {
          evaluators.push(userOption);
        }
        if (u.roles && u.roles.includes("Intake Personnel")) {
          intake.push(userOption);
        }
      });

      setAvailableEvaluators(evaluators);
      setAvailableIntake(intake);
    } catch (err) {
      console.error("Error fetching reference data:", err);
    } finally {
      setLoadingRefs(false);
    }
  }, [currentAssociation]);

  const fetchSessionAssignments = useCallback(async (sessionId: string) => {
    try {
      // Fetch assigned evaluators
      const { data: evalData } = await supabase
        .from("session_evaluators")
        .select("user_id")
        .eq("session_id", sessionId);

      if (evalData) {
        setAssignedEvaluatorIds(evalData.map((r) => r.user_id));
      }

      // Fetch assigned intake personnel
      const { data: intakeData } = await supabase
        .from("session_intake_personnel")
        .select("user_id")
        .eq("session_id", sessionId);

      if (intakeData) {
        setAssignedIntakeIds(intakeData.map((r) => r.user_id));
      }
    } catch (err) {
      console.error("Error fetching session assignments:", err);
    }
  }, []);

  useEffect(() => {
    if (open && currentAssociation) {
      void fetchReferenceData();
    }
  }, [open, currentAssociation, fetchReferenceData]);

  useEffect(() => {
    if (open) {
      if (session) {
        // Edit mode
        setName(session.name);
        setLocationId(session.location_id || "");
        setScheduledDate(session.scheduled_date);
        setScheduledTime(session.scheduled_time);
        setDurationMinutes(session.duration_minutes || 60);
        setCohortId(session.cohort_id ?? "null");
        void fetchSessionAssignments(session.id);
      } else {
        // Create mode
        setName("");
        setLocationId("");
        setScheduledDate("");
        setScheduledTime("");
        setDurationMinutes(60);
        setCohortId("null");
        setAssignedEvaluatorIds([]);
        setAssignedIntakeIds([]);
      }
    }
  }, [open, session, fetchSessionAssignments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssociation) return;

    if (!session && !activeSeason) {
      setError("Cannot create session: No active season found.");
      return;
    }

    if (cohortId === "null") {
      setError("Cohort is required.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        location_id: locationId || null,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        duration_minutes: durationMinutes,
        cohort_id: cohortId,
      };

      let sessionId = session?.id;

      if (session) {
        // Update session
        const { error } = await supabase
          .from("sessions")
          .update(payload)
          .eq("id", session.id);

        if (error) throw error;
      } else {
        // Create session
        if (!activeSeason) throw new Error("No active season");

        const { data, error } = await supabase
          .from("sessions")
          .insert({
            association_id: currentAssociation.association_id,
            season_id: activeSeason.id,
            status: "draft", // Default status
            ...payload,
          })
          .select()
          .single();

        if (error) throw error;
        sessionId = data.id;
      }

      if (sessionId) {
        // Update Evaluators
        // First delete existing (simple replace strategy)
        await supabase
          .from("session_evaluators")
          .delete()
          .eq("session_id", sessionId);

        if (assignedEvaluatorIds.length > 0) {
          const evalInserts = assignedEvaluatorIds.map((uid) => ({
            association_id: currentAssociation.association_id,
            session_id: sessionId!,
            user_id: uid,
          }));
          const { error: evalError } = await supabase
            .from("session_evaluators")
            .insert(evalInserts);
          if (evalError) throw evalError;
        }

        // Update Intake Personnel
        await supabase
          .from("session_intake_personnel")
          .delete()
          .eq("session_id", sessionId);

        if (assignedIntakeIds.length > 0) {
          const intakeInserts = assignedIntakeIds.map((uid) => ({
            association_id: currentAssociation.association_id,
            session_id: sessionId!,
            user_id: uid,
          }));
          const { error: intakeError } = await supabase
            .from("session_intake_personnel")
            .insert(intakeInserts);
          if (intakeError) throw intakeError;
        }
      }

      onSuccess(
        session
          ? "Session updated successfully."
          : "Session created successfully."
      );
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save session:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEvaluator = (userId: string) => {
    setAssignedEvaluatorIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleIntake = (userId: string) => {
    setAssignedIntakeIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {session ? "Edit Session" : "Create Session"}
          </DialogTitle>
          <DialogDescription>
            {session
              ? "Update session details and staff assignments."
              : "Schedule a new evaluation session."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!session && !loadingRefs && !activeSeason && (
          <div className="rounded-md bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Warning: No active season found. You cannot create sessions until a
            season is activated.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. U11 Evaluation 1"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={locationId}
                onValueChange={setLocationId}
                disabled={submitting || loadingRefs}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.length === 0 && (
                    <SelectItem value="no-locations" disabled>
                      No locations found
                    </SelectItem>
                  )}
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Date</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Time</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Min)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cohort">Cohort</Label>
            <Select
              value={cohortId}
              onValueChange={setCohortId}
              disabled={submitting || loadingRefs}
            >
              <SelectTrigger id="cohort">
                <SelectValue placeholder="Select cohort" />
              </SelectTrigger>
              <SelectContent>
                {cohorts.length === 0 && (
                  <SelectItem value="no-cohorts" disabled>
                    No active cohorts found
                  </SelectItem>
                )}
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign Evaluators</Label>
              <div className="rounded-md border p-2">
                <ScrollArea className="h-[120px]">
                  {availableEvaluators.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-2">
                      No evaluators found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableEvaluators.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`eval-${user.id}`}
                            checked={assignedEvaluatorIds.includes(user.id)}
                            onCheckedChange={() => toggleEvaluator(user.id)}
                          />
                          <label
                            htmlFor={`eval-${user.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {user.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign Intake Personnel</Label>
              <div className="rounded-md border p-2">
                <ScrollArea className="h-[120px]">
                  {availableIntake.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-2">
                      No intake personnel found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableIntake.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`intake-${user.id}`}
                            checked={assignedIntakeIds.includes(user.id)}
                            onCheckedChange={() => toggleIntake(user.id)}
                          />
                          <label
                            htmlFor={`intake-${user.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {user.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
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
            <Button
              type="submit"
              disabled={submitting || (!session && !activeSeason)}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {session ? "Save Changes" : "Create Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
