"use client";

import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from "recharts";
import { CreditCard } from "lucide-react";

interface DistributionChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export default function DistributionChart({ data }: DistributionChartProps) {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  if (totalValue === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-zinc-200/60 rounded-2xl p-6 text-center text-zinc-500 text-xs font-sans">
        No revenue distribution data found for the selected period.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between font-sans text-left" dir="ltr">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-200/60">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">EGP vs USD Revenue Split</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Distribution of total sales volume by currency</p>
        </div>
        <CreditCard className="w-4 h-4 text-zinc-500 shrink-0" />
      </div>

      <div className="w-full h-48 sm:h-64 flex items-center justify-center relative" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              <Cell fill="#1D4ED8" />
              <Cell fill="#10b981" />
            </Pie>
            <Tooltip
              formatter={(value: any, name: any) => {
                const nameEn = name === "EGP Revenue" ? "EGP Revenue" : "USD Revenue (EGP Equivalent)";
                if (name === "EGP Revenue") return [`${value} EGP`, nameEn];
                return [`$${(value / 50).toFixed(2)} USD (Equivalent to ${value} EGP)`, nameEn];
              }}
              contentStyle={{ backgroundColor: "#ffffff", borderColor: "rgba(0,0,0,0.08)", borderRadius: "12px", textAlign: "left" }}
              itemStyle={{ fontSize: "10px" }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              formatter={(value) => {
                const valueEn = value === "EGP Revenue" ? "EGP Revenue" : "USD Revenue";
                return <span className="text-[9.5px] sm:text-[10.5px] font-bold text-zinc-500">{valueEn}</span>;
              }} 
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
