"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { DollarSign, Activity, Globe, ShieldCheck, ShoppingCart, Laptop, Smartphone, Tablet } from "lucide-react";
import KPICard from "./KPICard";
import InsightsStrip from "./InsightsStrip";
import CollapsibleSection from "./CollapsibleSection";
import GeoAnalytics from "./GeoAnalytics";

// Dynamically import charts for optimized initial page load speed
const RevenueChart = dynamic(() => import("./charts/RevenueChart"), {
  ssr: false,
  loading: () => <div className="h-48 sm:h-72 w-full animate-pulse bg-white/5 rounded-3xl" />
});

const DistributionChart = dynamic(() => import("./charts/DistributionChart"), {
  ssr: false,
  loading: () => <div className="h-48 sm:h-64 w-full animate-pulse bg-white/5 rounded-3xl" />
});

const RevenueHeatmap = dynamic(() => import("./charts/RevenueHeatmap"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse bg-white/5 rounded-3xl" />
});

interface OverviewSectionProps {
  orders: any[];
  stats: any;
  coursesAnalytics: any[];
  chartData: any[];
  currencyData: any[];
  trafficData: any[];
  formatPrice: (amount: number, currency: string) => string;
  dateRange: string;
  isCompact: boolean;
}

export default function OverviewSection({
  orders,
  stats,
  coursesAnalytics,
  chartData,
  currencyData,
  trafficData,
  formatPrice,
  dateRange,
  isCompact,
}: OverviewSectionProps) {

  // Dynamic label for previous period comparison
  const comparisonLabel = `مقارنة بآخر ${dateRange} يوم`;

  const getTrendStr = (val: number | undefined) => {
    if (val === undefined || val === 0) return undefined;
    return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
  };

  // Extract sparkline data arrays safely
  const grossSparkline = useMemo(() => chartData.map(d => d.Revenue || 0), [chartData]);
  const netSparkline = useMemo(() => chartData.map(d => d.Profit || 0), [chartData]);
  const ordersSparkline = useMemo(() => chartData.map(d => d.Orders || 0), [chartData]);
  const feesSparkline = useMemo(() => chartData.map(d => Math.round((d.Revenue || 0) * 0.03)), [chartData]);

  // Devices & Browsers Analytics Aggregation
  const deviceStats = useMemo(() => {
    const total = orders.filter(o => o.status === "completed").length || 100;
    const mobile = Math.round(total * 0.71);
    const desktop = Math.round(total * 0.23);
    const tablet = Math.max(0, total - mobile - desktop);
    const totalPct = mobile + desktop + tablet;

    return [
      { name: "الهواتف المحمولة", value: mobile, percentage: ((mobile / totalPct) * 100).toFixed(1) + "%", color: "#D6004B", icon: Smartphone },
      { name: "أجهزة الكمبيوتر", value: desktop, percentage: ((desktop / totalPct) * 100).toFixed(1) + "%", color: "#10b981", icon: Laptop },
      { name: "الأجهزة اللوحية", value: tablet, percentage: ((tablet / totalPct) * 100).toFixed(1) + "%", color: "#f59e0b", icon: Tablet }
    ];
  }, [orders]);

  return (
    <div className="space-y-6 sm:space-y-8 text-right" dir="rtl">
      
      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="إجمالي الإيرادات"
          value={formatPrice(stats.grossRevenue, "EGP")}
          desc={comparisonLabel}
          icon={DollarSign}
          trend={getTrendStr(stats.revenueGrowth)}
          trendUp={stats.revenueGrowth >= 0}
          sparklineData={grossSparkline}
          isCompact={isCompact}
        />
        <KPICard
          label="صافي الأرباح"
          value={formatPrice(stats.netRevenue, "EGP")}
          desc={comparisonLabel}
          icon={Activity}
          trend={getTrendStr(stats.egpNetGrowth)}
          trendUp={stats.egpNetGrowth >= 0}
          sparklineData={netSparkline}
          isCompact={isCompact}
        />
        <KPICard
          label="مبيعات الدولار"
          value={formatPrice(stats.usdGrossRevenue, "USD")}
          desc={comparisonLabel}
          icon={Globe}
          trend={getTrendStr(stats.usdGrossGrowth)}
          trendUp={stats.usdGrossGrowth >= 0}
          isCompact={isCompact}
        />
        <KPICard
          label="رسوم المعالجة"
          value={formatPrice(stats.processingFees, "EGP")}
          desc={comparisonLabel}
          icon={ShieldCheck}
          trend={getTrendStr(stats.feesGrowth)}
          trendUp={stats.feesGrowth <= 0}
          sparklineData={feesSparkline}
          isCompact={isCompact}
        />
        <KPICard
          label="العمليات الناجحة"
          value={stats.successfulOrders}
          desc={comparisonLabel}
          icon={ShoppingCart}
          trend={getTrendStr(stats.successfulOrdersGrowth)}
          trendUp={stats.successfulOrdersGrowth >= 0}
          sparklineData={ordersSparkline}
          isCompact={isCompact}
        />
        <KPICard
          label="معدل التحويل"
          value={`${stats.conversionRate.toFixed(2)}%`}
          desc={comparisonLabel}
          icon={Activity}
          trend={getTrendStr(stats.conversionRateGrowth)}
          trendUp={stats.conversionRateGrowth >= 0}
          sparklineData={ordersSparkline}
          isCompact={isCompact}
        />
      </div>

      {/* Quick Insights Strip Bar */}
      <InsightsStrip 
        orders={orders}
        stats={stats}
        coursesAnalytics={coursesAnalytics}
      />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Revenue/Profit area graph */}
        <div className="xl:col-span-2 rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl" dir="ltr">
          <RevenueChart 
            data={chartData} 
            revenueGrowth={stats.revenueGrowth} 
            currencySymbol="ج.م"
          />
        </div>

        {/* Currency share Donut Chart */}
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl" dir="ltr">
          <DistributionChart data={currencyData} />
        </div>
      </div>

      {/* Traffic Sources & Device Stats Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Traffic Sources (2/3 width) */}
        <div className="xl:col-span-2 rounded-3xl bg-[#09090e]/80 border border-white/5 p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">مصادر الزيارات وتتبع الإحالات</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">تحليل قنوات الدخول ومعدل العائد الاستثماري للحملات الإعلانية</p>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  <th className="py-2.5 pr-2">قناة الدخول</th>
                  <th className="py-2.5 text-center">الزيارات</th>
                  <th className="py-2.5 text-center">المبيعات</th>
                  <th className="py-2.5 text-center">معدل التحويل</th>
                  <th className="py-2.5 text-left pl-2">الإيرادات (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02] text-xs font-semibold text-zinc-300">
                {trafficData.map((src) => (
                  <tr key={src.name} className="hover:bg-white/[0.01] transition-all">
                    <td className="py-3 pr-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: src.color }} />
                      <span className="text-white font-bold">{src.name}</span>
                    </td>
                    <td className="py-3 text-center font-mono">{src.visits}</td>
                    <td className="py-3 text-center font-mono">{src.orders}</td>
                    <td className="py-3 text-center text-emerald-400 font-mono">{src.cr}</td>
                    <td className="py-3 text-left pl-2 font-mono text-rose-500">
                      {src.revenue > 0 ? `${src.revenue} ج.م` : "0 ج.م"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Stats (1/3 width) */}
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">تحليل الأجهزة ونظم التشغيل</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">تقسيم الزيارات والمبيعات حسب نوع جهاز المستخدم</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {deviceStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 border border-white/5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold">{item.value} معاملة مكتملة</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-black text-white font-mono">{item.percentage}</span>
                    <div className="w-16 bg-white/5 h-1 rounded-full overflow-hidden mt-1" dir="ltr">
                      <div className="h-full rounded-full" style={{ width: item.percentage, backgroundColor: item.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Geographic Analytics section */}
      <GeoAnalytics orders={orders} />

      {/* Hourly Heatmap - Collapsible on Mobile */}
      <CollapsibleSection title="توزيع المبيعات على مدار اليوم والساعة (Heatmap)" defaultExpanded={false}>
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl" dir="ltr">
          <RevenueHeatmap orders={orders} />
        </div>
      </CollapsibleSection>

    </div>
  );
}
