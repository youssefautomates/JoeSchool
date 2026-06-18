import { supabaseAdmin } from "./supabaseAdmin";
import { sendTelegramMessage, getTelegramSettings, sendTelegramDocument, sanitizeMarkdown } from "./telegram";
import { Resend } from "resend";
import ExcelJS from "exceljs";

// Types for compiled report metrics
export interface ReportMetrics {
  revenue: number;
  orders: number;
  newStudents: number;
  aov: number;
  visits: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  checkoutSessions: number;
  conversionRate: number;
  bestSellingCourse: string;
  
  // Growth fields
  revenueGrowth: number;
  ordersGrowth: number;
  studentsGrowth: number;
  visitsGrowth: number;
  uniqueGrowth: number;
  newVisitorsGrowth: number;
  returningVisitorsGrowth: number;
  checkoutGrowth: number;
  conversionChange: number; // percentage point difference
  conversionGrowth: number; // percentage rate growth
  aovGrowth: number;
}

export interface CourseSalesData {
  courseName: string;
  sales: number;
  revenue: number;
}

export interface ReportData {
  type: 'daily' | 'weekly' | 'monthly';
  periodLabel: string;
  prevPeriodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  prevPeriodStart: Date;
  prevPeriodEnd: Date;
  metrics: ReportMetrics;
  prevMetrics: ReportMetrics;
  orders: any[];
  coursesPerformance: CourseSalesData[];
  insights: string[];
  opportunities: string[];
  alerts?: string[];
}

/**
 * 🌍 Cairo Offset Calculator & Parser
 * Converts local ISO-like Cairo time string (e.g. "2026-06-16T00:00:00") to a standard UTC Date
 */
