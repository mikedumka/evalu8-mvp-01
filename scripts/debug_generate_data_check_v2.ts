import { createClient } from "@supabase/supabase-js";

// Hardcoded for convenience based on debug_pl.ts
const supabaseUrl = "https://agselgureasuqmaqglpj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnc2VsZ3VyZWFzdXFtYXFnbHBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjcyMDcwMCwiZXhwIjoyMDc4Mjk2NzAwfQ.OmX1ETMM1ZQjrzjm342i_ltAEEUvFlOuQPhwFYT-qFA";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking data...");

  // 1. Get a Cohort (Likely U9 since that was used in previous sessions)
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name")
    .ilike("name", "%U9%")
    .limit(1);
  let cohortId = cohorts && cohorts.length > 0 ? cohorts[0].id : null;

  // Fallback to ANY cohort if U9 not found
  if (!cohortId) {
    const { data: anyCohort } = await supabase
      .from("cohorts")
      .select("id, name")
      .limit(1);
    if (anyCohort && anyCohort.length > 0) {
      cohortId = anyCohort[0].id;
      console.log(`Using Fallback Cohort: ${anyCohort[0].name}`);
    }
  } else {
    console.log(`Using Cohort: ${cohorts![0].name}`);
  }

  if (!cohortId) {
    console.log("No cohorts found at all.");
    return;
  }

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
  console.log(`Evaluators assigned: ${evaluators?.length}`);

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

  // 6 Check Players in Cohort
  const { data: cohortPlayers } = await supabase
    .from("players")
    .select("id, position_type_id")
    .eq("cohort_id", cohortId);
  console.log(`Players in Cohort: ${cohortPlayers?.length}`);

  if (
    drills &&
    drills.length > 0 &&
    cohortPlayers &&
    cohortPlayers.length > 0
  ) {
    // Cross reference position types
    const drillPositions = new Set(
      drills.flatMap((d) => d.applies_to_positions),
    ); // Assuming array of strings
    console.log(
      `Drills apply to positions: ${Array.from(drillPositions).join(", ")}`,
    );

    // This requires fetching position type names to be useful, but at least we see if arrays match roughly
  }
}

checkData();
