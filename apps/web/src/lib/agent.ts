import { supabaseAdmin } from "./supabaseAdmin";
import { compileRawMetricsForRange, generateExcelReport, getUtcDateFromCairoLocal, ReportData, ReportMetrics, CourseSalesData } from "./reports";
import { getKV, setKV } from "./kv";
import { callLLM, ChatMessage } from "./llm";
import { sanitizeMarkdown } from "./telegram";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Define the schema for conversation history
export interface SessionHistory {
  messages: ChatMessage[];
}

/**
 * ----------------------------------------------------
 * 🛠️ BI Agent Accessor Tools
 * ----------------------------------------------------
 */

export async function getPlatformOverview(isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getPlatformOverview (isLifetime: ${isLifetime})...`);
  
  const settings = await getKV<any>("marketing_settings");
  const analyticsResetDate = settings?.analyticsResetDate;
  const analyticsMode = settings?.analyticsMode || "reset";
  
  // Total courses count - courses are static business data, not reset!
  const { count: totalCourses, error: coursesErr } = await supabaseAdmin
    .from("courses")
    .select("id", { count: "exact", head: true });
    
  if (coursesErr) console.error("getPlatformOverview courses err:", coursesErr);

  // Total completed orders & revenue
  let orderQuery = supabaseAdmin
    .from("orders")
    .select("amount, created_at")
    .eq("status", "completed");

  if (!isLifetime && analyticsMode === "reset" && analyticsResetDate) {
    orderQuery = orderQuery.gte("created_at", new Date(analyticsResetDate).toISOString());
  }

  const { data: orders, error: ordersErr } = await orderQuery;
  if (ordersErr) console.error("getPlatformOverview orders err:", ordersErr);

  const completedOrders = orders || [];
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalCompletedOrders = completedOrders.length;

  // Total students count from auth.users (paginated loop)
  let totalStudents = 0;
  let page = 1;
  const perPage = 1000;
  const resetCutoff = (!isLifetime && analyticsMode === "reset" && analyticsResetDate) ? new Date(analyticsResetDate) : null;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("getPlatformOverview listUsers err:", error);
      break;
    }
    if (!data?.users || data.users.length === 0) break;
    
    let pageUsers = data.users;
    if (resetCutoff) {
      pageUsers = pageUsers.filter(u => new Date(u.created_at) >= resetCutoff);
    }

    totalStudents += pageUsers.length;
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

export async function getTodayMetrics(isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getTodayMetrics (isLifetime: ${isLifetime})...`);
  const now = new Date();
  const cairoTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now);
  
  const start = getUtcDateFromCairoLocal(`${cairoTodayStr}T00:00:00`);
  return await compileRawMetricsForRange(start, now, isLifetime);
}

export async function getWeeklyMetrics(isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getWeeklyMetrics (isLifetime: ${isLifetime})...`);
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
  return await compileRawMetricsForRange(start, now, isLifetime);
}

export async function getMonthlyMetrics(isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getMonthlyMetrics (isLifetime: ${isLifetime})...`);
  const now = new Date();
  
  const cairoYear = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", year: "numeric" }).format(now), 10);
  const cairoMonth = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", month: "numeric" }).format(now), 10);
  
  const startStr = `${cairoYear}-${String(cairoMonth).padStart(2, "0")}-01`;
  const start = getUtcDateFromCairoLocal(`${startStr}T00:00:00`);
  return await compileRawMetricsForRange(start, now, isLifetime);
}

export async function getRevenueAnalytics(startDate: string, endDate: string, isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getRevenueAnalytics for range: ${startDate} to ${endDate} (isLifetime: ${isLifetime})`);
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  const metrics = await compileRawMetricsForRange(start, end, isLifetime);
  return {
    totalRevenue: metrics.revenue,
    completedOrders: metrics.orders,
    freeOrdersCount: (metrics as any).freeOrdersCount || 0,
    freeOrdersCoupons: (metrics as any).freeOrdersCoupons || [],
    aov: metrics.aov
  };
}

export async function getTrafficAnalytics(startDate: string, endDate: string, isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getTrafficAnalytics for range: ${startDate} to ${endDate} (isLifetime: ${isLifetime})`);
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  const metrics = await compileRawMetricsForRange(start, end, isLifetime);
  return {
    visits: metrics.visits,
    uniqueVisitors: metrics.uniqueVisitors,
    newVisitors: metrics.newVisitors,
    returningVisitors: metrics.returningVisitors,
    checkoutSessions: metrics.checkoutSessions,
    conversionRate: metrics.conversionRate
  };
}

