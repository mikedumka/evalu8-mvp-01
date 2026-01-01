import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface InviteRequest {
  email: string;
  fullName: string;
  roles: string[];
  associationId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      data: { user: caller },
    } = await supabaseClient.auth.getUser();

    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, fullName, roles, associationId } =
      (await req.json()) as InviteRequest;

    if (!email || !associationId || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Verify caller is an Administrator for this association
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("association_users")
      .select("roles")
      .eq("user_id", caller.id)
      .eq("association_id", associationId)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("Membership check failed:", membershipError);
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Not a member of this association",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isAdmin = membership.roles.includes("Administrator");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Must be an Administrator" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Check if user already exists in public.users (more reliable than listing all auth users)
    const { data: existingPublicUser } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    let targetUserId = existingPublicUser?.id;
    let isNewUser = false;

    if (!targetUserId) {
      // 3. Invite new user
      // Note: If the user exists in Auth but not public.users, this might fail or return the existing user depending on config.
      // But for now, we assume sync is working.
      isNewUser = true;
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: `${
            Deno.env.get("SITE_URL") ?? "http://localhost:5173"
          }/auth/callback`,
        });

      if (inviteError) {
        // If error is "User already registered", we should try to find them in Auth to get their ID
        // But since we checked public.users and didn't find them, it means they are in Auth but not public.users.
        // This is an edge case (sync failure).
        throw inviteError;
      }
      targetUserId = inviteData.user.id;
    }

    if (!targetUserId) {
      throw new Error("Failed to find or create user");
    }

    // 4. Ensure user exists in public.users (sync might be async, so we force it here if needed,
    // or rely on triggers. For safety, we can upsert.)
    const { error: profileError } = await supabaseAdmin.from("users").upsert({
      id: targetUserId,
      email: email,
      full_name: fullName || undefined,
      auth_provider: "email",
    });

    if (profileError) {
      console.error("Error syncing public profile:", profileError);
      // Continue anyway, trigger might handle it
    }

    // 5. Add/Update Association Membership
    const { error: associationError } = await supabaseAdmin
      .from("association_users")
      .upsert({
        association_id: associationId,
        user_id: targetUserId,
        roles: roles,
        status: "active",
        invited_at: new Date().toISOString(),
        invited_by: caller.id,
        invitation_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 days
      });

    if (associationError) {
      throw associationError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: targetUserId,
        isNewUser,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
