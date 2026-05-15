"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Package, CreditCard, Loader2 } from "lucide-react";

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

  return (
    <div className="p-8 text-white font-cairo bg-[#050505] min-h-screen">
      <h1 className="text-3xl font-alexandria font-bold mb-8">لوحة التحكم (نسخة مستقرة)</h1>
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" /> جاري تحميل الإحصائيات...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-2xl">
             <div className="flex items-center gap-4 text-zinc-400 mb-4">
               <ShoppingCart className="w-6 h-6 text-rose-500" /> الطلبات
             </div>
             <p className="text-2xl font-bold">مستقر</p>
           </Card>
           <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-2xl">
             <div className="flex items-center gap-4 text-zinc-400 mb-4">
               <Package className="w-6 h-6 text-emerald-500" /> المنتجات
             </div>
             <p className="text-2xl font-bold">مستقر</p>
           </Card>
           <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-2xl">
             <div className="flex items-center gap-4 text-zinc-400 mb-4">
               <CreditCard className="w-6 h-6 text-amber-500" /> الإيرادات
             </div>
             <p className="text-2xl font-bold">مستقر</p>
           </Card>
        </div>
      )}
    </div>
  );
}
