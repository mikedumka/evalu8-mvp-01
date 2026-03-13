import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { CohortSwitcher } from "@/components/cohorts/CohortSwitcher";
import { useToast } from "@/hooks/use-toast";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shirt } from "lucide-react";

type AllowedColor = {
  name: string;
  hex: string;
};

type SessionWithMeta = {
  id: string;
  name: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  location?: { name: string } | null;
  wave?: {
    wave_number: number | null;
    custom_wave_name: string | null;
    teams_per_session: number | null;
  } | null;
};

type PlayerSessionRow = {
  player_id: string;
  session_id: string;
  team_number: number | null;
  checked_in: boolean;
  no_show: boolean;
  jersey_number: number | null;
  jersey_color: string | null;
  created_at?: string;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    position_type?: {
      name: string;
    } | null;
  } | null;
};

type TeamPlayerGroup = {
  teamNumber: number;
  players: PlayerSessionRow[];
};

type CheckInDebugPayload = {
  ts: string;
  action: string;
  details: Record<string, unknown>;
};

const ALLOWED_COLORS: AllowedColor[] = [
  { name: "Aqua", hex: "#00FFFF" },
  { name: "Black", hex: "#000000" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Fuchsia", hex: "#FF00FF" },
  { name: "Gray", hex: "#808080" },
  { name: "Green", hex: "#008000" },
  { name: "Lime", hex: "#00FF00" },
  { name: "Maroon", hex: "#800000" },
  { name: "Navy", hex: "#000080" },
  { name: "Olive", hex: "#808000" },
  { name: "Purple", hex: "#800080" },
  { name: "Red", hex: "#FF0000" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Teal", hex: "#008080" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Orange", hex: "#FFA500" },
];

const colorNameToHex = new Map(ALLOWED_COLORS.map((c) => [c.name, c.hex]));

export default function CheckInPage() {
  const { currentAssociation } = useAuth();
  const { toast } = useToast();

  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [sessions, setSessions] = useState<SessionWithMeta[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [playerSessions, setPlayerSessions] = useState<PlayerSessionRow[]>([]);

  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingPlayer, setSavingPlayer] = useState(false);

  const [playerEditOpen, setPlayerEditOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSessionRow | null>(
    null,
  );
  const [editColor, setEditColor] = useState<string>("");
  const [editNumber, setEditNumber] = useState<string>("");
  const [editNoShow, setEditNoShow] = useState(false);
  const [numberError, setNumberError] = useState<string>("");
  const [operationError, setOperationError] = useState<string>("");
  const [hasUpdatePermission, setHasUpdatePermission] = useState(true);
  const [permissionChecking, setPermissionChecking] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  // Team-level default color (locked after first jersey color assignment for that team)
  const [teamDefaults, setTeamDefaults] = useState<Record<number, string>>({});

  const handleCohortChange = (cohortId: string) => {
    // Reset dependent state immediately to avoid stale-board flash during cohort switch.
    setSelectedSessionId("");
    setSessions([]);
    setPlayerSessions([]);
    setTeamDefaults({});
    setSelectedCohortId(cohortId);
  };

  const fetchSessions = useCallback(async () => {
    if (!selectedCohortId || !currentAssociation?.association_id) return;
    setLoadingSessions(true);

    const { data, error } = await supabase
      .from("sessions")
      .select(
        `
          id,
          name,
          scheduled_date,
          scheduled_time,
          status,
          location:locations(name),
          wave:waves(wave_number, custom_wave_name, teams_per_session)
        `,
      )
      .eq("association_id", currentAssociation.association_id)
      .eq("cohort_id", selectedCohortId)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (error) {
      toast({
        title: "Error loading sessions",
        description: error.message,
        variant: "destructive",
      });
      setLoadingSessions(false);
      return;
    }

    setSessions((data as SessionWithMeta[]) || []);
    setLoadingSessions(false);
  }, [currentAssociation?.association_id, selectedCohortId, toast]);

  const logCheckInDebug = useCallback(
    (action: string, details: Record<string, unknown>) => {
      const payload: CheckInDebugPayload = {
        ts: new Date().toISOString(),
        action,
        details,
      };

      console.info("[CheckInDebug]", payload);

      try {
        const key = "evalu8_checkin_debug_log";
        const raw = localStorage.getItem(key);
        const existing = raw ? (JSON.parse(raw) as CheckInDebugPayload[]) : [];
        const next = [...existing, payload].slice(-250);
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // non-blocking diagnostics only
      }
    },
    [],
  );

  const evaluateUpdatePermission = useCallback(
    async (sessionId: string) => {
      setPermissionChecking(true);
      setPermissionMessage("");

      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;

        if (!userId || !currentAssociation?.association_id) {
          setHasUpdatePermission(false);
          setPermissionMessage("Unable to determine your user context.");
          logCheckInDebug("permission_check_failed_no_user", {
            sessionId,
            userId,
            associationId: currentAssociation?.association_id,
          });
          return;
        }

        const [adminMembershipResult, intakeAssignmentResult] =
          await Promise.all([
            supabase
              .from("association_users")
              .select("roles, status")
              .eq("association_id", currentAssociation.association_id)
              .eq("user_id", userId)
              .eq("status", "active")
              .maybeSingle(),
            supabase
              .from("session_intake_personnel")
              .select("user_id")
              .eq("session_id", sessionId)
              .eq("user_id", userId)
              .maybeSingle(),
          ]);

        const roles = adminMembershipResult.data?.roles || [];
        const isAdmin =
          roles.includes("Administrator") ||
          roles.includes("System Administrator");
        const isAssignedIntake = !!intakeAssignmentResult.data?.user_id;
        const allowed = isAdmin || isAssignedIntake;

        setHasUpdatePermission(allowed);
        if (!allowed) {
          setPermissionMessage(
            "You do not have update permission for this session. Ask an Administrator to assign you as Intake Personnel.",
          );
        }

        logCheckInDebug("permission_check_result", {
          sessionId,
          userId,
          isAdmin,
          isAssignedIntake,
          allowed,
          roles,
          adminMembershipError: adminMembershipResult.error?.message,
          intakeAssignmentError: intakeAssignmentResult.error?.message,
        });
      } catch (error: unknown) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: unknown }).message || "")
            : "Unknown error";
        // Fail open so we don't block legitimate updates due diagnostics failure.
        setHasUpdatePermission(true);
        setPermissionMessage("");
        logCheckInDebug("permission_check_exception", { sessionId, message });
      } finally {
        setPermissionChecking(false);
      }
    },
    [currentAssociation?.association_id, logCheckInDebug],
  );

  const fetchRoster = useCallback(
    async (sessionId: string) => {
      setLoadingRoster(true);

      const { data, error } = await supabase
        .from("player_sessions")
        .select(
          `
          player_id,
          session_id,
          team_number,
          checked_in,
          no_show,
          jersey_number,
          jersey_color,
          created_at,
          player:players!player_id(
            id,
            first_name,
            last_name,
            position_type:position_types!position_type_id(name)
          )
        `,
        )
        .eq("session_id", sessionId)
        .order("team_number", { ascending: true });

      if (error) {
        toast({
          title: "Error loading session roster",
          description: error.message,
          variant: "destructive",
        });
        setLoadingRoster(false);
        return;
      }

      const rows = (data as PlayerSessionRow[]) || [];
      setPlayerSessions(rows);

      // Derive team defaults from first checked-in player per team
      const defaults: Record<number, string> = {};
      const byTeam = new Map<number, PlayerSessionRow[]>();
      rows.forEach((row) => {
        if (!row.team_number) return;
        if (!byTeam.has(row.team_number)) byTeam.set(row.team_number, []);
        byTeam.get(row.team_number)!.push(row);
      });

      byTeam.forEach((teamRows, teamNumber) => {
        const checkedRows = teamRows
          .filter((r) => r.checked_in && !!r.jersey_color)
          .sort((a, b) =>
            (a.created_at || "").localeCompare(b.created_at || ""),
          );

        if (checkedRows.length > 0 && checkedRows[0].jersey_color) {
          defaults[teamNumber] = checkedRows[0].jersey_color;
        }
      });

      setTeamDefaults(defaults);
      setLoadingRoster(false);
    },
    [toast],
  );

  useEffect(() => {
    setSelectedSessionId("");
    setSessions([]);
    setPlayerSessions([]);

    if (!selectedCohortId || !currentAssociation?.association_id) return;
    void fetchSessions();
  }, [selectedCohortId, currentAssociation?.association_id, fetchSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setPlayerSessions([]);
      setTeamDefaults({});
      return;
    }
    void fetchRoster(selectedSessionId);
  }, [selectedSessionId, fetchRoster]);

  const selectedSession =
    sessions.find((s) => s.id === selectedSessionId) || null;

  const teamNumbers = useMemo(() => {
    if (!selectedSession) return [] as number[];

    const fromAssignments = Array.from(
      new Set(
        playerSessions.map((p) => p.team_number).filter(Boolean) as number[],
      ),
    ).sort((a, b) => a - b);

    const teamsPerSession = selectedSession.wave?.teams_per_session || 0;
    if (teamsPerSession > 0) {
      return Array.from({ length: teamsPerSession }, (_, i) => i + 1);
    }

    return fromAssignments;
  }, [playerSessions, selectedSession]);

  const teamColorOwner = useMemo(() => {
    const owner = new Map<string, number>();

    // Persisted jersey colors own color-space.
    // Team defaults are UI hints and should not reserve colors globally
    // until at least one player's jersey is actually assigned.
    for (const row of playerSessions) {
      if (!row.team_number || !row.jersey_color) continue;
      if (!owner.has(row.jersey_color))
        owner.set(row.jersey_color, row.team_number);
    }

    return owner;
  }, [playerSessions]);

  const teamLocked = useMemo(() => {
    const locked: Record<number, boolean> = {};
    teamNumbers.forEach((teamNumber) => {
      locked[teamNumber] = playerSessions.some(
        (p) => p.team_number === teamNumber && !!p.jersey_color,
      );
    });
    return locked;
  }, [playerSessions, teamNumbers]);

  const groupedByTeam = useMemo<TeamPlayerGroup[]>(() => {
    return teamNumbers.map((teamNumber) => {
      const teamPlayers = playerSessions
        .filter((p) => p.team_number === teamNumber)
        .sort((a, b) => {
          const posA = a.player?.position_type?.name || "";
          const posB = b.player?.position_type?.name || "";
          const posCmp = posA.localeCompare(posB);
          if (posCmp !== 0) return posCmp;

          const lastCmp = (a.player?.last_name || "").localeCompare(
            b.player?.last_name || "",
          );
          if (lastCmp !== 0) return lastCmp;

          return (a.player?.first_name || "").localeCompare(
            b.player?.first_name || "",
          );
        });

      return {
        teamNumber,
        players: teamPlayers,
      };
    });
  }, [playerSessions, teamNumbers]);

  const getWaveLabel = (session: SessionWithMeta) => {
    const wave = session.wave;
    if (!wave) return "No wave";
    const base =
      wave.wave_number !== null ? `Wave ${wave.wave_number}` : "Custom Wave";
    return wave.custom_wave_name ? `${base} (${wave.custom_wave_name})` : base;
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const h = parseInt(hours, 10);
      const suffix = h >= 12 ? "PM" : "AM";
      const formattedH = h % 12 || 12;
      return `${formattedH}:${minutes} ${suffix}`;
    } catch {
      return timeString;
    }
  };

  const getTextColorForHex = (hex: string) => {
    const normalized = hex.replace("#", "");
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness >= 140 ? "#000000" : "#FFFFFF";
  };

  const openPlayerModal = (row: PlayerSessionRow) => {
    const teamNumber = row.team_number ?? 0;
    const teamDefault = teamDefaults[teamNumber] || "";
    setSelectedPlayer(row);
    setEditNoShow(row.no_show);
    setEditColor(row.jersey_color || teamDefault || "");
    setEditNumber(row.jersey_number?.toString() || "");
    setNumberError("");
    setOperationError("");
    setPermissionMessage("");
    setHasUpdatePermission(true);
    setPermissionChecking(true);
    logCheckInDebug("open_player_modal", {
      sessionId: row.session_id,
      playerId: row.player_id,
      teamNumber: row.team_number,
      checkedIn: row.checked_in,
      noShow: row.no_show,
      jerseyColor: row.jersey_color,
      jerseyNumber: row.jersey_number,
    });
    void evaluateUpdatePermission(row.session_id);
    setPlayerEditOpen(true);
  };

  const selectedPlayerHasAssignment =
    !!selectedPlayer &&
    (selectedPlayer.jersey_number !== null ||
      !!selectedPlayer.jersey_color ||
      selectedPlayer.checked_in ||
      selectedPlayer.no_show);
  const canClearSelectedPlayerAssignment =
    selectedPlayerHasAssignment && !savingPlayer;

  const selectedColorOwner = editColor
    ? teamColorOwner.get(editColor)
    : undefined;
  const selectedPlayerTeamNumber = selectedPlayer?.team_number ?? 0;
  const isSelectedColorBlocked =
    !!selectedColorOwner && selectedColorOwner !== selectedPlayerTeamNumber;

  const updateLocalPlayerSession = (
    sessionId: string,
    playerId: string,
    updates: Partial<
      Pick<
        PlayerSessionRow,
        "checked_in" | "no_show" | "jersey_color" | "jersey_number"
      >
    >,
  ) => {
    setPlayerSessions((prev) =>
      prev.map((row) =>
        row.player_id === playerId && row.session_id === sessionId
          ? {
              ...row,
              ...updates,
            }
          : row,
      ),
    );
  };

  const savePlayerCheckIn = async () => {
    if (!selectedPlayer || !selectedSessionId) return;
    const targetSessionId = selectedPlayer.session_id;
    const targetPlayerId = selectedPlayer.player_id;

    setNumberError("");
    setOperationError("");
    logCheckInDebug("save_attempt", {
      sessionId: targetSessionId,
      playerId: targetPlayerId,
      teamNumber: selectedPlayer.team_number,
      editColor,
      editNumber,
      editNoShow,
    });

    if (!selectedPlayer.team_number) {
      toast({
        title: "Player has no team",
        description: "Cannot check in a player without a team assignment.",
        variant: "destructive",
      });
      setOperationError("Player has no team assignment for this session.");
      logCheckInDebug("save_blocked_no_team", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
      });
      return;
    }

    if (!hasUpdatePermission) {
      setOperationError(
        permissionMessage ||
          "You do not have permission to update this session assignment.",
      );
      logCheckInDebug("save_blocked_no_permission", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
      });
      return;
    }

    const teamNumber = selectedPlayer.team_number;

    setSavingPlayer(true);
    try {
      if (editNoShow) {
        const { data: preRow } = await supabase
          .from("player_sessions")
          .select("checked_in, no_show, jersey_color, jersey_number")
          .eq("session_id", targetSessionId)
          .eq("player_id", targetPlayerId)
          .maybeSingle();

        logCheckInDebug("save_no_show_pre_state", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          preRow,
        });

        const { error } = await supabase
          .from("player_sessions")
          .update({
            no_show: true,
            checked_in: false,
            jersey_color: null,
            jersey_number: null,
          })
          .eq("session_id", targetSessionId)
          .eq("player_id", targetPlayerId);

        if (error) {
          setOperationError(error.message || "Unable to save no-show state.");
          logCheckInDebug("save_no_show_db_error", {
            sessionId: targetSessionId,
            playerId: targetPlayerId,
            error,
          });
          toast({
            title: "Save failed",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        const { data: postRow } = await supabase
          .from("player_sessions")
          .select("checked_in, no_show, jersey_color, jersey_number")
          .eq("session_id", targetSessionId)
          .eq("player_id", targetPlayerId)
          .maybeSingle();

        const verifiedNoShow =
          !!postRow && postRow.no_show === true && postRow.checked_in === false;

        if (!verifiedNoShow) {
          setOperationError(
            "No-show state was not persisted. Please retry and report this case.",
          );
          logCheckInDebug("save_no_show_verify_failed", {
            sessionId: targetSessionId,
            playerId: targetPlayerId,
            preRow,
            postRow,
          });
          toast({
            title: "Save failed",
            description:
              "No player assignment was updated. Please verify permissions and session assignment.",
            variant: "destructive",
          });
          return;
        }

        logCheckInDebug("save_no_show_success", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          preRow,
          postRow,
        });

        updateLocalPlayerSession(targetSessionId, targetPlayerId, {
          no_show: true,
          checked_in: false,
          jersey_color: null,
          jersey_number: null,
        });
        toast({ title: "Player marked no-show" });
        setPlayerEditOpen(false);
        await fetchRoster(targetSessionId);
        return;
      }

      const parsedNumber = Number(editNumber);
      if (!editColor) {
        setOperationError("Jersey color is required.");
        logCheckInDebug("save_blocked_no_color", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
        });
        toast({
          title: "Jersey color required",
          description: "Please select a jersey color.",
          variant: "destructive",
        });
        return;
      }

      if (
        !Number.isInteger(parsedNumber) ||
        parsedNumber < 0 ||
        parsedNumber > 999
      ) {
        setNumberError("Jersey number must be between 0 and 999.");
        setOperationError("Jersey number must be between 0 and 999.");
        logCheckInDebug("save_blocked_invalid_number", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          editNumber,
        });
        toast({
          title: "Invalid jersey number",
          description:
            "Jersey number must be a whole number between 0 and 999.",
          variant: "destructive",
        });
        return;
      }

      const existingColorOwner = teamColorOwner.get(editColor);
      if (existingColorOwner && existingColorOwner !== teamNumber) {
        setOperationError(
          `${editColor} is already assigned to Team ${existingColorOwner}.`,
        );
        logCheckInDebug("save_blocked_color_owned", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          selectedColor: editColor,
          ownerTeam: existingColorOwner,
          playerTeam: teamNumber,
        });
        toast({
          title: "Color already used by another team",
          description: `${editColor} is already assigned to Team ${existingColorOwner} in this session.`,
          variant: "destructive",
        });
        return;
      }

      const duplicateNumber = playerSessions.find(
        (p) =>
          p.session_id === targetSessionId &&
          p.team_number === teamNumber &&
          p.player_id !== targetPlayerId &&
          p.jersey_number === parsedNumber,
      );

      if (duplicateNumber) {
        setNumberError(
          `Number ${parsedNumber} is already taken on Team ${teamNumber}. Please select a different number.`,
        );
        setOperationError(
          `Number ${parsedNumber} is already taken on Team ${teamNumber}.`,
        );
        logCheckInDebug("save_blocked_duplicate_number", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          teamNumber,
          jerseyNumber: parsedNumber,
          conflictingPlayerId: duplicateNumber.player_id,
        });
        toast({
          title: "Duplicate jersey number",
          description: `Jersey number ${parsedNumber} is already assigned in Team ${teamNumber}.`,
          variant: "destructive",
        });
        return;
      }

      const { data: preRow } = await supabase
        .from("player_sessions")
        .select("checked_in, no_show, jersey_color, jersey_number")
        .eq("session_id", targetSessionId)
        .eq("player_id", targetPlayerId)
        .maybeSingle();

      logCheckInDebug("save_pre_state", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
        preRow,
      });

      const { error } = await supabase
        .from("player_sessions")
        .update({
          checked_in: true,
          no_show: false,
          jersey_color: editColor,
          jersey_number: parsedNumber,
        })
        .eq("session_id", targetSessionId)
        .eq("player_id", targetPlayerId);

      if (error) {
        setOperationError(error.message || "Unable to save jersey assignment.");
        logCheckInDebug("save_db_error", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          error,
        });
        toast({
          title: "Save failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const { data: postRow } = await supabase
        .from("player_sessions")
        .select("checked_in, no_show, jersey_color, jersey_number")
        .eq("session_id", targetSessionId)
        .eq("player_id", targetPlayerId)
        .maybeSingle();

      const verifiedSave =
        !!postRow &&
        postRow.checked_in === true &&
        postRow.no_show === false &&
        postRow.jersey_color === editColor &&
        postRow.jersey_number === parsedNumber;

      if (!verifiedSave) {
        setOperationError("Jersey assignment was not persisted. Please retry.");
        logCheckInDebug("save_verify_failed", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          teamNumber,
          editColor,
          parsedNumber,
          preRow,
          postRow,
        });
        toast({
          title: "Save failed",
          description:
            "No player assignment was updated. Please verify permissions and session assignment.",
          variant: "destructive",
        });
        return;
      }

      logCheckInDebug("save_success", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
        teamNumber,
        editColor,
        parsedNumber,
        preRow,
        postRow,
      });

      updateLocalPlayerSession(targetSessionId, targetPlayerId, {
        checked_in: true,
        no_show: false,
        jersey_color: editColor,
        jersey_number: parsedNumber,
      });
      setNumberError("");

      // Set default team color on first jersey color assignment.
      if (!teamDefaults[teamNumber]) {
        setTeamDefaults((prev) => ({ ...prev, [teamNumber]: editColor }));
      }

      toast({ title: "Player checked in" });
      setPlayerEditOpen(false);
      await fetchRoster(targetSessionId);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message || "")
          : "Unknown error";
      setOperationError(message || "Unexpected error during save.");
      logCheckInDebug("save_exception", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
        message,
      });
      toast({
        title: "Save failed",
        description: message || "Unexpected error during save.",
        variant: "destructive",
      });
    } finally {
      setSavingPlayer(false);
    }
  };

  const clearPlayerJerseyAssignment = async () => {
    if (!selectedPlayer || !selectedSessionId) return;
    const targetSessionId = selectedPlayer.session_id;
    const targetPlayerId = selectedPlayer.player_id;

    setOperationError("");
    logCheckInDebug("clear_attempt", {
      sessionId: targetSessionId,
      playerId: targetPlayerId,
      teamNumber: selectedPlayer.team_number,
    });

    if (!hasUpdatePermission) {
      setOperationError(
        permissionMessage ||
          "You do not have permission to update this session assignment.",
      );
      logCheckInDebug("clear_blocked_no_permission", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
      });
      return;
    }
    const targetTeamNumber = selectedPlayer.team_number;

    setSavingPlayer(true);
    try {
      const { data: preRow } = await supabase
        .from("player_sessions")
        .select("checked_in, no_show, jersey_color, jersey_number")
        .eq("session_id", targetSessionId)
        .eq("player_id", targetPlayerId)
        .maybeSingle();

      logCheckInDebug("clear_pre_state", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
        preRow,
      });

      const { error } = await supabase
        .from("player_sessions")
        .update({
          checked_in: false,
          no_show: false,
          jersey_color: null,
          jersey_number: null,
        })
        .eq("session_id", targetSessionId)
        .eq("player_id", targetPlayerId);

      if (error) {
        setOperationError(
          error.message || "Unable to clear jersey assignment.",
        );
        logCheckInDebug("clear_db_error", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          error,
        });
        toast({
          title: "Clear failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const { data: postRow } = await supabase
        .from("player_sessions")
        .select("checked_in, no_show, jersey_color, jersey_number")
        .eq("session_id", targetSessionId)
        .eq("player_id", targetPlayerId)
        .maybeSingle();

      const verifiedClear =
        !!postRow &&
        postRow.checked_in === false &&
        postRow.no_show === false &&
        postRow.jersey_color === null &&
        postRow.jersey_number === null;

      if (!verifiedClear) {
        setOperationError(
          "No rows were cleared. Please retry and report this if it persists.",
        );
        logCheckInDebug("clear_verify_failed", {
          sessionId: targetSessionId,
          playerId: targetPlayerId,
          preRow,
          postRow,
        });
        toast({
          title: "Clear failed",
          description:
            "No player assignment was cleared. Please verify permissions and session assignment.",
          variant: "destructive",
        });
        return;
      }

      // Optimistic local update so UI reflects clear immediately.
      updateLocalPlayerSession(targetSessionId, targetPlayerId, {
        checked_in: false,
        no_show: false,
        jersey_color: null,
        jersey_number: null,
      });

      if (targetTeamNumber) {
        setTeamDefaults((prev) => {
          const hasRemainingColorInTeam = playerSessions.some(
            (row) =>
              row.session_id === targetSessionId &&
              row.team_number === targetTeamNumber &&
              row.player_id !== targetPlayerId &&
              !!row.jersey_color,
          );

          if (hasRemainingColorInTeam) return prev;

          const next = { ...prev };
          delete next[targetTeamNumber];
          return next;
        });
      }

      setSelectedPlayer((prev) =>
        prev
          ? {
              ...prev,
              checked_in: false,
              no_show: false,
              jersey_color: null,
              jersey_number: null,
            }
          : prev,
      );

      toast({ title: "Jersey assignment cleared" });
      logCheckInDebug("clear_success", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
        teamNumber: targetTeamNumber,
        preRow,
        postRow,
      });
      setNumberError("");
      setPlayerEditOpen(false);
      await fetchRoster(targetSessionId);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message || "")
          : "Unknown error";
      setOperationError(message || "Unexpected error during clear.");
      logCheckInDebug("clear_exception", {
        sessionId: targetSessionId,
        playerId: targetPlayerId,
        message,
      });
      toast({
        title: "Clear failed",
        description: message || "Unexpected error during clear.",
        variant: "destructive",
      });
    } finally {
      setSavingPlayer(false);
    }
  };

  const sessionInfoLine = (session: SessionWithMeta) => {
    const date = new Date(session.scheduled_date).toLocaleDateString();
    const time = formatTime(session.scheduled_time);
    const location = session.location?.name || "No location";
    return `${session.name} • ${date} • ${time} • ${location}`;
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Check-in</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Session Intake & Check-In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[320px_1fr]">
              <CohortSwitcher
                selectedCohortId={selectedCohortId}
                onCohortChange={handleCohortChange}
              />

              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
                disabled={!selectedCohortId || loadingSessions}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {sessionInfoLine(session)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingSessions ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sessions...
              </div>
            ) : null}

            {!loadingSessions && selectedCohortId && sessions.length === 0 ? (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No sessions are scheduled for this Cohort yet. Create or import
                sessions from Scheduling to begin Check-in.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Check-in Board</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedSession ? (
                <span>
                  {selectedSession.name} •{" "}
                  {new Date(
                    selectedSession.scheduled_date,
                  ).toLocaleDateString()}{" "}
                  • {formatTime(selectedSession.scheduled_time)} •{" "}
                  {selectedSession.location?.name || "No location"} •{" "}
                  {getWaveLabel(selectedSession)}
                </span>
              ) : selectedCohortId && sessions.length === 0 ? (
                "No sessions available for the selected Cohort yet."
              ) : selectedCohortId ? (
                "Select a session to display teams and player check-in."
              ) : (
                "Select a cohort and session to begin check-in."
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedSession && selectedCohortId && sessions.length === 0 ? (
              <div className="rounded-md border border-dashed py-10 px-4 text-center">
                <div className="text-sm font-medium">No sessions scheduled</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Once sessions are imported or created for this Cohort, team
                  check-in will appear here.
                </div>
              </div>
            ) : !selectedSession && selectedCohortId ? (
              <div className="rounded-md border border-dashed py-10 px-4 text-center">
                <div className="text-sm font-medium">Select a session</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Choose a session above to display teams and player check-in.
                </div>
              </div>
            ) : !selectedSession ? null : loadingRoster ? (
              <div className="py-8 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading roster...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(teamNumbers.length, 1)}, minmax(320px, 1fr))`,
                  }}
                >
                  {groupedByTeam.map((team) => {
                    const defaultColor = teamDefaults[team.teamNumber] || "";
                    return (
                      <Card key={team.teamNumber}>
                        <CardHeader className="space-y-3">
                          <CardTitle className="text-base">
                            Team {team.teamNumber}
                          </CardTitle>

                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">
                              Team jersey color
                            </div>
                            <Select
                              value={defaultColor}
                              onValueChange={(value) => {
                                const owner = teamColorOwner.get(value);
                                if (owner && owner !== team.teamNumber) {
                                  toast({
                                    title: "Color already owned",
                                    description: `${value} is already assigned to Team ${owner}.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setTeamDefaults((prev) => ({
                                  ...prev,
                                  [team.teamNumber]: value,
                                }));
                              }}
                              disabled={teamLocked[team.teamNumber]}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select team color" />
                              </SelectTrigger>
                              <SelectContent>
                                {ALLOWED_COLORS.map((color) => {
                                  const owner = teamColorOwner.get(color.name);
                                  const blocked =
                                    !!owner && owner !== team.teamNumber;
                                  return (
                                    <SelectItem
                                      key={color.name}
                                      value={color.name}
                                      disabled={blocked}
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <span
                                          className="h-3 w-3 rounded-sm border border-slate-600"
                                          style={{ backgroundColor: color.hex }}
                                        />
                                        <span>
                                          {color.name}
                                          {owner ? ` (Team ${owner})` : ""}
                                        </span>
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {teamLocked[team.teamNumber] ? (
                              <div className="text-xs text-muted-foreground">
                                Team color locked after first jersey color
                                assignment.
                              </div>
                            ) : null}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-2">
                          {team.players.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-8 text-center">
                              No players assigned.
                            </div>
                          ) : (
                            team.players.map((p) => {
                              const bg = p.jersey_color
                                ? colorNameToHex.get(p.jersey_color) ||
                                  "#FFFFFF"
                                : "#FFFFFF";
                              const fg = getTextColorForHex(bg);
                              const displayNumber =
                                p.jersey_number !== null &&
                                p.jersey_number !== undefined
                                  ? p.jersey_number.toString()
                                  : "";

                              const positionLabel =
                                p.player?.position_type?.name || "Unassigned";
                              const nameLabel = `${p.player?.last_name || ""}, ${p.player?.first_name || ""}`;

                              return (
                                <button
                                  type="button"
                                  key={`${p.session_id}-${p.player_id}`}
                                  className={`w-full rounded-md border p-2 text-left ${
                                    p.no_show
                                      ? "bg-red-50 border-red-200 hover:bg-red-100/70"
                                      : "hover:bg-muted/30"
                                  }`}
                                  onClick={() => openPlayerModal(p)}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div
                                        className={`h-10 w-16 rounded-md border flex items-center justify-center font-bold tracking-wide shrink-0 ${
                                          p.no_show
                                            ? "border-red-300 bg-white text-red-600"
                                            : ""
                                        }`}
                                        style={{
                                          backgroundColor: p.no_show
                                            ? undefined
                                            : bg,
                                          color: p.no_show ? undefined : fg,
                                        }}
                                      >
                                        {p.no_show ? "—" : displayNumber}
                                      </div>

                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">
                                          {nameLabel}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {positionLabel}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 pt-1">
                                      {p.no_show ? (
                                        <Badge
                                          variant="outline"
                                          className="text-destructive border-destructive/40"
                                        >
                                          No-show
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={playerEditOpen}
        onOpenChange={(open) => {
          setPlayerEditOpen(open);
          if (!open) {
            setSavingPlayer(false);
            setNumberError("");
            setOperationError("");
            logCheckInDebug("modal_closed", {
              sessionId: selectedSessionId,
              playerId: selectedPlayer?.player_id,
            });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Player Check-in</DialogTitle>
            <DialogDescription>
              {selectedPlayer?.player
                ? `${selectedPlayer.player.first_name} ${selectedPlayer.player.last_name}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {operationError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                {operationError}
              </div>
            ) : null}

            {permissionChecking ? (
              <div className="rounded-md border border-muted bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
                Checking update permission...
              </div>
            ) : null}

            {!permissionChecking && permissionMessage ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                {permissionMessage}
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editNoShow}
                onCheckedChange={(checked) => setEditNoShow(Boolean(checked))}
                disabled={
                  savingPlayer || permissionChecking || !hasUpdatePermission
                }
              />
              <span>Mark as No-show</span>
            </label>

            <div className="space-y-2">
              <div className="text-sm font-medium">Jersey Color</div>
              <Select
                value={editColor}
                onValueChange={setEditColor}
                disabled={
                  savingPlayer ||
                  editNoShow ||
                  permissionChecking ||
                  !hasUpdatePermission
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jersey color" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_COLORS.map((color) => {
                    const owner = teamColorOwner.get(color.name);
                    const thisTeam = selectedPlayer?.team_number || 0;
                    const blocked = !!owner && owner !== thisTeam;
                    return (
                      <SelectItem
                        key={color.name}
                        value={color.name}
                        disabled={blocked}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-sm border border-slate-600"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>
                            {color.name}
                            {owner ? ` (Team ${owner})` : ""}
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {editColor ? (
                <div
                  className={`text-xs ${
                    isSelectedColorBlocked
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {isSelectedColorBlocked
                    ? `${editColor} is owned by Team ${selectedColorOwner}. Choose another color.`
                    : selectedColorOwner
                      ? `${editColor} is assigned to Team ${selectedColorOwner}.`
                      : `${editColor} is available.`}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Jersey Number (0-999)</div>
              <Input
                value={editNumber}
                onChange={(e) => {
                  setEditNumber(
                    e.target.value.replace(/[^0-9]/g, "").slice(0, 3),
                  );
                  if (numberError) setNumberError("");
                }}
                placeholder="e.g. 7"
                disabled={
                  savingPlayer ||
                  editNoShow ||
                  permissionChecking ||
                  !hasUpdatePermission
                }
              />
              {numberError ? (
                <div className="text-xs text-destructive">{numberError}</div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlayerEditOpen(false)}
              disabled={savingPlayer}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={clearPlayerJerseyAssignment}
              disabled={
                !canClearSelectedPlayerAssignment ||
                permissionChecking ||
                !hasUpdatePermission
              }
              className="sm:mr-auto"
            >
              Clear Jersey Assignment
            </Button>
            <Button
              onClick={savePlayerCheckIn}
              disabled={
                savingPlayer || permissionChecking || !hasUpdatePermission
              }
            >
              {savingPlayer ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shirt className="h-4 w-4" /> Save
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
