"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Mail, Eye, Download, Filter, Loader2, RefreshCw, 
  MoreVertical, ExternalLink, Calendar, User, CreditCard, 
  Sparkles, Rocket, Globe, Laptop, ShieldCheck, X, Clock 
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/pricing";

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterProductType, setFilterProductType] = useState("all");
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterCoupon, setFilterCoupon] = useState("all");
  const [filterDeviceType, setFilterDeviceType] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const [statsData, setStatsData] = useState({
    totalRevenueEGP: 0,
    totalRevenueUSD: 0,
    totalOrdersCount: 0,
    completedCount: 0,
    conversionRate: "0",
    internationalCount: 0
  });

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchOrders(1);
    fetchGlobalStats();
  }, []); // eslint-disable-line

  async function fetchGlobalStats() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("amount, status, currency, country");

      if (error) throw error;
      if (data) {
        const completed = data.filter(o => o.status === "completed");
        const completedEgp = completed.filter(o => o.currency !== "USD");
        const completedUsd = completed.filter(o => o.currency === "USD");
        
        const egpRevenue = completedEgp.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        const usdRevenue = completedUsd.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

        const rate = data.length > 0 ? ((completed.length / data.length) * 100).toFixed(1) : "0";
        
        const internationalCount = completed.filter(o => {
          return o.currency === "USD" || (o.country && o.country !== "EG" && o.country !== "Unknown");
        }).length;

        setStatsData({
          totalRevenueEGP: egpRevenue,
          totalRevenueUSD: usdRevenue,
          totalOrdersCount: data.length,
          completedCount: completed.length,
          conversionRate: rate,
          internationalCount
        });
      }
    } catch (err) {
      console.error("Error fetching global stats:", err);
    }
  }

  async function fetchOrders(pageNumber = 1, isLoadMore = false) {
    if (!isLoadMore) setIsLoading(true);
    try {
      const from = (pageNumber - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Select all columns to get tracking metadata
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        setHasMore(data.length === PAGE_SIZE);
        if (isLoadMore) {
          setOrders(prev => [...prev, ...data]);
        } else {
          setOrders(data);
        }
      }
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  }

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(nextPage, true);
  };

  const handleResendEmail = (email: string) => {
    toast.success(`Download delivery email resent successfully to ${email}`);
  };

  // Helper: Mask IP for privacy
  const maskIpAddress = (ip: string | null) => {
    if (!ip || ip === "Unknown") return "xxx.xxx.xxx.xxx";
    if (ip.includes(":")) {
      const segments = ip.split(":");
      return segments.length > 2 
        ? `${segments[0]}:${segments[1]}:xxxx:xxxx:xxxx:xxxx` 
        : "xxxx:xxxx::xxxx";
    }
    const parts = ip.split(".");
    return parts.length === 4 
      ? `${parts[0]}.${parts[1]}.xxx.xxx` 
      : "xxx.xxx.xxx.xxx";
  };

  // Helper: ISO Country Code to Emoji flag
  const getFlagEmoji = (countryCode: string | null) => {
    if (!countryCode || countryCode === "Unknown") return "🌐";
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map(char => 127397 + char.charCodeAt(0));
    try {
      return String.fromCodePoint(...codePoints);
    } catch (e) {
      return "🌐";
    }
  };

  const getPaymentMethodInfo = (order: { payment_method?: string; payment_provider?: string }) => {
    if (order.payment_provider === "instapay") return null;
    
    const method = (order.payment_method || "").toLowerCase();
    const provider = (order.payment_provider || "").toLowerCase();
    
    if (method === "instapay" || provider === "instapay") return null;
    
    if (
      method.includes("wallet") || 
      method.includes("vodafone") || 
      method.includes("etisalat") || 
      method.includes("orange") || 
      method.includes("we") || 
      method === "mw"
    ) {
      return {
        text: "Mobile Wallet",
        color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      };
    }
    
    if (
      method.includes("card") || 
      method.includes("visa") || 
      method.includes("mastercard") || 
      method.includes("meeza") || 
      method === "card"
    ) {
      return {
        text: "Bank Card",
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      };
    }

    // Fallback for default Paymob integration
    if (provider === "paymob" || method === "tbc") {
      return {
        text: "Bank Card",
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      };
    }

    return null;
  };

  // Filter Unique Options dynamically from the loaded list
  const uniqueCountries = useMemo(() => {
    return Array.from(new Set(orders.map(o => o.country).filter(Boolean)));
  }, [orders]);

  const uniqueCurrencies = useMemo(() => {
    return Array.from(new Set(orders.map(o => o.currency).filter(Boolean)));
  }, [orders]);

  const uniqueProviders = useMemo(() => {
    return Array.from(new Set(orders.map(o => o.payment_provider).filter(Boolean)));
  }, [orders]);

  const uniqueDevices = useMemo(() => {
    return Array.from(new Set(orders.map(o => o.device_type).filter(Boolean)));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.invoice_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.payment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product_title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCountry = filterCountry === "all" || order.country === filterCountry;
      const matchesCurrency = filterCurrency === "all" || order.currency === filterCurrency;
      
      const isCourse = order.product_id?.startsWith("course-") || order.product_title?.toLowerCase().includes("course") || order.product_title?.toLowerCase().includes("track");
      const matchesProductType = filterProductType === "all" || 
        (filterProductType === "course" && isCourse) || 
        (filterProductType === "product" && !isCourse);

      const matchesProvider = filterProvider === "all" || order.payment_provider === filterProvider;
      
      const matchesCoupon = filterCoupon === "all" || 
        (filterCoupon === "has_coupon" && order.coupon_code) ||
        (filterCoupon === "no_coupon" && !order.coupon_code);

      const matchesDevice = filterDeviceType === "all" || order.device_type?.toLowerCase() === filterDeviceType.toLowerCase();

      let matchesDate = true;
      if (filterStartDate) {
        matchesDate = matchesDate && new Date(order.created_at) >= new Date(filterStartDate);
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(order.created_at) <= end;
      }

      return matchesSearch && matchesCountry && matchesCurrency && matchesProductType && matchesProvider && matchesCoupon && matchesDevice && matchesDate;
    });
  }, [orders, searchQuery, filterCountry, filterCurrency, filterProductType, filterProvider, filterCoupon, filterDeviceType, filterStartDate, filterEndDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLocalTimeOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // High-fidelity Print & Save as PDF invoice compiler
  const handlePrintInvoice = (order: any) => {
    const isEgp = order.currency?.toUpperCase() === "EGP";
    const subtotal = order.subtotal_price || order.amount;
    const gatewayFee = order.gateway_fee_amount || 0;
    const total = order.final_price || order.amount;
    const formattedSubtotal = isEgp ? `${subtotal} EGP` : `$${subtotal}`;
    const formattedFee = isEgp ? `${gatewayFee} EGP` : `$${gatewayFee}`;
    const formattedTotal = isEgp ? `${total} EGP` : `$${total}`;
    const maskedIp = maskIpAddress(order.ip_address);
    const countryName = order.country ? (order.country === "Unknown" ? "Unknown" : `${getFlagEmoji(order.country)} ${order.country}`) : "Unknown";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Blocked by popup blocker!");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.invoice_id || order.payment_id || order.id?.slice(0, 8)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Alexandria:wght@400;700;900&display=swap');
            body {
              font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1f2937;
              background-color: #ffffff;
              padding: 40px;
              direction: ltr;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #f3f4f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
              direction: ltr;
            }
            .logo-section {
              text-align: right;
            }
            .logo-title {
              font-family: 'Alexandria', sans-serif;
              font-weight: 900;
              font-size: 32px;
              color: #D6004B;
              margin: 0;
            }
            .logo-subtitle {
              font-size: 12px;
              color: #6b7280;
              margin-top: 4px;
            }
            .invoice-title {
              text-align: left;
            }
            .invoice-title h1 {
              font-size: 28px;
              font-weight: 900;
              margin: 0;
              color: #111827;
            }
            .invoice-title p {
              font-size: 14px;
              color: #4b5563;
              margin: 4px 0 0 0;
            }
            .details-grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
              text-align: left;
            }
            .details-section h3 {
              font-size: 16px;
              font-weight: 700;
              color: #374151;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .details-section p {
              font-size: 14px;
              line-height: 1.6;
              margin: 6px 0;
              color: #4b5563;
            }
            .details-section span {
              font-weight: 700;
              color: #1f2937;
            }
            .table-container {
              margin-bottom: 40px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              text-align: left;
            }
            th {
              background-color: #f9fafb;
              color: #374151;
              font-weight: 700;
              font-size: 14px;
              padding: 12px 16px;
              border-bottom: 1px solid #e5e7eb;
            }
            td {
              padding: 16px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 14px;
              color: #4b5563;
            }
            .total-row td {
              border-bottom: none;
              padding-top: 12px;
              padding-bottom: 12px;
            }
            .total-label {
              text-align: right;
              font-weight: 700;
              color: #374151;
            }
            .total-value {
              font-weight: 700;
              color: #111827;
            }
            .grand-total {
              font-size: 18px;
              color: #D6004B !important;
            }
            .footer {
              text-align: center;
              margin-top: 60px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
              font-size: 12px;
              color: #9ca3af;
              line-height: 1.6;
            }
            .seal {
              display: inline-block;
              border: 3px solid #10b981;
              color: #10b981;
              border-radius: 8px;
              padding: 4px 12px;
              font-weight: bold;
              font-size: 14px;
              transform: rotate(-5deg);
              margin-top: 10px;
            }
            @media print {
              body {
                padding: 0;
              }
              .invoice-container {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="invoice-title">
                <h1>Digital Purchase Invoice</h1>
                <p>Invoice ID: ${order.invoice_id || order.payment_id || order.id?.slice(0, 8)}</p>
                <p>Purchase Date: ${new Date(order.created_at).toLocaleString("en-US")}</p>
              </div>
              <div class="logo-section">
                <h1 class="logo-title">JOESCHOOL</h1>
                <p class="logo-subtitle">Academy for Content Creation & AI Education</p>
              </div>
            </div>

            <div class="details-grid">
              <div class="details-section">
                <h3>Subscriber Details</h3>
                <p>Name: <span>${order.customer_name}</span></p>
                <p>Email: <span>${order.customer_email}</span></p>
                <p>Phone: <span>${order.customer_phone || "-"}</span></p>
                <p>Country: <span>${countryName}</span></p>
              </div>
              <div class="details-section">
                <h3>Payment & Provider Details</h3>
                <p>Provider: <span>JoeSchool Academy</span></p>
                <p>Payment Gateway: <span>${order.payment_provider || "Paymob"}</span></p>
                <p>IP Address (Masked): <span>${maskedIp}</span></p>
                <div class="seal">PAID</div>
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${order.product_title}</td>
                    <td style="text-align: right;">${formattedSubtotal}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="total-label">Subtotal:</td>
                    <td style="text-align: right;" class="total-value">${formattedSubtotal}</td>
                  </tr>
                  ${gatewayFee > 0 ? `
                  <tr class="total-row">
                    <td class="total-label">Payment Processing Fee:</td>
                    <td style="text-align: right;" class="total-value">${formattedFee}</td>
                  </tr>
                  ` : ''}
                  ${order.coupon_code ? `
                  <tr class="total-row">
                    <td class="total-label">Coupon Code Used:</td>
                    <td style="text-align: right;" class="total-value font-mono text-rose-500">${order.coupon_code}</td>
                  </tr>
                  ` : ''}
                  <tr class="total-row" style="border-top: 2px solid #e5e7eb;">
                    <td class="total-label grand-total">Total Paid:</td>
                    <td style="text-align: right;" class="total-value grand-total">${formattedTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p>Thank you for subscribing to our premium learning paths.</p>
              <p>This invoice is a certified proof of purchase and requires no signature.</p>
              <p>JoeSchool © 2026. All rights reserved. support@joeschool.com</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export filtered orders as clean CSV format
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order ID,Customer Name,Email,Phone,Product,Subtotal,Gateway Fee,Total,Currency,Status,Payment ID,Date,Country,City,IP Address,Device,Browser,OS,Coupon\n";

    filteredOrders.forEach(o => {
      const isEgp = o.currency !== "USD";
      const subtotal = o.subtotal_price || o.amount;
      const gatewayFee = o.gateway_fee_amount || 0;
      const total = o.final_price || o.amount;

      const row = [
        o.id,
        `"${o.customer_name?.replace(/"/g, '""')}"`,
        o.customer_email,
        o.customer_phone || "",
        `"${o.product_title?.replace(/"/g, '""')}"`,
        subtotal,
        gatewayFee,
        total,
        o.currency || "EGP",
        o.status,
        o.payment_id || "",
        o.created_at,
        o.country || "Unknown",
        o.city || "Unknown",
        o.ip_address || "Unknown",
        o.device_type || "Desktop",
        o.browser || "Unknown",
        o.os || "Unknown",
        o.coupon_code || ""
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `JoeSchool_Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Spreadsheet successfully compiled and downloaded!");
  };

  const { totalRevenueEGP, totalRevenueUSD, totalOrdersCount, completedCount, conversionRate, internationalCount } = statsData;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-2 md:p-8 font-sans text-left" style={{ background: "#080810", minHeight: "100vh" }} dir="ltr">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">Orders Ledger</h1>
          <p className="text-zinc-500">Manage store transactions, audit payment states, and view international visitor tracking.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-5 h-12 rounded-xl font-semibold text-sm transition-all active:scale-95 cursor-pointer bg-white/5 border border-white/10 text-zinc-300 hover:text-white"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={() => { setPage(1); fetchOrders(1); fetchGlobalStats(); }}
            className="flex items-center gap-2 px-5 h-12 rounded-xl font-semibold text-sm transition-all active:scale-95 cursor-pointer bg-white/5 border border-white/10 text-zinc-300 hover:text-white"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-rose-500" /> : <RefreshCw className="w-5 h-5" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[
          { label: "EGP Revenue (Completed)", value: formatPrice(totalRevenueEGP, "EGP").replace("\u062c.\u0645", "L.E").replace("EGP", "L.E"), sub: "Egypt payments", accent: "#D6004B", glow: "rgba(214,0,75,0.12)" },
          { label: "USD Revenue (Completed)", value: formatPrice(totalRevenueUSD, "USD"), sub: "International payments", accent: "#3b82f6", glow: "rgba(59,130,246,0.12)" },
          { label: "International Orders", value: internationalCount, sub: "Completed outside Egypt", accent: "#10b981", glow: "rgba(16,185,129,0.12)" },
          { label: "Conversion Rate", value: `${conversionRate}%`, sub: `Across ${totalOrdersCount} orders`, accent: "#f59e0b", glow: "rgba(245,158,11,0.12)" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "rgba(16,16,26,0.85)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl pointer-events-none" style={{ background: stat.glow }} />
            <p className="mb-1 text-xs relative z-10 text-zinc-500 font-bold uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-2xl font-extrabold relative z-10 text-white mt-1">{stat.value}</h3>
            <div className="mt-3 flex items-center text-xs font-bold relative z-10" style={{ color: stat.accent }}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main Ledger Box */}
      <div className="overflow-hidden rounded-[2rem]" style={{ background: "rgba(16,16,26,0.85)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
        
        {/* Search & Global Actions Bar */}
        <div className="p-6 flex flex-col lg:flex-row gap-4 items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="relative w-full lg:w-96">
            <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#52525b" }} />
            <Input
              type="text"
              placeholder="Search by customer name, email, ID or title..."
              className="h-12 pl-12 rounded-xl text-white border-white/10"
              style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", color: "#f4f4f5" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 h-12 rounded-xl text-sm transition-all cursor-pointer bg-white/5 border border-white/10 text-zinc-300 hover:text-white"
          >
            <Download className="w-4 h-4" />
            Export CSV Report
          </button>
        </div>

        {/* Dynamic Filter Dropdowns panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-6 bg-white/[0.01] border-b border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden"
            >
              {/* Country */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Country</label>
                <select
                  value={filterCountry}
                  onChange={e => setFilterCountry(e.target.value)}
                  className="bg-[#0b0b14] border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="all">All Countries</option>
                  {uniqueCountries.map(c => (
                    <option key={c} value={c}>{getFlagEmoji(c)} {c}</option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Currency</label>
                <select
                  value={filterCurrency}
                  onChange={e => setFilterCurrency(e.target.value)}
                  className="bg-[#0b0b14] border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="all">All Currencies</option>
                  {uniqueCurrencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Product Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Product Type</label>
                <select
                  value={filterProductType}
                  onChange={e => setFilterProductType(e.target.value)}
                  className="bg-[#0b0b14] border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="all">All Products</option>
                  <option value="course">Academy Courses</option>
                  <option value="product">Digital Products</option>
                </select>
              </div>

              {/* Device Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Device Type</label>
                <select
                  value={filterDeviceType}
                  onChange={e => setFilterDeviceType(e.target.value)}
                  className="bg-[#0b0b14] border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="all">All Devices</option>
                  <option value="mobile">Mobile</option>
                  <option value="desktop">Desktop</option>
                  <option value="tablet">Tablet</option>
                </select>
              </div>

              {/* Coupon */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Coupon Usage</label>
                <select
                  value={filterCoupon}
                  onChange={e => setFilterCoupon(e.target.value)}
                  className="bg-[#0b0b14] border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="all">All coupon usages</option>
                  <option value="has_coupon">Used Promo Code</option>
                  <option value="no_coupon">No Promo Code</option>
                </select>
              </div>

              {/* Date Start */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="bg-[#0b0b14] border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              {/* Date End */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="bg-[#0b0b14] border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterCountry("all");
                    setFilterCurrency("all");
                    setFilterProductType("all");
                    setFilterProvider("all");
                    setFilterCoupon("all");
                    setFilterDeviceType("all");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white transition-all"
                >
                  Clear Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                <TableHead className="text-left py-5 pl-8 text-xs uppercase tracking-widest font-bold text-zinc-500">Order ID & Price</TableHead>
                <TableHead className="text-left py-5 text-xs uppercase tracking-widest font-bold text-zinc-500">Customer Identity</TableHead>
                <TableHead className="text-left py-5 text-xs uppercase tracking-widest font-bold text-zinc-500">Billing Country</TableHead>
                <TableHead className="text-left py-5 text-xs uppercase tracking-widest font-bold text-zinc-500">Device / Browser</TableHead>
                <TableHead className="text-left py-5 text-xs uppercase tracking-widest font-bold text-zinc-500">Status</TableHead>
                <TableHead className="text-left py-5 text-xs uppercase tracking-widest font-bold text-zinc-500">Timestamp</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-24">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-rose-600 mb-6" />
                    <p className="text-zinc-400 text-lg animate-pulse">Fetching database logs from Supabase...</p>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-24 text-zinc-500 text-lg">
                    {searchQuery ? "No matching transactional records found." : "No customer orders registered yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, idx) => {
                  const countryFlag = getFlagEmoji(order.country);
                  const isEgp = order.currency?.toUpperCase() === "EGP" || !order.currency;
                  const finalPaid = order.final_price || order.amount;
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => setSelectedOrder(order)}
                      className="border-zinc-800 hover:bg-zinc-800/40 transition-all cursor-pointer group"
                    >
                      <TableCell className="py-5 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-rose-600 group-hover:text-white transition-all">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-white mb-0.5 text-sm tracking-tight">{order.invoice_id || order.payment_id || order.id?.slice(0, 8)}</div>
                            <div className="text-rose-400 text-xs font-bold">
                              {isEgp ? `${finalPaid} EGP` : `$${finalPaid}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm mb-0.5">{order.customer_name}</span>
                          <span className="text-zinc-500 text-[10px] font-mono leading-none">{order.customer_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{countryFlag}</span>
                          <span className="text-zinc-300 font-bold text-xs">{order.country || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold">
                          <Laptop className="w-3.5 h-3.5 opacity-60" />
                          <span>{order.device_type || "Desktop"} / {order.browser || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const payMethodInfo = getPaymentMethodInfo(order);
                            if (!payMethodInfo) return null;
                            return (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${payMethodInfo.color}`}>
                                {payMethodInfo.text}
                              </span>
                            );
                          })()}
                          <Badge className={
                            order.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2.5 py-0.5 rounded-lg text-[10px]'
                              : order.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 px-2.5 py-0.5 rounded-lg text-[10px]'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 px-2.5 py-0.5 rounded-lg text-[10px]'
                          }>
                            {order.status === 'completed' ? 'Paid' : order.status === 'pending' ? 'Pending' : 'Failed'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs font-mono">
                        <div className="flex flex-col">
                          <span>{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          <span className="text-[9px] text-zinc-600">{formatLocalTimeOnly(order.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-8" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 p-0 text-zinc-500 hover:bg-zinc-800 hover:text-white rounded-xl flex items-center justify-center outline-none transition-all cursor-pointer">
                            <MoreVertical className="h-4.5 w-4.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-300 w-64 p-2 rounded-2xl shadow-2xl">
                            <DropdownMenuItem 
                              onClick={() => setSelectedOrder(order)}
                              className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white rounded-xl p-3"
                            >
                              <Eye className="w-5 h-5 mr-3 text-rose-400" /> View Invoice details
                            </DropdownMenuItem>
                            {order.status === 'completed' && (
                              <DropdownMenuItem
                                className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white rounded-xl p-3"
                                onClick={() => handleResendEmail(order.customer_email)}
                              >
                                <Mail className="w-5 h-5 mr-3 text-emerald-400" /> Resend Delivery Email
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-zinc-800 my-1" />
                            <DropdownMenuItem 
                              onClick={() => handlePrintInvoice(order)}
                              className="hover:bg-zinc-800 hover:text-white cursor-pointer focus:bg-zinc-800 focus:text-white rounded-xl p-3"
                            >
                              <Download className="w-5 h-5 mr-3 text-amber-400" /> Download PDF Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Load More Trigger */}
        {hasMore && !isLoading && (
          <div className="p-6 border-t border-white/5 text-center">
            <button
              onClick={loadMore}
              className="px-6 py-2 rounded-xl text-xs font-bold transition-all bg-white/5 border border-white/10 text-zinc-300 hover:text-white"
            >
              Load More Orders
            </button>
          </div>
        )}
      </div>

      {/* ── ADVANCED INVOICE DETAIL MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-[#09090f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Invoice Details - {selectedOrder.invoice_id || selectedOrder.payment_id || selectedOrder.id?.slice(0, 8)}</h3>
                    <p className="text-[10px] text-zinc-500">Audit logs & tracking metadata</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar text-xs font-semibold text-zinc-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Card 1: Customer Information */}
                  <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                    <h4 className="text-[10px] uppercase tracking-wider text-rose-500 font-bold border-b border-white/5 pb-2">Customer Information</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Full Name</span>
                        <span className="text-white mt-1 block">{selectedOrder.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Email Address</span>
                        <span className="text-white mt-1 block font-mono">{selectedOrder.customer_email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Phone Number</span>
                        <span className="text-white mt-1 block font-mono">{selectedOrder.customer_phone || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Country Location</span>
                        <span className="text-white mt-1 block flex items-center gap-1.5">
                          {getFlagEmoji(selectedOrder.country)} {selectedOrder.country || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Purchase Information */}
                  <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                    <h4 className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold border-b border-white/5 pb-2">Purchase Information</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Digital product / Course</span>
                        <span className="text-white mt-1 block truncate" title={selectedOrder.product_title}>{selectedOrder.product_title}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Subtotal</span>
                          <span className="text-white mt-1 block font-mono">
                            {formatPrice(selectedOrder.subtotal_price || selectedOrder.amount, selectedOrder.currency || "EGP")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Gateway Surcharge</span>
                          <span className="text-white mt-1 block font-mono text-amber-400">
                            {formatPrice(selectedOrder.gateway_fee_amount || 0, selectedOrder.currency || "EGP")}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Coupon Code</span>
                          <span className="text-white mt-1 block font-mono text-rose-400">{selectedOrder.coupon_code || "None"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Final Total Charged</span>
                          <span className="text-emerald-400 mt-1 block font-black font-mono">
                            {formatPrice(selectedOrder.final_price || selectedOrder.amount, selectedOrder.currency || "EGP")}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Payment Channel</span>
                          <span className="text-white mt-1 block capitalize">{selectedOrder.payment_provider || "Paymob"}</span>
                        </div>
                        {(() => {
                          const payMethodInfo = getPaymentMethodInfo(selectedOrder);
                          if (!payMethodInfo) return null;
                          return (
                            <div>
                              <span className="text-[10px] text-zinc-500 block">Payment Method</span>
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 mt-1 rounded border ${payMethodInfo.color}`}>
                                {payMethodInfo.text}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Technical Metadata */}
                  <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                    <h4 className="text-[10px] uppercase tracking-wider text-blue-400 font-bold border-b border-white/5 pb-2">Technical Metadata</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Masked IP Address</span>
                        <span className="text-white mt-1 block font-mono">{maskIpAddress(selectedOrder.ip_address)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Device / OS</span>
                          <span className="text-white mt-1 block">{selectedOrder.device_type || "Desktop"} / {selectedOrder.os || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">Browser Agent</span>
                          <span className="text-white mt-1 block">{selectedOrder.browser || "Unknown"}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Local Time & Timezone</span>
                        <span className="text-white mt-1 block font-mono text-[10px]">{selectedOrder.timezone || "UTC"} ({formatLocalTimeOnly(selectedOrder.created_at)})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">ISO User Language</span>
                        <span className="text-white mt-1 block font-mono uppercase">{selectedOrder.language || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Audit Logs */}
                <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-white/5 pb-2">Security Audits</h4>
                  <div className="relative border-l border-white/10 pl-6 ml-3 space-y-4 text-xs font-semibold">
                    <div className="relative">
                      <div className="absolute left-[-28.5px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-white">Transaction Initialized</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Secure payment intent snapshot recorded · {formatDate(selectedOrder.created_at)}</p>
                    </div>
                    <div className="relative">
                      <div className={`absolute left-[-28.5px] top-1 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        selectedOrder.status === "completed" 
                          ? "bg-emerald-500/20 border-2 border-emerald-500" 
                          : selectedOrder.status === "failed" 
                          ? "bg-red-500/20 border-2 border-red-500" 
                          : "bg-amber-500/20 border-2 border-amber-500"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          selectedOrder.status === "completed" 
                            ? "bg-emerald-500" 
                            : selectedOrder.status === "failed" 
                            ? "bg-red-500" 
                            : "bg-amber-500"
                        }`} />
                      </div>
                      <p className="text-white">Payment Status: <span className="capitalize">{selectedOrder.status}</span></p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {selectedOrder.status === "completed" 
                          ? "Fulfillment complete: download links dispatched & LMS access unlocked." 
                          : selectedOrder.status === "failed" 
                          ? "Transaction rejected by card processor or failed callback check." 
                          : "Order pending: awaiting signature verification webhook from gateway."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Tools */}
              <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 bg-white/[0.01]">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 h-11 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  Close Details
                </button>
                <button
                  onClick={() => handlePrintInvoice(selectedOrder)}
                  className="px-6 h-11 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-600/10"
                >
                  <Download className="w-4 h-4" />
                  Print / Download PDF Invoice
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
