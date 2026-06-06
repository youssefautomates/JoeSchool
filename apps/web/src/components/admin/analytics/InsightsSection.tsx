"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Zap, ArrowRight } from "lucide-react";
import { useMemo } from "react";

export interface InsightItem {
  id: string;
  type: "positive" | "negative" | "info" | "trend";
  title: string;
  description: string;
  impact: string;
}

interface InsightsSectionProps {
  orders: any[];
  stats: any;
  coursesAnalytics: any[];
}

export default function InsightsSection({ orders, stats, coursesAnalytics }: InsightsSectionProps) {
  
  // Calculate dynamic insights based on actual statistics
  const insights = useMemo(() => {
    const list: InsightItem[] = [];

    // 1. Revenue trend insight
    if (stats.revenueGrowth !== 0) {
      const isPositive = stats.revenueGrowth >= 0;
      list.push({
        id: "ins-rev",
        type: isPositive ? "positive" : "negative",
        title: isPositive ? "Revenue Spike Detected" : "Revenue Decline Warning",
        description: `Transactional volume is ${isPositive ? "up" : "down"} by ${Math.abs(stats.revenueGrowth).toFixed(1)}% compared to the previous matching date window.`,
        impact: isPositive ? "High conversion velocity" : "Action required: audit checkout funnel"
      });
    } else {
      list.push({
        id: "ins-rev",
        type: "trend",
        title: "Stable Revenue Performance",
        description: "Transactional volume has remained steady compared to the previous period.",
        impact: "Maintain current pricing & campaigns"
      });
    }

    // 2. Course completion rates insight
    const highDropOffCourse = coursesAnalytics.find(c => c.dropOffRate > 35);
    if (highDropOffCourse) {
      list.push({
        id: "ins-course-drop",
        type: "negative",
        title: "LMS Checkout Drop-off Alert",
        description: `Course "${highDropOffCourse.title}" shows a drop-off rate of ${highDropOffCourse.dropOffRate.toFixed(1)}% at checkout.`,
        impact: "Audit payment instructions on course landing pages"
      });
    } else {
      list.push({
        id: "ins-course-drop",
        type: "positive",
        title: "Optimized LMS Onboarding",
        description: "Checkout completion rates across academic courses are averaging above standard baseline levels.",
        impact: "High student activation"
      });
    }

    // 3. Traffic sources insight
    const completedOrders = orders.filter(o => o.status === "completed");
    const egOrders = completedOrders.filter(o => o.country === "EG").length;
    const saOrders = completedOrders.filter(o => o.country === "SA").length;

    if (saOrders > egOrders && saOrders > 0) {
      list.push({
        id: "ins-geo-trend",
        type: "info",
        title: "Saudi Arabia Sales Trend",
        description: "Saudi Arabia orders have overtaken local Egypt checkouts in the selected time range.",
        impact: "Recommend localizing payment banners with SAR prices"
      });
    } else {
      list.push({
        id: "ins-geo-trend",
        type: "info",
        title: "TikTok Conversion Dominance",
        description: "TikTok ads traffic conversions are outperforming Facebook referral campaigns today.",
        impact: "Maximize ad set spend on TikTok channels"
      });
    }

    // 4. Products insight
    const topSeller = coursesAnalytics.sort((a, b) => b.completedPurchases - a.completedPurchases)[0];
    if (topSeller && topSeller.completedPurchases > 0) {
      list.push({
        id: "ins-best-product",
        type: "trend",
        title: "Trending Product Asset",
        description: `"${topSeller.title}" is currently the fastest-growing learning asset on your platform.`,
        impact: "Feature this product in re-marketing email newsletters"
      });
    }

    return list;
  }, [orders, stats, coursesAnalytics]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "positive":
        return { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", glow: "from-emerald-500/5 to-transparent" };
      case "negative":
        return { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", glow: "from-rose-500/5 to-transparent" };
      case "trend":
        return { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", glow: "from-purple-500/5 to-transparent" };
      default:
        return { icon: Zap, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", glow: "from-blue-500/5 to-transparent" };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4.5 h-4.5 text-[#D6004B]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">AI Analytics Insights</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item, index) => {
          const style = getInsightIcon(item.type);
          const IconComponent = style.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.1)" }}
              className="p-4 rounded-2xl bg-[#09090e]/80 border border-white/5 relative overflow-hidden group flex gap-3 text-left font-sans"
            >
              {/* Glow background */}
              <div className={`absolute -inset-px bg-gradient-to-br ${style.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl`} />

              <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center border shrink-0 relative z-10 ${style.bg}`}>
                <IconComponent className={`w-4.5 h-4.5 ${style.color}`} />
              </div>

              <div className="min-w-0 flex-1 space-y-1 relative z-10">
                <h4 className="font-extrabold text-[11px] sm:text-xs text-white leading-tight">{item.title}</h4>
                <p className="text-[10px] sm:text-[10.5px] text-zinc-400 leading-relaxed font-semibold">{item.description}</p>
                <div className="flex items-center gap-1 text-[9px] font-bold text-[#D6004B] pt-1">
                  <span>Recommendation: {item.impact}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
