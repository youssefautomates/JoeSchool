"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingCart, Package, CreditCard, Loader2, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle,
  Activity, Zap, Users, DollarSign, BarChart3, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  product_title: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, customer_name, customer_email, product_title, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("products")
          .select("id, title, price, sales, status")
          .limit(5),
      ]);
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (productsRes.data) setProducts(productsRes.data);
    } catch (err) {
      console.error("[DASHBOARD] Load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const completedOrders = orders.filter(o => o.status === "completed");
  const pendingOrders = orders.filter(o => o.status === "pending");
  const failedOrders = orders.filter(o => o.status === "failed");
  const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);
  const conversionRate = orders.length > 0
    ? ((completedOrders.length / orders.length) * 100).toFixed(1)
    : "0.0";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const stats = [
    {
      label: "إجمالي الإيرادات",
      value: `${totalRevenue.toFixed(0)} ج.م`,
      icon: DollarSign,
      accent: "#D6004B",
      glow: "rgba(214,0,75,0.15)",
      sub: `${completedOrders.length} طلب مكتمل`,
      trend: "+12%",
      up: true,
    },
    {
      label: "إجمالي الطلبات",
      value: orders.length.toString(),
      icon: ShoppingCart,
      accent: "#6366f1",
      glow: "rgba(99,102,241,0.15)",
      sub: `${pendingOrders.length} قيد الانتظار`,
      trend: "+8%",
      up: true,
    },
    {
      label: "المنتجات النشطة",
      value: products.filter(p => p.status === "نشط").length.toString(),
      icon: Package,
      accent: "#10b981",
      glow: "rgba(16,185,129,0.15)",
      sub: `${products.length} منتج إجمالاً`,
      trend: "0%",
      up: true,
    },
    {
      label: "معدل التحويل",
      value: `${conversionRate}%`,
      icon: Activity,
      accent: "#f59e0b",
      glow: "rgba(245,158,11,0.15)",
      sub: "من إجمالي الزيارات",
      trend: "+3%",
      up: true,
    },
  ];

  const statusConfig = {
    completed: { label: "مكتمل", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", icon: CheckCircle2 },
    pending:   { label: "انتظار", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", icon: Clock },
    failed:    { label: "فشل",   color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.2)",  icon: XCircle },
  };

  return (
    <div className="space-y-8 font-cairo" style={{ minHeight: "100vh" }}>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-alexandria font-black tracking-tight" style={{ color: "#ffffff" }}>
            لوحة التحكم
          </h1>
          <p className="text-sm mt-1" style={{ color: "#52525b" }}>
            مرحباً يوسف · آخر تحديث منذ قليل
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-semibold transition-all active:scale-95 self-start sm:self-auto"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#d4d4d8" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} style={{ color: loading ? "#D6004B" : undefined }} />
          تحديث
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: "rgba(16,16,26,0.85)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: stat.glow }} />

            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${stat.accent}20` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.accent }} />
              </div>
              <span
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                style={{ background: stat.up ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: stat.up ? "#10b981" : "#ef4444" }}
              >
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </span>
            </div>

            <div className="relative z-10">
              {loading ? (
                <div className="h-9 w-24 rounded-lg animate-pulse mb-1" style={{ background: "rgba(255,255,255,0.06)" }} />
              ) : (
                <p className="text-2xl font-black font-alexandria mb-1" style={{ color: "#ffffff" }}>{stat.value}</p>
              )}
              <p className="text-xs font-semibold mb-1" style={{ color: "#71717a" }}>{stat.label}</p>
              <p className="text-xs" style={{ color: "#3f3f46" }}>{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Status Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "مكتملة", count: completedOrders.length, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
          { label: "قيد الانتظار", count: pendingOrders.length, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)" },
          { label: "فشلت", count: failedOrders.length, color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl px-4 py-4 text-center"
            style={{ background: item.bg, border: `1px solid ${item.border}` }}
          >
            <p className="text-2xl font-black font-alexandria" style={{ color: item.color }}>
              {loading ? "—" : item.count}
            </p>
            <p className="text-xs mt-1 font-semibold" style={{ color: item.color, opacity: 0.7 }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Bottom Grid: Recent Orders + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Orders */}
        <div
          className="xl:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: "rgba(16,16,26,0.85)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(214,0,75,0.15)" }}>
                <BarChart3 className="w-4 h-4" style={{ color: "#D6004B" }} />
              </div>
              <h2 className="font-alexandria font-bold text-sm" style={{ color: "#ffffff" }}>أحدث الطلبات</h2>
            </div>
            <a href="/admin/orders" className="text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all" style={{ color: "#D6004B" }}>
              عرض الكل <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <div className="h-2.5 w-48 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                  </div>
                  <div className="h-6 w-16 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
              ))
            ) : orders.length === 0 ? (
              <div className="py-16 text-center" style={{ color: "#3f3f46" }}>
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد طلبات بعد</p>
              </div>
            ) : (
              orders.slice(0, 7).map((order, i) => {
                const sc = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                    >
                      <StatusIcon className="w-4 h-4" style={{ color: sc.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#f4f4f5" }}>{order.customer_name}</p>
                      <p className="text-xs truncate" style={{ color: "#52525b" }}>{order.product_title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: "#D6004B" }}>{Number(order.amount).toFixed(0)} ج.م</p>
                      <p className="text-xs" style={{ color: "#3f3f46" }}>{order.created_at ? formatDate(order.created_at) : "—"}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Products + Quick Links */}
        <div className="space-y-4">

          {/* Top Products */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(16,16,26,0.85)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <Zap className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
                </div>
                <h2 className="font-alexandria font-bold text-sm" style={{ color: "#ffffff" }}>أفضل المنتجات</h2>
              </div>
              <a href="/admin/products" className="text-xs font-semibold" style={{ color: "#52525b" }}>عرض الكل</a>
            </div>
            <div className="p-4 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-28 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                      <div className="h-2 w-16 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                    </div>
                  </div>
                ))
              ) : products.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "#3f3f46" }}>لا توجد منتجات</p>
              ) : (
                products.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black font-alexandria shrink-0"
                      style={{ background: i === 0 ? "rgba(214,0,75,0.15)" : "rgba(255,255,255,0.05)", color: i === 0 ? "#D6004B" : "#71717a" }}
                    >
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "#e4e4e7" }}>{p.title}</p>
                      <p className="text-xs" style={{ color: "#52525b" }}>{p.price} ج.م · {p.sales || 0} مبيعة</p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-md font-semibold shrink-0"
                      style={{
                        background: p.status === "نشط" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                        color: p.status === "نشط" ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(16,16,26,0.85)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#52525b" }}>إجراءات سريعة</h3>
            {[
              { label: "إضافة منتج جديد", href: "/admin/products", color: "#D6004B", bg: "rgba(214,0,75,0.12)", border: "rgba(214,0,75,0.2)" },
              { label: "مراجعة الطلبات", href: "/admin/orders", color: "#6366f1", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)" },
              { label: "إعدادات النظام", href: "/admin/settings", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:scale-[1.02] group"
                style={{ background: item.bg, border: `1px solid ${item.border}` }}
              >
                <span className="text-sm font-semibold" style={{ color: item.color }}>{item.label}</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: item.color }} />
              </a>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
