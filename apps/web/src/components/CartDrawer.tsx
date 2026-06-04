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
            className="fixed top-0 left-0 h-full w-[90%] md:w-[400px] bg-[#0a0a0f] border-r border-white/10 z-[101] shadow-2xl flex flex-col font-cairo"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/10 flex items-center justify-center text-rose-500">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-alexandria font-bold text-white">سلة المشتريات</h2>
                <span className="bg-white/10 text-white text-xs px-2 py-1 rounded-md">{items.length}</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <ShoppingCart className="w-16 h-16 text-zinc-500" />
                  <p className="text-zinc-400 font-bold">السلة فارغة حالياً</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 group relative">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#050505]">
                      <Image src={item.image_url || "/placeholder.png"} alt={item.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-sm font-bold text-white line-clamp-2">{item.title}</h3>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-zinc-500 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-alexandria font-black text-rose-400">{formatPrice(item.price, currency)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-zinc-400 font-bold">الإجمالي:</span>
                  <span className="text-2xl font-alexandria font-black text-white">{formatPrice(cartTotal, currency)}</span>
                </div>
                <Link
                  href="/checkout/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full h-14 bg-[#D6004B] hover:bg-[#b0003d] text-white font-cairo font-black text-lg rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(214,0,75,0.3)] hover:shadow-[0_0_30px_rgba(214,0,75,0.5)]"
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
