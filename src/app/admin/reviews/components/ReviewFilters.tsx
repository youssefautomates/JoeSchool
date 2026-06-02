import React, { useState } from "react";
import { Search, SlidersHorizontal, X, Star, Calendar, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterState {
  search: string;
  rating: string; // "all" | "low" (under 3) | "high" (4+) | "5" | "4.5" | "4" | "3.5" | "3" | "2.5" | "2" | "1"
  type: string; // "all" | "course" | "product" | "bundle"
  status: string; // "all" | "visible" | "hidden" | "pending"
  sort: string; // "recent" | "oldest" | "highest" | "lowest"
  isFeaturedFilter: boolean;
}

interface ReviewFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
}

export function ReviewFilters({ filters, onChange, onReset }: ReviewFiltersProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const presets = [
    { label: "الكل", value: "all" },
    { label: "🌟 التقييمات المميزة", value: "featured" },
    { label: "⏳ قيد الانتظار", value: "pending" },
    { label: "⚠️ تقييمات منخفضة (أقل من 3)", value: "low_ratings" },
    { label: "📅 الأحدث", value: "recent" }
  ];

  // Detect current active preset based on filters state
  const getActivePreset = () => {
    if (filters.isFeaturedFilter) return "featured";
    if (filters.status === "pending") return "pending";
    if (filters.rating === "low") return "low_ratings";
    if (filters.sort === "recent" && filters.rating === "all" && filters.status === "all" && !filters.isFeaturedFilter && filters.type === "all" && filters.search === "") {
      return "recent";
    }
    if (filters.rating === "all" && filters.status === "all" && !filters.isFeaturedFilter && filters.type === "all" && filters.search === "") {
      return "all";
    }
    return "custom";
  };

  const handleApplyPreset = (preset: string) => {
    const defaultState: FilterState = {
      search: "",
      rating: "all",
      type: "all",
      status: "all",
      sort: "recent",
      isFeaturedFilter: false
    };

    switch (preset) {
      case "all":
        onChange(defaultState);
        break;
      case "featured":
        onChange({ ...defaultState, isFeaturedFilter: true });
        break;
      case "pending":
        onChange({ ...defaultState, status: "pending" });
        break;
      case "low_ratings":
        onChange({ ...defaultState, rating: "low" });
        break;
      case "recent":
        onChange({ ...defaultState, sort: "recent" });
        break;
    }
  };

  const activePreset = getActivePreset();

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onChange({
      ...filters,
      [key]: value
    });
  };

  const filterControls = (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4" dir="rtl">
      {/* Search Input */}
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <label className="text-[10px] text-zinc-400 font-bold font-cairo">البحث باسم العميل أو العنوان</label>
        <div className="relative group">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
          <input
            type="text"
            placeholder="مثال: يوسف، صناعة المحتوى..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-xs focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-zinc-300 font-sans"
          />
        </div>
      </div>

      {/* Type Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-400 font-bold font-cairo">نوع التقييم</label>
        <select
          value={filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300 font-sans text-xs outline-none focus:border-rose-500/50 cursor-pointer"
        >
          <option value="all" className="bg-[#09090e] text-zinc-300">الكل</option>
          <option value="course" className="bg-[#09090e] text-zinc-300">🎓 كورس أكاديمي</option>
          <option value="product" className="bg-[#09090e] text-zinc-300">🛍️ منتج رقمي</option>
          <option value="bundle" className="bg-[#09090e] text-zinc-300">📦 باقة متكاملة</option>
        </select>
      </div>

      {/* Status Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-400 font-bold font-cairo">حالة النشر</label>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300 font-sans text-xs outline-none focus:border-rose-500/50 cursor-pointer"
        >
          <option value="all" className="bg-[#09090e] text-zinc-300">الكل</option>
          <option value="visible" className="bg-[#09090e] text-zinc-300">🟢 نشط / ظاهر</option>
          <option value="pending" className="bg-[#09090e] text-zinc-300">⏳ قيد الانتظار</option>
          <option value="hidden" className="bg-[#09090e] text-zinc-300">🔴 مخفي</option>
          <option value="archived" className="bg-[#09090e] text-zinc-300">📁 مؤرشف / محذوف سوفت</option>
        </select>
      </div>

      {/* Rating Filter */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-400 font-bold font-cairo">التقييم بالنجوم</label>
        <select
          value={filters.rating}
          onChange={(e) => handleFilterChange("rating", e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300 font-sans text-xs outline-none focus:border-rose-500/50 cursor-pointer"
        >
          <option value="all" className="bg-[#09090e] text-zinc-300">الكل</option>
          <option value="high" className="bg-[#09090e] text-zinc-300">⭐ إيجابي (4 نجوم فما فوق)</option>
          <option value="low" className="bg-[#09090e] text-zinc-300">⭐ سلبي (أقل من 3 نجوم)</option>
          <option value="5" className="bg-[#09090e] text-zinc-300">5.0 نجوم</option>
          <option value="4.5" className="bg-[#09090e] text-zinc-300">4.5 نجوم فما فوق</option>
          <option value="4" className="bg-[#09090e] text-zinc-300">4.0 نجوم</option>
          <option value="3" className="bg-[#09090e] text-zinc-300">3.0 نجوم</option>
        </select>
      </div>

      {/* Sorting Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-400 font-bold font-cairo">ترتيب حسب</label>
        <select
          value={filters.sort}
          onChange={(e) => handleFilterChange("sort", e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300 font-sans text-xs outline-none focus:border-rose-500/50 cursor-pointer"
        >
          <option value="recent" className="bg-[#09090e] text-zinc-300">📅 الأحدث إضافة</option>
          <option value="oldest" className="bg-[#09090e] text-zinc-300">📅 الأقدم إضافة</option>
          <option value="highest" className="bg-[#09090e] text-zinc-300">⭐ أعلى تقييم أولاً</option>
          <option value="lowest" className="bg-[#09090e] text-zinc-300">⭐ أقل تقييم أولاً</option>
        </select>
      </div>

      {/* Featured Checkbox toggle */}
      <div className="flex items-center gap-2 pt-5 select-none cursor-pointer" onClick={() => handleFilterChange("isFeaturedFilter", !filters.isFeaturedFilter)}>
        <input
          type="checkbox"
          checked={filters.isFeaturedFilter}
          onChange={() => {}} // Controlled by parent div click
          className="rounded border-zinc-700 bg-white/5 text-rose-600 focus:ring-rose-500 cursor-pointer"
        />
        <label className="text-xs text-zinc-300 font-bold font-cairo cursor-pointer">التقييمات المميزة فقط (Featured)</label>
      </div>

      {/* Reset Button */}
      <div className="flex items-end justify-end">
        <button
          onClick={onReset}
          className="h-[38px] w-full px-5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>إعادة ضبط الفلاتر</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Preset tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none font-cairo">
        {presets.map((p) => {
          const isActive = activePreset === p.value;
          return (
            <button
              key={p.value}
              onClick={() => handleApplyPreset(p.value)}
              className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all duration-300 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#D6004B]/10 border-[#D6004B]/30 text-rose-500 shadow-[0_0_15px_rgba(214,0,75,0.1)]"
                  : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {activePreset === "custom" && (
          <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-lg border border-rose-500/20 font-bold font-cairo">
            تخصيص نشط ⚙️
          </span>
        )}
      </div>

      {/* Desktop view (Expand filters block) */}
      <div className="hidden lg:block bg-[#09090e]/60 p-6 rounded-2xl border border-white/5">
        {filterControls}
      </div>

      {/* Mobile view toggle */}
      <div className="lg:hidden flex items-center justify-between gap-4">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex-1 h-11 bg-[#09090e]/60 border border-white/5 text-zinc-300 hover:text-white rounded-xl text-xs font-bold font-cairo flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-rose-500" />
          <span>تصفية وفلترة التقييمات</span>
        </button>
      </div>

      {/* Framer Motion Drawer for mobile filters */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Slide-out drawer sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute bottom-0 inset-x-0 bg-[#09090e] border-t border-white/10 rounded-t-[2.5rem] p-6 max-h-[85vh] overflow-y-auto z-50 text-right space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-sm font-bold text-white font-alexandria">لوحة تصفية التقييمات</h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-2">
                {filterControls}
              </div>

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full py-3.5 bg-[#D6004B] hover:bg-[#ff0059] text-white rounded-xl font-bold text-xs transition-colors font-cairo cursor-pointer"
                >
                  تطبيق الفلاتر الآن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
