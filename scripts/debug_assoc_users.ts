
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
    console.log("Checking SJAMHA users...");

    // 1. Get SJAMHA Association
    const { data: associations, error: assocError } = await supabase
        .from('associations')
        .select('*')
        .ilike('name', '%St_ James%'); // %St. James% might be issue with period?

    if (assocError) {
        console.error(assocError);
        process.exit(1);
    }
    
    // Fallback search
    let sjamha = associations && associations.length > 0 ? associations[0] : null;
    if(!sjamha) {
       const { data: sjamha2 } = await supabase.from('associations').select('*').ilike('abbreviation', 'SJAMHA');
       if(sjamha2 && sjamha2.length > 0) sjamha = sjamha2[0];
    }

    if (!sjamha) {
        console.error("SJAMHA not found via script search.");
        process.exit(1);
    }

    console.log(`Found association: ${sjamha.name} (${sjamha.id})`);

    // 2. List Members
    const { data: members, error: membersError } = await supabase
        .from('association_users')
        .select(`
            user_id, 
            roles, 
            status,
            user:users!association_users_user_id_fkey (
                id, email, full_name
            )
        `)
        .eq('association_id', sjamha.id);

    if (membersError) {
        console.error(membersError);
    } else {
        console.log(`Found ${members.length} members.`);
        members.forEach(m => {
            // @ts-ignore
            console.log(` - ${m.user?.email || m.user_id} [${m.roles.join(', ')}] (Status: ${m.status})`);
        });
    }

    // 3. Specifically check for Evaluators
    const evaluators = members?.filter(m => m.roles.includes('Evaluator') || m.roles.includes('evaluator')) || [];
    console.log(`\nFiltered Evaluators count: ${evaluators.length}`);
}

main();
