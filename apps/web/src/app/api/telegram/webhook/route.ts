import { NextResponse } from "next/server";
import { getTelegramSettings, sendTelegramMessage, sendTelegramDocument } from "@/lib/telegram";
import { runAgent } from "@/lib/agent";
import * as fs from "fs";

/**
 * Telegram incoming webhook handler (/api/telegram/webhook)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if the body contains a standard message
    const message = body.message;
    if (!message || !message.chat || !message.text) {
      // Return 200 for any non-message events (like edits or inline queries) so Telegram doesn't retry
      return NextResponse.json({ success: true, message: "Ignored non-message update" });
    }

    const chatId = String(message.chat.id);
    const userText = message.text.trim();

    // 1. Fetch authorized Chat ID from KV settings or environment variables
    const settings = await getTelegramSettings();
    const authorizedChatId = String(settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || "");

    if (!authorizedChatId) {
      console.warn("[TELEGRAM_WEBHOOK] Warning: No TELEGRAM_CHAT_ID configured in settings.");
    }

    // 2. Security isolation check
    if (chatId !== authorizedChatId) {
      console.warn(`[TELEGRAM_WEBHOOK] Unauthorized access attempt blocked from Chat ID: ${chatId}`);
      // Send a polite declination and exit
      await sendTelegramMessage(
        "🔒 <b>Access Denied</b>\n\nSorry, you are not authorized to consult the JoeSchool Business Intelligence Manager.",
        chatId
      );
      return NextResponse.json({ success: true });
    }

    // 3. Welcome / Help Command
    if (userText.startsWith("/start") || userText.startsWith("/help")) {
      const welcomeMessage = `
💼 <b>JoeSchool Business Intelligence Manager</b>

Welcome! I am your AI-powered Business Intelligence Agent. I analyze platform transactions, student registration trends, website conversions, and clickstream traffic in real-time.

💡 <b>Example Queries:</b>
• <i>How much revenue did we generate today?</i>
• <i>What is our best performing course this week?</i>
• <i>Compare this month's revenue to last month.</i>
• <i>How is our conversion rate trending?</i>
• <i>Give me recommendations to improve sales.</i>

📊 <b>Excel Reports On-Demand:</b>
• <i>Generate an Excel report for Q1</i>
• <i>Export a spreadsheet for the last 30 days</i>

Please note: I operate in <b>read-only mode</b>. I can compile metrics and export files, but I will never modify platform data.
      `.trim();
      
      await sendTelegramMessage(welcomeMessage, chatId);
      return NextResponse.json({ success: true });
    }

    // 4. Run the Agent reasoning loop
    console.log(`[TELEGRAM_WEBHOOK] Running agent loop for user query: "${userText}"`);
    
    // Indicate that the bot is "typing..."
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN || settings.telegramBotToken;
      if (token) {
        await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, action: "typing" })
        });
      }
    } catch {}

    const agentResult = await runAgent(chatId, userText);
    
    // 5. Send agent's final text reply
    await sendTelegramMessage(agentResult.text, chatId);

    // 6. Upload file attachment if generated
    if (agentResult.fileAttachment) {
      const fileMeta = agentResult.fileAttachment;
      console.log(`[TELEGRAM_WEBHOOK] Uploading document to Telegram: ${fileMeta.path}`);
      
      try {
        if (fs.existsSync(fileMeta.path)) {
          const fileBuffer = fs.readFileSync(fileMeta.path);
          await sendTelegramDocument(
            chatId,
            fileBuffer,
            fileMeta.name,
            `📊 <b>Excel Report:</b> <code>${fileMeta.name}</code>`
          );
        } else {
          console.error(`[TELEGRAM_WEBHOOK] Excel file not found on path: ${fileMeta.path}`);
        }
      } catch (uploadErr) {
        console.error("[TELEGRAM_WEBHOOK] Error uploading document:", uploadErr);
        await sendTelegramMessage("⚠️ Failed to upload the generated Excel report. Please check server logs.", chatId);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[TELEGRAM_WEBHOOK] Webhook handler error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
