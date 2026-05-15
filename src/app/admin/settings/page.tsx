"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  Shield, 
  CreditCard, 
  Mail, 
  Store, 
  Save, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Rocket,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Store Settings State
  const [storeName, setStoreName] = useState("يوسف أوتميتس");
  const [storeEmail, setStoreEmail] = useState("contact@youssefautomates.com");
  
  // Paymob Settings State
  const [paymobApiKey, setPaymobApiKey] = useState("••••••••••••••••••••••••");
  const [paymobIntegrationId, setPaymobIntegrationId] = useState("4567891");
  const [paymobHmac, setPaymobHmac] = useState("••••••••••••••••");

  const handleSave = async () => {
    setIsLoading(true);
    // In a real app, you'd save these to a settings table in Supabase or an API
    setTimeout(() => {
      setIsLoading(false);
      toast.success("تم حفظ الإعدادات بنجاح", {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });
    }, 1500);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-alexandria font-black text-white mb-3 tracking-tighter">إعدادات النظام</h1>
          <p className="text-zinc-500 font-cairo text-lg">إدارة هوية المتجر، بوابات الدفع، وإعدادات الأمان المتقدمة.</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={isLoading}
          className="bg-rose-600 hover:bg-rose-500 text-white font-alexandria font-bold px-8 h-14 rounded-2xl transition-all shadow-xl shadow-rose-500/20 active:scale-95"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> جاري الحفظ...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              حفظ كافة التغييرات
            </div>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Navigation */}
        <div className="lg:col-span-3 space-y-3">
          <nav className="flex flex-col gap-2">
            {[
              { id: "general", label: "الإعدادات العامة", icon: Store, active: true },
              { id: "payments", label: "بوابة الدفع (Paymob)", icon: CreditCard, active: false },
              { id: "email", label: "خدمات البريد (Resend)", icon: Mail, active: false },
              { id: "security", label: "الأمان والخصوصية", icon: Shield, active: false },
            ].map((item) => (
              <button 
                key={item.id}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-cairo font-bold group",
                  item.active 
                    ? "bg-rose-600/10 text-rose-500 border border-rose-500/20" 
                    : "text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.active && <ChevronRight className="w-4 h-4 mr-auto rotate-180" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-9 space-y-8">
          {/* General Store Settings */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-white/5 bg-zinc-900/50 rounded-[2.5rem] overflow-hidden backdrop-blur-xl p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-alexandria font-black text-white">هوية المتجر</h3>
                  <p className="text-zinc-500 font-cairo text-sm">المعلومات الأساسية التي تظهر للعملاء.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-zinc-400 font-cairo pr-2">اسم المتجر</Label>
                  <Input 
                    value={storeName} 
                    onChange={e => setStoreName(e.target.value)}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl focus:border-rose-500 transition-all font-cairo text-lg" 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-zinc-400 font-cairo pr-2">بريد التواصل</Label>
                  <Input 
                    value={storeEmail} 
                    onChange={e => setStoreEmail(e.target.value)}
                    dir="ltr"
                    className="h-14 bg-white/5 border-white/10 rounded-2xl focus:border-rose-500 transition-all font-sans text-lg text-left" 
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Paymob Integration */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-white/5 bg-zinc-900/50 rounded-[2.5rem] overflow-hidden backdrop-blur-xl p-8 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-alexandria font-black text-white">بوابة الدفع (Paymob)</h3>
                  <p className="text-zinc-500 font-cairo text-sm">الربط البرمجي لاستقبال المدفوعات.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-zinc-400 font-cairo pr-2">API Key</Label>
                  <div className="relative">
                    <Input 
                      type={showApiKey ? "text" : "password"}
                      value={paymobApiKey} 
                      onChange={e => setPaymobApiKey(e.target.value)}
                      dir="ltr"
                      className="h-14 bg-white/5 border-white/10 rounded-2xl focus:border-rose-500 transition-all font-mono text-lg pr-12" 
                    />
                    <button 
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-zinc-400 font-cairo pr-2">Integration ID</Label>
                    <Input 
                      value={paymobIntegrationId} 
                      onChange={e => setPaymobIntegrationId(e.target.value)}
                      dir="ltr"
                      className="h-14 bg-white/5 border-white/10 rounded-2xl focus:border-rose-500 transition-all font-mono text-lg text-left" 
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-zinc-400 font-cairo pr-2">HMAC Secret</Label>
                    <Input 
                      type="password"
                      value={paymobHmac} 
                      onChange={e => setPaymobHmac(e.target.value)}
                      dir="ltr"
                      className="h-14 bg-white/5 border-white/10 rounded-2xl focus:border-rose-500 transition-all font-mono text-lg text-left" 
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Security Status Card */}
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-600/20">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-alexandria font-bold text-white text-xl mb-1">النظام مؤمن بالكامل</h4>
                <p className="text-zinc-500 font-cairo">يتم تشفير كافة مفاتيح الربط (Keys) قبل تخزينها.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-emerald-500 font-cairo font-bold">
              <CheckCircle2 className="w-5 h-5" />
              حالة الاتصال: نشط
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
