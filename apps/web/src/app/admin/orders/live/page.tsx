"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Flame, ShoppingCart, Loader2, Volume2, VolumeX,
  Play, RefreshCw, ArrowUpRight, CheckCircle2, Clock, XCircle, X,
  BookOpen, Eye, EyeOff, Copy, Lock, Calendar, User, Mail, CreditCard,
  Sparkles, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/pricing";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_id?: string;
  product_title: string;
  amount: number;
  currency?: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
  coupon_code?: string | null;
  gateway_fee_amount?: number;
  subtotal_price?: number;
  final_price?: number;
  country?: string;
  city?: string;
  country_name?: string;
  payment_provider?: string;
  payment_method?: string;
  checkout_password?: string;
}

const countryTranslations: Record<string, string> = {
  "Egypt": "مصر",
  "EG": "مصر",
  "United States": "أمريكا",
  "US": "أمريكا",
  "Saudi Arabia": "السعودية",
  "SA": "السعودية",
  "United Arab Emirates": "الإمارات",
  "AE": "الإمارات",
  "Kuwait": "الكويت",
  "KW": "الكويت",
  "Qatar": "قطر",
  "QA": "قطر",
  "Bahrain": "البحرين",
  "BH": "البحرين",
  "Oman": "عمان",
  "OM": "عمان",
  "Jordan": "الأردن",
  "JO": "الأردن",
  "Lebanon": "لبنان",
  "LB": "لبنان",
  "Syria": "سوريا",
  "SY": "سوريا",
  "Iraq": "العراق",
  "IQ": "العراق",
  "Palestine": "فلسطين",
  "PS": "فلسطين",
  "Yemen": "اليمن",
  "YE": "اليمن",
  "Libya": "ليبيا",
  "LY": "ليبيا",
  "Sudan": "السودان",
  "SD": "السودان",
  "Algeria": "الجزائر",
  "DZ": "الجزائر",
  "Morocco": "المغرب",
  "MA": "المغرب",
  "Tunisia": "تونس",
  "TN": "تونس",
};

const getLocalizedLocation = (country: string | undefined, city: string | undefined) => {
  if (!country && !city) return "غير معروف";
  const cn = country ? (countryTranslations[country] || country) : "";
  const ct = city || "";
  if (cn && ct) return `${cn} / ${ct}`;
  return cn || ct;
};

const getFlagEmoji = (countryCode: string | undefined) => {
  if (!countryCode) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return "🌐";
  }
};

const formatArabicDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  const timePart = date.toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} ${timePart}`;
};

const formatArabicPrice = (amount: number, currency: string = "EGP") => {
  const symbol = currency === "EGP" ? "ج.م" : currency;
  return `${amount.toFixed(2)} ${symbol}`;
};

const getPaymentMethodInfo = (order: { payment_method?: string; payment_provider?: string }) => {
  if (order.payment_provider === "instapay") return null;
  
  const method = (order.payment_method || "").toLowerCase();
  const provider = (order.payment_provider || "").toLowerCase();
  
  if (method === "instapay" || provider === "instapay") return null;
  
  if (
    method.includes("wallet") || 
    method.includes("vodafone") || 
    method.includes("etisalat") || 
    method.includes("orange") || 
    method.includes("we") || 
    method === "mw"
  ) {
    return {
      text: "Mobile Wallet",
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    };
  }
  
  if (
    method.includes("card") || 
    method.includes("visa") || 
    method.includes("mastercard") || 
    method.includes("meeza") || 
    method === "card"
  ) {
    return {
      text: "Bank Card",
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    };
  }

  // Fallback for default Paymob integration
  if (provider === "paymob" || method === "tbc") {
    return {
      text: "Bank Card",
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    };
  }

  return null;
};

export default function LiveOrdersFeed() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [fetchingOriginalPrice, setFetchingOriginalPrice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Filter and Timeline States
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "incomplete">("all");
  const [orderEvents, setOrderEvents] = useState<Record<string, string>>({});

  const playSuccessChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log("Audio blocked", e);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to new orders insert events via supabase realtime
    const channel = supabase
      .channel("page-live-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders(prev => [newOrder, ...prev]);
          setOrderEvents(prev => ({ ...prev, [newOrder.id]: "order_created" }));
          playSuccessChime();
          toast.success(`New order: ${newOrder.customer_name} purchased ${newOrder.product_title}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  // Fetch original price when an order is selected
  useEffect(() => {
    if (!selectedOrder) {
      setOriginalPrice(null);
      setShowPassword(false);
      return;
    }

    async function fetchOriginalPrice() {
      if (!selectedOrder?.product_id) return;
      setFetchingOriginalPrice(true);
      try {
        let price = null;
        // Try courses table
        if (selectedOrder.product_id.startsWith("course-") || selectedOrder.product_id.includes("course")) {
          const { data, error } = await supabase
            .from("courses")
            .select("original_price_egp, price_egp, original_price, price")
            .eq("id", selectedOrder.product_id)
            .maybeSingle();
          if (data) {
            price = data.original_price_egp || data.original_price || data.price_egp || data.price;
          }
        }
        
        // Try products table if not found or not course
        if (!price) {
          const { data, error } = await supabase
            .from("products")
            .select("original_price_egp, price_egp, original_price, price")
            .eq("id", selectedOrder.product_id)
            .maybeSingle();
          if (data) {
            price = data.original_price_egp || data.original_price || data.price_egp || data.price;
          }
        }

        if (price) {
          setOriginalPrice(Number(price));
        }
      } catch (err) {
        console.error("Error fetching original price:", err);
      } finally {
        setFetchingOriginalPrice(false);
      }
    }

    fetchOriginalPrice();
  }, [selectedOrder]);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      if (data) {
        setOrders(data as Order[]);
        
        // Fetch timeline events for these orders to determine exact last stage
        const orderIds = data.map(o => o.id);
        if (orderIds.length > 0) {
          try {
            const { data: events, error: eventsErr } = await supabase
              .from("analytics_events")
              .select("event_name, metadata, created_at")
              .filter("metadata->>order_id", "in", `(${orderIds.join(",")})`);
            
            if (events) {
              const eventMap: Record<string, string> = {};
              // Sort by created_at ascending so that the last one processed (latest) overwrites
              const sortedEvents = [...events].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              sortedEvents.forEach(evt => {
                const oid = evt.metadata?.order_id;
                if (oid) {
                  eventMap[oid] = evt.event_name;
                }
              });
              setOrderEvents(eventMap);
            }
          } catch (evtErr) {
            console.error("Failed to query order events:", evtErr);
          }
        }
      }
    } catch (err) {
      console.error("[LIVE ORDERS] Load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStageDescription = (order: Order, eventName?: string) => {
    if (eventName) {
      switch (eventName) {
        case "email_sent":
          return "Course activated & confirmation email sent successfully";
        case "course_enrolled":
          return "Course enrolled for student successfully";
        case "payment_success":
          return "Payment succeeded";
        case "order_created":
          return "Order created / awaiting payment";
        default:
          break;
      }
    }

    if (order.status === "completed") {
      const isCourse = 
        order.product_title?.includes("دورة") || 
        order.product_title?.includes("كورس") || 
        order.product_id?.startsWith("course-");
      return isCourse ? "Course activated & email confirmation sent" : "Payment succeeded & invoice sent";
    } else if (order.status === "failed") {
      return "Payment attempt failed";
    } else {
      if (order.payment_provider === "instapay") {
        return "Selected InstaPay / Awaiting transfer confirmation";
      }
      return "On checkout page / Awaiting payment completion";
    }
  };

  const getStageStyles = (order: Order, eventName?: string) => {
    const desc = getStageDescription(order, eventName);
    if (order.status === "completed") {
      return {
        bg: "bg-emerald-50/50 border border-emerald-100/50",
        dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        text: "text-emerald-800 font-bold",
        desc
      };
    } else if (order.status === "failed") {
      return {
        bg: "bg-red-50/50 border border-red-100/50",
        dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
        text: "text-red-800 font-bold",
        desc
      };
    } else {
      return {
        bg: "bg-amber-50/50 border border-amber-100/50",
        dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse",
        text: "text-amber-800 font-bold",
        desc
      };
    }
  };

  // Filter and pricing calculations
  const filteredOrders = orders.filter(order => {
    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return order.status === "completed";
    if (statusFilter === "incomplete") return order.status !== "completed";
    return true;
  });

  const totalCharged = selectedOrder ? Number(selectedOrder.final_price || selectedOrder.amount || 0) : 0;
  const gatewayFee = selectedOrder ? Number(selectedOrder.gateway_fee_amount || 0) : 0;
  const netSettled = selectedOrder ? (selectedOrder.subtotal_price ? Number(selectedOrder.subtotal_price) : (totalCharged - gatewayFee)) : 0;

  const netPaidPriceVal = selectedOrder ? (selectedOrder.subtotal_price ? Number(selectedOrder.subtotal_price) : totalCharged) : 0;
  const hasDiscount = selectedOrder ? (originalPrice !== null && originalPrice > netPaidPriceVal) : false;
  const originalPriceVal = hasDiscount ? (originalPrice || netPaidPriceVal) : netPaidPriceVal;
  const discountVal = hasDiscount ? (originalPriceVal - netPaidPriceVal) : 0;

  return (
    <div className="space-y-8 min-h-screen pb-16 text-left live-orders-feed-container" dir="ltr">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Alexandria:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        .live-orders-feed-container, 
        .live-orders-feed-container *,
        .font-cairo,
        .font-cairo * {
          font-family: 'Cairo', 'Alexandria', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        }
      `}</style>
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Live Sales Feed
            <Flame className="w-8 h-8 text-emerald-400" />
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Watch real-time transactional performance and customer checkout flows with live acoustic chimes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-11 h-11 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-rose-500" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-5 h-11 rounded-xl text-xs font-bold transition-all bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[#09090b]/40 border border-white/5 rounded-2xl w-fit">
        {[
          { id: "all", label: "All Orders", count: orders.length },
          { id: "completed", label: "Completed Orders", count: orders.filter(o => o.status === "completed").length },
          { id: "incomplete", label: "Incomplete Orders", count: orders.filter(o => o.status !== "completed").length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === tab.id
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/10"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
              statusFilter === tab.id ? "bg-white/20 text-white" : "bg-white/5 text-zinc-500"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Live Feed List */}
      <div className="max-w-4xl mx-auto space-y-4">
        {loading ? (
          <div className="w-full h-80 flex items-center justify-center bg-[#09090b]/40 rounded-3xl border border-white/5 animate-pulse">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-sm bg-[#09090b]/20 rounded-3xl border border-white/5">
            No orders match this filter currently.
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredOrders.map((order) => {
                const statusColors = {
                  completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                  failed: "text-red-400 bg-red-500/10 border-red-500/20"
                };
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 rounded-3xl bg-[#09090b]/60 border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-600/10 border border-rose-500/20 shrink-0">
                        <ShoppingCart className="w-5 h-5 text-rose-500" />
                      </div>
                      <div className="min-w-0 text-left">
                        <h3 
                          onClick={() => setSelectedOrder(order)}
                          className="text-sm font-bold text-white truncate cursor-pointer hover:text-rose-500 hover:underline transition-colors inline-block"
                        >
                          {order.customer_name || "Anonymous Buyer"}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 truncate">{order.product_title}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{order.customer_email}</p>
                        
                        {/* Last Stage Badge */}
                        <div className="mt-2.5 flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl w-fit">
                          <span className="text-[#D6004B] font-bold text-[9px] uppercase tracking-wider">Last Stage:</span>
                          <span className="text-zinc-300 text-xs font-semibold">{getStageDescription(order, orderEvents[order.id])}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                      <div className="text-left md:text-right">
                        <p className="text-sm font-bold text-rose-500">{formatPrice(order.amount, (order.currency as any) || 'EGP').replace("EGP", "L.E")}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const payMethodInfo = getPaymentMethodInfo(order);
                          if (!payMethodInfo) return null;
                          return (
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${payMethodInfo.color}`}>
                              {payMethodInfo.text}
                            </span>
                          );
                        })()}
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${statusColors[order.status] || statusColors.pending}`}>
                          {order.status === "completed" ? "Completed" : order.status === "failed" ? "Failed" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Customer / Order Detail Modal (Arabic, RTL) */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-zinc-100 p-8 relative text-left text-zinc-900 font-cairo"
              dir="ltr"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-all active:scale-95 cursor-pointer shadow-sm z-10"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6 mt-4">
                {/* Header: Product & Status */}
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-extrabold border border-rose-100">
                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                    <span>Order & Collection Details</span>
                  </div>
                  
                  <h2 className="text-xl md:text-2xl font-black text-zinc-900 leading-snug tracking-tight">
                    {selectedOrder.product_title}
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-semibold">{formatDate(selectedOrder.created_at)}</span>
                    </div>

                    <span className={`px-3 py-1 rounded-full font-bold text-xs border flex items-center gap-1.5 ${
                      selectedOrder.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : selectedOrder.status === 'pending'
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {selectedOrder.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                      {selectedOrder.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                      {selectedOrder.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                      {selectedOrder.status === 'completed' ? 'Confirmed / Paid' : selectedOrder.status === 'pending' ? 'Awaiting Payment' : 'Failed / Incomplete'}
                    </span>
                  </div>
                </div>

                {/* Card 1: Last Stage Reached */}
                <div className="bg-zinc-50/50 border border-zinc-100 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Current Order Telemetry</span>
                  {(() => {
                    const stageStyles = getStageStyles(selectedOrder, orderEvents[selectedOrder.id]);
                    return (
                      <div className={`flex items-center gap-3 p-3.5 rounded-xl ${stageStyles.bg} transition-all`}>
                        <div className={`w-3 h-3 rounded-full shrink-0 ${stageStyles.dot}`} />
                        <p className={`text-sm leading-relaxed ${stageStyles.text}`}>{stageStyles.desc}</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Card 2: Financial Slip / Invoice */}
                <div className="bg-zinc-50/30 border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                  {/* Purchase Price Header */}
                  <div className="p-4 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pricing & Settlement Breakdown</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Price and Discount */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Product Price</span>
                      <div className="text-right">
                        {hasDiscount ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zinc-400 line-through font-semibold">{formatPrice(originalPriceVal, selectedOrder.currency as any)}</span>
                              <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-lg text-[10px] border border-rose-100">{formatPrice(discountVal, selectedOrder.currency as any)} discount</span>
                            </div>
                            <div className="text-2xl font-black text-zinc-900 leading-none mt-1">
                              {formatPrice(netPaidPriceVal, selectedOrder.currency as any)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-2xl font-black text-zinc-900 leading-none">
                            {formatPrice(netPaidPriceVal, selectedOrder.currency as any)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dotted separator */}
                    <div className="border-t border-dashed border-zinc-200 my-2" />

                    {/* Settlement details */}
                    <div className="space-y-2.5 text-xs">
                      {(() => {
                        const payMethodInfo = getPaymentMethodInfo(selectedOrder);
                        if (!payMethodInfo) return null;
                        return (
                          <div className="flex justify-between items-center text-zinc-500 font-semibold border-b border-zinc-100 pb-2 mb-2">
                            <span>Payment Method</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${payMethodInfo.color}`}>
                              {payMethodInfo.text}
                            </span>
                          </div>
                        );
                      })()}
                      
                      <div className="flex justify-between items-center text-zinc-500 font-semibold">
                        <span>Total Amount Charged</span>
                        <span className="font-bold text-zinc-900">{formatPrice(totalCharged, selectedOrder.currency as any)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-zinc-500 font-semibold">
                        <span>Payment Gateway Transaction Fee</span>
                        <span className="font-bold text-amber-600 bg-amber-50/80 border border-amber-100/50 px-2.5 py-0.5 rounded-lg text-[11px]">{formatPrice(gatewayFee, selectedOrder.currency as any)}</span>
                      </div>

                      <div className="border-t border-zinc-100 pt-3 mt-3 flex justify-between items-center font-bold text-sm">
                        <span className="text-zinc-800">Net Wallet Settlement</span>
                        <span className="text-[#D6004B] font-black text-base">{formatPrice(netSettled, selectedOrder.currency as any)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Customer Card & Login info */}
                <div className="bg-zinc-50/30 border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-zinc-50/80 border-b border-zinc-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Customer Details & Security</span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Customer Profile Details */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-rose-600/15 shrink-0 select-none">
                        {selectedOrder.customer_name ? selectedOrder.customer_name.trim().charAt(0) : "C"}
                      </div>
                      <div className="text-right min-w-0 flex-1">
                        <h4 className="font-bold text-zinc-900 text-sm leading-tight truncate">
                          {selectedOrder.customer_name || "Anonymous Buyer"}
                        </h4>
                        
                        {/* Interactive Copy Email */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedOrder.customer_email);
                            toast.success("Email copied successfully!");
                          }}
                          className="text-zinc-500 hover:text-rose-600 font-mono text-[11px] flex items-center gap-1.5 mt-1 cursor-pointer transition-colors w-fit group"
                          title="Copy Email"
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0 text-zinc-400 group-hover:text-rose-500" />
                          <span className="select-all truncate">{selectedOrder.customer_email}</span>
                          <Copy className="w-3 h-3 text-zinc-400 group-hover:text-rose-500 shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Location Badge */}
                    <div className="flex items-center gap-1.5 bg-zinc-100/60 border border-zinc-200/20 px-3 py-1.5 rounded-xl text-xs text-zinc-600 font-medium w-fit">
                      <span className="text-base select-none">{getFlagEmoji(selectedOrder.country)}</span>
                      <span className="font-bold">{getLocalizedLocation(selectedOrder.country_name || selectedOrder.country, selectedOrder.city)}</span>
                    </div>

                    {/* Password Sub-card */}
                    {selectedOrder.checkout_password && (
                      <div className="bg-rose-50/30 border border-rose-100/30 p-3.5 rounded-xl flex justify-between items-center text-xs mt-2 transition-all hover:bg-rose-50/50">
                        <div className="flex items-center gap-2 text-zinc-600">
                          <Lock className="w-4 h-4 text-rose-500" />
                          <span className="font-bold">Account Password:</span>
                        </div>
                        
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-rose-600 text-sm bg-white border border-rose-100/30 px-3 py-1 rounded-lg select-all shadow-sm">
                            {showPassword ? selectedOrder.checkout_password : "••••••••"}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-100/40 transition-all cursor-pointer"
                            title={showPassword ? "Hide Password" : "Show Password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedOrder.checkout_password) {
                                navigator.clipboard.writeText(selectedOrder.checkout_password);
                                toast.success("Password copied successfully!");
                              }
                            }}
                            className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-100/40 transition-all cursor-pointer"
                            title="Copy Password"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
