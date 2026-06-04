"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Flame, ShoppingCart, Loader2, Volume2, VolumeX,
  Play, RefreshCw, ArrowUpRight, CheckCircle2, Clock, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/pricing";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  product_title: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
  currency?: string;
}

export default function LiveOrdersFeed() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

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
          playSuccessChime();
          toast.success(`New order: ${newOrder.customer_name} purchased ${newOrder.product_title}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  async function loadData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      if (data) setOrders(data as Order[]);
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

      {/* Live Feed List */}
      <div className="max-w-4xl mx-auto space-y-4">
        {loading ? (
          <div className="w-full h-80 flex items-center justify-center bg-[#09090b]/40 rounded-3xl border border-white/5 animate-pulse">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-sm">
            No live transactional activity recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {orders.map((order) => {
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
                        <h3 className="text-sm font-bold text-white truncate">{order.customer_name || "Anonymous Buyer"}</h3>
                        <p className="text-xs text-zinc-400 mt-1 truncate">{order.product_title}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{order.customer_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                      <div className="text-left md:text-right">
                        <p className="text-sm font-bold text-rose-500">{formatPrice(order.amount, (order.currency as any) || 'EGP').replace("ج.م", "L.E")}</p>
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

    </div>
  );
}
