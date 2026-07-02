"use client";

import dynamic from "next/dynamic";
import { DollarSign, Activity, Globe, ShieldCheck, ShoppingCart, Users, TrendingDown, MousePointerClick, ShoppingBag, FileText } from "lucide-react";
import KPICard from "./KPICard";
import InsightsSection from "./InsightsSection";
import CollapsibleSection from "./CollapsibleSection";

// Dynamically import charts for optimized initial page load speed
const RevenueChart = dynamic(() => import("./charts/RevenueChart"), {
  ssr: false,
  loading: () => <div className="h-48 sm:h-72 w-full animate-pulse bg-zinc-100/40 rounded-3xl" />
});

const DistributionChart = dynamic(() => import("./charts/DistributionChart"), {
  ssr: false,
  loading: () => <div className="h-48 sm:h-64 w-full animate-pulse bg-zinc-100/40 rounded-3xl" />
});

const RevenueHeatmap = dynamic(() => import("./charts/RevenueHeatmap"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse bg-zinc-100/40 rounded-3xl" />
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
  const comparisonLabel = `Vs last ${dateRange} days`;

  const getTrendStr = (val: number | undefined) => {
    if (val === undefined || val === 0) return undefined;
    return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 text-left" dir="ltr">
      
      {/* KPI Cards Grid - 5 per row on large screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
        <KPICard
          label="EGP Revenue (Gross)"
          value={formatPrice(stats.egpGrossRevenue, "EGP")}
          desc={comparisonLabel}
          icon={DollarSign}
          trend={getTrendStr(stats.revenueGrowth)}
          trendUp={stats.revenueGrowth >= 0}
        />
        <KPICard
          label="EGP Revenue (Net)"
          value={formatPrice(stats.egpNetRevenue, "EGP")}
          desc={comparisonLabel}
          icon={Activity}
          trend={getTrendStr(stats.egpNetGrowth)}
          trendUp={stats.egpNetGrowth >= 0}
        />
        <KPICard
          label="USD Revenue (Gross)"
          value={formatPrice(stats.usdGrossRevenue, "USD")}
          desc={comparisonLabel}
          icon={Globe}
          trend={getTrendStr(stats.usdGrossGrowth)}
          trendUp={stats.usdGrossGrowth >= 0}
        />
        <KPICard
          label="Paymob Gateway Fees"
          value={formatPrice(stats.processingFees, "EGP")}
          desc={comparisonLabel}
          icon={ShieldCheck}
          trend={getTrendStr(stats.feesGrowth)}
          trendUp={stats.feesGrowth <= 0} // Decreased fees is positive
        />
        <KPICard
          label="Successful Orders"
          value={stats.successfulOrders}
          desc={comparisonLabel}
          icon={ShoppingCart}
          trend={getTrendStr(stats.successfulOrdersGrowth)}
          trendUp={stats.successfulOrdersGrowth >= 0}
        />
      </div>

      {/* Funnel KPI Cards Row 2 - 6 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          label="Unique Visitors"
          value={stats.totalVisitors ?? 0}
          desc={`Tracked sessions (${dateRange}d)`}
          icon={Users}
          trend={stats.totalVisitors > 0 ? "Live sessions" : undefined}
          trendUp={true}
          trendNeutral={!stats.totalVisitors}
        />
        <KPICard
          label="Add to Cart Events"
          value={stats.addToCartCount ?? 0}
          desc="Products added to cart"
          icon={ShoppingBag}
          trend={stats.addToCartCount > 0 ? "Purchase intent" : undefined}
          trendUp={true}
          trendNeutral={!stats.addToCartCount}
        />
        <KPICard
          label="Checkout Page Opened"
          value={stats.checkoutPageOpenedCount ?? 0}
          desc="Opened registration page"
          icon={FileText}
          trend={stats.checkoutPageOpenedCount > 0 ? "Checkout visits" : undefined}
          trendUp={true}
          trendNeutral={!stats.checkoutPageOpenedCount}
        />
        <KPICard
          label="Checkout Started"
          value={stats.checkoutStartedCount ?? 0}
          desc="Entered checkout flow"
          icon={MousePointerClick}
          trend={stats.checkoutStartedCount > 0 ? "High intent" : undefined}
          trendUp={true}
          trendNeutral={!stats.checkoutStartedCount}
        />
        <KPICard
          label="Abandoned Checkouts"
          value={stats.abandonedCheckouts ?? 0}
          desc="Started checkout, didn't pay"
          icon={TrendingDown}
          trend={stats.abandonedCheckouts > 0 ? "Needs recovery" : "All converted!"}
          trendUp={false}
          trendNeutral={!stats.abandonedCheckouts}
        />
        <KPICard
          label="Conversion Rate"
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
        <div className="xl:col-span-2 rounded-3xl bg-slate-50/80 border border-zinc-200/60 p-4 sm:p-6 shadow-sm border border-zinc-200/60" dir="ltr">
          <RevenueChart 
            data={chartData} 
            revenueGrowth={stats.revenueGrowth} 
            currencySymbol="EGP"
          />
        </div>

        {/* Currency share Donut Chart */}
        <div className="rounded-3xl bg-slate-50/80 border border-zinc-200/60 p-4 sm:p-6 shadow-sm border border-zinc-200/60" dir="ltr">
          <DistributionChart data={currencyData} />
        </div>
      </div>

      {/* Hourly Heatmap - Collapsible on Mobile */}
      <CollapsibleSection title="Sales Hourly Heatmap Distribution" defaultExpanded={false}>
        <div className="rounded-3xl bg-slate-50/80 border border-zinc-200/60 p-4 sm:p-6 shadow-sm border border-zinc-200/60" dir="ltr">
          <RevenueHeatmap orders={orders} />
        </div>
      </CollapsibleSection>

      {/* Smart insights section - Collapsible on Mobile */}
      <CollapsibleSection title="AI Smart Insights & Advanced Analytics" defaultExpanded={true}>
        <InsightsSection 
          orders={orders} 
          stats={stats} 
          coursesAnalytics={coursesAnalytics} 
        />
      </CollapsibleSection>
    </div>
  );
}
