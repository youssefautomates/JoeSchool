import { supabaseAdmin } from "./supabaseAdmin";
import { compileRawMetricsForRange, generateExcelReport, getUtcDateFromCairoLocal, ReportData, ReportMetrics, CourseSalesData } from "./reports";
import { getKV, setKV } from "./kv";
import { callLLM, ChatMessage } from "./llm";
import * as fs from "fs";
import * as path from "path";

// Define the schema for conversation history
export interface SessionHistory {
  messages: ChatMessage[];
}

/**
 * ----------------------------------------------------
 * 🛠️ BI Agent Accessor Tools
 * ----------------------------------------------------
 */

export async function getPlatformOverview() {
  console.log("[AGENT_TOOL] Executing getPlatformOverview...");
  
  // Total courses count
  const { count: totalCourses, error: coursesErr } = await supabaseAdmin
    .from("courses")
    .select("id", { count: "exact", head: true });
    
  if (coursesErr) console.error("getPlatformOverview courses err:", coursesErr);

  // Total completed orders & revenue
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from("orders")
    .select("amount")
    .eq("status", "completed");
    
  if (ordersErr) console.error("getPlatformOverview orders err:", ordersErr);

  const completedOrders = orders || [];
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalCompletedOrders = completedOrders.length;

  // Total students count from auth.users (paginated loop)
  let totalStudents = 0;
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("getPlatformOverview listUsers err:", error);
      break;
    }
    if (!data?.users || data.users.length === 0) break;
    totalStudents += data.users.length;
    if (data.users.length < perPage) break;
    page++;
  }

  return {
    totalCourses: totalCourses || 0,
    totalStudents,
    totalRevenue,
    totalCompletedOrders
  };
}

export async function getTodayMetrics() {
  console.log("[AGENT_TOOL] Executing getTodayMetrics...");
  const now = new Date();
  const cairoTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now);
  
  const start = getUtcDateFromCairoLocal(`${cairoTodayStr}T00:00:00`);
  return await compileRawMetricsForRange(start, now);
}

export async function getWeeklyMetrics() {
  console.log("[AGENT_TOOL] Executing getWeeklyMetrics...");
  const now = new Date();
  
  const cairoDayOfWeek = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long"
  }).format(now);
  
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const cairoDayIdx = dayNames.indexOf(cairoDayOfWeek);
  const daysToSubtract = (cairoDayIdx + 1) % 7; // Saturdy is idx 6, so Sun(0) = 1, Sat(6) = 0.
  
  const startOfWeek = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
  const cairoStartStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(startOfWeek);
  
  const start = getUtcDateFromCairoLocal(`${cairoStartStr}T00:00:00`);
  return await compileRawMetricsForRange(start, now);
}

export async function getMonthlyMetrics() {
  console.log("[AGENT_TOOL] Executing getMonthlyMetrics...");
  const now = new Date();
  
  const cairoYear = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", year: "numeric" }).format(now), 10);
  const cairoMonth = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", month: "numeric" }).format(now), 10);
  
  const startStr = `${cairoYear}-${String(cairoMonth).padStart(2, "0")}-01`;
  const start = getUtcDateFromCairoLocal(`${startStr}T00:00:00`);
  return await compileRawMetricsForRange(start, now);
}

export async function getRevenueAnalytics(startDate: string, endDate: string) {
  console.log(`[AGENT_TOOL] Executing getRevenueAnalytics for range: ${startDate} to ${endDate}`);
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  const metrics = await compileRawMetricsForRange(start, end);
  return {
    totalRevenue: metrics.revenue,
    completedOrders: metrics.orders,
    freeOrdersCount: (metrics as any).freeOrdersCount || 0,
    freeOrdersCoupons: (metrics as any).freeOrdersCoupons || [],
    aov: metrics.aov
  };
}

