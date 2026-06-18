import { NextResponse } from "next/server";
import { compileReportData, generateTelegramReportMessage, generateExcelReport, sendMonthlyExcelReportEmail } from "@/lib/reports";
import { sendTelegramMessage } from "@/lib/telegram";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Test Endpoint (/api/cron/reports/test)
 * Runs the reporting compiler on demand, saves Excel sheet locally to scratch,
 * and sends test reports.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "daily") as 'daily' | 'weekly' | 'monthly';
    const send = searchParams.get("send") === "true";

    console.log(`[TEST_ROUTE] Running test compiled report for type: ${type}`);
    
    // Compile using current execution time
    const now = new Date();
    const reportData = await compileReportData(type, now);
    
    // Generate messages
    const telegramMessage = generateTelegramReportMessage(reportData);
    
    let emailSent = false;
    let telegramSent = false;
    let excelSavedPath = "";

    if (send) {
      telegramSent = await sendTelegramMessage(telegramMessage);
    }

    if (type === "monthly") {
      const excelBuffer = await generateExcelReport(reportData);
      
      // Save locally to scratch directory for agent verification
      const scratchDir = os.tmpdir();
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      
      const fileName = `JoeSchool_Report_${reportData.periodLabel.replace(' ', '_')}.xlsx`;
      const fullPath = path.join(scratchDir, fileName);
      fs.writeFileSync(fullPath, excelBuffer);
      excelSavedPath = fullPath;
      console.log(`[TEST_ROUTE] Saved test Excel workbook locally to: ${fullPath}`);

      if (send) {
        emailSent = await sendMonthlyExcelReportEmail(reportData, excelBuffer);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test run for ${type} report compiled successfully.`,
      telegramMessageLength: telegramMessage.length,
      telegramMessageSnippet: telegramMessage.slice(0, 300) + "...",
      telegramSent,
      emailSent,
      excelSavedPath,
      dataSummary: {
        period: reportData.periodLabel,
        prevPeriod: reportData.prevPeriodLabel,
        metrics: reportData.metrics,
        ordersCount: reportData.orders.length,
        coursesPerformanceCount: reportData.coursesPerformance.length,
        insightsCount: reportData.insights.length,
        opportunitiesCount: reportData.opportunities.length
      },
      insights: reportData.insights,
      opportunities: reportData.opportunities
    });

  } catch (err: any) {
    console.error("[TEST_ROUTE] Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