export function getUtcDateFromCairoLocal(localIsoStr: string): Date {
  const dateInUtc = new Date(localIsoStr + 'Z');
  
  // Format the dateInUtc in Africa/Cairo to compare
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(dateInUtc);
  
  const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const formattedLocalStr = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}`;
  
  const diffMs = new Date(formattedLocalStr + 'Z').getTime() - dateInUtc.getTime();
  return new Date(new Date(localIsoStr + 'Z').getTime() - diffMs);
}

/**
 * Helper to calculate growth percentage safely
 */
function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Compiles all data and formats metrics for a report period
 */
export async function compileReportData(type: 'daily' | 'weekly' | 'monthly', now: Date): Promise<ReportData> {
  const cairoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  
  let periodStart: Date;
  let periodEnd: Date;
  let prevPeriodStart: Date;
  let prevPeriodEnd: Date;
  
  let periodLabel = "";
  let prevPeriodLabel = "";
  
  if (type === 'daily') {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    const yStr = cairoFormatter.format(yesterday);
    const tStr = cairoFormatter.format(twoDaysAgo);
    
    periodStart = getUtcDateFromCairoLocal(`${yStr}T00:00:00`);
    periodEnd = getUtcDateFromCairoLocal(`${yStr}T23:59:59.999`);
    
    prevPeriodStart = getUtcDateFromCairoLocal(`${tStr}T00:00:00`);
    prevPeriodEnd = getUtcDateFromCairoLocal(`${tStr}T23:59:59.999`);
    
    periodLabel = yStr;
    prevPeriodLabel = tStr;
  } else if (type === 'weekly') {
    // Covers previous week: last Saturday to Friday
    // If runs on Saturday, yesterday was Friday, 7 days ago was Saturday
    const endOfWeek = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const endOfPrevWeek = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const startOfPrevWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const startStr = cairoFormatter.format(startOfWeek);
    const endStr = cairoFormatter.format(endOfWeek);
    const pStartStr = cairoFormatter.format(startOfPrevWeek);
    const pEndStr = cairoFormatter.format(endOfPrevWeek);
    
    periodStart = getUtcDateFromCairoLocal(`${startStr}T00:00:00`);
    periodEnd = getUtcDateFromCairoLocal(`${endStr}T23:59:59.999`);
    
    prevPeriodStart = getUtcDateFromCairoLocal(`${pStartStr}T00:00:00`);
    prevPeriodEnd = getUtcDateFromCairoLocal(`${pEndStr}T23:59:59.999`);
    
    periodLabel = `${startStr} to ${endStr}`;
    prevPeriodLabel = `${pStartStr} to ${pEndStr}`;
  } else {
    // Monthly: previous calendar month
    const cairoYear = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric' }).format(now), 10);
    const cairoMonth = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', month: 'numeric' }).format(now), 10);
    
    let reportMonth = cairoMonth - 1;
    let reportYear = cairoYear;
    if (reportMonth === 0) {
      reportMonth = 12;
      reportYear = cairoYear - 1;
    }
    const lastDay = new Date(Date.UTC(reportYear, reportMonth, 0)).getUTCDate();
    const startStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
    const endStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    periodStart = getUtcDateFromCairoLocal(`${startStr}T00:00:00`);
    periodEnd = getUtcDateFromCairoLocal(`${endStr}T23:59:59.999`);
    
    let prevMonth = reportMonth - 1;
    let prevYear = reportYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = reportYear - 1;
    }
    const prevLastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    const pStartStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const pEndStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;
    
    prevPeriodStart = getUtcDateFromCairoLocal(`${pStartStr}T00:00:00`);
    prevPeriodEnd = getUtcDateFromCairoLocal(`${pEndStr}T23:59:59.999`);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    periodLabel = `${monthNames[reportMonth - 1]} ${reportYear}`;
    prevPeriodLabel = `${monthNames[prevMonth - 1]} ${prevYear}`;
  }

  // 1. Fetch Users
  let allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(`[REPORTS] Error fetching users on page ${page}:`, error);
      break;
    }
    if (!data?.users || data.users.length === 0) break;
    allUsers.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  // Helper to compile core metrics from Supabase
  const compileRawMetrics = async (start: Date, end: Date) => {
    // Fetch completed orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (ordersError) {
      console.error("[REPORTS] Error fetching orders:", ordersError);
    }
    
    const completedOrders = orders || [];
    const revenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const ordersCount = completedOrders.length;
    
    // Count new registrations
    const newStudents = allUsers.filter(u => {
      const created = new Date(u.created_at);
      return created >= start && created <= end;
    }).length;
    
    const aov = ordersCount > 0 ? revenue / ordersCount : 0;
    
    // Fetch analytics events
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('analytics_events')
      .select('session_id, event_name, metadata, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
      
    if (eventsError) {
      console.error("[REPORTS] Error fetching events:", eventsError);
    }
    
    const analytics = events || [];
    const visits = analytics.filter(e => e.event_name === 'page_view').length;
    
    const uniqueSessionIds = [...new Set(analytics.map(e => e.session_id).filter(Boolean))];
    const uniqueVisitors = uniqueSessionIds.length;
    
    // Calculate new vs returning visitors
    let newVisitors = 0;
    let returningVisitors = 0;
    
    if (uniqueSessionIds.length > 0) {
      const { data: historicalEvents } = await supabaseAdmin
        .from('analytics_events')
        .select('session_id')
        .in('session_id', uniqueSessionIds)
        .lt('created_at', start.toISOString());
        
      const oldSessions = new Set((historicalEvents || []).map(h => h.session_id));
      newVisitors = uniqueSessionIds.filter(s => !oldSessions.has(s)).length;
      returningVisitors = uniqueSessionIds.filter(s => oldSessions.has(s)).length;
    }
    
    // Calculate checkout sessions (page views on path starting with /checkout, excluding success/failed)
    const checkoutSessions = [...new Set(
      analytics
        .filter(e => {
          if (e.event_name !== 'page_view') return false;
          const path = e.metadata?.pathname || e.metadata?.path || "";
          return path.startsWith('/checkout') && !path.includes('/success') && !path.includes('/failed');
        })
        .map(e => e.session_id)
        .filter(Boolean)
    )].length;
    
    const conversionRate = uniqueVisitors > 0 ? (ordersCount / uniqueVisitors) * 100 : 0;
    
    // Calculate Course Performance
    const courseSalesMap: { [course: string]: CourseSalesData } = {};
    completedOrders.forEach(o => {
      const title = o.product_title || "Unknown Course";
      if (!courseSalesMap[title]) {
        courseSalesMap[title] = { courseName: title, sales: 0, revenue: 0 };
      }
      courseSalesMap[title].sales += 1;
      courseSalesMap[title].revenue += o.amount || 0;
    });
    
    const coursesPerformance = Object.values(courseSalesMap).sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);
    const bestSellingCourse = coursesPerformance[0]?.courseName || "N/A";
    
    return {
      revenue,
      orders: ordersCount,
      newStudents,
      aov,
      visits,
      uniqueVisitors,
      newVisitors,
      returningVisitors,
      checkoutSessions,
      conversionRate,
      bestSellingCourse,
      coursesPerformance,
      rawOrders: completedOrders
    };
  };

  // Compile active and previous period metrics
  const currentData = await compileRawMetrics(periodStart, periodEnd);
  const prevData = await compileRawMetrics(prevPeriodStart, prevPeriodEnd);

  // Compute growths
  const metrics: ReportMetrics = {
    revenue: currentData.revenue,
    orders: currentData.orders,
    newStudents: currentData.newStudents,
    aov: currentData.aov,
    visits: currentData.visits,
    uniqueVisitors: currentData.uniqueVisitors,
    newVisitors: currentData.newVisitors,
    returningVisitors: currentData.returningVisitors,
    checkoutSessions: currentData.checkoutSessions,
    conversionRate: currentData.conversionRate,
    bestSellingCourse: currentData.bestSellingCourse,
    
    revenueGrowth: calculateGrowth(currentData.revenue, prevData.revenue),
    ordersGrowth: calculateGrowth(currentData.orders, prevData.orders),
    studentsGrowth: calculateGrowth(currentData.newStudents, prevData.newStudents),
    visitsGrowth: calculateGrowth(currentData.visits, prevData.visits),
    uniqueGrowth: calculateGrowth(currentData.uniqueVisitors, prevData.uniqueVisitors),
    newVisitorsGrowth: calculateGrowth(currentData.newVisitors, prevData.newVisitors),
    returningVisitorsGrowth: calculateGrowth(currentData.returningVisitors, prevData.returningVisitors),
    checkoutGrowth: calculateGrowth(currentData.checkoutSessions, prevData.checkoutSessions),
    conversionChange: currentData.conversionRate - prevData.conversionRate,
    conversionGrowth: calculateGrowth(currentData.conversionRate, prevData.conversionRate),
    aovGrowth: calculateGrowth(currentData.aov, prevData.aov)
  };

  const prevMetrics: ReportMetrics = {
    revenue: prevData.revenue,
    orders: prevData.orders,
    newStudents: prevData.newStudents,
    aov: prevData.aov,
    visits: prevData.visits,
    uniqueVisitors: prevData.uniqueVisitors,
    newVisitors: prevData.newVisitors,
    returningVisitors: prevData.returningVisitors,
    checkoutSessions: prevData.checkoutSessions,
    conversionRate: prevData.conversionRate,
    bestSellingCourse: prevData.bestSellingCourse,
    
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

  // Generate Key Insights and Opportunities dynamically
  const insights: string[] = [];
  const opportunities: string[] = [];

  // Insight: Revenue
  if (metrics.revenueGrowth > 5) {
    insights.push(`Revenue increased by ${metrics.revenueGrowth.toFixed(1)}% compared to the previous period.`);
  } else if (metrics.revenueGrowth < -5) {
    insights.push(`Revenue decreased by ${Math.abs(metrics.revenueGrowth).toFixed(1)}% compared to the previous period.`);
  } else {
    insights.push(`Revenue remained stable (change of ${metrics.revenueGrowth.toFixed(1)}%).`);
  }

  // Insight: Traffic
  if (metrics.visitsGrowth > 5) {
    insights.push(`Website traffic increased by ${metrics.visitsGrowth.toFixed(1)}% (Total visits: ${metrics.visits}).`);
  } else if (metrics.visitsGrowth < -5) {
    insights.push(`Website traffic decreased by ${Math.abs(metrics.visitsGrowth).toFixed(1)}%.`);
  }

  // Insight: Conversion
  if (metrics.conversionChange > 0.5) {
    insights.push(`Conversion rate increased by ${metrics.conversionChange.toFixed(2)}% percentage points to ${metrics.conversionRate.toFixed(2)}%.`);
  } else if (metrics.conversionChange < -0.5) {
    insights.push(`Conversion rate decreased by ${Math.abs(metrics.conversionChange).toFixed(2)}% percentage points to ${metrics.conversionRate.toFixed(2)}%.`);
  }

  // Insight: Course
  if (currentData.bestSellingCourse !== "N/A") {
    const bestSales = currentData.coursesPerformance[0]?.sales || 0;
    insights.push(`Course "${currentData.bestSellingCourse}" was the top seller with ${bestSales} enrollments.`);
  }

  // Insight: Students
  if (metrics.studentsGrowth > 5) {
    insights.push(`Student registrations increased by ${metrics.studentsGrowth.toFixed(1)}% (New students: ${metrics.newStudents}).`);
  }

  // Opportunity: Conversion Optimizations
  if (metrics.visitsGrowth > 10 && metrics.revenueGrowth < 2) {
    opportunities.push("Traffic is growing faster than revenue. Consider auditing the checkout page for potential user friction.");
  }

  // Opportunity: Course Dominance
  if (currentData.coursesPerformance.length > 0 && totalRevenueSum(currentData.coursesPerformance) > 0) {
    const totalRev = totalRevenueSum(currentData.coursesPerformance);
    const topCourseRev = currentData.coursesPerformance[0]?.revenue || 0;
    if (topCourseRev / totalRev > 0.6) {
      opportunities.push(`"${currentData.bestSellingCourse}" represents over 60% of total revenue. Consider cross-selling other programs to diversify risk.`);
    }
  }

  // Opportunity: General Low Conversion
  if (metrics.conversionRate < 1.0 && metrics.visits > 100) {
    opportunities.push("Overall conversion rate is low (below 1%). Launching a retargeting campaign or offering a limited-time coupon could boost sales.");
  }

  // Opportunity: AOV
  if (metrics.aovGrowth < -5) {
    opportunities.push("Average Order Value (AOV) has decreased. Consider bundling courses or introducing higher-priced tiers.");
  } else if (metrics.aovGrowth > 10) {
    opportunities.push("Average Order Value (AOV) is rising. This shows strong demand for premium course bundles or individual offerings.");
  }

  // Proactive Alerts Engine (Section 2)
  const alerts: string[] = [];
  
  // 1. Revenue drop alert (>20% drop)
  if (metrics.revenueGrowth <= -20 && prevMetrics.revenue > 100) {
    alerts.push(`Revenue dropped by ${Math.abs(metrics.revenueGrowth).toFixed(1)}% compared to the previous period (Current: ${metrics.revenue} EGP vs Prev: ${prevMetrics.revenue} EGP).`);
  }
  
  // 2. Conversion rate drop alert (>1.5% points drop)
  if (metrics.conversionChange <= -1.5) {
    alerts.push(`Conversion rate dropped significantly by ${Math.abs(metrics.conversionChange).toFixed(2)}% percentage points to ${metrics.conversionRate.toFixed(2)}%.`);
  }
  
  // 3. Traffic spike alert (>50% increase)
  if (metrics.visitsGrowth >= 50 && prevMetrics.visits > 10) {
    alerts.push(`Traffic spiked unexpectedly by ${metrics.visitsGrowth.toFixed(1)}% (Visits: ${metrics.visits} vs Prev: ${prevMetrics.visits}).`);
  }
  
  // 4. Sales drought alert (0 orders, while prev had >=1)
  if (metrics.orders === 0 && prevMetrics.orders >= 1) {
    alerts.push(`Alert: No orders were completed during this period (Previous period had ${prevMetrics.orders} orders).`);
  }
  
  // 5. New Daily Revenue Record check
  if (type === 'daily' && metrics.revenue > 0) {
    try {
      const { data: dailyLogs } = await supabaseAdmin
        .from('report_logs')
        .select('metadata')
        .eq('report_type', 'daily');
        
      if (dailyLogs && dailyLogs.length > 0) {
        const revenues = dailyLogs.map(l => Number(l.metadata?.revenue || 0));
        const maxPastRevenue = Math.max(...revenues, 0);
        if (metrics.revenue > maxPastRevenue) {
          alerts.push(`🎉 New Daily Revenue Record reached! Yesterday's revenue was ${metrics.revenue.toLocaleString()} EGP (Previous highest daily revenue: ${maxPastRevenue.toLocaleString()} EGP).`);
        }
      } else {
        // First daily report ever
        alerts.push(`🎉 First daily revenue milestone logged! Revenue: ${metrics.revenue.toLocaleString()} EGP.`);
      }
    } catch (err) {
      console.error("[REPORTS ALERT] Error checking revenue records:", err);
    }
  }

  // Default fallbacks if lists are empty
  if (insights.length === 0) {
    insights.push("No significant performance shifts detected during this period.");
  }
  if (opportunities.length === 0) {
    opportunities.push("Maintain current advertising allocation and continue monitoring conversion funnels.");
  }

  return {
    type,
    periodLabel,
    prevPeriodLabel,
    periodStart,
    periodEnd,
    prevPeriodStart,
    prevPeriodEnd,
    metrics,
    prevMetrics,
    orders: currentData.rawOrders,
    coursesPerformance: currentData.coursesPerformance,
    insights,
    opportunities,
    alerts
  };
}

