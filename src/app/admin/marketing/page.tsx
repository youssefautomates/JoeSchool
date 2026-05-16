"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Target, Activity, Save, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function MarketingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    metaPixelId: "",
    metaPixelEnabled: false,
    tiktokPixelId: "",
    tiktokPixelEnabled: false
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data) setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("فشل تحميل إعدادات التتبع");
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success("تم حفظ إعدادات بيكسل التتبع بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-2 md:p-8 font-cairo">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-alexandria font-black text-white mb-3">إعدادات التسويق والتتبع</h1>
          <p className="text-zinc-400">إدارة Meta Pixel و TikTok Pixel لتتبع التحويلات (Conversions)</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          حفظ الإعدادات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Meta Pixel Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0f] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-[50px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-alexandria font-bold text-white">Meta Pixel</h3>
                <p className="text-sm text-zinc-500 mt-1">تتبع أحداث فيسبوك وانستجرام</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Switch 
                checked={settings.metaPixelEnabled}
                onCheckedChange={(c) => setSettings({...settings, metaPixelEnabled: c})}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="space-y-3">
              <Label className="text-zinc-300 font-bold">Pixel ID (معرف البيكسل)</Label>
              <Input 
                value={settings.metaPixelId}
                onChange={(e) => setSettings({...settings, metaPixelId: e.target.value})}
                placeholder="مثال: 123456789012345"
                className="h-12 bg-white/5 border-white/10 text-white font-mono text-left focus:border-blue-500 focus:ring-blue-500/20"
                dir="ltr"
              />
            </div>
            
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex gap-3">
              <Activity className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-100/70 leading-relaxed">
                <p className="font-bold text-blue-300 mb-1">الأحداث التي يتم تتبعها تلقائياً:</p>
                PageView, ViewContent, AddToCart, InitiateCheckout, Purchase (مع إرسال قيمة الطلب والعملة).
              </div>
            </div>
          </div>
        </motion.div>

        {/* TikTok Pixel Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0a0a0f] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-pink-500/30 transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/10 rounded-full blur-[50px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20">
                <Target className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h3 className="text-2xl font-alexandria font-bold text-white">TikTok Pixel</h3>
                <p className="text-sm text-zinc-500 mt-1">تتبع التحويلات من إعلانات تيك توك</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Switch 
                checked={settings.tiktokPixelEnabled}
                onCheckedChange={(c) => setSettings({...settings, tiktokPixelEnabled: c})}
                className="data-[state=checked]:bg-pink-500"
              />
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="space-y-3">
              <Label className="text-zinc-300 font-bold">Pixel ID (معرف البيكسل)</Label>
              <Input 
                value={settings.tiktokPixelId}
                onChange={(e) => setSettings({...settings, tiktokPixelId: e.target.value})}
                placeholder="مثال: C1234567890ABCDEF"
                className="h-12 bg-white/5 border-white/10 text-white font-mono text-left focus:border-pink-500 focus:ring-pink-500/20"
                dir="ltr"
              />
            </div>
            
            <div className="bg-pink-500/5 border border-pink-500/10 rounded-xl p-4 flex gap-3">
              <Activity className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
              <div className="text-sm text-pink-100/70 leading-relaxed">
                <p className="font-bold text-pink-300 mb-1">الأحداث المدمجة مسبقاً:</p>
                Pageview, ViewContent, AddToCart, InitiateCheckout, CompletePayment (مع البيانات الكاملة).
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-8 flex items-start gap-4">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h4 className="text-xl font-alexandria font-bold text-emerald-400 mb-2">تكامل الأكواد التلقائي (Auto-Injection)</h4>
          <p className="text-emerald-100/60 leading-relaxed max-w-3xl">
            بمجرد تفعيل البيكسل وإدخال المعرفات، سيقوم النظام تلقائياً بحقن الأكواد الذكية في جميع صفحات المتجر. 
            لا حاجة للتعديل اليدوي أو إضافة أكواد برمجية. نظام التتبع جاهز وموثوق ويعمل بنسبة 100% مع متطلبات التتبع الدقيقة.
          </p>
        </div>
      </div>
    </div>
  );
}
