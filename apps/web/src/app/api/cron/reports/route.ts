import { NextResponse } from "next/server";
import { runReportWorkflow } from "@/lib/reports";

/**
 * Scheduled Cron Endpoint (/api/cron/reports)
 * 
 * Secure endpoint designed to run hourly (configured in vercel.json).
 * In Cairo Local Time (Africa/Cairo), it executes:
 * - Daily report: Every day at midnight.
 * - Weekly report: Every Saturday at midnight.
 * - Monthly report + Excel workbook: On the 1st day of every month at midnight.
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
    
    // 2. Format Cairo Local Time components
    const cairoHourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      hour: "numeric",
      hour12: false
    }).format(now);
    
    const cairoHour = parseInt(cairoHourStr, 10);
    const isCairoMidnight = cairoHour === 0 || cairoHour === 24;

    console.log(`[CRON_REPORTS] Scheduler invoked. Current UTC: ${now.toISOString()} | Cairo Hour: ${cairoHourStr} (Is Midnight: ${isCairoMidnight})`);

    // For debugging or manual execution, we can bypass the midnight hour check by passing ?force=true
    const force = searchParams.get("force") === "true";

    if (!isCairoMidnight && !force) {
      return NextResponse.json({
        success: true,
        message: `Skipped. Reports only run at midnight Cairo time. Current Cairo hour is: ${cairoHour}`
      });
    }

    // Determine other Cairo date properties for scheduling
    const cairoDayOfWeek = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      weekday: "long"
    }).format(now); // e.g. "Saturday", "Sunday"
    
    const cairoDayOfMonthStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      day: "numeric"
    }).format(now);
    const cairoDayOfMonth = parseInt(cairoDayOfMonthStr, 10); // e.g. 1

    console.log(`[CRON_REPORTS] Triggering reports... Cairo Day: ${cairoDayOfWeek} | Day of Month: ${cairoDayOfMonth}`);

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
