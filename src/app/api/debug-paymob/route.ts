import { NextResponse } from "next/server";

export async function GET() {
  console.log("[DEBUG_PAYMOB] Route hit");

  try {
    const apiKey = process.env.PAYMOB_API_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;
    
    // Log presence, but not the exact string to avoid leaking secrets
    console.log("[DEBUG_PAYMOB] PAYMOB_API_KEY exists?", !!apiKey);
    console.log("[DEBUG_PAYMOB] PAYMOB_API_KEY starts with:", apiKey ? `${apiKey.substring(0, 5)}...` : "N/A");
    console.log("[DEBUG_PAYMOB] PAYMOB_INTEGRATION_ID:", integrationId || "MISSING");

    if (!apiKey) {
      return NextResponse.json({ 
        error: "PAYMOB_API_KEY is completely missing from process.env",
        envKeysFound: Object.keys(process.env).filter(k => k.toLowerCase().includes('paymob'))
      }, { status: 500 });
    }

    const authEndpoint = "https://accept.paymob.com/api/auth/tokens";
    const payload = { api_key: apiKey };

    console.log("[DEBUG_PAYMOB] Calling exact endpoint:", authEndpoint);
    // Logging payload schema without the actual key string
    console.log("[DEBUG_PAYMOB] Payload keys:", Object.keys(payload));

    const response = await fetch(authEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("[DEBUG_PAYMOB] Response HTTP Status:", response.status);
    console.log("[DEBUG_PAYMOB] Response statusText:", response.statusText);

    // Get raw text first to avoid JSON parse errors if Paymob returns HTML/error
    const rawText = await response.text();
    console.log("[DEBUG_PAYMOB] Raw Response Text:", rawText);

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (e) {
      console.log("[DEBUG_PAYMOB] Failed to parse response as JSON. It's likely an HTML error page.");
      parsedJson = { raw: rawText };
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        status: response.status,
        statusText: response.statusText,
        paymob_response: parsedJson
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      tokenExists: !!parsedJson.token,
      paymob_response: parsedJson
    });

  } catch (error: any) {
    console.error("[DEBUG_PAYMOB] Caught exception:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