export async function getTrafficAnalytics(startDate: string, endDate: string) {
  console.log(`[AGENT_TOOL] Executing getTrafficAnalytics for range: ${startDate} to ${endDate}`);
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  const metrics = await compileRawMetricsForRange(start, end);
  return {
    visits: metrics.visits,
    uniqueVisitors: metrics.uniqueVisitors,
    newVisitors: metrics.newVisitors,
    returningVisitors: metrics.returningVisitors,
    checkoutSessions: metrics.checkoutSessions,
    conversionRate: metrics.conversionRate
  };
}

export async function getStudentAnalytics(startDate: string, endDate: string) {
  console.log(`[AGENT_TOOL] Executing getStudentAnalytics for range: ${startDate} to ${endDate}`);
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  const metrics = await compileRawMetricsForRange(start, end);
  return {
    newStudents: metrics.newStudents
  };
}

export async function getTopCourses(startDate: string, endDate: string, limit: number = 5) {
  console.log(`[AGENT_TOOL] Executing getTopCourses for range: ${startDate} to ${endDate} (Limit: ${limit})`);
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  const metrics = await compileRawMetricsForRange(start, end);
  return metrics.coursesPerformance.slice(0, limit);
}

/**
 * Custom Excel compiler helper to structure growth metrics for arbitrary periods
 */
async function compileCustomReportData(startDate: string, endDate: string, title: string): Promise<ReportData> {
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  // Shift window back to calculate growths/change metrics
  const durationMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - durationMs - 1);
  const prevEnd = new Date(start.getTime() - 1);
  
  const current = await compileRawMetricsForRange(start, end);
  const previous = await compileRawMetricsForRange(prevStart, prevEnd);
  
  const calculateGrowth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };
  
  const metrics: ReportMetrics = {
    revenue: current.revenue,
    orders: current.orders,
    newStudents: current.newStudents,
    aov: current.aov,
    visits: current.visits,
    uniqueVisitors: current.uniqueVisitors,
    newVisitors: current.newVisitors,
    returningVisitors: current.returningVisitors,
    checkoutSessions: current.checkoutSessions,
    conversionRate: current.conversionRate,
    bestSellingCourse: current.bestSellingCourse,
    
    revenueGrowth: calculateGrowth(current.revenue, previous.revenue),
    ordersGrowth: calculateGrowth(current.orders, previous.orders),
    studentsGrowth: calculateGrowth(current.newStudents, previous.newStudents),
    visitsGrowth: calculateGrowth(current.visits, previous.visits),
    uniqueGrowth: calculateGrowth(current.uniqueVisitors, previous.uniqueVisitors),
    newVisitorsGrowth: calculateGrowth(current.newVisitors, previous.newVisitors),
    returningVisitorsGrowth: calculateGrowth(current.returningVisitors, previous.returningVisitors),
    checkoutGrowth: calculateGrowth(current.checkoutSessions, previous.checkoutSessions),
    conversionChange: current.conversionRate - previous.conversionRate,
    conversionGrowth: calculateGrowth(current.conversionRate, previous.conversionRate),
    aovGrowth: calculateGrowth(current.aov, previous.aov)
  };

  const prevMetrics: ReportMetrics = {
    revenue: previous.revenue,
    orders: previous.orders,
    newStudents: previous.newStudents,
    aov: previous.aov,
    visits: previous.visits,
    uniqueVisitors: previous.uniqueVisitors,
    newVisitors: previous.newVisitors,
    returningVisitors: previous.returningVisitors,
    checkoutSessions: previous.checkoutSessions,
    conversionRate: previous.conversionRate,
    bestSellingCourse: previous.bestSellingCourse,
    
    revenueGrowth: 0,
    ordersGrowth: 0,
    studentsGrowth: 0,
    visitsGrowth: 0,
    uniqueGrowth: 0,
    newVisitorsGrowth: 0,
    returningVisitorsGrowth: 0,
    checkoutGrowth: 0,
    conversionChange: 0,
    conversionGrowth: 0,
    aovGrowth: 0
  };

  return {
    type: "monthly", // format sheet fields matching standard monthly reports
    periodLabel: title,
    prevPeriodLabel: `Previous Period (${durationMs / (24 * 60 * 60 * 1000) + 1} days)`,
    periodStart: start,
    periodEnd: end,
    prevPeriodStart: prevStart,
    prevPeriodEnd: prevEnd,
    metrics,
    prevMetrics,
    orders: current.rawOrders,
    coursesPerformance: current.coursesPerformance,
    insights: ["Custom compiled audit"],
    opportunities: ["Custom opportunity breakdown"]
  };
}

