"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, BookOpen, Award, Star, 
  AlertTriangle, ShieldCheck, HelpCircle 
} from "lucide-react";

export interface ActivityItem {
  id: string;
  type: "enrollment" | "lesson_completion" | "certificate" | "review" | "quiz_failure" | "login";
  user: string;
  itemTitle?: string;
  details?: string;
  created_at: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

export default function ActivityFeed({ activities, maxItems = 15 }: ActivityFeedProps) {
  const visibleActivities = activities.slice(0, maxItems);

  const getIcon = (type: string) => {
    switch (type) {
      case "enrollment":
        return { icon: Users, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "lesson_completion":
        return { icon: BookOpen, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
      case "certificate":
        return { icon: Award, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
      case "review":
        return { icon: Star, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
      case "quiz_failure":
        return { icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
      case "login":
        return { icon: ShieldCheck, color: "text-zinc-400 bg-white/5 border-white/5" };
      default:
        return { icon: HelpCircle, color: "text-zinc-500 bg-white/5 border-white/5" };
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "enrollment": return "Enrolled in course";
      case "lesson_completion": return "Completed lesson";
      case "certificate": return "Earned certificate";
      case "review": return "Left a course review";
      case "quiz_failure": return "Failed quiz attempt";
      case "login": return "Logged into dashboard";
      default: return "Performed activity";
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) {
      return "recently";
    }
  };

  return (
    <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-[420px] relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Live Student Activity Feed</h3>
            <p className="text-[10px] text-zinc-500">Real-time learning events and platform registrations</p>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        <div className="overflow-y-auto max-h-[300px] space-y-2.5 pr-1 custom-scrollbar">
          <AnimatePresence initial={false}>
            {visibleActivities.length === 0 ? (
              <div className="py-16 text-center text-zinc-600 text-xs">
                No recent activity recorded.
              </div>
            ) : (
              visibleActivities.map((act) => {
                const config = getIcon(act.type);
                const IconComponent = config.icon;
                
                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all flex items-start gap-3 text-left font-sans"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${config.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black text-white truncate">{act.user}</p>
                        <span className="text-[8.5px] text-zinc-500 font-mono shrink-0">
                          {formatRelativeTime(act.created_at)}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-semibold leading-tight">
                        {getLabel(act.type)}{" "}
                        {act.itemTitle && (
                          <span className="text-white font-extrabold">{act.itemTitle}</span>
                        )}
                      </p>
                      {act.details && (
                        <p className="text-[9px] text-zinc-500 italic mt-0.5 truncate max-w-xs">{act.details}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[9px] text-zinc-600 font-bold">
        <span>Showing up to {maxItems} items</span>
        <span className="text-rose-500 uppercase tracking-widest">Realtime Sync Active</span>
      </div>
    </div>
  );
}
