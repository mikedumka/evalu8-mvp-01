import type {} from "../types.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  createClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2.44.3";

type InvitePayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  systemRoles?: string[];
  associationId?: string;
  associationRoles?: string[];
};

interface JsonResponse {
  success: true;
  message: string;
  invitationStatus: "invited" | "existing";
  user: Record<string, unknown> | null;
}

const baseJsonHeaders = {
  "Content-Type": "application/json",
};

const UPSERT_MAX_ATTEMPTS = 5;
const UPSERT_RETRY_DELAY_MS = 400;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as const;
  const jsonHeaders = {
    ...corsHeaders,
    ...baseJsonHeaders,
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const supabaseUrl =
    Deno.env.get("EDGE_SUPABASE_URL") ??
    Deno.env.get("SUPABASE_URL") ??
    Deno.env.get("VITE_SUPABASE_URL");
  const anonKey =
    Deno.env.get("EDGE_SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("VITE_SUPABASE_ANON_KEY");
  const serviceRoleKey =
    Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Missing Supabase environment configuration");
    return new Response(
      JSON.stringify({ error: "Server is not configured correctly." }),
      { status: 500, headers: jsonHeaders }
    );
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const requestClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authorization },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await requestClient.auth.getUser();

  if (authError || !user) {
    console.error("Failed to resolve requesting user", authError);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  let payload: InvitePayload;
  try {
    payload = (await req.json()) as InvitePayload;
  } catch (error) {
    console.error("Failed to parse request payload", error);
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const email = (payload.email ?? "").trim();
  const firstName = (payload.firstName ?? "").trim();
  const lastName = (payload.lastName ?? "").trim();
  const systemRoles = Array.isArray(payload.systemRoles)
    ? payload.systemRoles.filter(
        (role): role is string =>
          typeof role === "string" && role.trim().length > 0
      )
    : [];
  const associationId =
    typeof payload.associationId === "string" ? payload.associationId : null;
  const associationRoles = Array.isArray(payload.associationRoles)
    ? payload.associationRoles.filter(
        (role): role is string =>
          typeof role === "string" && role.trim().length > 0
      )
    : [];

  if (!EMAIL_REGEX.test(email)) {
    return new Response(
      JSON.stringify({ error: "A valid email address is required." }),
      { status: 400, headers: jsonHeaders }
    );
  }

  if (!associationId) {
    return new Response(
      JSON.stringify({ error: "Association selection is required." }),
      { status: 400, headers: jsonHeaders }
    );
  }

  if (!associationRoles.length) {
    return new Response(
      JSON.stringify({ error: "Select at least one association role." }),
      { status: 400, headers: jsonHeaders }
    );
  }

  if (!lastName) {
    return new Response(JSON.stringify({ error: "Last name is required." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  if (!firstName) {
    return new Response(JSON.stringify({ error: "First name is required." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let invitationStatus: JsonResponse["invitationStatus"] = "existing";
  let authUser: User | null = null;

  try {
    const { data } = await adminClient.auth.admin.getUserByEmail(email);
    authUser = data?.user ?? null;
  } catch (error) {
    console.warn("getUserByEmail failed; treating as new user", error);
  }

  if (!authUser) {
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      }
    );

    if (error) {
      console.error("Failed to invite user", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "Unable to invite user." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    authUser = data?.user ?? null;
    invitationStatus = "invited";
  } else {
    try {
      await adminClient.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...(authUser.user_metadata ?? {}),
          first_name: firstName,
          last_name: lastName,
        },
      });
    } catch (error) {
      console.warn("Failed to update user metadata", error);
    }
  }

  if (!authUser) {
    return new Response(
      JSON.stringify({ error: "Unable to resolve invited user." }),
      { status: 500, headers: jsonHeaders }
    );
  }

  const fullName = `${lastName}, ${firstName}`;

  let upsertedUser: Record<string, unknown> | null = null;
  let upsertError: { message?: string } | null = null;

  for (let attempt = 1; attempt <= UPSERT_MAX_ATTEMPTS; attempt++) {
    const { data, error } = await requestClient.rpc("system_upsert_user", {
      p_email: email,
      p_full_name: fullName,
      p_system_roles: systemRoles,
      p_status: "active",
      p_association_id: associationId,
      p_association_roles: associationRoles,
    });

    if (!error) {
      upsertedUser = data as Record<string, unknown> | null;
      upsertError = null;
      break;
    }

    const errorMessage = error?.message?.toLowerCase() ?? "";
    const missingAuthUser =
      errorMessage.includes("auth.users") ||
      errorMessage.includes("was not found in auth");

    if (missingAuthUser && attempt < UPSERT_MAX_ATTEMPTS) {
      const delayMs = UPSERT_RETRY_DELAY_MS * attempt;
      console.warn(
        `system_upsert_user missing auth user (attempt ${attempt}). Retrying in ${delayMs}ms.`
      );
      await delay(delayMs);
      continue;
    }

    upsertError = error;
    break;
  }

  if (upsertError) {
    console.error("system_upsert_user failed", upsertError);
    const errorMessage =
      upsertError?.message ??
      "Unable to provision system access for the invited user.";
    const forbidden = errorMessage
      .toLowerCase()
      .includes("system administrator privileges");
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: upsertError?.details ?? null,
        hint: upsertError?.hint ?? null,
        code: upsertError?.code ?? null,
      }),
      { status: forbidden ? 403 : 400, headers: jsonHeaders }
    );
  }

  const message =
    invitationStatus === "invited"
      ? "Invitation sent and system access configured."
      : "User already exists; system access updated.";

  const response: JsonResponse = {
    success: true,
    message,
    invitationStatus,
    user: upsertedUser as Record<string, unknown> | null,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: jsonHeaders,
  });
});
