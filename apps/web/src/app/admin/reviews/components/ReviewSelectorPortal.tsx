import React from "react";
import { BookOpen, ShoppingBag, Layers, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface ReviewSelectorPortalProps {
  onSelect: (mode: "all" | "courses" | "products") => void;
}

export function ReviewSelectorPortal({ onSelect }: ReviewSelectorPortalProps) {
  const cards = [
    {
      id: "all" as const,
      title: "All Reviews",
      desc: "Browse, edit, and manage all incoming platform reviews (courses, digital products, and bundles) in one place with advanced filtering and bulk actions.",
      icon: Layers,
      color: "from-blue-950/40 via-blue-900/10 to-transparent border-blue-500/15 text-blue-400 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]",
      glow: "bg-blue-600/5"
    },
    {
      id: "courses" as const,
      title: "Course Reviews",
      desc: "Manage reviews from enrolled students with advanced filtering by academy track, specific courses, and individual or bulk moderation.",
      icon: BookOpen,
      color: "from-rose-950/40 via-rose-900/10 to-transparent border-rose-500/15 text-rose-400 hover:border-rose-500/40 hover:shadow-[0_0_30px_rgba(214,0,75,0.1)]",
      glow: "bg-[#D6004B]/5"
    },
    {
      id: "products" as const,
      title: "Digital Product Reviews",
      desc: "Monitor and manage customer reviews for digital products and smart assistants in the store, ensuring compliance with publishing policies.",
      icon: ShoppingBag,
      color: "from-emerald-950/40 via-emerald-900/10 to-transparent border-emerald-500/15 text-emerald-400 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]",
      glow: "bg-emerald-600/5"
    }
  ];

  return (
    <div className="space-y-8 py-4 font-sans" dir="ltr">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight font-sans">
          Reviews Management System
        </h1>
        <p className="text-zinc-500 text-xs md:text-sm leading-relaxed font-sans">
          Please select the section you want to manage to start reviewing and editing user reviews.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto pt-6 px-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              onClick={() => onSelect(card.id)}
              className={`relative bg-[#09090e] border p-8 rounded-3xl cursor-pointer transition-all duration-300 group overflow-hidden flex flex-col justify-between hover:scale-[1.02] shadow-2xl h-[280px] bg-gradient-to-br ${card.color}`}
            >
              {/* Ambient light glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 ${card.glow} rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-all`} />

              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-current group-hover:bg-white/10 transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-rose-500 transition-colors font-sans">
                    {card.title}
                  </h3>
                  <p className="text-zinc-400 text-[11px] md:text-xs leading-relaxed line-clamp-4 font-sans">
                    {card.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-zinc-300 group-hover:text-white transition-colors mt-4 self-start font-sans">
                <span>Open Section</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
