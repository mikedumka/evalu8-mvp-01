
import { createClient } from "@supabase/supabase-js";

// Hardcoded from .env.local because ts-node doesn't load it automatically without helper
const SUPABASE_URL = "https://agselgureasuqmaqglpj.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnc2VsZ3VyZWFzdXFtYXFnbHBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjcyMDcwMCwiZXhwIjoyMDc4Mjk2NzAwfQ.OmX1ETMM1ZQjrzjm342i_ltAEEUvFlOuQPhwFYT-qFA";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
    const { data, error } = await supabase.from('associations').select('*');
    if (error) {
        console.error(error);
    } else {
        console.log("Associations:", data);
    }
}

main();