function totalRevenueSum(courses: CourseSalesData[]): number {
  return courses.reduce((sum, c) => sum + c.revenue, 0);
}

/**
 * Generates the clean HTML/Text formatted report for Telegram
 */
export function generateTelegramReportMessage(reportData: ReportData): string {
  const m = reportData.metrics;
  const tLabel = reportData.type.toUpperCase();
  const emoji = reportData.type === 'daily' ? '📊' : reportData.type === 'weekly' ? '📈' : '🏆';
  
  // Format helpers
  const formatPct = (val: number) => {
    return `${val >= 0 ? '🟢 +' : '🔴 '}${val.toFixed(1)}%`;
  };
  const formatChangePoint = (val: number) => {
    return `${val >= 0 ? '🟢 +' : '🔴 '}${val.toFixed(2)}% pts`;
  };

  let message = "";
  
  // Prepend proactive alerts if any
  if (reportData.alerts && reportData.alerts.length > 0) {
    message += `⚠️ <b>PROACTIVE BUSINESS ALERT</b>\n`;
    reportData.alerts.forEach(a => {
      message += `• ${a}\n`;
    });
    message += `------------------------------------\n\n`;
  }

  message += `${emoji} <b>JOESCHOOL ${tLabel} BUSINESS REPORT</b>\n`;
  message += `📅 <b>Period:</b> ${reportData.periodLabel}\n\n`;
  
  message += `📊 <b>Performance Summary</b>\n`;
  message += `• <b>Total Revenue:</b> ${m.revenue.toLocaleString()} EGP (${formatPct(m.revenueGrowth)})\n`;
  message += `• <b>Total Orders:</b> ${m.orders} (${formatPct(m.ordersGrowth)})\n`;
  message += `• <b>New Students:</b> ${m.newStudents} (${formatPct(m.studentsGrowth)})\n`;
  message += `• <b>Average Order Value:</b> ${Math.round(m.aov)} EGP (${formatPct(m.aovGrowth)})\n\n`;

  message += `🌐 <b>Traffic & Conversions</b>\n`;
  message += `• <b>Total Visits:</b> ${m.visits} (${formatPct(m.visitsGrowth)})\n`;
  message += `• <b>Unique Visitors:</b> ${m.uniqueVisitors} (${formatPct(m.uniqueGrowth)})\n`;
  message += `• <b>Conversion Rate:</b> ${m.conversionRate.toFixed(2)}% (${formatChangePoint(m.conversionChange)})\n\n`;

  const topLimit = reportData.type === 'daily' ? 5 : 10;
  message += `🔥 <b>Top Courses (Max ${topLimit})</b>\n`;
  if (reportData.coursesPerformance.length === 0) {
    message += `• No sales recorded.\n\n`;
  } else {
    reportData.coursesPerformance.slice(0, topLimit).forEach((c, idx) => {
      message += `${idx + 1}. ${c.courseName} (${c.sales} sales | ${c.revenue.toLocaleString()} EGP)\n`;
    });
    message += `\n`;
  }

  // Business Insights Section as requested by the user
  message += `💡 <b>Key Insights</b>\n`;
  reportData.insights.forEach(i => {
    message += `• ${i}\n`;
  });
  message += `\n`;

  message += `🚀 <b>Opportunities</b>\n`;
  reportData.opportunities.forEach(o => {
    message += `• ${o}\n`;
  });

  return sanitizeMarkdown(message);
}

