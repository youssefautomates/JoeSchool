"use client";

import { motion } from "framer-motion";
import { Zap, Clock, ShieldCheck, Sparkles, Download, RefreshCw, Smartphone, Headphones } from "lucide-react";

const features = [
  {
    title: "تسليم فوري",
    desc: "احصل على ملفاتك فوراً بعد الدفع مباشرة دون انتظار، النظام مؤتمت بالكامل.",
    icon: Zap,
    color: "from-rose-500 to-pink-500"
  },
  {
    title: "أنظمة جاهزة",
    desc: "تدفقات عمل n8n وقوالب ذكاء اصطناعي مختبرة وجاهزة للربط والتشغيل فوراً.",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "دعم مستمر",
    desc: "فريقنا متواجد للإجابة على استفساراتك ومساعدتك في إعداد الأنظمة بنجاح.",
    icon: Headphones,
    color: "from-emerald-500 to-teal-500"
  },
  {
    title: "تحديثات مجانية",
    desc: "نحدث منتجاتنا دورياً لمواكبة التغيرات، وستحصل على التحديثات مجاناً دائماً.",
    icon: RefreshCw,
    color: "from-orange-500 to-amber-500"
  },
  {
    title: "أمان عالي",
    desc: "بياناتك ومدفوعاتك محمية بأعلى معايير التشفير العالمية لضمان تجربة آمنة.",
    icon: ShieldCheck,
    color: "from-indigo-500 to-purple-500"
  },
  {
    title: "سهولة الاستخدام",
    desc: "لا تحتاج لخبرة برمجية عميقة، نوفر لك أدلة تشغيل مبسطة لكل منتج.",
    icon: Smartphone,
    color: "from-violet-500 to-fuchsia-500"
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-1.5 rounded-full font-cairo text-sm font-bold mb-6 border border-rose-500/20"
          >
            <Sparkles className="w-4 h-4" />
            لماذا يختارنا المحترفون؟
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-6 tracking-tight">مميزات تجعلنا خيارك الأول</h2>
          <p className="text-zinc-400 font-cairo text-lg max-w-2xl mx-auto leading-relaxed">
            نحن لا نبيع مجرد ملفات، بل نوفر لك حلولاً متكاملة ترفع كفاءة عملك وتوفر وقتك الثمين.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group relative"
            >
              <div className="h-full bg-white/[0.03] border border-white/5 p-8 rounded-[2rem] hover:bg-white/[0.05] transition-all duration-500 hover:border-rose-500/30 group-hover:-translate-y-2">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
                
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-0.5 mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <div className="w-full h-full bg-[#050505] rounded-[0.9rem] flex items-center justify-center">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-alexandria font-bold text-white mb-4 group-hover:text-rose-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 font-cairo leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