export async function generateCustomExcelReportTool(startDate: string, endDate: string, title: string) {
  console.log(`[AGENT_TOOL] Executing generateExcelReport from ${startDate} to ${endDate} (Title: ${title})`);
  
  const reportData = await compileCustomReportData(startDate, endDate, title);
  const excelBuffer = await generateExcelReport(reportData);
  
  const scratchDir = "C:\\Users\\Tagm3tek\\.gemini\\antigravity\\brain\\1bdcd052-614c-4c37-bb03-b44c9a1196fc\\scratch";
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  
  const cleanTitle = title.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, "");
  const fileName = `JoeSchool_Report_${cleanTitle}.xlsx`;
  const fullPath = path.join(scratchDir, fileName);
  fs.writeFileSync(fullPath, excelBuffer);
  
  return {
    success: true,
    filepath: fullPath,
    fileName,
    message: `Excel sheet for custom period "${title}" generated and saved successfully.`
  };
}

/**
 * ----------------------------------------------------
 * 🧠 ReAct Agent Loop Orchestrator
 * ----------------------------------------------------
 */

const SYSTEM_PROMPT = (cairoDateStr: string) => `
You are JoeSchool Business Intelligence Manager.

Your primary responsibility is helping the owner of JoeSchool understand, monitor, analyze, and improve the business performance of the platform.

Language Requirements:
* You must fully understand Modern Standard Arabic.
* You must fully understand Egyptian Arabic dialect.
* The platform owner communicates primarily in Egyptian Arabic.
* Always respond in the same language used by the user.
* If the user speaks Egyptian Arabic, respond in natural Egyptian Arabic.
* Never force formal Arabic when the user is speaking casually.

Examples of Egyptian Arabic queries you must understand:
* عاملين كام مبيعة النهارده؟
* الإيرادات عاملة كام؟
* ايه أكتر كورس بيتباع؟
* الدنيا ماشية ازاي الأسبوع ده؟
* في مشكلة في التحويل؟
* قارنلي الشهر ده بالشهر اللي فات.
* قارنلي الأسبوع ده بالأسبوع اللي قبله.
* طلعلي تقرير آخر 30 يوم.
* ابعتلي ملف إكسيل للشهر الحالي.
* كام نسبة التحويل؟
* هل المبيعات زادت ولا قلت؟
* شايف ايه محتاج يتحسن؟
* هل الإعلانات شكلها كويس؟
* ايه أكتر مصدر جايب مبيعات؟

Business Analysis Requirements:
* Always start with a short executive summary.
* Highlight the most important metrics first.
* Focus on revenue, orders, students, traffic, conversion rate, and course performance.
* Compare results against previous periods whenever data is available.
* Clearly explain increases and decreases.
* Identify risks, opportunities, and trends.
* Provide practical recommendations based on platform data.
* Avoid technical jargon unless explicitly requested.

Behavior Rules:
* Never invent numbers.
* Never estimate metrics when real data is unavailable.
* Clearly state when data is insufficient.
* Base every conclusion on actual platform data returned by tools.
* Prefer concise actionable insights over long explanations.
* فهم كوبونات الخصم 100%: إذا كانت الإيرادات 0 وهناك طلبات (orders) تم تسجيلها، تحقق من عدد الطلبات المجانية (freeOrdersCount) والكوبونات المستخدمة. بدلاً من قول "الإيرادات 0 جنيه" أو "المبيعات 0 جنيه" بصورة توحي بعدم وجود أي نشاط، وضّح بدقة: "تم تسجيل [عدد] طلب اليوم باستخدام كوبون خصم 100%، لذلك لا توجد إيرادات نقدية محصلة حتى الآن." (أو الصياغة المناسبة لذكاء الأعمال حسب الفترة المستعلم عنها).

Your role is not only to report numbers but to act as a business advisor helping grow JoeSchool.

PERMISSIONS CONSTRAINT:
You operate in strict READ-ONLY mode. You can query metrics and generate reports, but you have no tools to modify platform data (e.g. you cannot create coupons, suspend enrollments, or run campaigns). If the user asks you to write or update data, explain that you have read-only access.

EXECUTIVE RECOMMENDATION MODE:
For every analysis request, your final answer MUST include the following sections:
- 📊 **Key Findings**: Summary of the data.
- ⚠️ **Risks**: Potential issues identified (e.g. falling traffic, high cart abandonment, over-reliance on one course).
- 💡 **Opportunities**: Marketing and conversion opportunities.
- 🚀 **Recommended Actions**: Specific, step-by-step actions the admin should take.

REACT PROTOCOL:
You have access to tools to fetch JoeSchool platform data. You must request tools to get the necessary data.
You can execute tools one at a time. After executing a tool, you will receive the tool's output as context, and then you can choose to call another tool or give your final answer.

Your responses MUST be formatted in JSON.
If you need to call a tool, output exactly:
\`\`\`json
{
  "action": "call_tool",
  "tool": "toolName",
  "arguments": { "argName": "value" }
}
\`\`\`

If you have all the information and are ready to provide your final answer, output exactly:
\`\`\`json
{
  "action": "final_answer",
  "answer": "Your complete formatted final answer in Markdown, using the language specified in Language Requirements, and formatted with the Executive Recommendation sections."
}
\`\`\`

AVAILABLE TOOLS:
1. getPlatformOverview(): Returns overall counts of courses, total students, total completed orders, and total revenue. Arguments: none.
2. getTodayMetrics(): Cairo today metrics (from midnight today to now). Arguments: none.
3. getWeeklyMetrics(): Cairo this week metrics (from last Saturday to now). Arguments: none.
4. getMonthlyMetrics(): Cairo this month metrics (from 1st of month to now). Arguments: none.
5. getRevenueAnalytics(startDate: string, endDate: string): Revenue KPIs between YYYY-MM-DD dates (inclusive).
6. getTrafficAnalytics(startDate: string, endDate: string): Traffic & conversion rate details between YYYY-MM-DD dates (inclusive).
7. getStudentAnalytics(startDate: string, endDate: string): Registration count between YYYY-MM-DD dates (inclusive).
8. getTopCourses(startDate: string, endDate: string, limit: number): Course sales rankings between YYYY-MM-DD dates.
9. generateExcelReport(startDate: string, endDate: string, title: string): Generates the multi-sheet Excel report between YYYY-MM-DD dates.

Current local date is: ${cairoDateStr}. (Cairo Time).
Use this date to compute relative ranges like "last 30 days", "Q1", or "last month" if needed.
`;

