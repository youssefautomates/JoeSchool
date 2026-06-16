import { NextResponse } from "next/server";
import { runReportWorkflow } from "@/lib/reports";

/**
 * Scheduled Cron Endpoint (/api/cron/reports)
 * 
 * Secure endpoint designed to run once daily (configured in vercel.json).
 * Runs at 21:00 UTC (00:00 midnight Cairo local time).
 * - Daily report: Runs daily.
 * - Weekly report: Runs every Saturday.
 * - Monthly report + Excel workbook: Runs on the 1st day of every month.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const authHeader = request.headers.get("Authorization");
    
    const cronSecret = process.env.CRON_SECRET || "@JoeSchoolReportsSecret2026";
    
    // 1. Verify cron secret to prevent unauthorized execution
    if (secret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[CRON_REPORTS] Unauthorized access attempt.");
      return new Response("Unauthorized", { status: 401 });
    }

    const now = new Date();
    
    // Determine Cairo date properties for scheduling
    const cairoDayOfWeek = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      weekday: "long"
    }).format(now); // e.g. "Saturday", "Sunday"
    
    const cairoDayOfMonthStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      day: "numeric"
    }).format(now);
    const cairoDayOfMonth = parseInt(cairoDayOfMonthStr, 10); // e.g. 1

    console.log(`[CRON_REPORTS] Scheduler invoked. Current UTC: ${now.toISOString()} | Cairo Day: ${cairoDayOfWeek} | Day of Month: ${cairoDayOfMonth}`);

    // For debugging or manual execution, we can bypass scheduling checks using ?force=true
    const force = searchParams.get("force") === "true";

    // Trigger daily report (covers previous day)
    const dailyResult = await runReportWorkflow("daily", now);
    
    // Trigger weekly report on Saturdays (covers previous Sat-Fri week)
    let weeklyResult = null;
    if (cairoDayOfWeek === "Saturday" || force) {
      weeklyResult = await runReportWorkflow("weekly", now);
    }
    
    // Trigger monthly report on the 1st of the month (covers previous calendar month)
    let monthlyResult = null;
    if (cairoDayOfMonth === 1 || force) {
      monthlyResult = await runReportWorkflow("monthly", now);
    }

    return NextResponse.json({
      success: true,
      utcTime: now.toISOString(),
      cairoDayOfWeek,
      cairoDayOfMonth,
      reports: {
        daily: dailyResult,
        weekly: weeklyResult || { success: true, executed: false, message: "Not scheduled for today" },
        monthly: monthlyResult || { success: true, executed: false, message: "Not scheduled for today" }
      }
    });

  } catch (err: any) {
    console.error("[CRON_REPORTS] Critical scheduler exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
