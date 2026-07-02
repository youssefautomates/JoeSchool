"use client";

import { useState, useEffect } from "react";
import { fetchRelatedContent, RelatedItem } from "@/lib/related";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft } from "lucide-react";
import Link from "next/link";
import WishlistButton from "./WishlistButton";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";

interface RelatedCarouselProps {
  sourceType: "course" | "digital_product" | "bundle";
  sourceId: string;
  limit?: number;
}

export default function RelatedCarousel({
  sourceType,
  sourceId,
  limit = 4,
}: RelatedCarouselProps) {
  const [items, setItems] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("EGP");

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchRelatedContent(sourceType, sourceId, limit);
      setItems(res);
      setLoading(false);
    }
    load();
  }, [sourceType, sourceId, limit]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="py-12 border-t border-zinc-200/60 relative overflow-hidden bg-black/40">
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-500 mb-2 font-mono text-sm uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>موصى به لك</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-500">
              محتوى ذو صلة قد يعجبك
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: limit }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-200/60 bg-neutral-900/40 p-4 space-y-4 animate-pulse"
                >
                  <div className="aspect-video w-full rounded-2xl bg-zinc-100/40" />
                  <div className="h-4 w-2/3 bg-zinc-100/40 rounded" />
                  <div className="h-3 w-full bg-zinc-100/40 rounded" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-4 w-1/4 bg-zinc-100/40 rounded" />
                    <div className="h-8 w-1/3 bg-zinc-100/40 rounded" />
                  </div>
                </div>
              ))
            : items.map((item) => {
                const itemLink =
                  item.type === "course"
                    ? `/courses/${item.slug}`
                    : item.type === "bundle"
                    ? `/bundles/${item.slug}`
                    : `/product/${item.slug}`;

                const typeBadge =
                  item.type === "course"
                    ? "دورة تعليمية"
                    : item.type === "bundle"
                    ? "حزمة عروض"
                    : "منتج رقمي";

                const badgeColor =
                  item.type === "course"
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : item.type === "bundle"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-brand-500/10 text-yellow-500 border-zinc-200/60";

                return (
                  <div
                    key={`${item.type}:${item.id}`}
                    className="group relative rounded-2xl border border-zinc-200/60 bg-slate-50 hover:border-zinc-200/60 hover:shadow-[0_0_20px_rgba(29, 78, 216,0.15)] transition-all duration-300 p-4 flex flex-col h-full cursor-pointer"
                    onClick={() => window.location.href = itemLink}
                  >
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-black/40">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-900/20 font-bold bg-neutral-900">
                          JoeSchool
                        </div>
                      )}
                      
                      <div className="absolute top-2 right-2 z-20">
                        <WishlistButton itemId={item.id} itemType={item.type} size={16} />
                      </div>

                      <span
                        className={`absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-sm ${badgeColor}`}
                      >
                        {typeBadge}
                      </span>
                    </div>

                    <div className="flex flex-col flex-grow">
                      {item.category && (
                        <span className="text-yellow-500 text-xs font-mono mb-1">{item.category}</span>
                      )}
                      <h3 className="text-base font-bold text-zinc-900 group-hover:text-yellow-500 transition-colors line-clamp-1 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-neutral-400 text-xs line-clamp-2 mb-4 flex-grow leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-200/60 mt-auto">
                        <div className="flex flex-col">
                          {(() => {
                            const pricing = resolveProductPrice(item, currency);
                            return (
                              <>
                                <span className="text-base font-bold text-yellow-500">
                                  {pricing.price === 0 ? "مجاني" : formatPrice(pricing.price, currency)}
                                </span>
                                {pricing.original_price && pricing.original_price > pricing.price ? (
                                  <span className="text-xs text-neutral-500 line-through">
                                    {formatPrice(pricing.original_price, currency)}
                                  </span>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>

                        <Link
                          href={itemLink}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-zinc-100/40 hover:bg-[#1D4ED8] hover:text-white border border-zinc-200 hover:border-brand-500 text-neutral-300 text-xs font-medium transition-all duration-300"
                        >
                          <span>عرض</span>
                          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </section>
  );
}
