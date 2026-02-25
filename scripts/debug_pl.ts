import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://agselgureasuqmaqglpj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnc2VsZ3VyZWFzdXFtYXFnbHBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjcyMDcwMCwiZXhwIjoyMDc4Mjk2NzAwfQ.OmX1ETMM1ZQjrzjm342i_ltAEEUvFlOuQPhwFYT-qFA";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking Association IDs...");

  // Check Association for specific cohort (e.g. U7)
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name, association_id")
    .limit(1);
  if (!cohorts || cohorts.length === 0) {
    console.log("No cohorts found.");
    return;
  }

  const cohort = cohorts[0];
  console.log(
    `Cohort: ${cohort.name}, Association ID: ${cohort.association_id}`,
  );

  // Check Association for Previous Levels
  const { data: levels } = await supabase
    .from("previous_levels")
    .select("id, name, association_id")
    .limit(1);
  if (!levels || levels.length === 0) {
    console.log("No levels found.");
    return;
  }

  const level = levels[0];
  console.log(`Level: ${level.name}, Association ID: ${level.association_id}`);

  if (cohort.association_id !== level.association_id) {
    console.warn(
      "MISMATCH! Cohort Association ID does not match Level Association ID.",
    );
  } else {
    console.log("MATCH! Association IDs match.");
  }
}

check();
