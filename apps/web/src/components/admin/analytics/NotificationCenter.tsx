"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, X, ShieldAlert, CreditCard, Award, 
  Star, Settings, Trash2, CheckCircle2 
} from "lucide-react";

export interface AlertNotification {
  id: string;
  type: "new_order" | "failed_payment" | "refund" | "new_student" | "new_review" | "revenue_spike" | "suspicious_login";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface NotificationPrefs {
  new_order: boolean;
  failed_payment: boolean;
  refund: boolean;
  new_student: boolean;
  new_review: boolean;
  revenue_spike: boolean;
  suspicious_login: boolean;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AlertNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  prefs: NotificationPrefs;
  onUpdatePref: (key: keyof NotificationPrefs, val: boolean) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  prefs,
  onUpdatePref
}: NotificationCenterProps) {

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "new_order":
      case "revenue_spike":
        return { icon: CreditCard, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "failed_payment":
      case "refund":
        return { icon: ShieldAlert, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
      case "new_student":
        return { icon: Award, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
      case "new_review":
        return { icon: Star, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
      case "suspicious_login":
        return { icon: ShieldAlert, color: "text-red-500 bg-red-600/10 border-red-600/20 animate-pulse" };
      default:
        return { icon: Bell, color: "text-zinc-400 bg-white/5 border-white/5" };
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "الآن";
      if (diffMins < 60) return `منذ ${diffMins} د`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `منذ ${diffHours} س`;
      return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
    } catch (e) {
      return "مؤخراً";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50"
          />

          {/* Drawer container - Opens from Left */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-screen w-full max-w-sm bg-[#07070b]/98 border-r border-white/5 z-55 flex flex-col shadow-2xl backdrop-blur-lg text-right"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-500" />
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">مركز الإشعارات والتنبيهات</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification logs list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                <span>آخر التنبيهات ({notifications.length})</span>
                <div className="flex gap-2.5">
                  {notifications.some(n => !n.read) && (
                    <button onClick={onMarkAllAsRead} className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> قراءة الكل
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={onClearAll} className="hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer">
                      <Trash2 className="w-3 h-3" /> تفريغ
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <div className="py-16 text-center text-zinc-600 text-xs">
                    لا توجد تنبيهات نشطة حالياً.
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const config = getAlertIcon(notif.type);
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border transition-all flex items-start gap-3 relative ${
                          notif.read 
                            ? "bg-white/[0.01] border-white/5 hover:border-white/10" 
                            : "bg-[#D6004B]/5 border-[#D6004B]/10 hover:border-[#D6004B]/20"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${config.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5 text-right">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10.5px] font-black text-white truncate">{notif.title}</span>
                            <span className="text-[8px] text-zinc-500 font-mono shrink-0" dir="ltr">
                              {getRelativeTime(notif.created_at)}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-zinc-400 font-medium leading-normal">{notif.message}</p>
                        </div>
                        {!notif.read && (
                          <span className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[#D6004B]" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Notification settings footer */}
            <div className="p-4 border-t border-white/5 bg-[#050508]/80">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-3">
                <Settings className="w-3.5 h-3.5" />
                <span>إعدادات تنبيهات النظام</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 text-[10px] font-semibold text-zinc-400">
                {[
                  { key: "new_order", label: "مبيعات المنتجات الرقمية الجديدة" },
                  { key: "failed_payment", label: "عمليات الدفع الفاشلة والمرفوضة" },
                  { key: "new_student", label: "تسجيلات الطلاب في الأكاديمية (LMS)" },
                  { key: "new_review", label: "التقييمات والمراجعات المضافة حديثاً" },
                  { key: "suspicious_login", label: "تنبيهات الأمان ومحاولات الدخول المشبوهة" }
                ].map((pref) => (
                  <label key={pref.key} className="flex items-center justify-between cursor-pointer select-none">
                    <span>{pref.label}</span>
                    <input
                      type="checkbox"
                      checked={prefs[pref.key as keyof NotificationPrefs]}
                      onChange={(e) => onUpdatePref(pref.key as keyof NotificationPrefs, e.target.checked)}
                      className="w-8 h-4 bg-white/10 checked:bg-rose-500 border border-white/10 rounded-full appearance-none relative cursor-pointer before:content-[''] before:absolute before:left-0.5 before:top-0.5 before:w-3 before:h-3 before:bg-white before:rounded-full before:transition-all checked:before:left-4 transition-all focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
