"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface RevenueChartProps {
  data: Array<{
    name: string;
    Revenue: number;
    Profit: number;
    Orders: number;
  }>;
  revenueGrowth?: number;
  currencySymbol?: string;
}

export default function RevenueChart({ data, revenueGrowth, currencySymbol = "ج.م" }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl p-6 text-center text-zinc-500 text-xs font-sans">
        لم يتم العثور على سجلات عمليات الدفع في الفترة المحددة.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between font-sans text-right" dir="rtl">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">تطور الإيرادات وصافي الأرباح</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">حجم العمليات التجارية المكتملة بالعملة المحلية</p>
        </div>
        {revenueGrowth !== undefined && revenueGrowth !== 0 && (
          <span className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${
            revenueGrowth >= 0 
              ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10" 
              : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
          }`}>
            {revenueGrowth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth.toFixed(1)}% مقارنة بالفترة السابقة
          </span>
        )}
      </div>

      <div className="w-full h-48 sm:h-72" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D6004B" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#D6004B" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="profitGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
               dataKey="name" 
              stroke="#3f3f46" 
              fontSize={8.5} 
              tickLine={false} 
              dy={5}
              minTickGap={15}
            />
            <YAxis 
              stroke="#3f3f46" 
              fontSize={8.5} 
              tickLine={false}
              dx={-5}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "#060608", borderColor: "rgba(255,255,255,0.06)", borderRadius: "12px", textAlign: "right" }}
              labelStyle={{ color: "#ffffff", fontWeight: "bold", fontSize: "10px" }}
              itemStyle={{ fontSize: "10px", padding: "1px 0" }}
              formatter={(value: any, name: any) => [`${value} ${currencySymbol === 'USD' ? 'دولار' : 'ج.م'}`, name === 'Revenue' ? 'الإيرادات' : 'صافي الربح']}
            />
            <Area type="monotone" dataKey="Revenue" stroke="#D6004B" strokeWidth={1.5} fillOpacity={1} fill="url(#revenueGlow)" name="Revenue" />
            <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#profitGlow)" name="Profit" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
