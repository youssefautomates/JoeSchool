"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Package, CreditCard, Loader2, TrendingUp } from "lucide-react";

export default function AdminStable() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    console.log("[EFFECT] Admin Dashboard load()");
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function load() {
      console.log("[FETCH_START] Admin Dashboard");
      const { data, error } = await supabase.from("orders").select("id").limit(1);
      console.log("[FETCH_DONE] Admin Dashboard");
      setData({ orders: data, error: error?.message });
      setLoading(false);
    }
    load();
  }, []);

  console.log("[RENDER] Admin Dashboard rendered");

  const stats = [
    {
      label: "الطلبات",
      value: "مستقر",
      icon: ShoppingCart,
      accent: "#D6004B",
      glow: "rgba(214,0,75,0.12)",
    },
    {
      label: "المنتجات",
      value: "مستقر",
      icon: Package,
      accent: "#10b981",
      glow: "rgba(16,185,129,0.12)",
    },
    {
      label: "الإيرادات",
      value: "مستقر",
      icon: CreditCard,
      accent: "#f59e0b",
      glow: "rgba(245,158,11,0.12)",
    },
  ];

  return (
    <div className="p-6 md:p-10 font-cairo min-h-screen" style={{ background: "#080810" }}>
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-alexandria font-black mb-1" style={{ color: "#ffffff" }}>
          لوحة التحكم
        </h1>
        <p className="text-sm" style={{ color: "#52525b" }}>
          نسخة مستقرة · Stable Architecture
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3" style={{ color: "#52525b" }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#D6004B" }} />
          جاري تحميل الإحصائيات...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-6 relative overflow-hidden transition-all duration-200"
              style={{
                background: "rgba(16,16,26,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              {/* Glow blob */}
              <div
                className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl pointer-events-none"
                style={{ background: stat.glow }}
              />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <p className="text-sm font-semibold" style={{ color: "#71717a" }}>
                  {stat.label}
                </p>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${stat.accent}20` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.accent }} />
                </div>
              </div>
              <p className="text-2xl font-black font-alexandria relative z-10" style={{ color: "#ffffff" }}>
                {stat.value}
              </p>
              <div
                className="mt-3 flex items-center gap-1.5 text-xs relative z-10"
                style={{ color: stat.accent }}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                أداء مستقر
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
