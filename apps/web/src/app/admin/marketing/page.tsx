"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Target, Activity, Save, CheckCircle2, Ticket, Plus, Trash2, 
  Calendar, ShieldAlert, Sparkles, BarChart3, Tag, ShoppingBag, 
  HelpCircle, AlertCircle, Percent
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabaseClient } from "@/lib/supabaseClient";

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  expiry_date: string | null;
  applies_to_type: "all" | "product" | "course";
  applies_to_id: string | null;
  created_at: string;
}

interface ItemOption {
  id: string;
  title: string;
  type: "product" | "course";
}

export default function MarketingPage() {
  // Navigation tabs: 'coupons' or 'pixels'
  const [activeTab, setActiveTab] = useState<"coupons" | "pixels">("coupons");
  
  // Tracking Pixels State
  const [loadingPixels, setLoadingPixels] = useState(true);
  const [savingPixels, setSavingPixels] = useState(false);
  const [settings, setSettings] = useState({
    metaPixelId: "",
    metaPixelEnabled: false,
    tiktokPixelId: "",
    tiktokPixelEnabled: false
  });

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [submittingCoupon, setSubmittingCoupon] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  // Form State
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_percent: 20,
    max_uses: 100,
    expiry_date: "",
    applies_to_type: "all" as "all" | "product" | "course",
    applies_to_id: ""
  });

  // Dynamic dropdown list for products/courses
  const [availableItems, setAvailableItems] = useState<ItemOption[]>([]);

  useEffect(() => {
    // 1. Fetch Pixel Settings
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data) setSettings(data);
        setLoadingPixels(false);
      })
      .catch(() => {
        toast.error("Failed to load tracking pixel settings");
        setLoadingPixels(false);
      });

    // 2. Fetch Coupons
    fetchCoupons();

    // 3. Fetch Items for restriction dropdown
    fetchTargetItems();
  }, []);

  async function fetchCoupons() {
    setLoadingCoupons(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (res.ok) {
        if (data.tableMissing) {
          setTableMissing(true);
        } else {
          setCoupons(data.coupons || []);
          setTableMissing(false);
        }
      } else {
        throw new Error(data.error || "Failed to load coupons");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while loading coupons");
    } finally {
      setLoadingCoupons(false);
    }
  }

  async function fetchTargetItems() {
    try {
      const options: ItemOption[] = [];
      
      // Fetch products
      const { data: products } = await supabaseClient
        .from("products")
        .select("id, title")
        .order("created_at", { ascending: false });

      if (products) {
        products.forEach(p => {
          options.push({ id: p.id, title: p.title, type: "product" });
        });
      }

      // Fetch courses
      const { data: courses } = await supabaseClient
        .from("courses")
        .select("id, title")
        .order("created_at", { ascending: false });

      if (courses) {
        courses.forEach(c => {
          options.push({ id: c.id, title: c.title, type: "course" });
        });
      }

      setAvailableItems(options);
    } catch (err) {
      console.error("Error fetching target options:", err);
    }
  }

  const handleSavePixels = async () => {
    setSavingPixels(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      toast.success("Tracking pixel settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving pixels");
    } finally {
      setSavingPixels(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code) {
      toast.error("Please enter the coupon code");
      return;
    }

    setSubmittingCoupon(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCoupon.code,
          discount_percent: newCoupon.discount_percent,
          max_uses: newCoupon.max_uses,
          expiry_date: newCoupon.expiry_date || null,
          applies_to_type: newCoupon.applies_to_type,
          applies_to_id: newCoupon.applies_to_type === "all" ? null : newCoupon.applies_to_id
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create coupon");

      toast.success(`Discount coupon ${data.coupon.code} created successfully!`);
      // Reset form
      setNewCoupon({
        code: "",
        discount_percent: 20,
        max_uses: 100,
        expiry_date: "",
        applies_to_type: "all",
        applies_to_id: ""
      });
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to create coupon");
    } finally {
      setSubmittingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;

    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete coupon");
      toast.success(`Discount coupon ${code} deleted successfully!`);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while deleting");
    }
  };

  // Stats calculation
  const totalUses = coupons.reduce((acc, c) => acc + c.used_count, 0);
  const activeCount = coupons.filter(c => {
    const notExpired = !c.expiry_date || new Date(c.expiry_date) > new Date();
    const notExceeded = c.used_count < c.max_uses;
    return notExpired && notExceeded;
  }).length;
  const expiredCount = coupons.length - activeCount;

  // Render Loading
  if (loadingPixels && loadingCoupons) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-2 md:p-8 font-sans text-left" dir="ltr">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Marketing & Smart Coupons</h1>
          <p className="text-zinc-400">Manage promotional discount codes and tracking pixels in one unified luxury workspace.</p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white/5 border border-white/5 p-1 rounded-xl flex gap-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("coupons")}
            className={`h-10 px-5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "coupons" 
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Ticket className="w-4 h-4" />
            Manage Coupons
          </button>
          <button
            onClick={() => setActiveTab("pixels")}
            className={`h-10 px-5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "pixels" 
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Target className="w-4 h-4" />
            Tracking Pixels
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "coupons" ? (
          <motion.div
            key="coupons-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0a0a0f] border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-600/5 rounded-full blur-[30px]" />
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 shrink-0">
                  <Ticket className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Coupons</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{coupons.length}</h3>
                </div>
              </div>

              <div className="bg-[#0a0a0f] border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-[30px]" />
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Coupons</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{activeCount}</h3>
                </div>
              </div>

              <div className="bg-[#0a0a0f] border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/5 rounded-full blur-[30px]" />
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shrink-0">
                  <Calendar className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Expired / Depleted</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{expiredCount}</h3>
                </div>
              </div>

              <div className="bg-[#0a0a0f] border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-[30px]" />
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shrink-0">
                  <BarChart3 className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Usage Count</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1">{totalUses}</h3>
                </div>
              </div>
            </div>

            {tableMissing ? (
              <div className="bg-rose-950/20 border border-rose-900/30 rounded-[2rem] p-8 flex flex-col items-center text-center max-w-2xl mx-auto">
                <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
                <h3 className="text-2xl font-extrabold text-white mb-2">Database Setup Required</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  The coupons table has not been created in your Supabase database yet. Please run the following SQL script inside the Supabase SQL Editor to enable coupons immediately:
                </p>
                <div className="bg-[#07070b] border border-white/5 rounded-xl p-4 w-full font-mono text-left text-xs text-rose-300 overflow-x-auto mb-6 select-all max-h-[150px]">
                  {`CREATE TABLE public.coupons (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    code TEXT UNIQUE NOT NULL,\n    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),\n    max_uses INTEGER NOT NULL DEFAULT 100,\n    used_count INTEGER NOT NULL DEFAULT 0,\n    expiry_date TIMESTAMP WITH TIME ZONE,\n    applies_to_type TEXT NOT NULL DEFAULT 'all',\n    applies_to_id TEXT,\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()\n);\n\nALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Allow public read coupons" ON public.coupons FOR SELECT USING (true);\nCREATE POLICY "Allow admin manage coupons" ON public.coupons FOR ALL USING (true);\n\nALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;`}
                </div>
                <button
                  onClick={fetchCoupons}
                  className="h-11 px-6 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  I've run the script, check again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Create Coupon Card */}
                <div className="lg:col-span-4 bg-[#0a0a0f] border border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff0f53] to-[#ff00b3]" />
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-rose-500" />
                    Create New Coupon
                  </h3>

                  <form onSubmit={handleCreateCoupon} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs font-bold">Coupon Code</Label>
                      <Input
                        value={newCoupon.code}
                        onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                        placeholder="e.g. BLACKFRIDAY"
                        className="h-11 bg-white/5 border-white/10 text-white font-mono text-left uppercase text-sm"
                        maxLength={18}
                        required
                      />
                      <p className="text-[10px] text-zinc-500">Alphanumeric English characters only, no spaces.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs font-bold flex justify-between">
                        <span>Discount Percentage</span>
                        <span className="text-rose-400 font-bold">{newCoupon.discount_percent}%</span>
                      </Label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={newCoupon.discount_percent}
                          onChange={e => setNewCoupon({ ...newCoupon, discount_percent: parseInt(e.target.value) })}
                          className="flex-1 accent-rose-600 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                        />
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={newCoupon.discount_percent}
                          onChange={e => setNewCoupon({ ...newCoupon, discount_percent: Math.min(100, Math.max(1, parseInt(e.target.value) || 20)) })}
                          className="w-16 h-9 bg-white/5 border-white/10 text-center text-xs p-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs font-bold">Maximum Uses</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newCoupon.max_uses}
                          onChange={e => setNewCoupon({ ...newCoupon, max_uses: Math.max(1, parseInt(e.target.value) || 100) })}
                          className="h-11 bg-white/5 border-white/10 text-white text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs font-bold">Expiry Date (Optional)</Label>
                        <Input
                          type="date"
                          value={newCoupon.expiry_date}
                          onChange={e => setNewCoupon({ ...newCoupon, expiry_date: e.target.value })}
                          className="h-11 bg-white/5 border-white/10 text-white text-xs cursor-pointer text-left"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs font-bold">Apply Discount To</Label>
                      <select
                        value={newCoupon.applies_to_type}
                        onChange={e => setNewCoupon({ ...newCoupon, applies_to_type: e.target.value as any, applies_to_id: "" })}
                        className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500 cursor-pointer"
                      >
                        <option value="all" className="bg-[#0a0a0f] text-white">Entire Store (All Products)</option>
                        <option value="product" className="bg-[#0a0a0f] text-white">Specific Digital Product</option>
                        <option value="course" className="bg-[#0a0a0f] text-white">Specific LMS Course</option>
                      </select>
                    </div>

                    {newCoupon.applies_to_type !== "all" && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label className="text-zinc-400 text-xs font-bold">
                          {newCoupon.applies_to_type === "course" ? "Select Target LMS Course" : "Select Target Digital Product"}
                        </Label>
                        <select
                          value={newCoupon.applies_to_id}
                          onChange={e => setNewCoupon({ ...newCoupon, applies_to_id: e.target.value })}
                          className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500 cursor-pointer"
                          required
                        >
                          <option value="" className="bg-[#0a0a0f] text-zinc-500">Select from list...</option>
                          {availableItems
                              .filter(item => item.type === newCoupon.applies_to_type)
                              .map(item => (
                                <option key={item.id} value={item.id} className="bg-[#0a0a0f] text-white">
                                  {item.title}
                                </option>
                              ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingCoupon}
                      className="w-full h-11 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 cursor-pointer shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20"
                    >
                      {submittingCoupon ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Create & Activate Coupon
                    </button>
                  </form>
                </div>

                {/* Coupons List Table */}
                <div className="lg:col-span-8 bg-[#0a0a0f] border border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-rose-500" />
                    Active Coupons Ledger
                  </h3>

                  {coupons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                      <Ticket className="w-12 h-12 text-zinc-700 mb-4 animate-bounce" />
                      <p className="text-sm">No active discount coupons found.</p>
                      <p className="text-xs text-zinc-600 mt-1">Start by creating your first discount coupon from the left panel!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-zinc-300">
                        <thead>
                          <tr className="border-b border-white/5 text-zinc-500 font-bold h-10">
                            <th className="pb-3 text-left">Coupon Code</th>
                            <th className="pb-3 text-center">Discount</th>
                            <th className="pb-3 text-center">Usage</th>
                            <th className="pb-3 text-center">Applicability</th>
                            <th className="pb-3 text-center">Expiry</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {coupons.map((coupon) => {
                            const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
                            const isExceeded = coupon.used_count >= coupon.max_uses;
                            const isInactive = isExpired || isExceeded;

                            // Find target name if applied to product/course
                            const targetName = availableItems.find(i => i.id === coupon.applies_to_id || `course-${i.id}` === coupon.applies_to_id)?.title || coupon.applies_to_id;

                            return (
                              <tr key={coupon.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-white px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg select-all">
                                      {coupon.code}
                                    </span>
                                    {isInactive && (
                                      <span className="text-[9px] bg-red-950/55 text-red-400 border border-red-900/30 px-1.5 py-0.5 rounded font-black scale-95">
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 text-center">
                                  <span className="inline-flex items-center gap-0.5 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 text-xs">
                                    <Percent className="w-3 h-3" />
                                    {coupon.discount_percent}% Off
                                  </span>
                                </td>
                                <td className="py-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-bold text-zinc-200">
                                      {coupon.used_count} / {coupon.max_uses}
                                    </span>
                                    {/* Progress bar */}
                                    <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${isExceeded ? 'bg-red-500' : 'bg-rose-600'}`}
                                        style={{ width: `${Math.min(100, (coupon.used_count / coupon.max_uses) * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 text-center">
                                  {coupon.applies_to_type === "all" ? (
                                    <span className="text-zinc-400 bg-white/5 px-2 py-1 rounded text-[10px]">
                                      Entire Store 🌐
                                    </span>
                                  ) : (
                                    <div className="flex flex-col items-center gap-0.5 max-w-[140px] mx-auto">
                                      <span className="text-zinc-500 text-[9px] block">
                                        {coupon.applies_to_type === "course" ? "Course 📚" : "Product 📦"}
                                      </span>
                                      <span className="text-rose-300 font-bold block truncate w-full text-center" title={targetName || ""}>
                                        {targetName || "Custom"}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 text-center">
                                  {coupon.expiry_date ? (
                                    <span className={`font-mono text-[10px] ${isExpired ? "text-red-400 line-through" : "text-zinc-400"}`}>
                                      {new Date(coupon.expiry_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-600">Never Expires ♾️</span>
                                  )}
                                </td>
                                <td className="py-4 text-right">
                                  <button
                                    onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Coupon"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="pixels-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Meta Pixel Card */}
            <div className="bg-[#0a0a0f] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-[50px] pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                    <Target className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Meta Pixel</h3>
                    <p className="text-sm text-zinc-500 mt-1">Track Facebook & Instagram conversion events</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={settings.metaPixelEnabled}
                    onCheckedChange={(c) => setSettings({...settings, metaPixelEnabled: c})}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="space-y-3">
                  <Label className="text-zinc-300 font-bold">Pixel ID</Label>
                  <Input 
                    value={settings.metaPixelId}
                    onChange={(e) => setSettings({...settings, metaPixelId: e.target.value})}
                    placeholder="e.g. 123456789012345"
                    className="h-12 bg-white/5 border-white/10 text-white font-mono text-left focus:border-blue-500 focus:ring-blue-500/20"
                    dir="ltr"
                  />
                </div>
                
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex gap-3">
                  <Activity className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-100/70 leading-relaxed">
                    <p className="font-bold text-blue-300 mb-1">Events tracked automatically:</p>
                    PageView, ViewContent, AddToCart, InitiateCheckout, Purchase (including order value and currency parameters).
                  </div>
                </div>
              </div>
            </div>

            {/* TikTok Pixel Card */}
            <div className="bg-[#0a0a0f] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-pink-500/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/10 rounded-full blur-[50px] pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20">
                    <Target className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">TikTok Pixel</h3>
                    <p className="text-sm text-zinc-500 mt-1">Track conversion events from TikTok advertisements</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={settings.tiktokPixelEnabled}
                    onCheckedChange={(c) => setSettings({...settings, tiktokPixelEnabled: c})}
                    className="data-[state=checked]:bg-pink-500"
                  />
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="space-y-3">
                  <Label className="text-zinc-300 font-bold">Pixel ID</Label>
                  <Input 
                    value={settings.tiktokPixelId}
                    onChange={(e) => setSettings({...settings, tiktokPixelId: e.target.value})}
                    placeholder="e.g. C1234567890ABCDEF"
                    className="h-12 bg-white/5 border-white/10 text-white font-mono text-left focus:border-pink-500 focus:ring-pink-500/20"
                    dir="ltr"
                  />
                </div>
                
                <div className="bg-pink-500/5 border border-pink-500/10 rounded-xl p-4 flex gap-3">
                  <Activity className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-pink-100/70 leading-relaxed">
                    <p className="font-bold text-pink-300 mb-1">Pre-integrated Events:</p>
                    PageView, ViewContent, AddToCart, InitiateCheckout, CompletePayment (including complete event metadata).
                  </div>
                </div>
              </div>
            </div>

            {/* Save Pixels Button Card */}
            <div className="lg:col-span-2 flex items-center justify-end">
              <button
                onClick={handleSavePixels}
                disabled={savingPixels}
                className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20"
              >
                {savingPixels ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                Save Pixel Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic SEO/Traction Alert Card */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-8 flex items-start gap-4">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h4 className="text-xl font-bold text-emerald-400 mb-2">High-Security Intelligent Marketing Hub</h4>
          <p className="text-emerald-100/60 leading-relaxed max-w-3xl">
            This tool enables you to generate dynamic promotional coupons and securely distribute them store-wide or restrict them to specific assets. Coupon verification and calculation are executed Server-Side to protect your checkout entirely against client price tampering or programmatic attacks.
          </p>
        </div>
      </div>
    </div>
  );
}