export async function getStudentAnalytics(startDate: string, endDate: string, isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getStudentAnalytics for range: ${startDate} to ${endDate} (isLifetime: ${isLifetime})`);
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  const metrics = await compileRawMetricsForRange(start, end, isLifetime);
  return {
    newStudents: metrics.newStudents
  };
}

export async function getTopCourses(startDate: string, endDate: string, limit: number = 5, isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getTopCourses for range: ${startDate} to ${endDate} (Limit: ${limit}, isLifetime: ${isLifetime})`);
  const start = getUtcDateFromCairoLocal(`${startDate}T00:00:00`);
  const end = getUtcDateFromCairoLocal(`${endDate}T23:59:59.999`);
  
  const metrics = await compileRawMetricsForRange(start, end, isLifetime);
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
    netRevenue: current.netRevenue,
    processingFees: current.processingFees,
    orders: current.orders,
    newStudents: current.newStudents,
    aov: current.aov,
    visits: current.visits,
    uniqueVisitors: current.uniqueVisitors,
    newVisitors: current.newVisitors,
    returningVisitors: current.returningVisitors,
    checkoutSessions: current.checkoutSessions,
    checkoutOpened: current.checkoutOpened,
    checkoutStarted: current.checkoutStarted,
    purchasingSessions: current.purchasingSessions,
    conversionRate: current.conversionRate,
    bestSellingCourse: current.bestSellingCourse,
    
    revenueGrowth: calculateGrowth(current.revenue, previous.revenue),
    netRevenueGrowth: calculateGrowth(current.netRevenue, previous.netRevenue),
    feesGrowth: calculateGrowth(current.processingFees, previous.processingFees),
    ordersGrowth: calculateGrowth(current.orders, previous.orders),
    studentsGrowth: calculateGrowth(current.newStudents, previous.newStudents),
    visitsGrowth: calculateGrowth(current.visits, previous.visits),
    uniqueGrowth: calculateGrowth(current.uniqueVisitors, previous.uniqueVisitors),
    newVisitorsGrowth: calculateGrowth(current.newVisitors, previous.newVisitors),
    returningVisitorsGrowth: calculateGrowth(current.returningVisitors, previous.returningVisitors),
    checkoutGrowth: calculateGrowth(current.checkoutSessions, previous.checkoutSessions),
    checkoutOpenedGrowth: calculateGrowth(current.checkoutOpened, previous.checkoutOpened),
    checkoutStartedGrowth: calculateGrowth(current.checkoutStarted, previous.checkoutStarted),
    purchasingSessionsGrowth: calculateGrowth(current.purchasingSessions, previous.purchasingSessions),
    conversionChange: current.conversionRate - previous.conversionRate,
    conversionGrowth: calculateGrowth(current.conversionRate, previous.conversionRate),
    aovGrowth: calculateGrowth(current.aov, previous.aov)
  };

  const prevMetrics: ReportMetrics = {
    revenue: previous.revenue,
    netRevenue: previous.netRevenue,
    processingFees: previous.processingFees,
    orders: previous.orders,
    newStudents: previous.newStudents,
    aov: previous.aov,
    visits: previous.visits,
    uniqueVisitors: previous.uniqueVisitors,
    newVisitors: previous.newVisitors,
    returningVisitors: previous.returningVisitors,
    checkoutSessions: previous.checkoutSessions,
    checkoutOpened: previous.checkoutOpened,
    checkoutStarted: previous.checkoutStarted,
    purchasingSessions: previous.purchasingSessions,
    conversionRate: previous.conversionRate,
    bestSellingCourse: previous.bestSellingCourse,
    
    revenueGrowth: 0,
    netRevenueGrowth: 0,
    feesGrowth: 0,
    ordersGrowth: 0,
    studentsGrowth: 0,
    visitsGrowth: 0,
    uniqueGrowth: 0,
    newVisitorsGrowth: 0,
    returningVisitorsGrowth: 0,
    checkoutGrowth: 0,
    checkoutOpenedGrowth: 0,
    checkoutStartedGrowth: 0,
    purchasingSessionsGrowth: 0,
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
  
  const scratchDir = os.tmpdir();
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

export async function searchStudentsTool(query: string) {
  console.log(`[AGENT_TOOL] Executing searchStudents for query: ${query}`);
  const cleanQuery = query.toLowerCase().trim();
  
  // 1. Fetch matching orders
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from("orders")
    .select("customer_name, customer_email, product_title, created_at, status")
    .or(`customer_name.ilike.%${cleanQuery}%,customer_email.ilike.%${cleanQuery}%`);
    
  if (ordersErr) console.error("searchStudents orders err:", ordersErr);
  
  // 2. Fetch auth users
  let authMatches: any[] = [];
  try {
    let page = 1;
    const perPage = 1000;
    while (page <= 2) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users || data.users.length === 0) break;
      const filtered = data.users.filter(u => 
        u.email?.toLowerCase().includes(cleanQuery) || 
        (u.user_metadata?.full_name && String(u.user_metadata.full_name).toLowerCase().includes(cleanQuery))
      );
      authMatches.push(...filtered.map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || "N/A",
        created_at: u.created_at
      })));
      if (data.users.length < perPage) break;
      page++;
    }
  } catch (e) {
    console.error("searchStudents listUsers exception:", e);
  }
  
  return {
    ordersMatched: orders || [],
    authUsersMatched: authMatches
  };
}

