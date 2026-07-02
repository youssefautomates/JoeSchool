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
    { label: "All", value: "all" },
    { label: "🌟 Featured Reviews", value: "featured" },
    { label: "⏳ Pending", value: "pending" },
    { label: "⚠️ Low Ratings (< 3)", value: "low_ratings" },
    { label: "📅 Recent", value: "recent" }
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left" dir="ltr">
      {/* Search Input */}
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <label className="text-[10px] text-zinc-500 font-bold font-sans">Search by Customer Name or Content</label>
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
          <input
            type="text"
            placeholder="e.g. John, Course..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-zinc-200/60 focus:bg-zinc-100/80 transition-all text-zinc-700 font-sans"
          />
        </div>
      </div>

      {/* Type Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-500 font-bold font-sans">Review Type</label>
        <select
          value={filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 text-zinc-700 font-sans text-xs outline-none focus:border-zinc-200/60 cursor-pointer"
        >
          <option value="all" className="bg-slate-50 text-zinc-700">All</option>
          <option value="course" className="bg-slate-50 text-zinc-700">🎓 Academy Course</option>
          <option value="product" className="bg-slate-50 text-zinc-700">🛍️ Digital Product</option>
          <option value="bundle" className="bg-slate-50 text-zinc-700">📦 Bundle</option>
        </select>
      </div>

      {/* Status Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-500 font-bold font-sans">Publishing Status</label>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 text-zinc-700 font-sans text-xs outline-none focus:border-zinc-200/60 cursor-pointer"
        >
          <option value="all" className="bg-slate-50 text-zinc-700">All</option>
          <option value="visible" className="bg-slate-50 text-zinc-700">🟢 Active / Visible</option>
          <option value="pending" className="bg-slate-50 text-zinc-700">⏳ Pending</option>
          <option value="hidden" className="bg-slate-50 text-zinc-700">🔴 Hidden</option>
          <option value="archived" className="bg-slate-50 text-zinc-700">📁 Archived / Soft Deleted</option>
        </select>
      </div>

      {/* Rating Filter */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-500 font-bold font-sans">Rating Stars</label>
        <select
          value={filters.rating}
          onChange={(e) => handleFilterChange("rating", e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 text-zinc-700 font-sans text-xs outline-none focus:border-zinc-200/60 cursor-pointer"
        >
          <option value="all" className="bg-slate-50 text-zinc-700">All</option>
          <option value="high" className="bg-slate-50 text-zinc-700">⭐ Positive (4+ Stars)</option>
          <option value="low" className="bg-slate-50 text-zinc-700">⭐ Negative (&lt; 3 Stars)</option>
          <option value="5" className="bg-slate-50 text-zinc-700">5.0 Stars</option>
          <option value="4.5" className="bg-slate-50 text-zinc-700">4.5 Stars & Above</option>
          <option value="4" className="bg-slate-50 text-zinc-700">4.0 Stars</option>
          <option value="3" className="bg-slate-50 text-zinc-700">3.0 Stars</option>
        </select>
      </div>

      {/* Sorting Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-zinc-500 font-bold font-sans">Sort By</label>
        <select
          value={filters.sort}
          onChange={(e) => handleFilterChange("sort", e.target.value)}
          className="w-full h-[38px] px-3.5 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 text-zinc-700 font-sans text-xs outline-none focus:border-zinc-200/60 cursor-pointer"
        >
          <option value="recent" className="bg-slate-50 text-zinc-700">📅 Newest</option>
          <option value="oldest" className="bg-slate-50 text-zinc-700">📅 Oldest</option>
          <option value="highest" className="bg-slate-50 text-zinc-700">⭐ Highest Rating</option>
          <option value="lowest" className="bg-slate-50 text-zinc-700">⭐ Lowest Rating</option>
        </select>
      </div>

      {/* Featured Checkbox toggle */}
      <div className="flex items-center gap-2 pt-5 select-none cursor-pointer" onClick={() => handleFilterChange("isFeaturedFilter", !filters.isFeaturedFilter)}>
        <input
          type="checkbox"
          checked={filters.isFeaturedFilter}
          onChange={() => {}} // Controlled by parent div click
          className="rounded border-zinc-700 bg-zinc-100/40 text-brand-600 focus:ring-brand-500 cursor-pointer"
        />
        <label className="text-xs text-zinc-700 font-bold font-sans cursor-pointer">Featured Reviews Only</label>
      </div>

      {/* Reset Button */}
      <div className="flex items-end justify-end">
        <button
          onClick={onReset}
          className="h-[38px] w-full px-5 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 border border-zinc-200/60 text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-left" dir="ltr">
      
      {/* Preset tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none font-sans">
        {presets.map((p) => {
          const isActive = activePreset === p.value;
          return (
            <button
              key={p.value}
              onClick={() => handleApplyPreset(p.value)}
              className={`h-9 px-4 rounded-2xl border text-xs font-bold transition-all duration-300 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#1D4ED8]/10 border-[#1D4ED8]/30 text-yellow-500 shadow-[0_0_15px_rgba(29, 78, 216,0.1)]"
                  : "bg-zinc-100/40 border-zinc-200/60 text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {activePreset === "custom" && (
          <span className="text-[10px] bg-brand-500/10 text-yellow-500 px-2.5 py-1 rounded-2xl border border-zinc-200/60 font-bold font-sans">
            Custom Active ⚙️
          </span>
        )}
      </div>

      {/* Desktop view (Expand filters block) */}
      <div className="hidden lg:block bg-slate-50/60 p-6 rounded-2xl border border-zinc-200/60">
        {filterControls}
      </div>

      {/* Mobile view toggle */}
      <div className="lg:hidden flex items-center justify-between gap-4">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex-1 h-11 bg-slate-50/60 border border-zinc-200/60 text-zinc-700 hover:text-zinc-900 rounded-2xl text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-yellow-500" />
          <span>Filter & Sort Reviews</span>
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
              className="absolute bottom-0 inset-x-0 bg-slate-50 border-t border-zinc-200 rounded-t-[2.5rem] p-6 max-h-[85vh] overflow-y-auto z-50 text-left space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-200/60 pb-4">
                <h3 className="text-sm font-bold text-zinc-900 font-sans">Filter Reviews Panel</h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-2xl bg-zinc-100/40 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-2">
                {filterControls}
              </div>

              <div className="pt-4 border-t border-zinc-200/60">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full py-3.5 bg-[#1D4ED8] hover:bg-[#3B82F6] text-white rounded-2xl font-bold text-xs transition-colors font-sans cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
