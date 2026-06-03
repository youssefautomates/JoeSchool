import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;
const projectRef = "ftiyeuhqqxpraiasjjvz";
const password = "@Youssefmostafa26";

const regions = [
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ca-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "sa-east-1"
];

async function testRegion(region: string) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`Testing region ${region} (${host})...`);
  const client = new Client({
    host,
    port: 6543,
    user: `postgres.${projectRef}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`>>> SUCCESS: Connected to region ${region}!`);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`Failed for ${region}: ${err.message || err}`);
    return false;
  }
}

async function main() {
  for (const r of regions) {
    const ok = await testRegion(r);
    if (ok) {
      console.log(`\nFound matching pooler region: ${r}`);
      break;
    }
  }
}

main();
