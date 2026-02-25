import fs from "fs";
import path from "path";
import pg from "pg";
const { Client } = pg;

// Config
const PROJ_REF = "agselgureasuqmaqglpj";
const DB_PASSWORD = "H$*aZ9Lej62*HvkZ";

async function run() {
  const regions = [
    "ca-central-1", // Likely based on user context (SJAMHA = St. James Assiniboia Minor Hockey Assoc, Winnipeg)
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "ap-southeast-1",
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-south-1",
    "sa-east-1",
  ];

  const hosts = regions.map((r) => `aws-0-${r}.pooler.supabase.com`);

  for (const host of hosts) {
    console.log(`Attempting connection to ${host}...`);
    const client = new Client({
      user: `postgres.${PROJ_REF}`,
      host: host,
      database: "postgres",
      password: DB_PASSWORD,
      port: 5432,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000, // Faster failover
    });

    try {
      await client.connect();
      console.log(`Connected to ${host}!`);

      const migrationFile = path.join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260224000000_add_current_rank_distribution.sql",
      );
      const sql = fs.readFileSync(migrationFile, "utf-8");

      console.log("Executing migration SQL...");
      await client.query(sql);
      console.log("Migration executed successfully!");

      await client.end();
      return; // Success!
    } catch (err: any) {
      // If connection fails (timeout or network unreachable), skip quickly.
      // If "Tenant or user not found", skip immediately.
      console.error(`Failed on ${host}: ${err.message}`);
      try {
        await client.end();
      } catch (e) {}
    }
  }

  console.error("All connection attempts failed.");
}

run();
