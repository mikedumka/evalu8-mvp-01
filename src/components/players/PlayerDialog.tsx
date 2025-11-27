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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type PositionTypeRow = Database["public"]["Tables"]["position_types"]["Row"];
type CohortRow = Database["public"]["Tables"]["cohorts"]["Row"];
type PreviousLevelRow = Database["public"]["Tables"]["previous_levels"]["Row"];
type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];

interface PlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerRow | null;
  onSuccess: (message: string) => void;
}

export function PlayerDialog({
  open,
  onOpenChange,
  player,
  onSuccess,
}: PlayerDialogProps) {
  const { currentAssociation } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference Data
  const [positions, setPositions] = useState<PositionTypeRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [previousLevels, setPreviousLevels] = useState<PreviousLevelRow[]>([]);
  const [activeSeason, setActiveSeason] = useState<SeasonRow | null>(null);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email1, setEmail1] = useState("");
  const [email2, setEmail2] = useState("");
  const [gender, setGender] = useState("");
  const [positionId, setPositionId] = useState("");
  const [cohortId, setCohortId] = useState<string | "null">("null");
  const [previousLevelId, setPreviousLevelId] = useState<string | "null">(
    "null"
  );
  const [status, setStatus] = useState<"active" | "withdrawn" | "other">(
    "active"
  );
  const [statusReason, setStatusReason] = useState("");
  const [notes, setNotes] = useState("");

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

      // Fetch positions
      const { data: posData } = await supabase
        .from("position_types")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .order("name");
      setPositions(posData || []);

      // Fetch cohorts
      console.log(
        "Fetching cohorts for association:",
        currentAssociation.association_id
      );
      const { data: cohortData, error: cohortError } = await supabase
        .from("cohorts")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .order("name");

      if (cohortError) {
        console.error("Error fetching cohorts:", cohortError);
      } else {
        console.log("Fetched cohorts:", cohortData);
      }

      setCohorts(cohortData || []);

      // Fetch previous levels
      const { data: levelData } = await supabase
        .from("previous_levels")
        .select("*")
        .eq("association_id", currentAssociation.association_id)
        .order("rank_order");
      setPreviousLevels(levelData || []);
    } catch (err) {
      console.error("Error fetching reference data:", err);
    } finally {
      setLoadingRefs(false);
    }
  }, [currentAssociation]);

  useEffect(() => {
    if (open && currentAssociation) {
      void fetchReferenceData();
    }
  }, [open, currentAssociation, fetchReferenceData, player]);

  useEffect(() => {
    if (open) {
      if (player) {
        // Edit mode - populate form with player data
        setFirstName(player.first_name);
        setLastName(player.last_name);
        setBirthDate(player.birth_date || "");
        setPhone(player.phone || "");
        setEmail1(player.email_1 || "");
        setEmail2(player.email_2 || "");
        setGender(player.gender || "");
        setPositionId(player.position_type_id);
        setCohortId(player.cohort_id ?? "null");
        setPreviousLevelId(player.previous_level_id ?? "null");
        setStatus(player.status as "active" | "withdrawn" | "other");
        setStatusReason(player.status_reason ?? "");
        setNotes(player.notes ?? "");
      } else {
        // Create mode - reset form
        setFirstName("");
        setLastName("");
        setBirthDate("");
        setPhone("");
        setEmail1("");
        setEmail2("");
        setGender("");
        setPositionId("");
        setCohortId("null");
        setPreviousLevelId("null");
        setStatus("active");
        setStatusReason("");
        setNotes("");
      }
    }
  }, [open, player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssociation) return;

    if (!player && !activeSeason) {
      setError("Cannot create player: No active season found.");
      return;
    }

    if (status === "other" && !statusReason.trim()) {
      setError("Status reason is required when status is 'Other'.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Use string splitting to avoid timezone issues with Date object
      const birthYear = birthDate ? parseInt(birthDate.split("-")[0]) : null;
      if (!birthYear) {
        setError("Birthdate is required.");
        setSubmitting(false);
        return;
      }

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate,
        birth_year: birthYear,
        phone: phone.trim() || null,
        email_1: email1.trim() || null,
        email_2: email2.trim() || null,
        gender: gender.trim() || null,
        position_type_id: positionId,
        cohort_id: cohortId === "null" ? null : cohortId,
        previous_level_id: previousLevelId === "null" ? null : previousLevelId,
        status,
        status_reason: status === "other" ? statusReason.trim() : null,
        notes: notes.trim() || null,
      };

      if (player) {
        // Update
        const { error } = await supabase
          .from("players")
          .update(payload)
          .eq("id", player.id);

        if (error) throw error;
        onSuccess("Player updated successfully.");
      } else {
        // Create
        if (!activeSeason) throw new Error("No active season");

        const { error } = await supabase.from("players").insert({
          association_id: currentAssociation.association_id,
          season_id: activeSeason.id,
          ...payload,
        });

        if (error) throw error;
        onSuccess("Player registered successfully.");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save player:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {player ? "Edit Player" : "Register Player"}
          </DialogTitle>
          <DialogDescription>
            {player
              ? "Update player details."
              : "Register a new player for the active season."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!player && !loadingRefs && !activeSeason && (
          <div className="rounded-md bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Warning: No active season found. You cannot register new players
            until a season is activated.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birthdate</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender (Optional)</Label>
              <Select
                value={gender}
                onValueChange={setGender}
                disabled={submitting}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email1">Email 1 (Optional)</Label>
              <Input
                id="email1"
                type="email"
                value={email1}
                onChange={(e) => setEmail1(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email2">Email 2 (Optional)</Label>
              <Input
                id="email2"
                type="email"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={positionId}
                onValueChange={setPositionId}
                disabled={submitting || loadingRefs}
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.length === 0 && (
                    <SelectItem value="no-positions" disabled>
                      No active positions found
                    </SelectItem>
                  )}
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cohort">Cohort (Optional)</Label>
              <Select
                value={cohortId}
                onValueChange={setCohortId}
                disabled={submitting || loadingRefs}
              >
                <SelectTrigger id="cohort">
                  <SelectValue placeholder="Select cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">None</SelectItem>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="previousLevel">Previous Level (Optional)</Label>
              <Select
                value={previousLevelId}
                onValueChange={setPreviousLevelId}
                disabled={submitting || loadingRefs}
              >
                <SelectTrigger id="previousLevel">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">None</SelectItem>
                  {previousLevels.length === 0 && (
                    <SelectItem value="no-levels" disabled>
                      No levels found
                    </SelectItem>
                  )}
                  {previousLevels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(val: "active" | "withdrawn" | "other") =>
                  setStatus(val)
                }
                disabled={submitting}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === "other" && (
            <div className="space-y-2">
              <Label htmlFor="statusReason">Reason (Required)</Label>
              <Input
                id="statusReason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Injury"
                required
                disabled={submitting}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              disabled={submitting}
            />
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
              disabled={submitting || (!player && !activeSeason)}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {player ? "Save Changes" : "Register Player"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