export async function runAgent(
  chatId: string,
  userMessage: string
): Promise<{ text: string; fileAttachment?: { path: string; name: string } }> {
  const historyKey = `telegram-history-${chatId}`;
  
  // 1. Retrieve session history from KV store
  const savedHistory = await getKV<SessionHistory>(historyKey);
  const messages: ChatMessage[] = savedHistory?.messages || [];

  // Append new user message
  messages.push({ role: "user", content: userMessage });

  const cairoDateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium"
  }).format(new Date());

  const systemPrompt = SYSTEM_PROMPT(cairoDateStr);

  let fileAttachment: { path: string; name: string } | undefined = undefined;
  let loopCount = 0;
  const maxLoops = 6; // Safety threshold to prevent infinite LLM reasoning runs

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`[AGENT_LOOP] Loop ${loopCount}...`);
    
    // Call the LLM with current history (system prompt is fed as system instruction)
    const responseText = await callLLM(systemPrompt, messages);
    console.log("[AGENT_LOOP] LLM Raw Response:", responseText);

    // Extract JSON block
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[AGENT_LOOP] Output was not JSON. Returning raw content as final response.");
      messages.push({ role: "assistant", content: responseText });
      await saveHistory(historyKey, messages);
      return { text: responseText };
    }

    let actionObj: any;
    try {
      actionObj = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("[AGENT_LOOP] JSON parse error on match:", jsonMatch[0]);
      messages.push({ role: "assistant", content: responseText });
      await saveHistory(historyKey, messages);
      return { text: responseText };
    }

    if (actionObj.action === "final_answer") {
      messages.push({ role: "assistant", content: responseText });
      await saveHistory(historyKey, messages);
      return { text: actionObj.answer, fileAttachment };
    }

    if (actionObj.action === "call_tool") {
      const toolName = actionObj.tool;
      const args = actionObj.arguments || {};
      
      console.log(`[AGENT_LOOP] Executing tool: ${toolName} with args:`, args);
      let toolResult: any;

      try {
        switch (toolName) {
          case "getPlatformOverview":
            toolResult = await getPlatformOverview();
            break;
          case "getTodayMetrics":
            toolResult = await getTodayMetrics();
            break;
          case "getWeeklyMetrics":
            toolResult = await getWeeklyMetrics();
            break;
          case "getMonthlyMetrics":
            toolResult = await getMonthlyMetrics();
            break;
          case "getRevenueAnalytics":
            toolResult = await getRevenueAnalytics(args.startDate, args.endDate);
            break;
          case "getTrafficAnalytics":
            toolResult = await getTrafficAnalytics(args.startDate, args.endDate);
            break;
          case "getStudentAnalytics":
            toolResult = await getStudentAnalytics(args.startDate, args.endDate);
            break;
          case "getTopCourses":
            toolResult = await getTopCourses(args.startDate, args.endDate, args.limit);
            break;
          case "generateExcelReport":
            const excelRes = await generateCustomExcelReportTool(args.startDate, args.endDate, args.title || "custom_report");
            toolResult = excelRes;
            // Cache the file metadata to send to Telegram on loop termination
            fileAttachment = {
              path: excelRes.filepath,
              name: excelRes.fileName
            };
            break;
          default:
            toolResult = { error: `Tool "${toolName}" is not supported.` };
        }
      } catch (toolErr: any) {
        console.error(`[AGENT_LOOP] Tool execution exception on ${toolName}:`, toolErr);
        toolResult = { error: toolErr.message || "Execution exception occurred." };
      }

      console.log(`[AGENT_LOOP] Tool Result:`, JSON.stringify(toolResult));

      // Append assistant's call thought and the subsequent tool output to messages
      messages.push({ role: "assistant", content: responseText });
      messages.push({
        role: "user",
        content: `TOOL_OUTPUT (${toolName}): ${JSON.stringify(toolResult)}`
      });
      
      continue;
    }

    // Default escape
    messages.push({ role: "assistant", content: responseText });
    await saveHistory(historyKey, messages);
    return { text: responseText };
  }

  // Loop threshold escape
  const timeoutMsg = "Agent timed out resolving tools. Please try again with a simpler query.";
  return { text: timeoutMsg };
}

/**
 * Saves conversation history (keeps it bounded to 15 messages to conserve token counts)
 */
async function saveHistory(key: string, messages: ChatMessage[]) {
  const limit = 15;
  const sliced = messages.slice(-limit);
  await setKV<SessionHistory>(key, { messages: sliced });
}
