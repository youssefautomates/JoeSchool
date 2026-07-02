"use client";

import { motion } from "framer-motion";
import { Zap, ShieldCheck, Sparkles, RefreshCw, Smartphone, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  title: string;
  desc: string;
  icon: any;
  color: string;
  glow: string;
  accent: string;
}

const features: Feature[] = [
  {
    title: "تسليم فوري",
    desc: "احصل على ملفاتك فوراً بعد الدفع مباشرة دون انتظار، النظام مؤتمت بالكامل.",
    icon: Zap,
    color: "from-brand-500 to-pink-500",
    glow: "rgba(244,63,94,0.15)",
    accent: "group-hover:border-zinc-200/60"
  },
  {
    title: "أنظمة جاهزة",
    desc: "أدوات وقوالب إنتاج الفيديو والتصميم بالذكاء الاصطناعي جاهزة لتسريع صناعة المحتوى فوراً.",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500",
    glow: "rgba(59,130,246,0.15)",
    accent: "group-hover:border-blue-500/30"
  },
  {
    title: "دعم مستمر",
    desc: "فريقنا متواجد للإجابة على استفساراتك ومساعدتك في توظيف أدوات الذكاء الاصطناعي بنجاح.",
    icon: Headphones,
    color: "from-emerald-500 to-teal-500",
    glow: "rgba(16,185,129,0.15)",
    accent: "group-hover:border-emerald-500/30"
  },
  {
    title: "تحديثات مجانية",
    desc: "نحدث منتجاتنا دورياً لمواكبة التغيرات، وستحصل على التحديثات مجاناً دائماً.",
    icon: RefreshCw,
    color: "from-orange-500 to-amber-500",
    glow: "rgba(245,158,11,0.15)",
    accent: "group-hover:border-amber-500/30"
  },
  {
    title: "أمان عالي",
    desc: "بياناتك ومدفوعاتك محمية بأعلى معايير التشفير العالمية لضمان تجربة آمنة.",
    icon: ShieldCheck,
    color: "from-indigo-500 to-purple-500",
    glow: "rgba(99,102,241,0.15)",
    accent: "group-hover:border-indigo-500/30"
  },
  {
    title: "سهولة الاستخدام",
    desc: "لا تحتاج لخبرة برمجية عميقة، نوفر لك أدلة تشغيل مبسطة لكل منتج.",
    icon: Smartphone,
    color: "from-violet-500 to-fuchsia-500",
    glow: "rgba(168,85,247,0.15)",
    accent: "group-hover:border-purple-500/30"
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 relative bg-white overflow-hidden select-none">
      
      {/* Background glow lines */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-brand-600/[0.02] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-brand-600/[0.02] rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        
        {/* Section Title */}
        <div className="text-center mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-brand-500/10 text-yellow-500 px-4 py-1.5 rounded-full font-sans text-sm font-bold mb-6 border border-zinc-200/60"
          >
            <Sparkles className="w-4 h-4" />
            لماذا يختارنا المحترفون؟
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-sans font-black text-zinc-900 mb-6 tracking-tighter">
            مميزات تجعلنا خيارك الأول
          </h2>
          <p className="text-zinc-500 font-sans text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            نحن لا نبيع مجرد ملفات، بل نوفر لك أدوات ومسارات تعليمية ترفع كفاءة إنتاجك وتوفر وقتك الثمين.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="group relative"
            >
              <div className={cn(
                "h-full bg-slate-50/60 backdrop-blur-xl border border-zinc-200/60 p-8 rounded-[2.5rem] transition-all duration-500 group-hover:-translate-y-2 relative overflow-hidden",
                feature.accent
              )}>
                
                {/* Radial Glow matching card accent color */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                  style={{ background: feature.glow }} 
                />

                {/* Futuristic Icon Frame */}
                <div className={cn(
                  "w-14 h-14 rounded-2xl bg-gradient-to-br p-0.5 mb-6 group-hover:scale-110 transition-all duration-500 shadow-sm border border-zinc-200/60",
                  feature.color
                )}>
                  <div className="w-full h-full bg-white rounded-[0.9rem] flex items-center justify-center group-hover:bg-transparent transition-colors duration-500">
                    <feature.icon className="w-6 h-6 text-zinc-900 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>

                {/* Feature Content */}
                <h3 className="text-xl font-sans font-bold text-zinc-900 mb-4 group-hover:text-zinc-900 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-zinc-500 font-sans text-sm leading-relaxed group-hover:text-zinc-700 transition-colors">
                  {feature.desc}
                </p>

                {/* Subtle outer bottom border highlight */}
                <div className={cn(
                  "absolute bottom-0 left-10 right-10 h-[2px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  feature.color
                )} />

              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
