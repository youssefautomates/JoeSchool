"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, ShieldAlert, Sparkles, Loader2, Zap, 
  AlertTriangle, Ban, Clock, ChevronDown, ChevronUp,
  TrendingUp, BookOpen, Award, Star, ShieldCheck, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  type: "enrollment" | "lesson_completion" | "certificate" | "review" | "quiz_failure" | "login" | "purchase";
  user: string;
  itemTitle?: string;
  details?: string;
  created_at: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  product_title: string;
  product_id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
  currency?: string;
  payment_id?: string;
  coupon_code?: string;
}

interface LiveActivitySectionProps {
  activities: ActivityItem[];
  seeding: boolean;
  analyticsTableMissing: boolean;
  diagnosticsLogs: {
    failed: Order[];
    pending: Order[];
  };
  handleSeedTelemetry: () => void;
  formatDate: (dateStr: string) => string;
  formatPrice: (amount: number, currency: string) => string;
}

export default function LiveActivitySection({
  activities,
  seeding,
  analyticsTableMissing,
  diagnosticsLogs,
  handleSeedTelemetry,
  formatDate,
  formatPrice
}: LiveActivitySectionProps) {
  const [showDeveloperTools, setShowDeveloperTools] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return { icon: Zap, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "enrollment":
        return { icon: BookOpen, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
      case "lesson_completion":
        return { icon: Clock, color: "text-zinc-400 bg-white/5 border-white/5" };
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
      case "purchase": return "أكمل عملية شراء جديدة لـ";
      case "enrollment": return "سجل في الكورس التعليمي";
      case "lesson_completion": return "أنهى الدرس التعليمي في";
      case "certificate": return "حصل على شهادة التخرج الرسمية في";
      case "review": return "أضاف تقييماً بـ ٥ نجوم لـ";
      case "quiz_failure": return "لم يتجاوز الاختبار المؤهل في";
      case "login": return "سجل الدخول للنظام";
      default: return "قام بنشاط تفاعلي في";
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return "الآن";
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      
      return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
    } catch (e) {
      return "مؤخراً";
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Live Stream Card */}
      <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-6 shadow-2xl relative overflow-hidden">
        {/* Pulse Dot Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h3 className="text-sm font-black text-white">النشاط المباشر والعمليات الفورية</h3>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium">مراقبة حية لكافة الأنشطة التعليمية وعمليات الشراء والتحويلات مباشرة</p>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl font-bold">
            تحديث فوري
          </span>
        </div>

        {/* Live List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pl-1 custom-scrollbar">
          <AnimatePresence initial={false}>
            {activities.length === 0 ? (
              <div className="py-24 text-center text-zinc-600 text-xs font-semibold">
                لا توجد سجلات أنشطة في الوقت الحالي. بانتظار أحداث جديدة...
              </div>
            ) : (
              activities.map((act) => {
                const config = getIcon(act.type);
                const IconComponent = config.icon;
                
                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-3.5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all flex items-start gap-4"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", config.color)}>
                      <IconComponent className="w-4.5 h-4.5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white truncate">{act.user}</p>
                        <span className="text-[9px] text-zinc-500 font-bold shrink-0">
                          {formatRelativeTime(act.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-semibold leading-relaxed">
                        {getLabel(act.type)}{" "}
                        {act.itemTitle && (
                          <span className="text-white font-extrabold">{act.itemTitle}</span>
                        )}
                      </p>
                      {act.details && (
                        <p className="text-[10px] text-zinc-500 font-medium italic mt-1">{act.details}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-bold">
          <span>مجموع الأنشطة المسجلة: {activities.length} نشاط</span>
          <span className="text-rose-500">متصل بقاعدة البيانات بنجاح</span>
        </div>
      </div>

      {/* Demoted Developer Tools (Collapsible Segment at the bottom) */}
      <div className="rounded-3xl bg-[#09090e]/40 border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowDeveloperTools(!showDeveloperTools)}
          className="w-full px-6 py-4 flex items-center justify-between text-zinc-400 hover:text-white transition-all bg-white/[0.01]"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4.5 h-4.5 text-zinc-500" />
            <span className="text-xs font-black">أدوات المطور وتشخيص الأخطاء</span>
          </div>
          {showDeveloperTools ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
        </button>

        {showDeveloperTools && (
          <div className="p-6 border-t border-white/5 space-y-6 bg-black/20">
            {/* Seeder Tool */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  محاكي البيانات وقاعدة البيانات
                </h4>
                <p className="text-[10px] text-zinc-500 max-w-xl">
                  توليد طلبات وعمليات شراء وزيارات وهمية لاختبار مظهر الرسوم البيانية والجداول.
                </p>
              </div>
              <button
                onClick={handleSeedTelemetry}
                disabled={seeding}
                className="flex items-center justify-center gap-2 px-5 h-9 rounded-xl text-[10px] font-black bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50 shrink-0"
              >
                {seeding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    توليد بيانات اختبارية
                  </>
                )}
              </button>
            </div>

            {/* Missing Table Alert */}
            {analyticsTableMissing && (
              <div className="p-4.5 rounded-2xl bg-red-950/20 border border-red-500/10 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[11px] font-bold text-red-400">جدول الزيارات غير متوفر</h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed mt-0.5">
                      يرجى إنشاء جدول <code className="font-mono text-white bg-white/5 px-1 rounded">analytics_events</code> في سوبابيس لتسجيل إحصائيات المرور الكاملة ومصادر الزيارات.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Failed Payments */}
              <div className="rounded-2xl border border-white/5 p-4.5 bg-black/40">
                <h5 className="text-xs font-bold text-red-400 pb-3 border-b border-white/5 mb-3">
                  عمليات الدفع الفاشلة / المرفوضة ({diagnosticsLogs.failed.length})
                </h5>
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {diagnosticsLogs.failed.length === 0 ? (
                    <div className="py-8 text-center text-zinc-600 text-[10px] font-medium">
                      لا توجد عمليات دفع فاشلة مسجلة.
                    </div>
                  ) : (
                    diagnosticsLogs.failed.map((ord) => (
                      <div key={ord.id} className="p-3 rounded-xl bg-red-950/5 border border-red-500/5 text-[10px] space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-white">{ord.customer_name}</span>
                          <span className="text-zinc-500 font-mono">{formatDate(ord.created_at)}</span>
                        </div>
                        <p className="text-zinc-400">المنتج: {ord.product_title}</p>
                        <div className="flex justify-between items-center pt-1 border-t border-white/5 font-semibold text-zinc-500">
                          <span>المبلغ: {formatPrice(ord.amount, ord.currency || "EGP")}</span>
                          <span className="text-red-400">فشلت المعاملة</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pending Sessions */}
              <div className="rounded-2xl border border-white/5 p-4.5 bg-black/40">
                <h5 className="text-xs font-bold text-amber-400 pb-3 border-b border-white/5 mb-3">
                  سلات الشراء المعلقة / المتروكة ({diagnosticsLogs.pending.length})
                </h5>
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {diagnosticsLogs.pending.length === 0 ? (
                    <div className="py-8 text-center text-zinc-600 text-[10px] font-medium">
                      لا توجد جلسات دفع معلقة.
                    </div>
                  ) : (
                    diagnosticsLogs.pending.map((ord) => (
                      <div key={ord.id} className="p-3 rounded-xl bg-amber-950/5 border border-amber-500/5 text-[10px] space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-white">{ord.customer_name}</span>
                          <span className="text-zinc-500 font-mono">{formatDate(ord.created_at)}</span>
                        </div>
                        <p className="text-zinc-400">المنتج: {ord.product_title}</p>
                        <div className="flex justify-between items-center pt-1 border-t border-white/5 font-semibold text-zinc-500">
                          <span>المبلغ: {formatPrice(ord.amount, ord.currency || "EGP")}</span>
                          <span className="text-amber-400">قيد الانتظار</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