export async function searchOrdersTool(query: string) {
  console.log(`[AGENT_TOOL] Executing searchOrders for query: ${query}`);
  const cleanQuery = query.toLowerCase().trim();
  
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .or(`id.eq.${cleanQuery},customer_name.ilike.%${cleanQuery}%,customer_email.ilike.%${cleanQuery}%,coupon_code.ilike.%${cleanQuery}%,product_title.ilike.%${cleanQuery}%`);
    
  if (ordersErr) console.error("searchOrders err:", ordersErr);
  return orders || [];
}

export async function searchCouponsTool(code?: string) {
  console.log(`[AGENT_TOOL] Executing searchCoupons for code: ${code}`);
  let queryBuilder = supabaseAdmin.from("coupons").select("*");
  if (code) {
    queryBuilder = queryBuilder.ilike("code", `%${code.trim()}%`);
  }
  const { data: coupons, error } = await queryBuilder;
  if (error) console.error("searchCoupons err:", error);
  return coupons || [];
}

export async function getCourseAnalyticsTool(isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getCourseAnalytics (isLifetime: ${isLifetime})...`);
  const settings = await getKV<any>("marketing_settings");
  const analyticsResetDate = settings?.analyticsResetDate;
  const analyticsMode = settings?.analyticsMode || "reset";
  
  const { data: courses, error: coursesErr } = await supabaseAdmin
    .from("courses")
    .select("id, title, slug, sales_count, price, price_egp");
    
  if (coursesErr) console.error("getCourseAnalytics courses err:", coursesErr);
  
  let enrollQuery = supabaseAdmin
    .from("enrollments")
    .select("course_id, enrolled_at");
  if (!isLifetime && analyticsMode === "reset" && analyticsResetDate) {
    enrollQuery = enrollQuery.gte("enrolled_at", new Date(analyticsResetDate).toISOString());
  }
  const { data: enrollments, error: enrollmentsErr } = await enrollQuery;
  if (enrollmentsErr) console.error("getCourseAnalytics enrollments err:", enrollmentsErr);
  
  const enrollMap: Record<string, number> = {};
  (enrollments || []).forEach(e => {
    enrollMap[e.course_id] = (enrollMap[e.course_id] || 0) + 1;
  });
  
  let orderQuery = supabaseAdmin
    .from("orders")
    .select("product_id, amount, created_at")
    .eq("status", "completed");
  if (!isLifetime && analyticsMode === "reset" && analyticsResetDate) {
    orderQuery = orderQuery.gte("created_at", new Date(analyticsResetDate).toISOString());
  }
  const { data: orderSums, error: orderErr } = await orderQuery;
  if (orderErr) console.error("getCourseAnalytics orders err:", orderErr);
  
  const revenueMap: Record<string, number> = {};
  const salesMap: Record<string, number> = {};
  (orderSums || []).forEach(o => {
    revenueMap[o.product_id] = (revenueMap[o.product_id] || 0) + (o.amount || 0);
    salesMap[o.product_id] = (salesMap[o.product_id] || 0) + 1;
  });
  
  return (courses || []).map(c => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    basePrice: c.price_egp || c.price,
    enrollmentCount: enrollMap[c.id] || 0,
    orderSalesCount: salesMap[c.id] || 0,
    totalRevenue: revenueMap[c.id] || 0,
    salesCountField: isLifetime ? (c.sales_count || 0) : (salesMap[c.id] || 0)
  }));
}

export async function getPaymentMethodStatsTool(isLifetime?: boolean) {
  console.log(`[AGENT_TOOL] Executing getPaymentMethodStats (isLifetime: ${isLifetime})...`);
  const settings = await getKV<any>("marketing_settings");
  const analyticsResetDate = settings?.analyticsResetDate;
  const analyticsMode = settings?.analyticsMode || "reset";

  let query = supabaseAdmin
    .from("orders")
    .select("status, payment_method, amount, created_at");
  if (!isLifetime && analyticsMode === "reset" && analyticsResetDate) {
    query = query.gte("created_at", new Date(analyticsResetDate).toISOString());
  }

  const { data: orders, error } = await query;
  if (error) console.error("getPaymentMethodStats err:", error);
  
  const stats: Record<string, { completed: number; failed: number; pending: number; revenue: number }> = {};
  (orders || []).forEach(o => {
    const method = o.payment_method || "Unknown";
    if (!stats[method]) {
      stats[method] = { completed: 0, failed: 0, pending: 0, revenue: 0 };
    }
    if (o.status === "completed") {
      stats[method].completed += 1;
      stats[method].revenue += (o.amount || 0);
    } else if (o.status === "failed") {
      stats[method].failed += 1;
    } else {
      stats[method].pending += 1;
    }
  });
  
  return stats;
}

/**
 * ----------------------------------------------------
 * 🧠 ReAct Agent Loop Orchestrator
 * ----------------------------------------------------
 */

const SYSTEM_PROMPT = (cairoDateStr: string, resetDate?: string, mode?: string) => `
# JoeSchool Business Intelligence Manager v2

## Analytics Reset Configuration:
- Analytics Reset Date: ${resetDate || "None"}
- Analytics Mode: ${mode || "reset"}
- DEFAULT REPORTING: For all normal queries (e.g. today, this week, this month, custom ranges, overview), you MUST default to reporting metrics "Since Reset Date" (${resetDate || "None"}).
- LIFETIME OVERRIDE: If the user explicitly asks for "lifetime", "lifetime statistics", "all time", "since the beginning", "مدى الحياة", "التاريخي", "كل الأوقات", or "من البداية", you MUST pass isLifetime: true to the metrics tools to retrieve and report complete historical totals.

You are the permanent AI Operating System for JoeSchool.

Your role is to actively operate as the Business Intelligence Manager, Growth Analyst, Revenue Analyst, Marketing Advisor, Sales Analyst, Customer Success Analyst, Product Analyst, and Operations Assistant for the entire JoeSchool platform.

You have access to database metrics, reports, analytics, orders, students, enrollments, traffic data, payment data, coupons, courses, Telegram reports, Excel exports, and future business tools.

━━━━━━━━━━━━━━━━━━
PRIMARY OBJECTIVE
━━━━━━━━━━━━━━━━━━

Your primary objective is:
- Increase revenue.
- Increase sales.
- Increase conversion rate.
- Increase student retention.
- Detect problems early.
- Provide actionable recommendations.
- Help grow JoeSchool.

Never behave like a generic chatbot.
Always behave like a business operator with direct access to platform data.

━━━━━━━━━━━━━━━━━━
LANGUAGE RULES
━━━━━━━━━━━━━━━━━━

The platform owner communicates primarily in Egyptian Arabic.
You must fully understand:
• Egyptian Arabic
• Modern Standard Arabic
• English

Always reply using the same language used by the user.
If the user speaks Egyptian Arabic, respond in clear Egyptian Arabic.
Never switch to English unless the user uses English.

━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━

CRITICAL FORMATTING CONSTRAINT:
All your outputs must be formatted in plain clean text only.
Never use any Markdown symbols. Markdown formatting is strictly forbidden because it causes layout crashes.

Never use:
* Markdown bold (**)
* Markdown bold (__)
* Markdown headers (#, ##, ###)
* Markdown tables
* Markdown emphasis

Forbidden examples:
**تم إنشاء ملف الإكسيل بنجاح**
**اسم الملف**
## تقرير المبيعات
### تفاصيل التقرير

Correct examples:
✅ تم إنشاء ملف الإكسيل بنجاح

📄 اسم الملف
JoeSchool_Report.xlsx

📊 تقرير المبيعات

Only present final business results.

When summarizing metrics or writing responses, follow this structure:

📊 ملخص سريع

[Metric 1]
[Metric 2]
[Metric 3]

━━━━━━━━━━

⚠️ ملاحظات مهمة

• [Insight 1]
• [Insight 2]
• [Insight 3]

━━━━━━━━━━

💡 اقتراحات

• [Recommendation 1]
• [Recommendation 2]
• [Recommendation 3]

━━━━━━━━━━

🚀 الإجراء المقترح

[One specific next action]

Ensure clean line spacing and absolutely no markdown headers, bolding, or tables.

━━━━━━━━━━━━━━━━━━
DATA RELIABILITY RULES
━━━━━━━━━━━━━━━━━━

Never invent numbers.
Never estimate metrics.
Never generate fake comparisons.
Never assume revenue, traffic, or sales.
Only use data returned from tools.

If data is unavailable:
Say:
"لا توجد بيانات كافية حالياً للإجابة بدقة."

If a report contains insufficient data:
Say:
"عدد البيانات الحالي ما زال محدوداً ولذلك لا يمكن استخراج استنتاج موثوق حتى الآن."

━━━━━━━━━━━━━━━━━━
BUSINESS ANALYSIS MODE
━━━━━━━━━━━━━━━━━━

Whenever data is available, analyze and explain:
What happened.
Why it happened.
What should be done next.
Never stop at reporting numbers.

━━━━━━━━━━━━━━━━━━
SEARCH & ANALYTICS CAPABILITIES
━━━━━━━━━━━━━━━━━━

You should support:
- Search by student name/email.
- Search by order ID/email/coupon/product.
- Coupon usage analysis.
- Course performance analytics (best/worst selling, enrollments, revenue).
- Payment analysis (completed, failed, wallet vs card, coupon purchases).

━━━━━━━━━━━━━━━━━━
EXCEL REPORTS
━━━━━━━━━━━━━━━━━━

Support generating Excel reports for daily, weekly, monthly, quarterly, or custom ranges. If requested, call the tool to generate it.

━━━━━━━━━━━━━━━━━━
MEMORY & CONTEXT
━━━━━━━━━━━━━━━━━━

Remember conversation context. Use previous context to avoid making the user repeat information.

━━━━━━━━━━━━━━━━━━
REACT PROTOCOL:
━━━━━━━━━━━━━━━━━━
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
  "answer": "Your complete formatted final answer, using the language specified in Language Rules, and formatted exactly according to the Response Format sections (without markdown bold/header symbols)."
}
\`\`\`

AVAILABLE TOOLS:
1. getPlatformOverview(isLifetime?: boolean): Overall metrics (courses, students, total completed orders, total revenue).
2. getTodayMetrics(isLifetime?: boolean): Cairo today metrics.
3. getWeeklyMetrics(isLifetime?: boolean): Cairo this week metrics.
4. getMonthlyMetrics(isLifetime?: boolean): Cairo this month metrics.
5. getRevenueAnalytics(startDate: string, endDate: string, isLifetime?: boolean): Revenue metrics between YYYY-MM-DD.
6. getTrafficAnalytics(startDate: string, endDate: string, isLifetime?: boolean): Traffic details between YYYY-MM-DD.
7. getStudentAnalytics(startDate: string, endDate: string, isLifetime?: boolean): Student registration count between YYYY-MM-DD.
8. getTopCourses(startDate: string, endDate: string, limit: number, isLifetime?: boolean): Course sales rankings.
9. generateExcelReport(startDate: string, endDate: string, title: string): Generates the Excel report.
10. searchStudents(query: string): Searches students by name or email.
11. searchOrders(query: string): Searches orders by ID, customer name, email, coupon, or course.
12. searchCoupons(code?: string): Searches coupons and usage details.
13. getCourseAnalytics(isLifetime?: boolean): Returns detailed course metrics (base price, enrollments, sales, revenue).
14. getPaymentMethodStats(isLifetime?: boolean): Returns aggregated payment method stats (completed/failed/pending/revenue).

Current local date is: ${cairoDateStr}. (Cairo Time).
Use this date to compute relative ranges.
`;

export async function runAgent(
  chatId: string,
  userMessage: string
): Promise<{ text: string; fileAttachment?: { path: string; name: string } }> {
  const settings = await getKV<any>("marketing_settings");
  const analyticsResetDate = settings?.analyticsResetDate || "";
  const analyticsMode = settings?.analyticsMode || "reset";

  const lowerMsg = userMessage.toLowerCase().trim();
  const isLifetimeRequest = 
    lowerMsg.includes("lifetime") || 
    lowerMsg.includes("all time") || 
    lowerMsg.includes("historical") || 
    lowerMsg.includes("الكل") || 
    lowerMsg.includes("مدى الحياة") || 
    lowerMsg.includes("التاريخي") || 
    lowerMsg.includes("التاريخ الكامل") || 
    lowerMsg.includes("كل الأوقات") || 
    lowerMsg.includes("من البداية") || 
    lowerMsg.includes("الأوقات كلها") || 
    lowerMsg.includes("تاريخي");

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

  const systemPrompt = SYSTEM_PROMPT(cairoDateStr, analyticsResetDate, analyticsMode);

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
      const sanitizedText = sanitizeMarkdown(responseText);
      messages.push({ role: "assistant", content: sanitizedText });
      await saveHistory(historyKey, messages);
      return { text: sanitizedText, fileAttachment };
    }

    let actionObj: any;
    try {
      actionObj = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("[AGENT_LOOP] JSON parse error on match:", jsonMatch[0]);
      const sanitizedText = sanitizeMarkdown(responseText);
      messages.push({ role: "assistant", content: sanitizedText });
      await saveHistory(historyKey, messages);
      return { text: sanitizedText, fileAttachment };
    }

    if (actionObj.action === "final_answer") {
      const sanitizedAnswer = sanitizeMarkdown(actionObj.answer);
      const sanitizedResponseText = JSON.stringify({
        ...actionObj,
        answer: sanitizedAnswer
      });
      messages.push({ role: "assistant", content: sanitizedResponseText });
      await saveHistory(historyKey, messages);
      return { text: sanitizedAnswer, fileAttachment };
    }

    if (actionObj.action === "call_tool") {
      const toolName = actionObj.tool;
      const args = actionObj.arguments || {};
      
      console.log(`[AGENT_LOOP] Executing tool: ${toolName} with args:`, args);
      let toolResult: any;

      try {
        switch (toolName) {
          case "getPlatformOverview":
            toolResult = await getPlatformOverview(isLifetimeRequest);
            break;
          case "getTodayMetrics":
            toolResult = await getTodayMetrics(isLifetimeRequest);
            break;
          case "getWeeklyMetrics":
            toolResult = await getWeeklyMetrics(isLifetimeRequest);
            break;
          case "getMonthlyMetrics":
            toolResult = await getMonthlyMetrics(isLifetimeRequest);
            break;
          case "getRevenueAnalytics":
            toolResult = await getRevenueAnalytics(args.startDate, args.endDate, isLifetimeRequest);
            break;
          case "getTrafficAnalytics":
            toolResult = await getTrafficAnalytics(args.startDate, args.endDate, isLifetimeRequest);
            break;
          case "getStudentAnalytics":
            toolResult = await getStudentAnalytics(args.startDate, args.endDate, isLifetimeRequest);
            break;
          case "getTopCourses":
            toolResult = await getTopCourses(args.startDate, args.endDate, args.limit, isLifetimeRequest);
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
          case "searchStudents":
            toolResult = await searchStudentsTool(args.query);
            break;
          case "searchOrders":
            toolResult = await searchOrdersTool(args.query);
            break;
          case "searchCoupons":
            toolResult = await searchCouponsTool(args.code);
            break;
          case "getCourseAnalytics":
            toolResult = await getCourseAnalyticsTool(isLifetimeRequest);
            break;
          case "getPaymentMethodStats":
            toolResult = await getPaymentMethodStatsTool(isLifetimeRequest);
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
    const sanitizedText = sanitizeMarkdown(responseText);
    messages.push({ role: "assistant", content: sanitizedText });
    await saveHistory(historyKey, messages);
    return { text: sanitizedText };
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
