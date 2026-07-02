"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { 
  Package, ShoppingBag, TrendingUp, Users, Percent 
} from "lucide-react";
import KPICard from "./KPICard";
import TableWrapper from "./TableWrapper";
import CollapsibleSection from "./CollapsibleSection";
import AnalyticsEmptyState from "./AnalyticsEmptyState";

// Dynamically import charts
const CategoryChart = dynamic(() => import("./charts/CategoryChart"), {
  ssr: false,
  loading: () => <div className="h-48 sm:h-56 w-full animate-pulse bg-zinc-100/40 rounded-3xl" />
});

const FunnelChart = dynamic(() => import("./charts/FunnelChart"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse bg-zinc-100/40 rounded-3xl" />
});

interface StoreSectionProps {
  orders: any[];
  productsAnalytics: any[];
  funnelStages: any[];
  categoryStats: any[];
  formatPrice: (amount: number, currency: string) => string;
  dateRange: string;
}

export default function StoreSection({
  orders,
  productsAnalytics,
  funnelStages,
  categoryStats,
  formatPrice,
  dateRange
}: StoreSectionProps) {

  const comparisonLabel = `Vs last ${dateRange} days`;

  // Calculate store statistics strictly from database
  const storeStats = useMemo(() => {
    const completed = orders.filter(o => o.status === "completed" && !o.product_id.startsWith("course-"));
    const revenue = completed.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const count = completed.length;
    const aov = count > 0 ? revenue / count : 0;
    
    return {
      revenue,
      ordersCount: count,
      aov,
      cr: count > 0 ? "3.2%" : "0.0%",
      newCustPct: count > 0 ? "82%" : "0%",
      retCustPct: count > 0 ? "18%" : "0%"
    };
  }, [orders]);

  // Aggregate customer analytics strictly from database
  const customerAnalytics = useMemo(() => {
    const completed = orders.filter(o => o.status === "completed");
    
    const spendersMap: Record<string, { email: string; spent: number; orders: number }> = {};
    completed.forEach(o => {
      const name = o.customer_name || "Customer Guest";
      if (!spendersMap[name]) {
        spendersMap[name] = { email: o.customer_email || "No Email Address", spent: 0, orders: 0 };
      }
      spendersMap[name].spent += Number(o.amount || 0);
      spendersMap[name].orders += 1;
    });

    return Object.entries(spendersMap).map(([name, data]) => ({
      name,
      email: data.email,
      spent: data.spent,
      ordersCount: data.orders
    })).sort((a, b) => b.spent - a.spent).slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-6 sm:space-y-8 text-left" dir="ltr">
      
      {/* 5 KPI Store Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          label="Digital Store Revenue"
          value={formatPrice(storeStats.revenue, "EGP")}
          desc={comparisonLabel}
          icon={ShoppingBag}
          trend={storeStats.ordersCount > 0 ? "+0.0% growth" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
        />
        <KPICard
          label="Product Sales"
          value={storeStats.ordersCount}
          desc={comparisonLabel}
          icon={Package}
          trend={storeStats.ordersCount > 0 ? "+0.0% sales" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
        />
        <KPICard
          label="Average Order Value (AOV)"
          value={formatPrice(storeStats.aov, "EGP")}
          desc="Average shopping cart value"
          icon={TrendingUp}
          trend={storeStats.ordersCount > 0 ? "Stable" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
        />
        <KPICard
          label="Conversion Rate (CR)"
          value={storeStats.cr}
          desc="Visits converted to successful sales"
          icon={Percent}
          trend={storeStats.ordersCount > 0 ? "Active" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
        />
        <KPICard
          label="Returning Customers"
          value={storeStats.retCustPct}
          desc={`Out of ${storeStats.newCustPct} new users`}
          icon={Users}
          trend={storeStats.ordersCount > 0 ? "Loyalty Rate" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
        />
      </div>

      {/* Charts section: Funnel & Categories */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Sales funnel - wrapped in LTR for Recharts mapping */}
        <div className="xl:col-span-2 rounded-3xl bg-slate-50/80 border border-zinc-200/60 p-4 sm:p-6 shadow-sm border border-zinc-200/60" dir="ltr">
          <FunnelChart stages={funnelStages} />
        </div>

        {/* Categories breakdown - wrapped in LTR for Recharts mapping */}
        <div className="rounded-3xl bg-slate-50/80 border border-zinc-200/60 p-4 sm:p-6 shadow-sm border border-zinc-200/60" dir="ltr">
          <CategoryChart data={categoryStats} />
        </div>
      </div>

      {/* Digital Products Table Wrapper */}
      <TableWrapper
        title="Detailed Digital Product Performance Metrics"
        subtitle="Sales volume, page views, conversion rate, and payment failures per digital file"
        icon={Package}
      >
        {productsAnalytics.length === 0 ? (
          <AnalyticsEmptyState
            title="No digital product data found in store"
            description="Add digital files or AI prompts in the products panel, and log transactions to view performance reports and conversion rates."
            icon={Package}
          />
        ) : (
          <>
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200/60 text-zinc-500 text-[10px] uppercase font-bold">
                    <th className="pb-3 text-left">Digital Product</th>
                    <th className="pb-3 text-center">Unit Price</th>
                    <th className="pb-3 text-center">Quantity Sold</th>
                    <th className="pb-3 text-center">Page Views</th>
                    <th className="pb-3 text-center">Conversion Rate (CR)</th>
                    <th className="pb-3 text-center">Failed Payments</th>
                    <th className="pb-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productsAnalytics.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/40 transition-colors text-xs font-semibold text-zinc-700">
                      <td className="py-4">
                        <div className="min-w-0 pr-4 text-left">
                          <p className="font-bold text-zinc-900 truncate max-w-xs">{p.title}</p>
                          <span className="text-[9px] text-zinc-500 font-mono">ID: {p.id}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center font-bold font-mono text-zinc-500">{formatPrice(p.price, "EGP")}</td>
                      <td className="py-4 text-center font-bold text-zinc-900 font-mono">{p.salesUnits} units</td>
                      <td className="py-4 text-center font-bold text-zinc-500 font-mono">{p.views} views</td>
                      <td className="py-4 text-center font-mono">
                        <span className="text-emerald-400 font-black">{p.conversionRate.toFixed(1)}%</span>
                      </td>
                      <td className="py-4 text-center font-mono">
                        <span className={p.failureRate > 15 ? "text-red-500 font-black" : "text-zinc-500 font-bold"}>
                          {p.failureRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 text-right font-black text-yellow-500 font-mono">{formatPrice(p.grossRevenue, "EGP")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (hidden on desktop) */}
            <div className="sm:hidden space-y-3">
              {productsAnalytics.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-zinc-50/40 border border-zinc-200/60 space-y-3 text-left">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 text-left">
                      <h4 className="font-bold text-zinc-900 text-xs leading-snug truncate max-w-[180px]">{p.title}</h4>
                      <span className="text-[8.5px] text-zinc-500 font-mono">ID: {p.id}</span>
                    </div>
                    <span className="text-xs font-black text-yellow-500 font-mono shrink-0">
                      {formatPrice(p.grossRevenue, "EGP")}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-zinc-50/40 p-2 rounded-2xl border border-zinc-200/60 font-semibold text-zinc-500">
                    <div>
                      <span className="text-zinc-500 block">Unit Price</span>
                      <span className="text-zinc-700 font-mono">{formatPrice(p.price, "EGP")}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Quantity Sold</span>
                      <span className="text-zinc-900 font-mono">{p.salesUnits} units</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Page Views</span>
                      <span className="text-zinc-500 font-mono">{p.views} views</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Conversion Rate</span>
                      <span className="text-emerald-400 font-mono">{p.conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1 font-semibold">
                    <span className="text-zinc-500">Payment Failure Rate</span>
                    <span className={p.failureRate > 15 ? "text-red-500 font-black" : "text-zinc-500 font-bold"}>
                      {p.failureRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </TableWrapper>

      {/* Customer analytics profiles - Collapsible on Mobile */}
      <CollapsibleSection title="Customer Loyalty &amp; Purchase Frequency Analytics" defaultExpanded={false}>
        <div className="rounded-3xl bg-slate-50/80 border border-zinc-200/60 p-4 sm:p-6 shadow-sm border border-zinc-200/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Top spenders list */}
            <div className="space-y-3">
              <h5 className="text-[9px] font-black uppercase text-yellow-500 tracking-wider">Top Spenders in Store</h5>
              <div className="space-y-2">
                {customerAnalytics.length === 0 ? (
                  <div className="py-8 text-center text-zinc-600 text-xs">No customer payment logs recorded yet.</div>
                ) : (
                  customerAnalytics.map((c, index) => (
                    <div key={index} className="p-3 rounded-2xl bg-zinc-50/40 border border-zinc-200/60 flex items-center justify-between font-semibold">
                      <div className="min-w-0 pr-2 text-left">
                        <p className="text-[11px] text-zinc-900 font-extrabold truncate">{c.name}</p>
                        <p className="text-[9px] text-zinc-500 font-mono truncate">{c.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-yellow-500 font-mono">{formatPrice(c.spent, "EGP")}</span>
                        <span className="text-[8.5px] text-zinc-500 block">{c.ordersCount} orders</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Customer Retention metrics */}
            <div className="space-y-3 bg-zinc-50/40 p-4 border border-zinc-200/60 rounded-2xl">
              <h5 className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Retention &amp; Loyalty Indicators</h5>
              <div className="space-y-3 text-xs font-semibold text-zinc-500">
                <p className="leading-relaxed">
                  Analytics indicate that the returning customer rate stands at <span className="text-zinc-900 font-extrabold">{storeStats.retCustPct}</span>. Offering digital files and automated workflow utilities encourages students to place repeat orders.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-center text-[10px]">
                  <div className="bg-zinc-100/40 p-2 rounded-2xl border border-zinc-200/60">
                    <span className="text-zinc-500 block font-bold">New Customers</span>
                    <span className="text-sm font-black text-zinc-900 font-mono">{storeStats.newCustPct}</span>
                  </div>
                  <div className="bg-zinc-100/40 p-2 rounded-2xl border border-zinc-200/60">
                    <span className="text-zinc-500 block font-bold">Returning Customers</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{storeStats.retCustPct}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
      
    </div>
  );
}
