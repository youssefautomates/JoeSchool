import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLiveAnalyticsContext } from "@/ai/analytics/engine";
import { getSystemPrompt } from "@/ai/prompts/system";
import { getOpenRouterResponse } from "@/ai/providers/openrouter";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Verify Admin Token
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { message, conversationId } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 2. Fetch Live Platform Analytics Context
    const analytics = await getLiveAnalyticsContext();
    const systemPrompt = getSystemPrompt(analytics);

    // 3. Load Past Messages from database if conversationId is provided
    let pastMessages: Array<{ role: string; content: string }> = [];
    if (conversationId) {
      const { data, error } = await supabaseAdmin
        .from("ai_conversations")
        .select("messages")
        .eq("id", conversationId)
        .single();
      
      if (!error && data?.messages) {
        pastMessages = data.messages as Array<{ role: string; content: string }>;
      }
    }

    // 4. Assemble standard prompt sequence
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...pastMessages,
      { role: "user", content: message }
    ];

    // 5. Query OpenRouter Non-Streaming API with robust cycling fallback
    const fullResponse = await getOpenRouterResponse(aiMessages);
    if (!fullResponse) {
      return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
    }

    const encoder = new TextEncoder();

    // 6. Build simulated characters stream for real-time client consumption
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chunkSize = 3;  // yields 3 characters per tick for high speed but natural feel
          const delayMs = 12;   // elegant delay tick in ms

          for (let i = 0; i < fullResponse.length; i += chunkSize) {
            const chunk = fullResponse.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          // 7. Persist updated chat history to Supabase asynchronously
          const updatedMessages = [
            ...pastMessages,
            { role: "user", content: message },
            { role: "assistant", content: fullResponse }
          ];

          if (conversationId) {
            // Update title to first 3 words of user query if title is "محادثة استشارية جديدة"
            let titleUpdate = {};
            const { data: convData } = await supabaseAdmin
              .from("ai_conversations")
              .select("title")
              .eq("id", conversationId)
              .single();

            if (convData && convData.title === "محادثة استشارية جديدة") {
              const firstWords = message.split(" ").slice(0, 4).join(" ") + "...";
              titleUpdate = { title: firstWords };
            }

            await supabaseAdmin
              .from("ai_conversations")
              .update({
                messages: updatedMessages,
                updated_at: new Date().toISOString(),
                ...titleUpdate
              })
              .eq("id", conversationId);
          }
        } catch (err: any) {
          console.error("[AI Stream Router] Runtime error:", err.message);
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("[AI Chat API] Critical failure:", error.message || error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
