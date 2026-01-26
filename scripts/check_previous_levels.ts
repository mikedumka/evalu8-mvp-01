import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log("Checking previous_levels...");
  const { data: levels, error: levelError } = await supabase
    .from("previous_levels")
    .select("*");

  if (levelError) {
    console.error("Error fetching previous_levels:", levelError);
  } else {
    console.log(`Found ${levels.length} previous_levels.`);
    console.table(levels);
  }

  console.log("\nChecking players...");
  const { data: players, error: playerError } = await supabase
    .from("players")
    .select("id, first_name, last_name, previous_level_id")
    .not("previous_level_id", "is", null)
    .limit(10);

  if (playerError) {
    console.error("Error fetching players:", playerError);
  } else {
    console.log(
      `Found ${players.length} players with previous_level_id set (showing 10).`
    );
    console.table(players);
  }
}

checkData();
