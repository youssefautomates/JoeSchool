import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  try {
    const headersList = await headers();
    // Vercel Geolocation header
    const country = headersList.get("x-vercel-ip-country") || "EG";
    console.log(`[GEOLOCATION_API] Resolved Country: ${country}`);
    
    const currency = country.toUpperCase() === "EG" ? "EGP" : "USD";
    return NextResponse.json({ currency });
  } catch (error: any) {
    console.error("[GEOLOCATION_API_ERROR]", error);
    return NextResponse.json({ currency: "EGP" });
  }
}
