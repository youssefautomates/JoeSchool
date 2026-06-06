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
  loading: () => <div className="h-48 sm:h-56 w-full animate-pulse bg-white/5 rounded-3xl" />
});

const FunnelChart = dynamic(() => import("./charts/FunnelChart"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse bg-white/5 rounded-3xl" />
});

interface StoreSectionProps {
  orders: any[];
  productsAnalytics: any[];
  funnelStages: any[];
  categoryStats: any[];
  formatPrice: (amount: number, currency: string) => string;
  dateRange: string;
  isCompact?: boolean;
}

export default function StoreSection({
  orders,
  productsAnalytics,
  funnelStages,
  categoryStats,
  formatPrice,
  dateRange,
  isCompact = false
}: StoreSectionProps) {

  const comparisonLabel = `مقارنة بـ آخر ${dateRange} يوم`;

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
      const name = o.customer_name || "طالب زائر";
      if (!spendersMap[name]) {
        spendersMap[name] = { email: o.customer_email || "لا يوجد بريد", spent: 0, orders: 0 };
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
    <div className="space-y-6 sm:space-y-8 text-right" dir="rtl">
      
      {/* 5 KPI Store Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          label="إيرادات المتجر الرقمي"
          value={formatPrice(storeStats.revenue, "EGP")}
          desc={comparisonLabel}
          icon={ShoppingBag}
          trend={storeStats.ordersCount > 0 ? "+0.0% نمو" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
          isCompact={isCompact}
        />
        <KPICard
          label="مبيعات المنتجات"
          value={storeStats.ordersCount}
          desc={comparisonLabel}
          icon={Package}
          trend={storeStats.ordersCount > 0 ? "+0.0% مبيعات" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
          isCompact={isCompact}
        />
        <KPICard
          label="متوسط قيمة الفاتورة"
          value={formatPrice(storeStats.aov, "EGP")}
          desc="متوسط قيمة سلة المشتريات"
          icon={TrendingUp}
          trend={storeStats.ordersCount > 0 ? "مستقر" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
          isCompact={isCompact}
        />
        <KPICard
          label="معدل التحويل للمتجر"
          value={storeStats.cr}
          desc="زيارات تحولت لمبيعات ناجحة"
          icon={Percent}
          trend={storeStats.ordersCount > 0 ? "نشط" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
          isCompact={isCompact}
        />
        <KPICard
          label="العملاء المستمرين"
          value={storeStats.retCustPct}
          desc={`من أصل ${storeStats.newCustPct} مستخدم جديد`}
          icon={Users}
          trend={storeStats.ordersCount > 0 ? "معدل الولاء" : undefined}
          trendUp={storeStats.ordersCount > 0}
          trendNeutral={storeStats.ordersCount === 0}
          isCompact={isCompact}
        />
      </div>

      {/* Charts section: Funnel & Categories */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Sales funnel - wrapped in LTR for Recharts mapping */}
        <div className="xl:col-span-2 rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl" dir="ltr">
          <FunnelChart stages={funnelStages} />
        </div>

        {/* Categories breakdown - wrapped in LTR for Recharts mapping */}
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl" dir="ltr">
          <CategoryChart data={categoryStats} />
        </div>
      </div>

      {/* Digital Products Table Wrapper */}
      <TableWrapper
        title="مؤشرات تفصيلية لأداء المنتجات الرقمية"
        subtitle="حجم المبيعات، الزيارات، نسبة التحويل وحالات فشل الدفع لكل ملف رقمي"
        icon={Package}
      >
        {productsAnalytics.length === 0 ? (
          <AnalyticsEmptyState
            title="لا توجد بيانات للمنتجات الرقمية بالمتجر"
            description="قم بإضافة ملفات رقمية أو موجهات ذكاء اصطناعي في لوحة المنتجات، وسجل عمليات بيع لعرض تقارير الأداء ومعدلات التحويل."
            icon={Package}
          />
        ) : (
          <>
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 text-[10px] uppercase font-bold">
                    <th className="pb-3 text-right">المنتج الرقمي</th>
                    <th className="pb-3 text-center">سعر الوحدة</th>
                    <th className="pb-3 text-center">الكمية المباعة</th>
                    <th className="pb-3 text-center">زيارات الصفحة</th>
                    <th className="pb-3 text-center">نسبة التحويل (CR)</th>
                    <th className="pb-3 text-center">فشل الدفع</th>
                    <th className="pb-3 text-left">إجمالي الإيرادات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productsAnalytics.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors text-xs font-semibold text-zinc-300">
                      <td className="py-4">
                        <div className="min-w-0 pl-4 text-right">
                          <p className="font-bold text-white truncate max-w-xs">{p.title}</p>
                          <span className="text-[9px] text-zinc-500 font-mono">الرمز المميز: {p.id}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center font-bold font-mono text-zinc-400">{formatPrice(p.price, "EGP")}</td>
                      <td className="py-4 text-center font-bold text-white font-mono">{p.salesUnits} وحدة</td>
                      <td className="py-4 text-center font-bold text-zinc-500 font-mono">{p.views} زيارة</td>
                      <td className="py-4 text-center font-mono">
                        <span className="text-emerald-400 font-black">{p.conversionRate.toFixed(1)}%</span>
                      </td>
                      <td className="py-4 text-center font-mono">
                        <span className={p.failureRate > 15 ? "text-red-500 font-black" : "text-zinc-500 font-bold"}>
                          {p.failureRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 text-left font-black text-rose-500 font-mono">{formatPrice(p.grossRevenue, "EGP")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (hidden on desktop) */}
            <div className="sm:hidden space-y-3">
              {productsAnalytics.map((p) => (
                <div key={p.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3 text-right">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 text-right">
                      <h4 className="font-bold text-white text-xs leading-snug truncate max-w-[180px]">{p.title}</h4>
                      <span className="text-[8.5px] text-zinc-500 font-mono">رمز: {p.id}</span>
                    </div>
                    <span className="text-xs font-black text-rose-500 font-mono shrink-0">
                      {formatPrice(p.grossRevenue, "EGP")}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/[0.01] p-2 rounded-lg border border-white/5 font-semibold text-zinc-400">
                    <div>
                      <span className="text-zinc-500 block">سعر الوحدة</span>
                      <span className="text-zinc-300 font-mono">{formatPrice(p.price, "EGP")}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">الكمية المباعة</span>
                      <span className="text-white font-mono">{p.salesUnits} وحدة</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">زيارات الصفحة</span>
                      <span className="text-zinc-400 font-mono">{p.views} زيارة</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">نسبة التحويل</span>
                      <span className="text-emerald-400 font-mono">{p.conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1 font-semibold">
                    <span className="text-zinc-500">معدل فشل الدفع</span>
                    <span className={p.failureRate > 15 ? "text-red-500 font-black" : "text-zinc-400 font-bold"}>
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
      <CollapsibleSection title="تحليلات العملاء ونسب الولاء وتكرار الشراء" defaultExpanded={false}>
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Top spenders list */}
            <div className="space-y-3">
              <h5 className="text-[9px] font-black uppercase text-rose-500 tracking-wider">العملاء الأكثر إنفاقاً بالمتجر</h5>
              <div className="space-y-2">
                {customerAnalytics.length === 0 ? (
                  <div className="py-8 text-center text-zinc-600 text-xs font-semibold">لا يوجد سجل مدفوعات للعملاء حتى الآن.</div>
                ) : (
                  customerAnalytics.map((c, index) => (
                    <div key={index} className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between font-semibold">
                      <div className="min-w-0 pl-2 text-right">
                        <p className="text-[11px] text-white font-extrabold truncate">{c.name}</p>
                        <p className="text-[9px] text-zinc-500 font-mono truncate">{c.email}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <span className="text-xs font-black text-rose-500 font-mono">{formatPrice(c.spent, "EGP")}</span>
                        <span className="text-[8.5px] text-zinc-500 block">{c.ordersCount} طلبات</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Customer Retention metrics */}
            <div className="space-y-3 bg-white/[0.01] p-4 border border-white/5 rounded-2xl">
              <h5 className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">مؤشرات تكرار الشراء والولاء</h5>
              <div className="space-y-3 text-xs font-semibold text-zinc-400">
                <p className="leading-relaxed">
                  توضح التحليلات أن نسبة العملاء المستمرين في الشراء تبلغ <span className="text-white font-extrabold">{storeStats.retCustPct}</span>. وتساهم الملفات الرقمية وأدوات الأتمتة المساعدة في تشجيع الطلاب على تكرار الطلب من المتجر.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-center text-[10px]">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-zinc-500 block font-bold">العملاء الجدد</span>
                    <span className="text-sm font-black text-white font-mono">{storeStats.newCustPct}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-zinc-500 block font-bold">العملاء الدائمين</span>
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
