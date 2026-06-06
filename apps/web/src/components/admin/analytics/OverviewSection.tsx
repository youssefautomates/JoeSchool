"use client";

import dynamic from "next/dynamic";
import { DollarSign, Activity, Globe, ShieldCheck, ShoppingCart } from "lucide-react";
import KPICard from "./KPICard";
import InsightsSection from "./InsightsSection";
import CollapsibleSection from "./CollapsibleSection";

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
  formatPrice: (amount: number, currency: string) => string;
  dateRange: string;
}

export default function OverviewSection({
  orders,
  stats,
  coursesAnalytics,
  chartData,
  currencyData,
  formatPrice,
  dateRange
}: OverviewSectionProps) {

  // Dynamic label for previous period comparison
  const comparisonLabel = `vs last ${dateRange} days`;

  const getTrendStr = (val: number | undefined) => {
    if (val === undefined || val === 0) return undefined;
    return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 text-right" dir="rtl">
      
      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="إجمالي الجنيه (Gross)"
          value={formatPrice(stats.egpGrossRevenue, "EGP")}
          desc={comparisonLabel}
          icon={DollarSign}
          trend={getTrendStr(stats.revenueGrowth)}
          trendUp={stats.revenueGrowth >= 0}
        />
        <KPICard
          label="صافي الجنيه (Net)"
          value={formatPrice(stats.egpNetRevenue, "EGP")}
          desc={comparisonLabel}
          icon={Activity}
          trend={getTrendStr(stats.egpNetGrowth)}
          trendUp={stats.egpNetGrowth >= 0}
        />
        <KPICard
          label="إيرادات الدولار (USD)"
          value={formatPrice(stats.usdGrossRevenue, "USD")}
          desc={comparisonLabel}
          icon={Globe}
          trend={getTrendStr(stats.usdGrossGrowth)}
          trendUp={stats.usdGrossGrowth >= 0}
        />
        <KPICard
          label="رسوم باي موب"
          value={formatPrice(stats.processingFees, "EGP")}
          desc={comparisonLabel}
          icon={ShieldCheck}
          trend={getTrendStr(stats.feesGrowth)}
          trendUp={stats.feesGrowth <= 0} // Decreased fees is positive
        />
        <KPICard
          label="العمليات الناجحة"
          value={stats.successfulOrders}
          desc={comparisonLabel}
          icon={ShoppingCart}
          trend={getTrendStr(stats.successfulOrdersGrowth)}
          trendUp={stats.successfulOrdersGrowth >= 0}
        />
        <KPICard
          label="معدل التحويل"
          value={`${stats.conversionRate.toFixed(2)}%`}
          desc={comparisonLabel}
          icon={Activity}
          trend={getTrendStr(stats.conversionRateGrowth)}
          trendUp={stats.conversionRateGrowth >= 0}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Revenue/Profit area graph */}
        <div className="xl:col-span-2 rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl" dir="ltr">
          <RevenueChart 
            data={chartData} 
            revenueGrowth={stats.revenueGrowth} 
            currencySymbol="L.E"
          />
        </div>

        {/* Currency share Donut Chart */}
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl" dir="ltr">
          <DistributionChart data={currencyData} />
        </div>
      </div>

      {/* Hourly Heatmap - Collapsible on Mobile */}
      <CollapsibleSection title="توزيع المبيعات على مدار اليوم والساعة (Heatmap)" defaultExpanded={false}>
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl" dir="ltr">
          <RevenueHeatmap orders={orders} />
        </div>
      </CollapsibleSection>

      {/* Smart insights section - Collapsible on Mobile */}
      <CollapsibleSection title="رؤى ذكاء الاصطناعي والتحليلات المتقدمة" defaultExpanded={true}>
        <InsightsSection 
          orders={orders} 
          stats={stats} 
          coursesAnalytics={coursesAnalytics} 
        />
      </CollapsibleSection>
    </div>
  );
}