/**
 * Generates structured Excel Workbook using ExcelJS
 */
export async function generateExcelReport(reportData: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JoeSchool BI';
  workbook.lastModifiedBy = 'JoeSchool BI';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // ==========================================
  // SHEET 1: Executive Summary
  // ==========================================
  const summarySheet = workbook.addWorksheet('Executive Summary', { views: [{ showGridLines: true }] });
  
  // Title
  summarySheet.addRow([]);
  const titleRow = summarySheet.addRow(['JoeSchool Performance Executive Summary']);
  titleRow.getCell(1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFD6004B' } };
  
  const periodRow = summarySheet.addRow([`Reporting Period: ${reportData.periodLabel} (vs ${reportData.prevPeriodLabel})`]);
  periodRow.getCell(1).font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } };
  summarySheet.addRow([]);
  
  // Headers
  const summaryHeader = summarySheet.addRow(['KPI Metric', 'Current Period', 'Previous Period', 'Growth / Change %']);
  summaryHeader.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD6004B' } // JoeSchool Theme Pink/Red
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
  });
  
  const m = reportData.metrics;
  const pm = reportData.prevMetrics;
  
  const summaryData = [
    ['Total Revenue', m.revenue, pm.revenue, m.revenueGrowth],
    ['Total Orders', m.orders, pm.orders, m.ordersGrowth],
    ['Total New Students', m.newStudents, pm.newStudents, m.studentsGrowth],
    ['Total Website Visits', m.visits, pm.visits, m.visitsGrowth],
    ['Unique Visitors', m.uniqueVisitors, pm.uniqueVisitors, m.uniqueGrowth],
    ['Conversion Rate', m.conversionRate / 100, pm.conversionRate / 100, m.conversionChange],
    ['Average Order Value (AOV)', m.aov, pm.aov, m.aovGrowth],
    ['Best Selling Course', m.bestSellingCourse, pm.bestSellingCourse, 0]
  ];

  summaryData.forEach((rowValues) => {
    const row = summarySheet.addRow([
      rowValues[0],
      rowValues[0] === 'Best Selling Course' ? rowValues[1] : rowValues[1],
      rowValues[0] === 'Best Selling Course' ? rowValues[2] : rowValues[2],
      rowValues[0] === 'Best Selling Course' ? 'N/A' : rowValues[3]
    ]);
    
    // Formatting numbers
    const metricName = rowValues[0] as string;
    const currentCell = row.getCell(2);
    const prevCell = row.getCell(3);
    const growthCell = row.getCell(4);
    
    if (metricName.includes('Revenue') || metricName.includes('Value')) {
      currentCell.numFmt = '#,##0.00" EGP"';
      prevCell.numFmt = '#,##0.00" EGP"';
    } else if (metricName.includes('Rate')) {
      currentCell.numFmt = '0.00%';
      prevCell.numFmt = '0.00%';
    } else if (!metricName.includes('Course')) {
      currentCell.numFmt = '#,##0';
      prevCell.numFmt = '#,##0';
    }
    
    // Formatting growth cells
    if (metricName !== 'Best Selling Course') {
      const growthVal = rowValues[3] as number;
      if (metricName.includes('Rate')) {
        growthCell.numFmt = '+0.00"% pts";-0.00"% pts";"0.00% pts"';
      } else {
        growthCell.numFmt = '+0.0%";-0.0%";"0.0%"';
      }
      
      if (growthVal > 0) {
        growthCell.font = { name: 'Calibri', color: { argb: 'FF15803D' }, bold: true }; // Green
      } else if (growthVal < 0) {
        growthCell.font = { name: 'Calibri', color: { argb: 'FFB91C1C' }, bold: true }; // Red
      }
    }
    
    row.eachCell(c => {
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });
  
  autoSizeColumns(summarySheet);

  // ==========================================
  // SHEET 2: Orders
  // ==========================================
  const ordersSheet = workbook.addWorksheet('Orders', { views: [{ showGridLines: true }] });
  const ordersHeader = ordersSheet.addRow([
    'Order ID', 'Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'Product / Course Name', 'Original Price', 'Discount Amount', 'Final Paid Amount', 'Coupon Code'
  ]);
  
  ordersHeader.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD6004B' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let totalOriginal = 0;
  let totalDiscounts = 0;
  let totalFinal = 0;

  reportData.orders.forEach(o => {
    const originalPrice = o.subtotal_price || o.amount || 0;
    const finalPaid = o.amount || 0;
    const discountAmount = Math.max(0, originalPrice - (finalPaid - (o.gateway_fee_amount || 0)));
    
    totalOriginal += originalPrice;
    totalDiscounts += discountAmount;
    totalFinal += finalPaid;

    const row = ordersSheet.addRow([
      o.invoice_id || o.id,
      new Date(o.created_at).toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
      o.customer_name || 'Manual Grant',
      o.customer_email,
      o.customer_phone || '',
      o.product_title,
      originalPrice,
      discountAmount,
      finalPaid,
      o.coupon_code || ''
    ]);

    row.getCell(7).numFmt = '#,##0.00" EGP"';
    row.getCell(8).numFmt = '#,##0.00" EGP"';
    row.getCell(9).numFmt = '#,##0.00" EGP"';
    
    row.eachCell(c => {
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Totals Row
  const ordersTotalRow = ordersSheet.addRow([
    'Total', '', '', '', '', '', totalOriginal, totalDiscounts, totalFinal, ''
  ]);
  ordersTotalRow.eachCell((c, idx) => {
    c.font = { name: 'Calibri', bold: true };
    if (idx === 7 || idx === 8 || idx === 9) {
      c.numFmt = '#,##0.00" EGP"';
    }
    c.border = {
      top: { style: 'medium', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'double', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
  });

  autoSizeColumns(ordersSheet);

  // ==========================================
  // SHEET 3: Course Performance
  // ==========================================
  const courseSheet = workbook.addWorksheet('Course Performance', { views: [{ showGridLines: true }] });
  const courseHeader = courseSheet.addRow([
    'Course Name', 'Total Sales', 'Total Revenue', 'Average Revenue Per Sale', 'Percentage Contribution To Total Revenue'
  ]);
  
  courseHeader.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD6004B' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let totalSales = 0;
  let totalRevenue = 0;

  reportData.coursesPerformance.forEach(c => {
    totalSales += c.sales;
    totalRevenue += c.revenue;
  });

  reportData.coursesPerformance.forEach(c => {
    const contribution = totalRevenue > 0 ? c.revenue / totalRevenue : 0;
    const avgRev = c.sales > 0 ? c.revenue / c.sales : 0;

    const row = courseSheet.addRow([
      c.courseName,
      c.sales,
      c.revenue,
      avgRev,
      contribution
    ]);

    row.getCell(2).numFmt = '#,##0';
    row.getCell(3).numFmt = '#,##0.00" EGP"';
    row.getCell(4).numFmt = '#,##0.00" EGP"';
    row.getCell(5).numFmt = '0.0%';

    row.eachCell(c => {
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Totals Row
  const courseTotalRow = courseSheet.addRow([
    'Total',
    totalSales,
    totalRevenue,
    totalSales > 0 ? totalRevenue / totalSales : 0,
    totalRevenue > 0 ? 1.0 : 0
  ]);
  courseTotalRow.eachCell((c, idx) => {
    c.font = { name: 'Calibri', bold: true };
    if (idx === 2) c.numFmt = '#,##0';
    if (idx === 3 || idx === 4) c.numFmt = '#,##0.00" EGP"';
    if (idx === 5) c.numFmt = '0.0%';
    c.border = {
      top: { style: 'medium', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'double', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
  });

  autoSizeColumns(courseSheet);

  // ==========================================
  // SHEET 4: Traffic & Conversion Analytics
  // ==========================================
  const trafficSheet = workbook.addWorksheet('Traffic & Conversion Analytics', { views: [{ showGridLines: true }] });
  const trafficHeader = trafficSheet.addRow([
    'Metric', 'Current Period', 'Previous Period', 'Growth / Change %'
  ]);
  
  trafficHeader.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD6004B' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const trafficData = [
    ['Total Visits', m.visits, pm.visits, m.visitsGrowth],
    ['Unique Visitors', m.uniqueVisitors, pm.uniqueVisitors, m.uniqueGrowth],
    ['New Visitors', m.newVisitors, pm.newVisitors, m.newVisitorsGrowth],
    ['Returning Visitors', m.returningVisitors, pm.returningVisitors, m.returningVisitorsGrowth],
    ['Checkout Sessions', m.checkoutSessions, pm.checkoutSessions, m.checkoutGrowth],
    ['Completed Orders', m.orders, pm.orders, m.ordersGrowth],
    ['Conversion Rate', m.conversionRate / 100, pm.conversionRate / 100, m.conversionChange],
    ['Monthly Growth % (Conversion)', m.conversionGrowth / 100, 0, 0]
  ];

  trafficData.forEach((rowValues) => {
    const row = trafficSheet.addRow([
      rowValues[0],
      rowValues[1],
      rowValues[2],
      String(rowValues[0]).includes('Growth %') ? 'N/A' : rowValues[3]
    ]);

    const metricName = rowValues[0] as string;
    const currentCell = row.getCell(2);
    const prevCell = row.getCell(3);
    const growthCell = row.getCell(4);

    if (metricName.includes('Rate') || metricName.includes('Growth %')) {
      currentCell.numFmt = '0.00%';
      prevCell.numFmt = '0.00%';
    } else {
      currentCell.numFmt = '#,##0';
      prevCell.numFmt = '#,##0';
    }

    if (!metricName.includes('Growth %')) {
      const growthVal = rowValues[3] as number;
      if (metricName.includes('Rate')) {
        growthCell.numFmt = '+0.00"% pts";-0.00"% pts";"0.00% pts"';
      } else {
        growthCell.numFmt = '+0.0%";-0.0%";"0.0%"';
      }

      if (growthVal > 0) {
        growthCell.font = { name: 'Calibri', color: { argb: 'FF15803D' }, bold: true };
      } else if (growthVal < 0) {
        growthCell.font = { name: 'Calibri', color: { argb: 'FFB91C1C' }, bold: true };
      }
    }

    row.eachCell(c => {
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  autoSizeColumns(trafficSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Automates sizing columns based on maximum character length in cells
 */
function autoSizeColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell && column.eachCell({ includeEmpty: true }, cell => {
      const val = cell.value;
      if (val !== null && val !== undefined) {
        let textLen = 0;
        if (typeof val === 'object' && 'text' in val) {
          textLen = (val as any).text.toString().length;
        } else if (typeof val === 'object' && 'result' in val) {
          textLen = (val as any).result.toString().length;
        } else if (cell.numFmt && cell.numFmt.includes('%') && typeof val === 'number') {
          // Format representations
          textLen = (val * 100).toFixed(2).toString().length + 5;
        } else {
          textLen = val.toString().length;
        }
        if (textLen > maxLength) {
          maxLength = textLen;
        }
      }
    });
    column.width = Math.max(maxLength + 4, 12);
  });
}

/**
 * Sends the monthly report email with the Excel attachment to support@joeschool.com
 */
export async function sendMonthlyExcelReportEmail(reportData: ReportData, excelBuffer: Buffer): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[REPORTS EMAIL] Resend API key is missing from environment variables.");
    return false;
  }

  const resend = new Resend(apiKey);
  const m = reportData.metrics;
  const pm = reportData.prevMetrics;

  const emailHtml = `
  <!DOCTYPE html>
  <html dir="ltr" lang="en">
  <head>
    <meta charset="utf-8">
    <title>JoeSchool Monthly Business Report - ${reportData.periodLabel}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
      .container { max-width: 650px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin: 0 auto; }
      .header { background-color: #0f172a; padding: 32px 24px; text-align: center; border-bottom: 4px solid #D6004B; color: #ffffff; }
      .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
      .header p { margin: 6px 0 0 0; font-size: 14px; color: #94a3b8; }
      .body { padding: 32px 24px; }
      .summary-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      .summary-table th { background-color: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
      .summary-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; color: #334155; }
      .summary-table tr:last-child td { border-bottom: none; }
      .trend-green { color: #16a34a; font-weight: bold; }
      .trend-red { color: #dc2626; font-weight: bold; }
      .insights-section { background-color: #fafafa; border-right: 4px solid #D6004B; border-radius: 6px; padding: 16px; margin-top: 24px; }
      .insights-section h3 { margin: 0 0 10px 0; font-size: 14px; color: #0f172a; }
      .insights-section ul { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #475569; }
      .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📊 JoeSchool Monthly Business Report</h1>
        <p>Period: ${reportData.periodLabel} (vs ${reportData.prevPeriodLabel})</p>
      </div>
      <div class="body">
        <p>Dear Admin,</p>
        <p>The monthly business performance report for JoeSchool has been compiled and is attached as an Excel spreadsheet.</p>
        
        <h3>📈 KPI Executive Summary</h3>
        <table class="summary-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Current Month</th>
              <th>Previous Month</th>
              <th>Change %</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Revenue</td>
              <td><b>${m.revenue.toLocaleString()} EGP</b></td>
              <td>${pm.revenue.toLocaleString()} EGP</td>
              <td><span class="${m.revenueGrowth >= 0 ? 'trend-green' : 'trend-red'}">${m.revenueGrowth >= 0 ? '+' : ''}${m.revenueGrowth.toFixed(1)}%</span></td>
            </tr>
            <tr>
              <td>Completed Orders</td>
              <td><b>${m.orders}</b></td>
              <td>${pm.orders}</td>
              <td><span class="${m.ordersGrowth >= 0 ? 'trend-green' : 'trend-red'}">${m.ordersGrowth >= 0 ? '+' : ''}${m.ordersGrowth.toFixed(1)}%</span></td>
            </tr>
            <tr>
              <td>New Registered Students</td>
              <td><b>${m.newStudents}</b></td>
              <td>${pm.newStudents}</td>
              <td><span class="${m.studentsGrowth >= 0 ? 'trend-green' : 'trend-red'}">${m.studentsGrowth >= 0 ? '+' : ''}${m.studentsGrowth.toFixed(1)}%</span></td>
            </tr>
            <tr>
              <td>Website Visits</td>
              <td><b>${m.visits.toLocaleString()}</b></td>
              <td>${pm.visits.toLocaleString()}</td>
              <td><span class="${m.visitsGrowth >= 0 ? 'trend-green' : 'trend-red'}">${m.visitsGrowth >= 0 ? '+' : ''}${m.visitsGrowth.toFixed(1)}%</span></td>
            </tr>
            <tr>
              <td>Unique Visitors</td>
              <td><b>${m.uniqueVisitors.toLocaleString()}</b></td>
              <td>${pm.uniqueVisitors.toLocaleString()}</td>
              <td><span class="${m.uniqueGrowth >= 0 ? 'trend-green' : 'trend-red'}">${m.uniqueGrowth >= 0 ? '+' : ''}${m.uniqueGrowth.toFixed(1)}%</span></td>
            </tr>
            <tr>
              <td>Conversion Rate</td>
              <td><b>${m.conversionRate.toFixed(2)}%</b></td>
              <td>${pm.conversionRate.toFixed(2)}%</td>
              <td><span class="${m.conversionChange >= 0 ? 'trend-green' : 'trend-red'}">${m.conversionChange >= 0 ? '+' : ''}${m.conversionChange.toFixed(2)}% pts</span></td>
            </tr>
          </tbody>
        </table>

        <div class="insights-section">
          <h3>💡 Key Insights & Analytics</h3>
          <ul>
            ${reportData.insights.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>
        
        <p style="margin-top: 24px; font-size: 13px;">Please find the attached <b>JoeSchool_Report_${reportData.periodLabel.replace(' ', '_')}.xlsx</b> for the full audit breakdown, course sales, and traffic acquisition details.</p>
      </div>
      <div class="footer">
        <p>This report was generated automatically by JoeSchool BI Platform.</p>
        <p>&copy; ${new Date().getFullYear()} JoeSchool. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const filename = `JoeSchool_Report_${reportData.periodLabel.replace(' ', '_')}.xlsx`;
    console.log(`[REPORTS EMAIL] Sending report email with attachment: ${filename}`);

    const result = await resend.emails.send({
      from: "JoeSchool BI Reports <delivery@joeschool.com>",
      to: "support@joeschool.com",
      subject: `JoeSchool Monthly Business Report - ${reportData.periodLabel}`,
      html: emailHtml,
      attachments: [
        {
          filename: filename,
          content: excelBuffer
        }
      ]
    });

    if (result.error) {
      console.error("[REPORTS EMAIL] Resend returned error:", result.error);
      return false;
    }

    console.log("[REPORTS EMAIL] Email sent successfully!", result.data?.id);
    return true;
  } catch (err) {
    console.error("[REPORTS EMAIL] Exception sending email:", err);
    return false;
  }
}

/**
 * Orchestrates the full report execution, checks log safety, sends updates
 */
export async function runReportWorkflow(
  type: 'daily' | 'weekly' | 'monthly',
  executionTime: Date = new Date()
): Promise<{ success: boolean; executed: boolean; message?: string }> {
  const cairoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  
  let periodStart: Date;
  let periodEnd: Date;
  
  if (type === 'daily') {
    const yesterday = new Date(executionTime.getTime() - 24 * 60 * 60 * 1000);
    const yStr = cairoFormatter.format(yesterday);
    periodStart = getUtcDateFromCairoLocal(`${yStr}T00:00:00`);
    periodEnd = getUtcDateFromCairoLocal(`${yStr}T23:59:59.999`);
  } else if (type === 'weekly') {
    const endOfWeek = new Date(executionTime.getTime() - 1 * 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(executionTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startStr = cairoFormatter.format(startOfWeek);
    const endStr = cairoFormatter.format(endOfWeek);
    periodStart = getUtcDateFromCairoLocal(`${startStr}T00:00:00`);
    periodEnd = getUtcDateFromCairoLocal(`${endStr}T23:59:59.999`);
  } else {
    const cairoYear = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric' }).format(executionTime), 10);
    const cairoMonth = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', month: 'numeric' }).format(executionTime), 10);
    
    let reportMonth = cairoMonth - 1;
    let reportYear = cairoYear;
    if (reportMonth === 0) {
      reportMonth = 12;
      reportYear = cairoYear - 1;
    }
    const lastDay = new Date(Date.UTC(reportYear, reportMonth, 0)).getUTCDate();
    const startStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
    const endStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    periodStart = getUtcDateFromCairoLocal(`${startStr}T00:00:00`);
    periodEnd = getUtcDateFromCairoLocal(`${endStr}T23:59:59.999`);
  }

  console.log(`[REPORT_WORKFLOW] Checking if ${type} report for period ${periodStart.toISOString()} already executed...`);

  // Check deduplication
  const { data: existingLogs, error: logFetchError } = await supabaseAdmin
    .from('report_logs')
    .select('id')
    .eq('report_type', type)
    .eq('period_start', periodStart.toISOString());

  if (logFetchError) {
    console.error("[REPORT_WORKFLOW] Error checking report log table:", logFetchError);
  }

  if (existingLogs && existingLogs.length > 0) {
    console.log(`[REPORT_WORKFLOW] ${type} report for period starting ${periodStart.toISOString()} has already been successfully run. Skipping.`);
    return { success: true, executed: false, message: 'Report already executed' };
  }

  try {
    console.log(`[REPORT_WORKFLOW] Compiling data for ${type} report...`);
    const reportData = await compileReportData(type, executionTime);
    
    console.log(`[REPORT_WORKFLOW] Formatting and sending Telegram notification...`);
    const telegramMessage = generateTelegramReportMessage(reportData);
    await sendTelegramMessage(telegramMessage);

    if (type === 'monthly') {
      console.log(`[REPORT_WORKFLOW] Generating Excel workbook attachment...`);
      const excelBuffer = await generateExcelReport(reportData);
      
      console.log(`[REPORT_WORKFLOW] Dispatching Monthly report email...`);
      await sendMonthlyExcelReportEmail(reportData, excelBuffer);

      console.log(`[REPORT_WORKFLOW] Dispatching Excel report to Telegram...`);
      const settings = await getTelegramSettings();
      const chatId = settings.telegramChatId || process.env.TELEGRAM_CHAT_ID;
      if (chatId) {
        const fileName = `JoeSchool_Report_${reportData.periodLabel.replace(' ', '_')}.xlsx`;
        await sendTelegramDocument(chatId, excelBuffer, fileName, `🏆 <b>JoeSchool Monthly Excel Report - ${reportData.periodLabel}</b>`);
      }
    }

    // Log success in DB to prevent duplicates
    const { error: logInsertError } = await supabaseAdmin
      .from('report_logs')
      .insert({
        report_type: type,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        status: 'success',
        metadata: {
          revenue: reportData.metrics.revenue,
          orders: reportData.metrics.orders,
          visits: reportData.metrics.visits
        }
      });

    if (logInsertError) {
      console.error("[REPORT_WORKFLOW] Failed to write report log block:", logInsertError);
    }

    console.log(`[REPORT_WORKFLOW] Successfully finished executing ${type} report!`);
    return { success: true, executed: true };

  } catch (err: any) {
    console.error(`[REPORT_WORKFLOW] Critical exception in runReportWorkflow for ${type}:`, err);
    return { success: false, executed: false, message: err.message };
  }
}

/**
 * Generic range-based compiler used by the BI Agent
 */
export async function compileRawMetricsForRange(start: Date, end: Date) {
  // 1. Fetch Users
  let allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(`[REPORTS] Error fetching users on page ${page}:`, error);
      break;
    }
    if (!data?.users || data.users.length === 0) break;
    allUsers.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  // Fetch completed orders
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('status', 'completed')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  const completedOrders = orders || [];
  const revenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const ordersCount = completedOrders.length;

  const freeOrdersCount = completedOrders.filter(o => {
    const amount = o.amount || 0;
    const hasCoupon = !!(o.coupon_code && o.coupon_code.trim() !== "");
    return amount === 0 && hasCoupon;
  }).length;

  const freeOrdersCoupons = completedOrders
    .filter(o => (o.amount || 0) === 0 && o.coupon_code && o.coupon_code.trim() !== "")
    .map(o => o.coupon_code!.trim());
  
  // Count new registrations
  const newStudents = allUsers.filter(u => {
    const created = new Date(u.created_at);
    return created >= start && created <= end;
  }).length;
  
  const aov = ordersCount > 0 ? revenue / ordersCount : 0;
  
  // Fetch analytics events
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('analytics_events')
    .select('session_id, event_name, metadata, created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
    
  const analytics = events || [];
  const visits = analytics.filter(e => e.event_name === 'page_view').length;
  
  const uniqueSessionIds = [...new Set(analytics.map(e => e.session_id).filter(Boolean))];
  const uniqueVisitors = uniqueSessionIds.length;
  
  // Calculate new vs returning visitors
  let newVisitors = 0;
  let returningVisitors = 0;
  
  if (uniqueSessionIds.length > 0) {
    const { data: historicalEvents } = await supabaseAdmin
      .from('analytics_events')
      .select('session_id')
      .in('session_id', uniqueSessionIds)
      .lt('created_at', start.toISOString());
      
    const oldSessions = new Set((historicalEvents || []).map(h => h.session_id));
    newVisitors = uniqueSessionIds.filter(s => !oldSessions.has(s)).length;
    returningVisitors = uniqueSessionIds.filter(s => oldSessions.has(s)).length;
  }
  
  // Calculate checkout sessions (page views on path starting with /checkout, excluding success/failed)
  const checkoutSessions = [...new Set(
    analytics
      .filter(e => {
        if (e.event_name !== 'page_view') return false;
        const path = e.metadata?.pathname || e.metadata?.path || "";
        return path.startsWith('/checkout') && !path.includes('/success') && !path.includes('/failed');
      })
      .map(e => e.session_id)
      .filter(Boolean)
  )].length;
  
  const conversionRate = uniqueVisitors > 0 ? (ordersCount / uniqueVisitors) * 100 : 0;
  
  // Calculate Course Performance
  const courseSalesMap: { [course: string]: CourseSalesData } = {};
  completedOrders.forEach(o => {
    const title = o.product_title || "Unknown Course";
    if (!courseSalesMap[title]) {
      courseSalesMap[title] = { courseName: title, sales: 0, revenue: 0 };
    }
    courseSalesMap[title].sales += 1;
    courseSalesMap[title].revenue += o.amount || 0;
  });
  
  const coursesPerformance = Object.values(courseSalesMap).sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);
  const bestSellingCourse = coursesPerformance[0]?.courseName || "N/A";
  
  return {
    revenue,
    orders: ordersCount,
    freeOrdersCount,
    freeOrdersCoupons,
    newStudents,
    aov,
    visits,
    uniqueVisitors,
    newVisitors,
    returningVisitors,
    checkoutSessions,
    conversionRate,
    bestSellingCourse,
    coursesPerformance,
    rawOrders: completedOrders
  };
}

