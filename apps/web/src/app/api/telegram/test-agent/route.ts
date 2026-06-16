import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { getKV } from "@/lib/kv";

/**
 * Agent Testing Endpoint (/api/telegram/test-agent)
 * 
 * Simulates receiving a Telegram message from a test Chat ID,
 * executes the ReAct reasoning loop, and prints details of memory history.
 */
export async function GET(request: Request) {
  const envInfo = {
    LLM_PROVIDER: process.env.LLM_PROVIDER || "not set",
    LLM_MODEL: process.env.LLM_MODEL || "not set",
    LLM_API_URL: process.env.LLM_API_URL || "not set",
    LLM_API_KEY_exists: !!process.env.LLM_API_KEY,
    LLM_API_KEY_length: process.env.LLM_API_KEY ? process.env.LLM_API_KEY.length : 0,
    OPENROUTER_API_KEY_exists: !!process.env.OPENROUTER_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "not set",
    SUPABASE_SERVICE_ROLE_KEY_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  try {
    const { searchParams } = new URL(request.url);
    
    if (searchParams.get("env") === "true") {
      return NextResponse.json({ success: true, envInfo });
    }

    const query = searchParams.get("q") || "Summarize platform performance";
    const testChatId = searchParams.get("chatId") || "test-chat-123";

    console.log(`[TEST_AGENT] Simulating chat ID: ${testChatId} | Query: "${query}"`);
    
    // Execute the agent loop
    const result = await runAgent(testChatId, query);
    
    // Retrieve updated session history to inspect memory persistence
    const savedHistory = await getKV<any>(`telegram-history-${testChatId}`);

    return NextResponse.json({
      success: true,
      query,
      chatId: testChatId,
      agentReply: result.text,
      fileAttachment: result.fileAttachment || "None",
      memoryState: {
        messageCount: savedHistory?.messages?.length || 0,
        messages: savedHistory?.messages || []
      }
    });

  } catch (err: any) {
    console.error("[TEST_AGENT] Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error", envInfo },
      { status: 500 }
    );
  }
}
