import { Client } from "pg";

const connStrHost = "postgresql://postgres.jnlyocojsuitzymideax:EAHNK0PJTC0hVinn@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
const connStrIP = "postgresql://postgres.jnlyocojsuitzymideax:EAHNK0PJTC0hVinn@52.59.152.35:5432/postgres";

async function testConnection(name: string, connectionString: string) {
  console.log(`\n--- Testing ${name} ---`);
  console.log(`URL: ${connectionString.replace(/:[^:@/]+@/, ":****@")}`);
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ ${name} connected successfully!`);
    const res = await client.query("SELECT NOW()");
    console.log("Database time:", res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error(`❌ ${name} failed:`, err.message || err);
  }
}

async function main() {
  await testConnection("Hostname Connection", connStrHost);
  await testConnection("Direct IP Connection", connStrIP);
}

main().catch(console.error);
