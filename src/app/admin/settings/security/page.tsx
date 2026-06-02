"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Clock, Activity, Ban } from "lucide-react";

export default function SecuritySettings() {
  const [sessions, setSessions] = useState([
    { id: 1, device: "Windows Chrome (Owner Account)", ip: "197.34.120.45", date: "Active Now", active: true },
    { id: 2, device: "iPhone 15 Safari", ip: "197.34.120.90", date: "2 hours ago", active: false }
  ]);

  const activityLog = [
    { action: "Successful Login Verification", user: "Youssef Mostafa", ip: "197.34.120.45", date: "10 minutes ago", status: "success" },
    { action: "Modified Digital Product #809 Details", user: "Youssef Mostafa", ip: "197.34.120.45", date: "1 hour ago", status: "success" },
    { action: "Exported Annual Gross Sales Report", user: "Youssef Mostafa", ip: "197.34.120.45", date: "4 hours ago", status: "success" }
  ];

  const handleRevoke = (id: number) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-8 font-sans text-zinc-100 min-h-screen pb-16">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            System Security & Auditing
            <ShieldCheck className="w-6 h-6 text-rose-500" />
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Monitor active sessions, administrator audit logs, and secure access configurations for JoeSchool.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sessions Control */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-[#09090e] border border-white/5 p-6 shadow-2xl space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-500" />
              Active & Authorized Sessions
            </h3>
            
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{session.device}</h4>
                    <p className="text-[10px] text-zinc-500 mt-1 font-semibold">IP Address: {session.ip} · Activity: {session.date}</p>
                  </div>
                  {session.active ? (
                    <span className="text-[9px] font-bold px-3 py-1 rounded-full bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 uppercase tracking-wider">
                      Current Session
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRevoke(session.id)}
                      className="text-[9px] font-bold px-3 py-1 rounded-full bg-red-500/5 text-red-400 border border-red-500/10 hover:bg-red-500 hover:text-white transition-all uppercase tracking-wider"
                    >
                      Revoke Access
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="rounded-2xl bg-[#09090e] border border-white/5 p-6 shadow-2xl space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Secure Action Audit Log
            </h3>
            <div className="space-y-3">
              {activityLog.map((log, i) => (
                <div key={i} className="flex justify-between items-center p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] transition-all border border-transparent hover:border-white/5">
                  <div>
                    <p className="text-xs font-bold text-white">{log.action}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-semibold">By: {log.user} · IP Address: {log.ip}</p>
                  </div>
                  <span className="text-[9px] text-zinc-400 font-bold font-mono">{log.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Side Card */}
        <div className="rounded-2xl bg-[#09090e] border border-white/5 p-6 shadow-2xl flex flex-col justify-between h-fit">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Access & Control Level</h3>
              <p className="text-xs text-zinc-500 leading-relaxed mt-2 font-semibold">
                Your current account holds full Super Admin capabilities. This grants permission to process payment intentions, trigger webhook deliveries, and execute database write operations.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.01] text-xs font-semibold">
                <span className="text-zinc-500">2FA Security Status</span>
                <span className="text-emerald-400 font-bold">Enabled & Verified</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.01] text-xs font-semibold">
                <span className="text-zinc-500">SSL Encrypted Channel</span>
                <span className="text-zinc-300 font-bold">256-bit Encrypted</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 mt-8">
            <p className="text-[10px] text-rose-400 leading-relaxed font-bold flex gap-1.5 items-start">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>SECURITY NOTICE: Never authenticate or manage settings from public, unencrypted connections.</span>
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
