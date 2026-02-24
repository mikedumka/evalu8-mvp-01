import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugWaveValidation() {
  console.log("Starting debug...");

  // 1. Find the U13-COED cohort
  const { data: cohort, error: cohortError } = await supabase
    .from("cohorts")
    .select("id, name, association_id")
    .eq("name", "U13-COED")
    .single();

  if (cohortError) {
    console.error("Error finding cohort:", cohortError);
    return;
  }
  console.log("Found Cohort:", cohort.name, cohort.id);

  // 2. Fetch all waves for this cohort
  const { data: waves, error: wavesError } = await supabase
    .from("waves")
    .select("id, wave_number, season_id, status")
    .eq("cohort_id", cohort.id)
    .order("wave_number");

  if (wavesError) {
    console.error("Error fetching waves:", wavesError);
    return;
  }

  console.log("Waves found:", waves.length);
  waves.forEach((w) =>
    console.log(
      ` - Wave ${w.wave_number} (ID: ${w.id}) Status: ${w.status}, Season: ${w.season_id}`,
    ),
  );

  // 3. Simulate the check for Wave 2
  const targetWave = waves.find((w) => w.wave_number === 2);
  if (!targetWave) {
    console.error("Wave 2 not found");
    return;
  }

  console.log(`\nChecking validation for Wave ${targetWave.wave_number}...`);

  if (targetWave.wave_number && targetWave.wave_number > 1) {
    console.log(`Looking for Wave ${targetWave.wave_number - 1}...`);

    // Find previous wave query exactly as written in component
    const { data: prevWave, error: prevError } = await supabase
      .from("waves")
      .select("id")
      .eq("cohort_id", cohort.id)
      .eq("wave_number", targetWave.wave_number - 1)
      .eq("season_id", targetWave.season_id)
      .single();

    if (prevError) {
      console.error("Error fetching prev wave:", prevError);
    }

    if (prevWave) {
      console.log(`Found Prev Wave ID: ${prevWave.id}`);

      // Check sessions
      const { data: incompleteSessions, error: sessionError } = await supabase
        .from("sessions")
        .select("id, name, status")
        .eq("wave_id", prevWave.id)
        .neq("status", "completed");

      if (sessionError) {
        console.error("Error fetching sessions:", sessionError);
      }

      console.log("Incomplete Sessions found:", incompleteSessions?.length);
      incompleteSessions?.forEach((s) =>
        console.log(` - ${s.name}: ${s.status}`),
      );

      if (incompleteSessions && incompleteSessions.length > 0) {
        console.log("VALIDATION RESULT: BLOCKED");
      } else {
        console.log("VALIDATION RESULT: ALLOWED");
      }
    } else {
      console.log("Previous wave not found via query.");
    }
  }
}

debugWaveValidation();
