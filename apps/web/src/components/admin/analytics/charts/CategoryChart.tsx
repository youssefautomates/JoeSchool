"use client";

import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip
} from "recharts";
import { Award } from "lucide-react";

interface CategoryData {
  name: string;
  revenue: number;
  visits: number;
  conversion: number;
}

interface CategoryChartProps {
  data: CategoryData[];
}

export default function CategoryChart({ data }: CategoryChartProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  if (totalRevenue === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-zinc-200/60 rounded-2xl p-6 text-center text-zinc-500 text-xs font-sans">
        No category sales statistics found.
      </div>
    );
  }

  // Format Recharts data structure
  const chartData = data.map((item) => ({
    name: item.name,
    Revenue: item.revenue,
    Conversion: item.conversion,
  }));

  return (
    <div className="w-full h-full flex flex-col justify-between font-sans text-left" dir="ltr">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-200/60">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Category Sales</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Sales volume distribution and conversion rate by product category</p>
        </div>
        <Award className="w-4 h-4 text-zinc-500 shrink-0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
        {/* Recharts Bar chart - Desktop only */}
        <div className="md:col-span-3 h-48 sm:h-56 hidden sm:block" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#3f3f46" fontSize={8} tickLine={false} />
              <YAxis stroke="#3f3f46" fontSize={8} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "rgba(0,0,0,0.08)", borderRadius: "12px", textAlign: "left" }}
                labelStyle={{ color: "#09090b", fontWeight: "bold", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
                formatter={(value: any, name: any) => [name === "Revenue" ? `${value} EGP` : `${value}%`, name === "Revenue" ? "Revenue" : "Conversion Rate"]}
              />
              <Bar dataKey="Revenue" fill="#1D4ED8" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? "#1D4ED8" : index === 1 ? "#10b981" : "#3b82f6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed stats rows */}
        <div className="md:col-span-2 space-y-2.5">
          {data.map((c, index) => {
            const colors = ["#1D4ED8", "#10b981", "#3b82f6", "#f59e0b"];
            const color = colors[index] || "#71717a";

            return (
              <div key={c.name} className="p-2.5 rounded-2xl bg-zinc-50/40 border border-zinc-200/60 space-y-1.5 text-left">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-bold text-zinc-900 truncate">{c.name}</span>
                  </div>
                  <span className="font-black text-yellow-500 font-mono shrink-0 ml-1">{c.revenue} EGP</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold">
                  <span>{c.visits} visits</span>
                  <span className="text-emerald-400">Conversion: {c.conversion.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
