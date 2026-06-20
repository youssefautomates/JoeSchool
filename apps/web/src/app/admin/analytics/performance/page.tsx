"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/pricing";
import { 
  ArrowLeft, Search, RefreshCw, Loader2, BookOpen, Package, 
  Eye, FileText, MousePointerClick, ShoppingCart, DollarSign,
  ArrowUpDown, Filter, Activity, TrendingUp, Percent
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DbCourse {
  id: string;
  title: string;
  price: number;
  status: string;
}

interface DbProduct {
  id: string;
  title: string;
  price: number;
  status: string;
}

interface DbOrder {
  id: string;
  product_id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

interface DbAnalyticsEvent {
  id: string;
  product_id: string;
  event_name: string;
  session_id: string;
  metadata?: any;
  created_at: string;
}

interface ItemAnalytics {
  id: string;
  title: string;
  price: number;
  type: "Course" | "Product";
  status: string;
  views: number;
  checkoutPageOpeneds: number;
  checkoutStarteds: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
}

type SortField = "title" | "views" | "checkoutPageOpeneds" | "checkoutStarteds" | "purchases" | "revenue" | "conversionRate";
type SortOrder = "asc" | "desc";

export default function DetailedAnalyticsPerformance() {
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<DbAnalyticsEvent[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "Course" | "Product">("all");
  
  const [sortBy, setSortBy] = useState<SortField>("revenue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [coursesRes, productsRes, ordersRes, eventsRes] = await Promise.all([
        supabase.from("courses").select("id, title, price, status"),
        supabase.from("products").select("id, title, price, status"),
        supabase.from("orders").select("id, product_id, amount, status, created_at").order("created_at", { ascending: false }),
        supabase.from("analytics_events").select("id, product_id, event_name, session_id, metadata, created_at").order("created_at", { ascending: false }).limit(10000)
      ]);

      if (coursesRes.data) setCourses(coursesRes.data as DbCourse[]);
      if (productsRes.data) setProducts(productsRes.data as DbProduct[]);
      if (ordersRes.data) setOrders(ordersRes.data as DbOrder[]);
      if (eventsRes.data) setAnalyticsEvents(eventsRes.data as DbAnalyticsEvent[]);
    } catch (err) {
      console.error("[DETAILED PERFORMANCE] Data retrieval failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // Pre-calculate per-item telemetry based on date range
  const computedItems = useMemo(() => {
    const combined: ItemAnalytics[] = [];
    const now = new Date();
    const cutoff = dateRange !== "all" ? new Date(now.getTime() - Number(dateRange) * 24 * 60 * 60 * 1000) : null;

    const filteredEvents = cutoff 
      ? analyticsEvents.filter(e => new Date(e.created_at) >= cutoff)
      : analyticsEvents;
      
    const filteredOrders = cutoff
      ? orders.filter(o => new Date(o.created_at) >= cutoff)
      : orders;

    // Process courses
    courses.forEach(c => {
      const itemOrders = filteredOrders.filter(o => o.product_id === c.id);
      const completed = itemOrders.filter(o => o.status === "completed");
      const revenue = completed.reduce((sum, o) => sum + Number(o.amount || 0), 0);
      
      const itemEvents = filteredEvents.filter(e => e.product_id === c.id);
      const completedOrderIds = new Set(completed.map(o => o.id));

      // 1. Purchasing Sessions
      const purchasingSessionsSet = new Set<string>();
      itemEvents.forEach(e => {
        if (e.session_id) {
          if (e.event_name === 'purchase') {
            purchasingSessionsSet.add(e.session_id);
          }
          if (e.event_name === 'order_created') {
            const oid = e.metadata?.order_id || e.metadata?.orderId;
            if (oid && completedOrderIds.has(oid)) {
              purchasingSessionsSet.add(e.session_id);
            }
          }
        }
      });

      // 2. Checkout Started (backfilled by purchasing)
      const checkoutStartedSet = new Set<string>();
      itemEvents.forEach(e => {
        if (e.session_id && (e.event_name === 'checkout_started' || e.event_name === 'order_created')) {
          checkoutStartedSet.add(e.session_id);
        }
      });
      purchasingSessionsSet.forEach(s => checkoutStartedSet.add(s));

      // 3. Checkout Page Opened (backfilled by checkout started)
      const checkoutOpenedSet = new Set<string>();
      itemEvents.forEach(e => {
        if (e.session_id) {
          if (e.event_name === 'checkout_page_opened') {
            checkoutOpenedSet.add(e.session_id);
          } else if (e.event_name === 'page_view') {
            const path = e.metadata?.pathname || e.metadata?.path || "";
            if (path.startsWith('/checkout') && !path.includes('/success') && !path.includes('/failed')) {
              checkoutOpenedSet.add(e.session_id);
            }
          }
        }
      });
      checkoutStartedSet.forEach(s => checkoutOpenedSet.add(s));

      // 4. Views / Unique Visitors (backfilled by checkout opened)
      const viewsSet = new Set<string>();
      itemEvents.forEach(e => {
        if (e.session_id && (e.event_name === 'product_view' || e.event_name === 'page_view')) {
          viewsSet.add(e.session_id);
        }
      });
      checkoutOpenedSet.forEach(s => viewsSet.add(s));

      const views = viewsSet.size;
      const checkoutPageOpeneds = checkoutOpenedSet.size;
      const checkoutStarteds = checkoutStartedSet.size;
      const purchases = purchasingSessionsSet.size;
      const conversionRate = views > 0 ? (purchases / views) * 100 : 0;

      combined.push({
        id: c.id,
        title: c.title,
        price: c.price || 0,
        type: "Course",
        status: c.status || "draft",
        views,
        checkoutPageOpeneds,
        checkoutStarteds,
        purchases,
        revenue,
        conversionRate
      });
    });

    // Process products
    products.forEach(p => {
      const itemOrders = filteredOrders.filter(o => o.product_id === p.id);
      const completed = itemOrders.filter(o => o.status === "completed");
      const revenue = completed.reduce((sum, o) => sum + Number(o.amount || 0), 0);

      const itemEvents = filteredEvents.filter(e => e.product_id === p.id);
      const completedOrderIds = new Set(completed.map(o => o.id));

      // 1. Purchasing Sessions
      const purchasingSessionsSet = new Set<string>();
      itemEvents.forEach(e => {
        if (e.session_id) {
          if (e.event_name === 'purchase') {
            purchasingSessionsSet.add(e.session_id);
          }
          if (e.event_name === 'order_created') {
            const oid = e.metadata?.order_id || e.metadata?.orderId;
            if (oid && completedOrderIds.has(oid)) {
              purchasingSessionsSet.add(e.session_id);
            }
          }
        }
      });

      // 2. Checkout Started (backfilled by purchasing)
      const checkoutStartedSet = new Set<string>();
      itemEvents.forEach(e => {
        if (e.session_id && (e.event_name === 'checkout_started' || e.event_name === 'order_created')) {
          checkoutStartedSet.add(e.session_id);
        }
      });
      purchasingSessionsSet.forEach(s => checkoutStartedSet.add(s));

      // 3. Checkout Page Opened (backfilled by checkout started)
      const checkoutOpenedSet = new Set<string>();
      itemEvents.forEach(e => {
        if (e.session_id) {
          if (e.event_name === 'checkout_page_opened') {
            checkoutOpenedSet.add(e.session_id);
          } else if (e.event_name === 'page_view') {
            const path = e.metadata?.pathname || e.metadata?.path || "";
            if (path.startsWith('/checkout') && !path.includes('/success') && !path.includes('/failed')) {
              checkoutOpenedSet.add(e.session_id);
            }
          }
        }
      });
      checkoutStartedSet.forEach(s => checkoutOpenedSet.add(s));

      // 4. Views / Unique Visitors (backfilled by checkout opened)
      const viewsSet = new Set<string>();
      itemEvents.forEach(e => {
        if (e.session_id && (e.event_name === 'product_view' || e.event_name === 'page_view')) {
          viewsSet.add(e.session_id);
        }
      });
      checkoutOpenedSet.forEach(s => viewsSet.add(s));

      const views = viewsSet.size;
      const checkoutPageOpeneds = checkoutOpenedSet.size;
      const checkoutStarteds = checkoutStartedSet.size;
      const purchases = purchasingSessionsSet.size;
      const conversionRate = views > 0 ? (purchases / views) * 100 : 0;

      combined.push({
        id: p.id,
        title: p.title,
        price: p.price || 0,
        type: "Product",
        status: p.status || "draft",
        views,
        checkoutPageOpeneds,
        checkoutStarteds,
        purchases,
        revenue,
        conversionRate
      });
    });

    return combined;
  }, [courses, products, orders, analyticsEvents, dateRange]);

  // Apply filters, search, and sorting
  const processedItems = useMemo(() => {
    let result = [...computedItems];

    // Filter active items only if activeOnly is true
    if (activeOnly) {
      result = result.filter(item => {
        const s = (item.status || "").toLowerCase();
        return s === "active" || s === "نشط" || s === "نشطة";
      });
    }

    // Filter by type
    if (typeFilter !== "all") {
      result = result.filter(item => item.type === typeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => item.title.toLowerCase().includes(q));
    }

    // Apply sorting
    result.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      if (typeof valA === "string") {
        const strA = valA.toLowerCase();
        const strB = (valB as string).toLowerCase();
        return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      } else {
        const numA = valA as number;
        const numB = valB as number;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }
    });

    return result;
  }, [computedItems, activeOnly, typeFilter, searchQuery, sortBy, sortOrder]);

  // Aggregate overall stats for header overview cards
  const summaryStats = useMemo(() => {
    let totalViews = 0;
    let totalCheckoutPageOpeneds = 0;
    let totalCheckoutStarteds = 0;
    let totalPurchases = 0;
    let totalRevenue = 0;

    processedItems.forEach(item => {
      totalViews += item.views;
      totalCheckoutPageOpeneds += item.checkoutPageOpeneds;
      totalCheckoutStarteds += item.checkoutStarteds;
      totalPurchases += item.purchases;
      totalRevenue += item.revenue;
    });

    const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

    return {
      totalViews,
      totalCheckoutPageOpeneds,
      totalCheckoutStarteds,
      totalPurchases,
      totalRevenue,
      conversionRate
    };
  }, [processedItems]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  function toggleStatus() {
    setActiveOnly(prev => !prev);
  }

  return (
    <div className="space-y-8 font-sans text-zinc-100 min-h-screen pb-16 text-left animate-in fade-in duration-700" dir="ltr">
      
      {/* Breadcrumb / Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard Overview
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 border border-white/5 rounded-xl p-1 gap-1">
            {[
              { label: "7 Days", value: "7" },
              { label: "30 Days", value: "30" },
              { label: "90 Days", value: "90" },
              { label: "All Time", value: "all" }
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === range.value ? "bg-[#D6004B] text-white shadow-lg shadow-[#D6004B]/20" : "text-zinc-400 hover:text-white"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-all bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Title & Headline */}
      <div className="pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-rose-500 bg-clip-text text-transparent flex items-center gap-3">
            Detailed Performance Analytics
            <Activity className="w-8 h-8 text-[#D6004B]" />
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Granular course-by-course and product-by-product funnel metrics, conversion curves, and cumulative revenue.
          </p>
        </div>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#09090e]/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Total Revenue</span>
          <span className="text-lg font-black text-white">{formatPrice(summaryStats.totalRevenue, "EGP")}</span>
          <span className="text-[10px] text-zinc-500 mt-2">Combined value</span>
        </div>
        <div className="bg-[#09090e]/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Blended CR</span>
          <span className="text-lg font-black text-emerald-400">{summaryStats.conversionRate.toFixed(2)}%</span>
          <span className="text-[10px] text-zinc-500 mt-2">Avg conversion</span>
        </div>
        <div className="bg-[#09090e]/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Page Views</span>
          <span className="text-lg font-black text-zinc-200">{summaryStats.totalViews.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500 mt-2">Visits count</span>
        </div>
        <div className="bg-[#09090e]/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Checkout Opened</span>
          <span className="text-lg font-black text-amber-400">{summaryStats.totalCheckoutPageOpeneds.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500 mt-2">Payment page visits</span>
        </div>
        <div className="bg-[#09090e]/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Checkout Started</span>
          <span className="text-lg font-black text-rose-500">{summaryStats.totalCheckoutStarteds.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500 mt-2">Form submitted</span>
        </div>
        <div className="bg-[#09090e]/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Purchases</span>
          <span className="text-lg font-black text-white">{summaryStats.totalPurchases.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500 mt-2">Orders successfully placed</span>
        </div>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-[#09090b]/40 border border-white/5 p-4 rounded-3xl">
        <div className="relative w-full lg:max-w-md group">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#D6004B] transition-colors" />
          <input 
            type="text" 
            placeholder="Search by course or product name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-sans focus:outline-none focus:border-[#D6004B]/50 focus:bg-white/10 transition-all text-zinc-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Type Filter */}
          <div className="flex items-center bg-white/5 border border-white/5 rounded-xl p-1 gap-1">
            {[
              { label: "All Items", value: "all" },
              { label: "Courses", value: "Course" },
              { label: "Products", value: "Product" }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setTypeFilter(type.value as any)}
                className={`px-4 py-2 rounded-lg text-[11px] font-bold transition-all ${
                  typeFilter === type.value ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Active vs All Status Toggle */}
          <button
            onClick={toggleStatus}
            className={`flex items-center gap-2.5 px-5 h-11 rounded-xl text-xs font-bold border transition-all ${
              activeOnly
                ? "bg-[#D6004B]/10 border-[#D6004B]/30 hover:bg-[#D6004B] text-[#D6004B] hover:text-white"
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Filter className="w-4 h-4" />
            {activeOnly ? "Showing Active Only" : "Showing All Items"}
          </button>
        </div>
      </div>

      {/* Performance Grid Table */}
      <div className="rounded-3xl bg-[#09090b]/60 border border-white/5 p-6 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 text-xs select-none">
                <th className="pb-4 font-semibold text-left cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("title")}>
                  <div className="flex items-center gap-1.5">
                    Course / Digital Product
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="pb-4 font-semibold text-center">Type</th>
                <th className="pb-4 font-semibold text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("views")}>
                  <div className="flex items-center justify-center gap-1.5">
                    Page Views
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="pb-4 font-semibold text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("checkoutPageOpeneds")}>
                  <div className="flex items-center justify-center gap-1.5">
                    Checkout Opened
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="pb-4 font-semibold text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("checkoutStarteds")}>
                  <div className="flex items-center justify-center gap-1.5">
                    Checkout Started
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="pb-4 font-semibold text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("purchases")}>
                  <div className="flex items-center justify-center gap-1.5">
                    Purchases
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="pb-4 font-semibold text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("revenue")}>
                  <div className="flex items-center justify-center gap-1.5">
                    Revenue
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="pb-4 font-semibold text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("conversionRate")}>
                  <div className="flex items-center justify-center gap-1.5">
                    Conversion Rate
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="pb-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-5"><div className="h-4 w-52 bg-white/10 rounded" /></td>
                    <td className="py-5 text-center"><div className="h-4 w-12 bg-white/5 mx-auto rounded" /></td>
                    <td className="py-5 text-center"><div className="h-4 w-12 bg-white/5 mx-auto rounded" /></td>
                    <td className="py-5 text-center"><div className="h-4 w-12 bg-white/5 mx-auto rounded" /></td>
                    <td className="py-5 text-center"><div className="h-4 w-12 bg-white/5 mx-auto rounded" /></td>
                    <td className="py-5 text-center"><div className="h-4 w-12 bg-white/5 mx-auto rounded" /></td>
                    <td className="py-5 text-center"><div className="h-4 w-20 bg-white/10 mx-auto rounded" /></td>
                    <td className="py-5 text-center"><div className="h-4 w-14 bg-white/10 mx-auto rounded" /></td>
                    <td className="py-5 text-right"><div className="h-4 w-14 bg-white/5 ml-auto rounded" /></td>
                  </tr>
                ))
              ) : processedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Filter className="w-8 h-8 text-zinc-600" />
                      <p className="font-bold text-zinc-400">No matching courses or digital products found.</p>
                      <p className="text-zinc-600 text-[11px]">Try adjusting your search criteria or toggling status visibility.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedItems.map((item) => {
                  const isActive = (item.status || "").toLowerCase() === "active" || (item.status || "") === "نشط" || (item.status || "") === "نشطة";
                  
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors border-white/5">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${
                            item.type === "Course" 
                              ? "bg-violet-500/5 border-violet-500/10 text-violet-400" 
                              : "bg-rose-500/5 border-rose-500/10 text-rose-400"
                          }`}>
                            {item.type === "Course" ? <BookOpen className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-extrabold text-white leading-normal">{item.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-1 font-bold">Base Price: {formatPrice(item.price, "EGP")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.type === "Course" 
                            ? "bg-violet-500/10 text-violet-400 border-violet-500/20" 
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="py-4 text-center font-extrabold text-zinc-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          {item.views.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 text-center font-extrabold text-amber-400">
                        <div className="flex items-center justify-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-500/60" />
                          {item.checkoutPageOpeneds.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 text-center font-extrabold text-rose-400">
                        <div className="flex items-center justify-center gap-1.5">
                          <MousePointerClick className="w-3.5 h-3.5 text-rose-500/60" />
                          {item.checkoutStarteds.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 text-center font-extrabold text-zinc-100">
                        <div className="flex items-center justify-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5 text-zinc-500" />
                          {item.purchases.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 text-center font-black text-rose-500">
                        {formatPrice(item.revenue, "EGP")}
                      </td>
                      <td className="py-4 text-center font-black text-emerald-400">
                        {item.conversionRate.toFixed(2)}%
                      </td>
                      <td className="py-4 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }`}>
                          {isActive ? "Active" : "Archived/Draft"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
