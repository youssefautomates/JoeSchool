"use client";

import React, { ReactNode } from "react";

interface TableWrapperProps {
  title: string;
  subtitle: string;
  icon: any; // Lucide Icon component
  iconColorClass?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function TableWrapper({
  title,
  subtitle,
  icon: Icon,
  iconColorClass = "text-rose-500 bg-rose-500/10 border-rose-500/20",
  action,
  children
}: TableWrapperProps) {
  return (
    <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-6 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="pb-4 border-b border-white/5 mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${iconColorClass}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 text-right">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 truncate">{title}</h3>
            <p className="text-[9.5px] text-zinc-500 font-semibold truncate mt-0.5">{subtitle}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
