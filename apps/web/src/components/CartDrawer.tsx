"use client";

import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Trash2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { resolveUserCurrency, formatPrice, type Currency } from "@/lib/pricing";

export function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, removeFromCart, cartTotal } = useCart();
  const [currency, setCurrency] = useState<Currency>("EGP");

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed top-0 left-0 h-full w-[90%] md:w-[400px] bg-slate-50 border-r border-zinc-200 z-[101] shadow-sm border border-zinc-200/60 flex flex-col font-sans"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-600/10 flex items-center justify-center text-yellow-500">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-sans font-bold text-zinc-900">سلة المشتريات</h2>
                <span className="bg-zinc-100/80 text-zinc-900 text-xs px-2 py-1 rounded-xl">{items.length}</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-zinc-100/80 rounded-full text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <ShoppingCart className="w-16 h-16 text-zinc-500" />
                  <p className="text-zinc-500 font-bold">السلة فارغة حالياً</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-zinc-100/40 p-4 rounded-2xl border border-zinc-200/60 group relative">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white">
                      <Image src={item.image_url || "/placeholder.png"} alt={item.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-sm font-bold text-zinc-900 line-clamp-2">{item.title}</h3>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-zinc-500 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-sans font-black text-yellow-500">{formatPrice(item.price, currency)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-zinc-200 bg-zinc-50/70">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-zinc-500 font-bold">الإجمالي:</span>
                  <span className="text-2xl font-sans font-black text-zinc-900">{formatPrice(cartTotal, currency)}</span>
                </div>
                <Link
                  href="/checkout/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full h-14 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-sans font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-all shadow-none hover:shadow-[0_0_30px_rgba(29, 78, 216,0.5)]"
                >
                  إتمام الشراء
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
