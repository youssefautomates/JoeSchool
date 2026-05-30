import { NextResponse } from "next/server";
import { getKV } from "@/lib/kv";
import crypto from "crypto";

const MARKETING_KEY = "marketing_settings";

function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      eventName, 
      eventId, 
      eventTime, 
      eventSourceUrl, 
      params,
      metaPixelId: clientPixelId,
      metaCapiToken: clientCapiToken,
      metaCapiTestCode: clientCapiTestCode,
      metaCapiEnabled: clientCapiEnabled
    } = body;
    
    // Load marketing settings from KV store as fallback
    const settings = await getKV<any>(MARKETING_KEY) || {
      metaPixelId: "",
      metaPixelEnabled: false,
      metaCapiToken: "",
      metaCapiEnabled: false,
      metaCapiTestCode: ""
    };

    const activePixelId = (clientPixelId || settings.metaPixelId || "").trim();
    const activeCapiToken = (clientCapiToken || settings.metaCapiToken || "").trim();
    const activeCapiTestCode = (clientCapiTestCode !== undefined ? clientCapiTestCode : settings.metaCapiTestCode || "").trim();
    const isCapiEnabled = clientCapiEnabled !== undefined ? !!clientCapiEnabled : !!settings.metaCapiEnabled;

    if (!isCapiEnabled || !activeCapiToken || !activePixelId) {
      return NextResponse.json({ 
        success: false, 
        status: "CAPI is disabled or credentials missing",
        raw_response: { error: "CAPI is disabled or credentials missing" }
      });
    }

    // Resolve real client IP and user agent securely
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const clientUserAgent = req.headers.get("user-agent") || "";
    
    // Format customer data (hash email and phone if present)
    const userEmail = params?.email || params?.user_email || "";
    const userPhone = params?.phone || params?.user_phone || "";
    
    const hashedEmail = userEmail ? hashSHA256(userEmail) : undefined;
    const hashedPhone = userPhone ? hashSHA256(userPhone) : undefined;
    
    const userData: any = {
      client_ip_address: clientIp.split(",")[0].trim(),
      client_user_agent: clientUserAgent
    };

    if (hashedEmail) {
      userData.em = [hashedEmail];
    }
    if (hashedPhone) {
      userData.ph = [hashedPhone];
    }

    const capiEvent: any = {
      event_name: eventName,
      event_time: Number(eventTime) || Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: eventSourceUrl,
      user_data: userData,
      custom_data: {
        currency: params?.currency || "EGP",
        value: Number(params?.value) || 0,
        content_name: params?.content_name || undefined,
        content_type: params?.content_type || "product",
        content_ids: params?.content_ids || undefined
      }
    };

    // Meta CAPI requires array format inside data
    const payload: any = {
      data: [capiEvent]
    };

    // If Test Event Code is populated in admin dashboard, send it
    if (activeCapiTestCode) {
      payload.test_event_code = activeCapiTestCode;
    }

    const metaUrl = `https://graph.facebook.com/v19.0/${activePixelId}/events?access_token=${activeCapiToken}`;
    
    console.log(`[CAPI Proxy Server] Dispatching event ${eventName} to Meta URL: https://graph.facebook.com/v19.0/${activePixelId}/events`);
    
    const response = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(`[CAPI Proxy Server] Event: ${eventName}, Response:`, result);

    if (result.error) {
      return NextResponse.json({ 
        success: false, 
        error: result.error.message, 
        fb_trace_id: result.error.fb_trace_id,
        raw_response: result
      });
    }

    return NextResponse.json({ 
      success: true, 
      events_received: result.events_received, 
      fb_trace_id: result.fb_trace_id,
      raw_response: result
    });
  } catch (err: any) {
    console.error("[CAPI Proxy Exception]:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      raw_response: { error: err.message }
    }, { status: 500 });
  }
}
