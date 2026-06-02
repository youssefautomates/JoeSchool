import React from "react";
import { Star, MessageSquare, ShieldCheck, EyeOff, Sparkles, TrendingUp, Award, BookOpen, ShoppingBag } from "lucide-react";
import { Review } from "@/app/api/admin/reviews/route";

interface DisplayItem {
  id: string;
  title: string;
  category: string;
  type: "course" | "product" | "bundle";
  imageUrl?: string;
}

interface ReviewAnalyticsProps {
  reviews: Review[];
  items: DisplayItem[];
}

export function ReviewAnalytics({ reviews, items }: ReviewAnalyticsProps) {
  // 1. Calculate general counters (ignoring archived reviews in counts)
  const activeReviews = reviews.filter(r => r.status !== "archived");
  const total = activeReviews.length;
  const average = total > 0 ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  
  const pending = activeReviews.filter(r => r.status === "pending").length;
  const hidden = activeReviews.filter(r => r.status === "hidden" || r.isHidden).length;
  const featured = activeReviews.filter(r => r.isFeatured).length;
  
  // Conversion indicators (ratio of reviews with rating >= 4)
  const positiveReviews = activeReviews.filter(r => r.rating >= 4).length;
  const conversionRate = total > 0 ? (positiveReviews / total) * 100 : 0;

  // 2. Ratings Distribution (5 star to 1 star)
  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
    const count = activeReviews.filter(r => {
      if (stars === 5) return r.rating >= 4.5;
      return r.rating >= stars - 0.5 && r.rating < stars + 0.5;
    }).length;
    
    const pct = total > 0 ? (count / total) * 100 : 0;
    return { stars, count, pct };
  });

  // 3. Reviews Volume Over Time (Past 6 Months)
  const getPast6Months = () => {
    const months = [];
    const locale = "ar-EG";
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString(locale, { month: "short" });
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      months.push({ label, monthNum, year, count: 0 });
    }
    return months;
  };

  const monthsData = getPast6Months();
  activeReviews.forEach(r => {
    const rDate = new Date(r.createdAt);
    const rMonth = rDate.getMonth();
    const rYear = rDate.getFullYear();
    const match = monthsData.find(m => m.monthNum === rMonth && m.year === rYear);
    if (match) {
      match.count++;
    }
  });

  const maxMonthCount = Math.max(...monthsData.map(m => m.count), 1);

  // 4. Miniature Widgets: Aggregations in Memory
  const statsByProduct: Record<string, { total: number; sum: number; avg: number; stdDev: number; isVolatile: boolean; ratings: number[] }> = {};
  activeReviews.forEach(r => {
    if (!statsByProduct[r.productId]) {
      statsByProduct[r.productId] = { total: 0, sum: 0, avg: 0, stdDev: 0, isVolatile: false, ratings: [] };
    }
    statsByProduct[r.productId].total++;
    statsByProduct[r.productId].sum += r.rating;
    statsByProduct[r.productId].ratings.push(r.rating);
  });
  Object.keys(statsByProduct).forEach(id => {
    const stat = statsByProduct[id];
    stat.avg = stat.sum / stat.total;
    if (stat.total >= 5) {
      const avg = stat.avg;
      const variance = stat.ratings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / stat.total;
      const stdDev = Math.sqrt(variance);
      stat.stdDev = stdDev;
      stat.isVolatile = stdDev > 1.2;
    }
  });

  const itemsWithStats = items.map(item => {
    const stats = statsByProduct[item.id] || { total: 0, avg: 0, stdDev: 0, isVolatile: false };
    return { ...item, ...stats };
  });

  // Top Rated Courses (min 1 review)
  const topCourses = itemsWithStats
    .filter(item => item.type === "course" && item.total > 0)
    .sort((a, b) => b.avg - a.avg || b.total - a.total)
    .slice(0, 3);

  // Top Rated Products (min 1 review)
  const topProducts = itemsWithStats
    .filter(item => item.type === "product" && item.total > 0)
    .sort((a, b) => b.avg - a.avg || b.total - a.total)
    .slice(0, 3);

  // Most Reviewed Items
  const mostReviewed = itemsWithStats
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total || b.avg - a.avg)
    .slice(0, 3);

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Upper Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: Key Performance Metrics */}
        <div className="bg-[#09090e]/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-alexandria">
            <TrendingUp className="w-4.5 h-4.5 text-rose-500" />
            <span>مؤشرات الأداء الرئيسية</span>
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1 font-cairo">متوسط التقييم</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white font-mono">{average.toFixed(1)}</span>
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
              </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1 font-cairo">إجمالي الآراء</span>
              <span className="text-2xl font-black text-white font-mono">{total}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1 font-cairo">قيد المراجعة / مخفي</span>
              <span className="text-xl font-bold text-amber-500 font-mono">
                {pending} <span className="text-zinc-600 text-xs font-normal">/</span> {hidden}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1 font-cairo">المميزة (Featured)</span>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-rose-500 font-mono">{featured}</span>
                <Sparkles className="w-3.5 h-3.5 text-rose-500 fill-current" />
              </div>
            </div>
          </div>

          {/* Conversion rate indicator */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold font-cairo">
              <span className="text-zinc-400">معدل التقييم الإيجابي (4+★)</span>
              <span className="text-emerald-400 font-mono">{conversionRate.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 transition-all duration-1000" 
                style={{ width: `${conversionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* COLUMN 2: Ratings Distribution Histogram */}
        <div className="bg-[#09090e]/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-alexandria">
            <Star className="w-4.5 h-4.5 text-yellow-400" />
            <span>توزيع التقييمات</span>
          </h3>

          <div className="space-y-3.5 pt-2">
            {ratingDistribution.map(item => (
              <div key={item.stars} className="flex items-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1 w-12 shrink-0 font-mono text-zinc-400">
                  <span>{item.stars}</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                </div>
                
                <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#D6004B] rounded-full transition-all duration-1000" 
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                
                <div className="w-16 text-left font-mono font-bold text-zinc-500 text-[10px] shrink-0">
                  {item.pct.toFixed(0)}% ({item.count})
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: Monthly Volume Trend */}
        <div className="bg-[#09090e]/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-alexandria">
            <MessageSquare className="w-4.5 h-4.5 text-indigo-400" />
            <span>حجم التقييمات المضافة مؤخرًا</span>
          </h3>

          <div className="h-32 flex items-end justify-between gap-3 pt-4 px-2 relative">
            {monthsData.map((m, idx) => {
              const heightPct = (m.count / maxMonthCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="absolute bottom-[105%] bg-zinc-950 border border-white/10 text-white font-mono text-[9px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl select-none text-center min-w-[50px]">
                    {m.count} تقييم
                  </div>
                  
                  <div className="w-full bg-zinc-900 rounded-t-lg overflow-hidden flex items-end h-20">
                    <div 
                      className="w-full bg-gradient-to-t from-rose-600/30 to-rose-500 hover:from-rose-500 hover:to-pink-400 transition-all rounded-t-lg duration-1000 origin-bottom"
                      style={{ height: `${Math.max(heightPct, 5)}%` }}
                    />
                  </div>
                  
                  <span className="text-[10px] text-zinc-500 font-bold font-cairo text-center">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Miniature Aggregate Summary Widgets */}
      {total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 font-cairo">
          {/* Top Rated Courses Widget */}
          <div className="bg-[#09090e]/40 border border-white/5 p-5 rounded-2xl space-y-3.5">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 font-alexandria">
              <Award className="w-4 h-4 text-rose-500" />
              <span>أعلى الكورسات تقييماً</span>
            </h4>
            <div className="space-y-2">
              {topCourses.length === 0 ? (
                <span className="text-[10px] text-zinc-600 block py-2">لا توجد تقييمات مسجلة</span>
              ) : (
                topCourses.map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/5 text-[11px]">
                    <div className="flex items-center gap-2 truncate max-w-[170px]">
                      <span className="font-mono text-zinc-500">#{idx+1}</span>
                      <span className="text-white truncate font-medium">{c.title}</span>
                      {c.isVolatile && (
                        <span className="bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold font-cairo shrink-0" title="تقييمات متذبذبة (الانحراف المعياري > 1.2)">
                          ⚠️ متذبذب
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-zinc-500">({c.total} تقييم)</span>
                      <div className="flex items-center text-yellow-400 gap-0.5 font-bold">
                        <span>{c.avg.toFixed(1)}</span>
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Rated Products Widget */}
          <div className="bg-[#09090e]/40 border border-white/5 p-5 rounded-2xl space-y-3.5">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 font-alexandria">
              <ShoppingBag className="w-4 h-4 text-emerald-500" />
              <span>أعلى المنتجات الرقمية تقييماً</span>
            </h4>
            <div className="space-y-2">
              {topProducts.length === 0 ? (
                <span className="text-[10px] text-zinc-600 block py-2">لا توجد تقييمات مسجلة</span>
              ) : (
                topProducts.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/5 text-[11px]">
                    <div className="flex items-center gap-2 truncate max-w-[170px]">
                      <span className="font-mono text-zinc-500">#{idx+1}</span>
                      <span className="text-white truncate font-medium">{p.title}</span>
                      {p.isVolatile && (
                        <span className="bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold font-cairo shrink-0" title="تقييمات متذبذبة (الانحراف المعياري > 1.2)">
                          ⚠️ متذبذب
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-zinc-500">({p.total} تقييم)</span>
                      <div className="flex items-center text-yellow-400 gap-0.5 font-bold">
                        <span>{p.avg.toFixed(1)}</span>
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Most Reviewed Items Widget */}
          <div className="bg-[#09090e]/40 border border-white/5 p-5 rounded-2xl space-y-3.5">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 font-alexandria">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>أكثر العناصر مراجعة</span>
            </h4>
            <div className="space-y-2">
              {mostReviewed.length === 0 ? (
                <span className="text-[10px] text-zinc-600 block py-2">لا توجد تقييمات مسجلة</span>
              ) : (
                mostReviewed.map((m, idx) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/5 text-[11px]">
                    <div className="flex items-center gap-2 truncate max-w-[170px]">
                      <span className="font-mono text-zinc-500">#{idx+1}</span>
                      <span className="text-white truncate font-medium">{m.title}</span>
                      {m.isVolatile && (
                        <span className="bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold font-cairo shrink-0" title="تقييمات متذبذبة (الانحراف المعياري > 1.2)">
                          ⚠️ متذبذب
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-zinc-400 font-bold">{m.total} تقييم</span>
                      <div className="flex items-center text-yellow-400 gap-0.5">
                        <span>{m.avg.toFixed(1)}</span>
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
