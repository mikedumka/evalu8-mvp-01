import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking data...");

  // 1. Get a Cohort
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name")
    .limit(1);
  if (!cohorts || cohorts.length === 0) {
    console.log("No cohorts found");
    return;
  }
  const cohortId = cohorts[0].id; // Use the first cohort for testing
  //   const cohortId = "78652613-7d84-486d-ab14-41913f021703"; // Specific from previous logs if needed
  console.log(`Using Cohort: ${cohorts[0].name} (${cohortId})`);

  // 2. Check Sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name")
    .eq("cohort_id", cohortId);
  console.log(`Sessions found: ${sessions?.length}`);

  if (!sessions || sessions.length === 0) return;
  const sessionIds = sessions.map((s) => s.id);

  // 3. Check Session Evaluators
  const { data: evaluators } = await supabase
    .from("session_evaluators")
    .select("*")
    .in("session_id", sessionIds);
  console.log(`Evaluators found: ${evaluators?.length}`);

  // 4. Check Player Sessions
  const { data: players } = await supabase
    .from("player_sessions")
    .select("*")
    .in("session_id", sessionIds);
  console.log(`Players assigned to sessions: ${players?.length}`);

  // 5. Check Session Drills
  const { data: drills } = await supabase
    .from("session_drills")
    .select("*")
    .in("session_id", sessionIds);
  console.log(`Drills configured: ${drills?.length}`);
}

checkData();
