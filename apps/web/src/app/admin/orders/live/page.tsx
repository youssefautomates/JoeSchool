"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Flame, ShoppingCart, Loader2, Volume2, VolumeX,
  Play, RefreshCw, ArrowUpRight, CheckCircle2, Clock, XCircle, X
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

export default function LiveOrdersFeed() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [fetchingOriginalPrice, setFetchingOriginalPrice] = useState(false);

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
          return "تم إرسال إيميل التفعيل بنجاح";
        case "course_enrolled":
          return "تم تفعيل الكورس للمشترك";
        case "payment_success":
          return "تم السداد بنجاح";
        case "order_created":
          return "تم إنشاء الطلب / في انتظار السداد";
        default:
          break;
      }
    }

    if (order.status === "completed") {
      const isCourse = 
        order.product_title?.includes("دورة") || 
        order.product_title?.includes("كورس") || 
        order.product_id?.startsWith("course-");
      return isCourse ? "تم تفعيل الكورس وإرسال الإيميل" : "تم السداد وإرسال الفاتورة";
    } else if (order.status === "failed") {
      return "فشلت عملية الدفع";
    } else {
      if (order.payment_provider === "instapay") {
        return "اختيار انستاباي / بانتظار تأكيد التحويل";
      }
      return "في صفحة الدفع / بانتظار إتمام السداد";
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
    <div className="space-y-8 font-sans text-zinc-100 min-h-screen pb-16 text-left" dir="ltr">
      
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
          { id: "all", label: "كل العمليات", count: orders.length },
          { id: "completed", label: "الطلبات الناجحة (المكتملة)", count: orders.filter(o => o.status === "completed").length },
          { id: "incomplete", label: "الطلبات غير المكتملة", count: orders.filter(o => o.status !== "completed").length }
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
            لا توجد طلبات تطابق هذا التصنيف حالياً.
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
                      <div className="min-w-0">
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
                          <span className="text-[#D6004B] font-bold text-[9px] uppercase tracking-wider">آخر مرحلة:</span>
                          <span className="text-zinc-300 text-xs font-semibold">{getStageDescription(order, orderEvents[order.id])}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                      <div className="text-left md:text-right">
                        <p className="text-sm font-bold text-rose-500">{formatPrice(order.amount, (order.currency as any) || 'EGP').replace("EGP", "L.E")}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${statusColors[order.status] || statusColors.pending}`}>
                        {order.status === "completed" ? "Completed" : order.status === "failed" ? "Failed" : "Pending"}
                      </span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl p-6 relative text-right text-zinc-900 border border-zinc-100"
              dir="rtl"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-6 mt-4">
                {/* Title and Badge */}
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 leading-snug">{selectedOrder.product_title}</h2>
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    <span>{formatArabicDate(selectedOrder.created_at)}</span>
                    <span className={`px-3 py-0.5 rounded-full font-bold text-[11px] border ${
                      selectedOrder.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : selectedOrder.status === 'pending'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {selectedOrder.status === 'completed' ? 'مؤكد' : selectedOrder.status === 'pending' ? 'انتظار الدفع' : 'غير مدفوع'}
                    </span>
                  </div>
                </div>

                <hr className="border-zinc-100" />

                {/* Last Step Reached */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">آخر مرحلة وصل إليها العميل</h3>
                  <div className="flex items-center gap-2 mt-1 bg-zinc-50 border border-zinc-100 p-3 rounded-2xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-sm font-bold text-zinc-800">{getStageDescription(selectedOrder, orderEvents[selectedOrder.id])}</p>
                  </div>
                </div>

                <hr className="border-zinc-100" />

                {/* Purchase Price */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">سعر الشراء</h3>
                  <div className="space-y-1">
                    {hasDiscount && (
                      <>
                        <div className="text-sm text-zinc-400 line-through">
                          {formatArabicPrice(originalPriceVal, selectedOrder.currency)}
                        </div>
                        <div className="text-sm text-red-500 font-bold">
                          {formatArabicPrice(discountVal, selectedOrder.currency)} (خصم)
                        </div>
                      </>
                    )}
                    <div className="text-2xl font-black text-zinc-900">
                      {formatArabicPrice(netPaidPriceVal, selectedOrder.currency)}
                    </div>
                  </div>
                </div>

                <hr className="border-zinc-100" />

                {/* Settlement Amount */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">مبلغ التسوية</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">المبلغ الكلي</span>
                      <span className="font-semibold text-zinc-900">{formatArabicPrice(totalCharged, selectedOrder.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">رسوم الدفع</span>
                      <span className="font-semibold text-amber-600">{formatArabicPrice(gatewayFee, selectedOrder.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-zinc-100 pt-1.5 font-bold">
                      <span className="text-zinc-800">المبلغ الصافي</span>
                      <span className="text-zinc-950">{formatArabicPrice(netSettled, selectedOrder.currency)}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-zinc-100" />

                {/* Product */}
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">المنتج</h3>
                  <p className="text-sm font-bold text-zinc-950">{selectedOrder.product_title}</p>
                </div>

                <hr className="border-zinc-100" />

                {/* Customer Info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">العميل</h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-zinc-900">{selectedOrder.customer_name || "مشتري مجهول"}</p>
                    <p className="text-sky-600 font-mono select-all">{selectedOrder.customer_email}</p>
                    <p className="text-zinc-600 flex items-center gap-1">
                      <span>{getFlagEmoji(selectedOrder.country)}</span>
                      <span>{getLocalizedLocation(selectedOrder.country_name || selectedOrder.country, selectedOrder.city)}</span>
                    </p>
                    {selectedOrder.checkout_password && (
                      <div className="mt-3 bg-rose-50 border border-rose-100/30 p-3 rounded-2xl flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-bold">كلمة مرور الحساب:</span>
                        <span className="font-mono font-black text-rose-600 select-all">{selectedOrder.checkout_password}</span>
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
