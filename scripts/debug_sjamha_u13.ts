import { createClient } from "@supabase/supabase-js";

// Hardcoded for convenience based on debug_pl.ts
const supabaseUrl = "https://agselgureasuqmaqglpj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnc2VsZ3VyZWFzdXFtYXFnbHBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjcyMDcwMCwiZXhwIjoyMDc4Mjk2NzAwfQ.OmX1ETMM1ZQjrzjm342i_ltAEEUvFlOuQPhwFYT-qFA";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking data for SJAMHA - U13-COED...");

  // 1. Get SJAMHA Association (St. James Minor Hockey Association)
  const { data: assocs } = await supabase
    .from("associations")
    .select("id, name")
    .eq("abbreviation", "SJAMHA")
    .limit(1);
  if (!assocs || assocs.length === 0) {
    console.log("SJAMHA not found by abbreviation");
    return;
  }
  const assocId = assocs[0].id;
  console.log(`Association: ${assocs[0].name} (${assocId})`);

  // 2. Get U13 COED Cohort
  // Note: ILIKE %U13%COED%
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name")
    .eq("association_id", assocId)
    .ilike("name", "%U13%COED%")
    .limit(1);

  if (!cohorts || cohorts.length === 0) {
    console.log("U13-COED Cohort not found in SJAMHA");
    return;
  }
  const cohortId = cohorts[0].id;
  console.log(`Cohort: ${cohorts[0].name} (${cohortId})`);

  // 3. Check Sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name")
    .eq("cohort_id", cohortId);
  console.log(`Sessions found: ${sessions?.length}`);

  if (!sessions || sessions.length === 0) return;
  const sessionIds = sessions.map((s) => s.id);

  // 4. Check Session Evaluators
  const { data: evaluators } = await supabase
    .from("session_evaluators")
    .select("*")
    .in("session_id", sessionIds);
  console.log(`Evaluators assigned: ${evaluators?.length}`);

  // 5. Check Player Sessions (Assignments)
  const { data: playerSessions } = await supabase
    .from("player_sessions")
    .select("*")
    .in("session_id", sessionIds);
  console.log(`Player Assignments found: ${playerSessions?.length}`);

  // 6. Check Session Drills
  const { data: drills } = await supabase
    .from("session_drills")
    .select("*")
    .in("session_id", sessionIds);
  console.log(`Drills configured: ${drills?.length}`);

  // 7. Check Players in Cohort
  const { data: cohortPlayers } = await supabase
    .from("players")
    .select("id, position_type_id")
    .eq("cohort_id", cohortId);
  console.log(`Total Players registered in Cohort: ${cohortPlayers?.length}`);

  if (drills && drills.length > 0) {
    console.log(
      "Sample Drill Applies To config:",
      drills[0].applies_to_positions,
    );
  }
}

checkData();
