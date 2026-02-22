import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  // Get a session first
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select("id, name")
    .limit(1)
    .single();

  if (sessionError) {
    console.error("Error fetching session:", sessionError);
    return;
  }

  console.log("Checking session:", sessionData.name);

  // Fetch player assignments for this session
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
            previous_level_id,
            previous_levels (
              id,
              name
            )
          )
        `,
    )
    .eq("session_id", sessionData.id)
    .limit(3);

  if (playerError) {
    console.error("Error fetching players:", playerError);
  } else {
    console.log("Player data sample:", JSON.stringify(playerData, null, 2));
  }
}

checkData();
