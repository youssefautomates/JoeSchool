"use client";

import { 
  Sparkles, Loader2, Zap, AlertTriangle, 
  Ban, Clock 
} from "lucide-react";

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

interface DiagnosticsSectionProps {
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

export default function DiagnosticsSection({
  seeding,
  analyticsTableMissing,
  diagnosticsLogs,
  handleSeedTelemetry,
  formatDate,
  formatPrice
}: DiagnosticsSectionProps) {

  return (
    <div className="space-y-6 sm:space-y-8 text-right" dir="rtl">
      
      {/* Telemetry Data Seeder Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#09090e] border border-white/5 relative overflow-hidden group space-y-6">
        <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
              أداة توليد البيانات التجريبية (Telemetry)
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-xl">
              قاعدة البيانات فارغة؟ قم بتوليد 3 منتجات رقمية تجريبية، و30 طلباً ببيانات فوترة غنية، و150 نقرة تتبع زيارات. ستظهر الرسوم البيانية، ومعدلات التحويل، وتصدير إكسل فوراً.
            </p>
          </div>
          <button
            onClick={handleSeedTelemetry}
            disabled={seeding}
            className="flex items-center justify-center gap-2 px-6 h-11 rounded-xl text-xs font-black transition-all bg-rose-600 hover:bg-[#ff0059] text-white shadow-xl shadow-rose-600/10 shrink-0 cursor-pointer disabled:opacity-50 border border-transparent self-start md:self-auto"
          >
            {seeding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري ملء قاعدة البيانات...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                توليد بيانات تجريبية في قاعدة البيانات
              </>
            )}
          </button>
        </div>

        {/* Missing Table Warning */}
        {analyticsTableMissing && (
          <div className="p-4 sm:p-5 rounded-2xl bg-red-950/20 border border-red-500/10 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-right">
                <h4 className="text-xs font-bold text-red-400">جدول تتبع النقرات والزيارات (analytics_events) غير موجود</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed mt-1">
                  لتفعيل تتبع الزوار العميق (الزيارات، السلات المتروكة، قنوات التحويل)، يرجى إنشاء جدول <code className="font-mono text-white bg-white/5 px-1.5 py-0.5 rounded">analytics_events</code> في سوبابيس. انسخ كود SQL أدناه وقم بتشغيله في <strong>Supabase SQL Editor</strong>:
                </p>
              </div>
            </div>
            <div className="relative text-left" dir="ltr">
              <pre className="bg-[#050508] border border-white/5 rounded-xl p-4 text-[9px] font-mono text-rose-300 overflow-x-auto select-all max-h-36 custom-scrollbar">
{`CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    session_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_id TEXT,
    product_title TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    referrer TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin read" ON public.analytics_events FOR SELECT USING (true);`}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Failed payments audit logs */}
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-5 shadow-2xl">
          <div className="pb-4 border-b border-white/5 mb-4 flex items-center justify-between">
            <div className="text-right">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">عمليات الدفع الفاشلة / المرفوضة</h3>
              <p className="text-[10px] text-zinc-500">فشل بوابات الدفع (باي موب) التي تتطلب المراجعة</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-red-600/10 border border-red-500/20 text-red-400 text-[9px] sm:text-[10px] font-black font-mono">
              {diagnosticsLogs.failed.length} خطأ
            </span>
          </div>

          <div className="overflow-y-auto max-h-[450px] space-y-3 pl-1 custom-scrollbar">
            {diagnosticsLogs.failed.length === 0 ? (
              <div className="py-16 text-center text-zinc-600 text-xs">
                ممتاز! لم يتم رصد أي عمليات دفع فاشلة في قاعدة البيانات.
              </div>
            ) : (
              diagnosticsLogs.failed.map((ord) => (
                <div key={ord.id} className="p-3.5 rounded-2xl bg-red-500/[0.01] border border-red-500/10 flex flex-col gap-2 text-right">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{ord.customer_name || "زائر"}</span>
                    <span className="text-[8.5px] text-zinc-500 font-mono">{formatDate(ord.created_at)}</span>
                  </div>
                  <div className="text-[9.5px] text-zinc-400 leading-relaxed font-semibold">
                    <span className="text-zinc-600">المنتج:</span> {ord.product_title} <br/>
                    <span className="text-zinc-600">البريد الإلكتروني:</span> {ord.customer_email} <br/>
                    <span className="text-zinc-600">رمز الدفع (Paymob ID):</span> <span className="font-mono text-zinc-500">{ord.payment_id || "لا يوجد"}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-red-400/80 flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5" /> تم رفض المعاملة
                    </span>
                    <span className="text-red-400 font-mono">{formatPrice(ord.amount, (ord.currency as any) || "EGP")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending checkout logs */}
        <div className="rounded-3xl bg-[#09090e]/80 border border-white/5 p-4 sm:p-5 shadow-2xl">
          <div className="pb-4 border-b border-white/5 mb-4 flex items-center justify-between">
            <div className="text-right">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">جلسات الشراء المعلقة / المتروكة</h3>
              <p className="text-[10px] text-zinc-500">جلسات دفع بدأت ولكن لم يكتمل سدادها بعد</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-600/10 border border-amber-500/20 text-amber-400 text-[9px] sm:text-[10px] font-black font-mono">
              {diagnosticsLogs.pending.length} جلسة
            </span>
          </div>

          <div className="overflow-y-auto max-h-[450px] space-y-3 pl-1 custom-scrollbar">
            {diagnosticsLogs.pending.length === 0 ? (
              <div className="py-16 text-center text-zinc-600 text-xs">
                لا توجد أي جلسات شراء معلقة حالياً.
              </div>
            ) : (
              diagnosticsLogs.pending.map((ord) => (
                <div key={ord.id} className="p-3.5 rounded-2xl bg-amber-500/[0.01] border border-amber-500/10 flex flex-col gap-2 text-right">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{ord.customer_name || "زائر"}</span>
                    <span className="text-[8.5px] text-zinc-500 font-mono">{formatDate(ord.created_at)}</span>
                  </div>
                  <div className="text-[9.5px] text-zinc-400 leading-relaxed font-semibold">
                    <span className="text-zinc-600">المنتج:</span> {ord.product_title} <br/>
                    <span className="text-zinc-600">البريد الإلكتروني:</span> {ord.customer_email} <br/>
                    <span className="text-zinc-600">الكوبون المستخدم:</span> <span className="font-mono text-rose-400">{ord.coupon_code || "لا يوجد"}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-amber-400/80 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> في انتظار الرد من البوابة
                    </span>
                    <span className="text-amber-400 font-mono">{formatPrice(ord.amount, (ord.currency as any) || "EGP")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
