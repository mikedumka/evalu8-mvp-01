import { useEffect, useState, useMemo } from "react";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

interface StaffConfigurationProps {
  session: SessionRow;
}

type StaffUser = {
  user_id: string;
  roles: string[];
  user: {
    email: string;
    full_name: string | null;
  } | null;
};

export function StaffConfiguration({ session }: StaffConfigurationProps) {
  const { currentAssociation } = useAuth();
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [evaluatorIds, setEvaluatorIds] = useState<Set<string>>(new Set());
  const [intakeIds, setIntakeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (session && currentAssociation) {
      fetchData();
    }
  }, [session, currentAssociation]);

  const fetchData = async () => {
    if (!currentAssociation) return;
    setLoading(true);

    try {
      // 1. Fetch all active association users (staff)
      const { data: staffData, error: staffError } = await supabase
        .from("association_users")
        .select("user_id, roles, user:users(email, full_name)")
        .eq("association_id", currentAssociation.association_id)
        .eq("status", "active")
        .order("created_at");

      if (staffError) throw staffError;

      // 2. Fetch assigned Evaluators
      const { data: evaluatorsData, error: evaluatorsError } = await supabase
        .from("session_evaluators")
        .select("user_id")
        .eq("session_id", session.id);

      if (evaluatorsError) throw evaluatorsError;

      // 3. Fetch assigned Intake Personnel
      const { data: intakeData, error: intakeError } = await supabase
        .from("session_intake_personnel")
        .select("user_id")
        .eq("session_id", session.id);

      if (intakeError) throw intakeError;

      setStaffList((staffData as unknown as StaffUser[]) || []);
      setEvaluatorIds(new Set(evaluatorsData?.map((e) => e.user_id)));
      setIntakeIds(new Set(intakeData?.map((i) => i.user_id)));
    } catch (error) {
      console.error("Error fetching staff data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEvaluator = async (userId: string) => {
    if (!currentAssociation) return;
    setProcessingId(`eval-${userId}`);
    const isAssigned = evaluatorIds.has(userId);

    try {
      if (isAssigned) {
        const { error } = await supabase
          .from("session_evaluators")
          .delete()
          .eq("session_id", session.id)
          .eq("user_id", userId);
        if (error) throw error;
        setEvaluatorIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        const { error } = await supabase.from("session_evaluators").insert({
          association_id: currentAssociation.association_id,
          session_id: session.id,
          user_id: userId,
        });
        if (error) throw error;
        setEvaluatorIds((prev) => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error("Error toggling evaluator:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleIntake = async (userId: string) => {
    if (!currentAssociation) return;
    setProcessingId(`intake-${userId}`);
    const isAssigned = intakeIds.has(userId);

    try {
      if (isAssigned) {
        const { error } = await supabase
          .from("session_intake_personnel")
          .delete()
          .eq("session_id", session.id)
          .eq("user_id", userId);
        if (error) throw error;
        setIntakeIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from("session_intake_personnel")
          .insert({
            association_id: currentAssociation.association_id,
            session_id: session.id,
            user_id: userId,
          });
        if (error) throw error;
        setIntakeIds((prev) => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error("Error toggling intake:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex h-[calc(100vh-250px)] gap-6 p-1">
      {/* Evaluators Column */}
      <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b bg-muted/40 p-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Evaluators</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Assign staff responsible for scoring athletes.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No staff members found.
            </div>
          ) : (
            <div className="space-y-2">
              {staffList.map((staff) => (
                <div
                  key={staff.user_id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {getInitials(
                          staff.user?.full_name || staff.user?.email || null
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {staff.user?.full_name || "Unknown User"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {staff.user?.email}
                      </div>
                      <div className="mt-1 flex gap-1">
                        {staff.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="text-[10px] px-1 h-5"
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={evaluatorIds.has(staff.user_id)}
                    onCheckedChange={() => handleToggleEvaluator(staff.user_id)}
                    disabled={Boolean(processingId)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Intake Personnel Column */}
      <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b bg-muted/40 p-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Intake Personnel</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Assign staff responsible for check-ins and jerseys.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No staff members found.
            </div>
          ) : (
            <div className="space-y-2">
              {staffList.map((staff) => (
                <div
                  key={staff.user_id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {getInitials(
                          staff.user?.full_name || staff.user?.email || null
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {staff.user?.full_name || "Unknown User"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {staff.user?.email}
                      </div>
                      <div className="mt-1 flex gap-1">
                        {staff.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="text-[10px] px-1 h-5"
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={intakeIds.has(staff.user_id)}
                    onCheckedChange={() => handleToggleIntake(staff.user_id)}
                    disabled={Boolean(processingId)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
