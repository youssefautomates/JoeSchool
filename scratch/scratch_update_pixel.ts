import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getKV, setKV } from "../apps/web/src/lib/kv";

async function main() {
  const MARKETING_KEY = "marketing_settings";
  const current = await getKV<any>(MARKETING_KEY);
  console.log("Current settings in DB:", current);

  const newSettings = {
    ...current,
    metaPixelId: "26144977705179312",
    metaPixelEnabled: true,
    metaCapiToken: "EAAN1MsDqq5QBRiq3ni3EeNtFpDz3av1XvlBO9ZBDgqMpag6EkpBv8M7qyftupHFO7R4ZBdEaNmxZAx9DqXWAP7d1uPndE8z6JLC2Bnp062lU6qNvpNytnFIf15Hjrv7PuUlgbb2FR7mRDI73iEpYN3fzZBBxz1Ga7ZBWU4a7zdLJUwXkYuViMmtk5ATj09gZDZD",
    metaCapiEnabled: true
  };

  console.log("Updating settings to:", newSettings);
  const success = await setKV(MARKETING_KEY, newSettings);
  console.log("Update success:", success);

  const updated = await getKV<any>(MARKETING_KEY);
  console.log("Updated settings in DB:", updated);
}

main().catch(console.error);
