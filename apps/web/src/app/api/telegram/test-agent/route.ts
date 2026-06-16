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
  try {
    const { searchParams } = new URL(request.url);
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
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
