"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  ShoppingCart, Package, CreditCard, Loader2, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle,
  Activity, Zap, Users, DollarSign, BarChart3, RefreshCw,
  Percent, AlertTriangle, ShieldCheck, Search, Share2,
  Calendar, Flame, Sparkles, Volume2, VolumeX, Keyboard,
  Globe, Laptop, ShieldAlert, Award, FileText, Ban, ChevronRight, Download,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice as formatPriceRaw } from "@/lib/pricing";
const formatPrice = (price: number, currency: any) => {
  const formatted = formatPriceRaw(price, currency);
  return formatted;
};
import dynamic from "next/dynamic";
import DashboardFilters from "@/components/admin/analytics/DashboardFilters";
import NotificationCenter, { AlertNotification, NotificationPrefs } from "@/components/admin/analytics/NotificationCenter";
import { useAdminPreferences } from "@/context/AdminPreferencesContext";

// Dynamically import section views
const OverviewSection = dynamic(() => import("@/components/admin/analytics/OverviewSection"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-white/5 rounded-3xl" />
});

const LmsSection = dynamic(() => import("@/components/admin/analytics/LmsSection"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-white/5 rounded-3xl" />
});

const StoreSection = dynamic(() => import("@/components/admin/analytics/StoreSection"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-white/5 rounded-3xl" />
});

const DiagnosticsSection = dynamic(() => import("@/components/admin/analytics/DiagnosticsSection"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-white/5 rounded-3xl" />
});

const AdminOrders = dynamic(() => import("./orders/page"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-white/5 rounded-3xl" />
});

const LiveOrdersFeed = dynamic(() => import("./orders/live/page"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-white/5 rounded-3xl" />
});

// Interfaces mapped to database schemas
interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  product_title: string;
  product_id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
  currency?: string;
  payment_id?: string;
  country?: string;
  payment_method?: string;
  coupon_code?: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  sales: number;
  status: string;
}

interface Course {
  id: string;
  title: string;
  price: number;
  status: string;
  category: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  enrolled_at: string;
}

interface AnalyticsEvent {
  id: string;
  event_name: string;
  session_id: string;
  user_id?: string | null;
  product_id?: string | null;
  product_title?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: any;
  created_at: string;
}

export default function AdminDashboard() {
  const {
    preferences,
    updatePreference,
    updateNotificationPref
  } = useAdminPreferences();

  const activeTab = preferences.activeTab;
  const theme = preferences.theme;
  const dateRange = preferences.dateRange;
  const currency = preferences.currency;
  const notificationPrefs = preferences.notificationPrefs;

  const setActiveTab = (tab: any) => updatePreference("activeTab", tab);
  const setTheme = (theme: any) => updatePreference("theme", theme);
  const setDateRange = (range: any) => updatePreference("dateRange", range);
  const setCurrency = (curr: any) => updatePreference("currency", curr);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [resetDate, setResetDate] = useState<string>("");
  const [analyticsMode, setAnalyticsMode] = useState<"reset" | "lifetime">("reset");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pollingActive, setPollingActive] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [analyticsTableMissing, setAnalyticsTableMissing] = useState(false);

  const [country, setCountry] = useState("ALL");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  
  // Track read and cleared notification IDs in localStorage to prevent duplication and simulator dependency
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const [clearedNotifIds, setClearedNotifIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        setReadNotifIds(JSON.parse(localStorage.getItem("admin_notifications_read") || "[]"));
        setClearedNotifIds(JSON.parse(localStorage.getItem("admin_notifications_cleared") || "[]"));
      } catch (e) {}
    }
  }, []);

  const derivedNotifications = useMemo(() => {
    const derived: AlertNotification[] = [];

    // 1. Process Orders for Sales Notifications (Completed vs Incomplete)
    orders.forEach(order => {
      // Completed Sale
      if (order.status === "completed") {
        const id = `sale-completed-${order.id}`;
        if (!clearedNotifIds.includes(id) && notificationPrefs.new_order) {
          derived.push({
            id,
            type: "new_order",
            title: "Completed Sale Received",
            message: `Completed payment of ${formatPrice(order.amount, order.currency || "EGP")} processed for "${order.product_title}" from ${order.customer_name || 'Guest'}.`,
            created_at: order.created_at,
            read: readNotifIds.includes(id)
          });
        }
        
        // Revenue spike alert (if amount >= 1500)
        if (order.amount >= 1500 && notificationPrefs.revenue_spike) {
          const spikeId = `sale-spike-${order.id}`;
          if (!clearedNotifIds.includes(spikeId)) {
            derived.push({
              id: spikeId,
              type: "revenue_spike",
              title: "Alert: Revenue Spike",
              message: `A high-value order of ${formatPrice(order.amount, order.currency || "EGP")} was processed from customer ${order.customer_name || "Guest"}.`,
              created_at: order.created_at,
              read: readNotifIds.includes(spikeId)
            });
          }
        }
      } 
      // Incomplete/Pending/Failed Sale
      else {
        const id = `sale-incomplete-${order.id}`;
        if (!clearedNotifIds.includes(id) && notificationPrefs.failed_payment) {
          const statusText = order.status === "failed" ? "Failed" : "Pending";
          derived.push({
            id,
            type: "failed_payment",
            title: `Incomplete Sale (${statusText})`,
            message: `An order of ${formatPrice(order.amount, order.currency || "EGP")} for "${order.product_title}" by ${order.customer_name || 'Guest'} is currently ${statusText.toLowerCase()}.`,
            created_at: order.created_at,
            read: readNotifIds.includes(id)
          });
        }
      }
    });

    // 2. Process analyticsEvents for security alerts (real failed login attempts)
    const seenFailedLogins = new Set<string>();
    
    // Process analytics events in reverse order to keep the newest one first, but since we are pushing to derived array,
    // we can just check if we have already added an alert for this email.
    // First, sort by created_at desc so we see newest first
    const sortedEvents = [...analyticsEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    sortedEvents.forEach(evt => {
      if (evt.event_name === "admin_login_failed" && notificationPrefs.suspicious_login) {
        const email = evt.metadata?.email_attempted || "Unknown email";
        if (!seenFailedLogins.has(email)) {
          seenFailedLogins.add(email);
          const id = `sec-alert-${evt.id}`;
          if (!clearedNotifIds.includes(id)) {
            derived.push({
              id,
              type: "suspicious_login",
              title: "Security Threat: Blocked Login Attempt",
              message: `A failed login attempt for admin email "${email}" from IP ${evt.ip_address || 'Unknown'} was blocked.`,
              created_at: evt.created_at,
              read: readNotifIds.includes(id)
            });
          }
        }
      }
    });

    // Sort notifications by created_at descending
    return derived.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, analyticsEvents, readNotifIds, clearedNotifIds, notificationPrefs]);

  const handleMarkAllAsRead = () => {
    const currentIds = derivedNotifications.map(n => n.id);
    const newReadIds = Array.from(new Set([...readNotifIds, ...currentIds]));
    setReadNotifIds(newReadIds);
    localStorage.setItem("admin_notifications_read", JSON.stringify(newReadIds));
  };

  const handleClearAll = () => {
    const currentIds = derivedNotifications.map(n => n.id);
    const newClearedIds = Array.from(new Set([...clearedNotifIds, ...currentIds]));
    setClearedNotifIds(newClearedIds);
    localStorage.setItem("admin_notifications_cleared", JSON.stringify(newClearedIds));
  };

  const hasFetched = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Use refs for notification prefs and sound so the Supabase channel is not recreated on pref changes
  const notificationPrefsRef = useRef(notificationPrefs);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { notificationPrefsRef.current = notificationPrefs; }, [notificationPrefs]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const handleSeedTelemetry = async () => {
    setSeeding(true);
    try {
      // 1. Check and Seed Products if empty
      const { data: currentProducts, error: prodCheckErr } = await supabase.from("products").select("id");
      if (prodCheckErr) throw prodCheckErr;

      let productIds: string[] = [];

      if (!currentProducts || currentProducts.length === 0) {
        const demoProducts = [
          {
            id: "prod-n8n-mastery",
            title: "AI Content Creation Mastery Course",
            price: 450,
            sales: 12,
            status: "active",
            created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "prod-ai-content",
            title: "Professional AI Tools & Spreadsheets Bundle",
            price: 250,
            sales: 8,
            status: "active",
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "prod-shopify-secrets",
            title: "Shopify Affiliate Marketing Secrets Book",
            price: 150,
            sales: 15,
            status: "active",
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        const { error: prodSeedErr } = await supabase.from("products").insert(demoProducts);
        if (prodSeedErr) throw prodSeedErr;
        productIds = demoProducts.map(p => p.id);
        toast.success("Successfully generated 3 demo digital products!");
      } else {
        productIds = currentProducts.map(p => p.id);
      }

      // Also get the course ID if exists
      const { data: currentCourses } = await supabase.from("courses").select("id");
      const courseIds = currentCourses ? currentCourses.map(c => c.id) : [];
      const allItemIds = [...productIds, ...courseIds];

      if (allItemIds.length === 0) {
        throw new Error("No products or courses found to link orders to!");
      }

      // 2. Check and Seed Orders
      const { data: currentOrders } = await supabase.from("orders").select("id");
      
      if (!currentOrders || currentOrders.length < 10) {
        const customers = [
          { name: "Ahmed Mansour", email: "ahmed.mansour@gmail.com" },
          { name: "Sara Ghandour", email: "sara.ghandour@yahoo.com" },
          { name: "Omar Abdelaziz", email: "omar.aziz@hotmail.com" },
          { name: "Mariam El Shafei", email: "mariam.shafei@gmail.com" },
          { name: "Yassin Abdullah", email: "yassine.abd@gmail.com" },
          { name: "Nouran Selim", email: "nouran.selim@outlook.com" },
          { name: "Hassan Ibrahim", email: "hassan.heba@gmail.com" }
        ];

        const paymentMethods = ["Credit Card", "E-Wallet", "Fawry"];
        const countries = ["EG", "SA", "AE", "US"];
        const statuses = ["completed", "completed", "completed", "pending", "failed"];
        const coupons = ["BLACKFRIDAY", "RAMADAN25", "GROWTH30", ""];

        const demoOrders = [];
        const now = Date.now();

        for (let i = 0; i < 30; i++) {
          const daysAgo = Math.floor(Math.random() * 14);
          const minutesAgo = Math.floor(Math.random() * 1440);
          const orderDate = new Date(now - (daysAgo * 24 * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));
          
          const cust = customers[Math.floor(Math.random() * customers.length)];
          const payId = `pay_mb_${Math.floor(10000000 + Math.random() * 90000000)}`;
          const targetItemId = allItemIds[Math.floor(Math.random() * allItemIds.length)];
          
          let title = "AI Content Creation Mastery Course";
          let price = 450;
          
          if (targetItemId === "prod-n8n-mastery") {
            title = "AI Content Creation Mastery Course";
            price = 450;
          } else if (targetItemId === "prod-ai-content") {
            title = "Professional AI Tools & Spreadsheets Bundle";
            price = 250;
          } else if (targetItemId === "prod-shopify-secrets") {
            title = "Shopify Affiliate Marketing Secrets Book";
            price = 150;
          } else {
            const matchedC = currentCourses?.find(c => c.id === targetItemId);
            if (matchedC) {
              title = (matchedC as any).title;
              price = (matchedC as any).price || 650;
            }
          }

          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const coupon = status === "completed" && Math.random() > 0.6 ? coupons[Math.floor(Math.random() * coupons.length)] : null;
          const finalAmount = coupon ? Math.round(price * 0.7) : price;

          demoOrders.push({
            customer_name: cust.name,
            customer_email: cust.email,
            product_title: title,
            product_id: targetItemId,
            amount: finalAmount,
            status,
            payment_id: payId,
            coupon_code: coupon || null,
            country: countries[Math.floor(Math.random() * countries.length)],
            payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            created_at: orderDate.toISOString()
          });
        }

        const { error: orderSeedErr } = await supabase.from("orders").insert(demoOrders);
        if (orderSeedErr) throw orderSeedErr;
        toast.success("Successfully generated 30 demo orders with complete billing details!");
      }

      // 3. Try to seed tracking events if table exists
      try {
        const { error: eventCheckErr } = await supabase.from("analytics_events").select("id").limit(1);
        if (!eventCheckErr) {
          const demoEvents = [];
          const now = Date.now();
          
          for (let i = 0; i < 150; i++) {
            const daysAgo = Math.floor(Math.random() * 14);
            const eventDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
            const sessId = `sess_${Math.floor(100000 + Math.random() * 900000)}`;
            const eventNames = ["page_view", "product_view", "add_to_cart", "checkout_started"];
            const randEvent = eventNames[Math.floor(Math.random() * eventNames.length)];
            const targetItemId = allItemIds[Math.floor(Math.random() * allItemIds.length)];

            demoEvents.push({
              event_name: randEvent,
              session_id: sessId,
              product_id: targetItemId,
              utm_source: ["tiktok", "facebook", "instagram", "google", "email"][Math.floor(Math.random() * 5)],
              utm_medium: "cpc",
              utm_campaign: "spring_sale",
              referrer: "https://t.co",
              created_at: eventDate.toISOString()
            });
          }

          await supabase.from("analytics_events").insert(demoEvents);
          toast.success("Successfully generated clickstream traffic events!");
        }
      } catch (e) {
        console.log("Analytics events table not present, skipped seeding clickstream events.");
      }

      await refreshTelemetry();
      toast.success("Dashboard successfully loaded with demo data!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate demo data");
    } finally {
      setSeeding(false);
    }
  };

  const playNewOrderSound = () => {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log("Audio play blocked", e);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Setup Postgres Live subscription for real-time commerce alerts
    const channel = supabase
      .channel("admin-realtime-feed")
      // Listen to all changes on orders (INSERT, UPDATE)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            setOrders(prev => [newOrder, ...prev]);
            playNewOrderSound();
            toast.success(
              `New order received: ${formatPrice(newOrder.amount, (newOrder.currency as any) || 'EGP')} from customer ${newOrder.customer_name || 'Guest'}`,
              { duration: 6000 }
            );
          } else if (payload.eventType === "UPDATE") {
            const updatedOrder = payload.new as Order;
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            if (updatedOrder.status === "completed") {
              playNewOrderSound();
              toast.success(
                `Order completed! ${formatPrice(updatedOrder.amount, (updatedOrder.currency as any) || 'EGP')} from ${updatedOrder.customer_name || 'Guest'}`,
                { duration: 6000 }
              );
            }
          }
        }
      )
      // Listen to student enrollments
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "enrollments" },
        (payload) => {
          const newEnroll = payload.new as any;
          setEnrollments(prev => [newEnroll, ...prev]);
          toast.info(`New student registration: Student enrolled in course ID: ${newEnroll.course_id}`);
        }
      )
      // Listen to product reviews
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        (payload) => {
          const newReview = payload.new as any;
          setReviews(prev => [newReview, ...prev]);
          toast.info(`New review submitted: Rating ${newReview.rating || 5} stars from student "${newReview.student_name || 'Anonymous'}"`);
        }
      )
      // Listen to visitor clicks / clickstreams in real-time
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_events" },
        (payload) => {
          const newEvent = payload.new as AnalyticsEvent;
          setAnalyticsEvents(prev => [newEvent, ...prev]);
          if (newEvent.event_name === "admin_login_failed") {
            toast.error(`Security Alert: A failed admin login attempt from IP ${newEvent.ip_address || 'Unknown'} was blocked!`);
          }
        }
      )
      .subscribe();

    // 2. Background polling fallback scheduler (every 20s for high responsiveness)
    let pollInterval: any;
    if (pollingActive) {
      pollInterval = setInterval(() => {
        refreshTelemetry();
      }, 20000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  // Only re-run on pollingActive change — refs handle the rest without recreating channels
  }, [pollingActive]);

  async function loadData() {
    setLoading(true);
    await refreshTelemetry();
    setLoading(false);
  }  async function refreshTelemetry() {
    try {
      const [ordersRes, productsRes, analyticsRes, enrollmentsRes, coursesRes, reviewsRes, settingsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("*")
          .order("sales", { ascending: false }),
        supabase
          .from("analytics_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10000), // Funnel tracking
        supabase
          .from("enrollments")
          .select("*"),
        supabase
          .from("courses")
          .select("*"),
        supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false }),
        fetch("/api/admin/settings").then(r => r.json()).catch(err => {
          console.error("Failed to load settings in dashboard:", err);
          return null;
        })
      ]);

      if (settingsRes && !settingsRes.error) {
        if (settingsRes.analyticsResetDate) {
          setResetDate(settingsRes.analyticsResetDate);
        } else {
          setResetDate("");
        }
        if (settingsRes.analyticsMode) {
          setAnalyticsMode(settingsRes.analyticsMode);
        }
      }

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (coursesRes.data) setCourses(coursesRes.data as Course[]);
      if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data as Enrollment[]);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      if (analyticsRes.data) {
        setAnalyticsEvents(analyticsRes.data as AnalyticsEvent[]);
        setAnalyticsTableMissing(false);
      } else {
        setAnalyticsEvents([]);
        if (analyticsRes.error && analyticsRes.error.message.includes("relation")) {
          setAnalyticsTableMissing(true);
        }
      }
    } catch (err) {
      console.error("[TELEMETRY_LOAD] Error loading analytics:", err);
      toast.error("Failed to load real-time analytics data");
    }
  }

  // Filtered orders and events based on date cutoff
  const dateCutoff = useMemo(() => {
    const now = new Date();
    const rangeCutoff = new Date(now.getTime() - Number(dateRange) * 24 * 60 * 60 * 1000);
    if (analyticsMode === "reset" && resetDate) {
      const parsedReset = new Date(resetDate);
      return new Date(Math.max(rangeCutoff.getTime(), parsedReset.getTime()));
    }
    return rangeCutoff;
  }, [dateRange, analyticsMode, resetDate]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const dateMatch = new Date(o.created_at) >= dateCutoff;
      if (!dateMatch) return false;

      if (country !== "ALL") {
        const c = o.country || "Unknown";
        if (c !== country) return false;
      }

      if (currency !== "ALL") {
        const isUsd = o.currency === "USD";
        if (currency === "USD" && !isUsd) return false;
        if (currency === "EGP" && isUsd) return false;
      }

      return true;
    });
  }, [orders, dateCutoff, country, currency]);

  const previousPeriodOrders = useMemo(() => {
    const now = new Date();
    const periodMs = Number(dateRange) * 24 * 60 * 60 * 1000;
    let startPrev = new Date(now.getTime() - periodMs * 2);
    let endPrev = dateCutoff;
    if (analyticsMode === "reset" && resetDate) {
      const parsedReset = new Date(resetDate);
      if (startPrev < parsedReset) startPrev = parsedReset;
      if (endPrev < parsedReset) endPrev = parsedReset;
    }
    return orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= startPrev && d < endPrev;
    });
  }, [orders, dateRange, dateCutoff, analyticsMode, resetDate]);

  // Filtered enrollments based on dateCutoff if in reset mode
  const filteredEnrollments = useMemo(() => {
    if (analyticsMode === "reset" && resetDate) {
      const parsedReset = new Date(resetDate);
      return enrollments.filter(e => new Date(e.enrolled_at) >= parsedReset);
    }
    return enrollments;
  }, [enrollments, analyticsMode, resetDate]);

  // Filtered analytics events based on dateCutoff
  const filteredAnalyticsEvents = useMemo(() => {
    return analyticsEvents.filter(e => new Date(e.created_at) >= dateCutoff);
  }, [analyticsEvents, dateCutoff]);

  // Aggregated Marketing KPIs (Today, 7 days, 30 days, 90 days)
  const stats = useMemo(() => {
    const completed = filteredOrders.filter(o => o.status === "completed");
    const totalOrders = filteredOrders.length;
    
    // EGP Revenue: sum of completed EGP orders
    const egpRevenue = completed
      .filter(o => o.currency !== "USD")
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    // USD Revenue: sum of completed USD orders
    const usdRevenue = completed
      .filter(o => o.currency === "USD")
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    // Processing Fees Recovered: sum of gateway_fee_amount
    const processingFees = completed.reduce((sum, o) => sum + Number((o as any).gateway_fee_amount || 0), 0);

    // International Customers: country is set and not EG/Unknown, or currency is USD
    const internationalCustomers = completed.filter(o => {
      const isUsd = o.currency === "USD";
      const hasIntlCountry = o.country && o.country !== "EG" && o.country !== "Unknown";
      return isUsd || hasIntlCountry;
    }).length;

    // Gross Revenue (EGP equivalent using a flat 50 rate for analytics consistency)
    const exchangeRate = 50.0;
    const grossRevenue = egpRevenue + (usdRevenue * exchangeRate);
    
    // Subtract standard processor fees
    const gatewayFees = egpRevenue * 0.03;
    const netRevenue = (egpRevenue - gatewayFees) + (usdRevenue * exchangeRate);

    // AOV (Average Order Value)
    const aov = completed.length > 0 ? grossRevenue / completed.length : 0;

    // Target total visitor count from session logs
    const rangeEvents = analyticsEvents.filter(e => new Date(e.created_at) >= dateCutoff);
    const uniqueSessionIds = new Set(rangeEvents.map(e => e.session_id));
    
    // Strictly use actual visitor count from session logs (0 if empty)
    const totalSessions = uniqueSessionIds.size;

    // CR (Conversion Rate)
    const conversionRate = totalSessions > 0 ? (completed.length / totalSessions) * 100 : 0;

    // Cart Abandonment Rate (strictly from database events)
    const checkoutStartedEvents = rangeEvents.filter(e => e.event_name === "checkout_started").length;
    const abandonedCarts = Math.max(0, checkoutStartedEvents - completed.length);
    const abandonmentRate = (checkoutStartedEvents > 0 || completed.length > 0)
      ? (abandonedCarts / (abandonedCarts + completed.length)) * 100
      : 0;

    // Historical Period Comparison Trends
    const prevCompleted = previousPeriodOrders.filter(o => o.status === "completed");
    const prevEgp = prevCompleted.filter(o => o.currency !== "USD").reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const prevUsd = prevCompleted.filter(o => o.currency === "USD").reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const prevRevenue = prevEgp + (prevUsd * exchangeRate);
    
    // 1. Gross Revenue growth (EGP + USD equivalent)
    const revenueGrowth = prevRevenue > 0 ? ((grossRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // 2. Net Revenue growth
    const prevFees = prevCompleted.reduce((sum, o) => sum + Number((o as any).gateway_fee_amount || 0), 0);
    const prevNetRevenue = (prevEgp - prevFees) + (prevUsd * exchangeRate);
    const egpNetGrowth = prevNetRevenue > 0 ? ((netRevenue - prevNetRevenue) / prevNetRevenue) * 100 : 0;

    // 3. USD Revenue growth
    const usdGrossGrowth = prevUsd > 0 ? ((usdRevenue - prevUsd) / prevUsd) * 100 : 0;

    // 4. Processing Fees growth
    const feesGrowth = prevFees > 0 ? ((processingFees - prevFees) / prevFees) * 100 : 0;

    // 5. Successful orders count growth
    const prevSuccessfulOrdersCount = prevCompleted.length;
    const successfulOrdersGrowth = prevSuccessfulOrdersCount > 0 
      ? ((completed.length - prevSuccessfulOrdersCount) / prevSuccessfulOrdersCount) * 100 
      : 0;

    // 6. Conversion Rate growth
    const now = new Date();
    const periodMs = Number(dateRange) * 24 * 60 * 60 * 1000;
    const startPrev = new Date(now.getTime() - periodMs * 2);
    const endPrev = dateCutoff;
    const prevRangeEvents = analyticsEvents.filter(e => {
      const d = new Date(e.created_at);
      return d >= startPrev && d < endPrev;
    });
    const prevUniqueSessions = new Set(prevRangeEvents.map(e => e.session_id)).size;
    const prevSessions = prevUniqueSessions;
    const prevConversionRate = prevSessions > 0 ? (prevCompleted.length / prevSessions) * 100 : 0;
    const conversionRateGrowth = prevConversionRate > 0 
      ? ((conversionRate - prevConversionRate) / prevConversionRate) * 100 
      : 0;

    // Additional funnel stats for overview cards
    const rangeEventsAll = analyticsEvents.filter(e => new Date(e.created_at) >= dateCutoff);
    const totalVisitorsCount = new Set(rangeEventsAll.map(e => e.session_id)).size;
    const addToCartCount = rangeEventsAll.filter(e => e.event_name === "add_to_cart").length;
    const checkoutStartedCount = rangeEventsAll.filter(e => e.event_name === "checkout_started").length;
    const abandonedCheckouts = Math.max(0, checkoutStartedCount - completed.length);

    return {
      grossRevenue,
      netRevenue,
      egpGrossRevenue: egpRevenue,
      egpNetRevenue: egpRevenue - processingFees,
      usdGrossRevenue: usdRevenue,
      usdNetRevenue: usdRevenue, // USD Net === USD Gross
      processingFees,
      internationalCustomers,
      totalOrders,
      successfulOrders: completed.length,
      conversionRate,
      aov,
      abandonmentRate,
      sessions: totalSessions,
      totalVisitors: totalVisitorsCount,
      addToCartCount,
      checkoutStartedCount,
      abandonedCheckouts,
      revenueGrowth,
      egpNetGrowth,
      usdGrossGrowth,
      feesGrowth,
      successfulOrdersGrowth,
      conversionRateGrowth
    };
  }, [filteredOrders, previousPeriodOrders, analyticsEvents, dateCutoff, dateRange]);

  // International Revenue Visualization Memos
  const topCountriesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.filter(o => o.status === "completed").forEach(o => {
      const c = o.country || "Unknown";
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([country, count]) => {
        let flag = "🌐";
        if (country !== "Unknown" && country.length === 2) {
          const codePoints = country.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
          try {
            flag = String.fromCodePoint(...codePoints);
          } catch (e) {}
        }
        return { name: `${flag} ${country}`, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOrders]);

  const currencyDistributionData = useMemo(() => {
    const egpSum = filteredOrders
      .filter(o => o.status === "completed" && o.currency !== "USD")
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const usdSum = filteredOrders
      .filter(o => o.status === "completed" && o.currency === "USD")
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);
    return [
      { name: "EGP Revenue", value: egpSum },
      { name: "USD Revenue (EGP Equiv.)", value: usdSum * 50 }
    ];
  }, [filteredOrders]);

  // Daily Chart Area Data Ingestion
  const revenueChartData = useMemo(() => {
    const dataMap: { [day: string]: { revenue: number; orders: number } } = {};
    const now = new Date();
    const daysToMap = Number(dateRange);

    for (let i = daysToMap - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dataMap[dateStr] = { revenue: 0, orders: 0 };
    }

    filteredOrders.filter(o => o.status === "completed").forEach(o => {
      const d = new Date(o.created_at);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dataMap[dateStr] !== undefined) {
        dataMap[dateStr].revenue += Number(o.amount || 0);
        dataMap[dateStr].orders += 1;
      }
    });

    return Object.entries(dataMap).map(([day, val]) => ({
      name: day,
      Revenue: val.revenue,
      Orders: val.orders,
      Profit: Math.round(val.revenue * 0.97) // Standard Net margin (97% after fees)
    }));
  }, [filteredOrders, dateRange]);

  // Traffic Source Attribution Model
  const trafficMetrics = useMemo(() => {
    const rangeEvents = analyticsEvents.filter(e => new Date(e.created_at) >= dateCutoff);
    const rangeOrders = filteredOrders.filter(o => o.status === "completed");

    const sources: Record<string, { visits: number; orders: number; revenue: number; color: string }> = {
      "TikTok Ads": { visits: 0, orders: 0, revenue: 0, color: "#ec4899" },
      "Facebook Ads": { visits: 0, orders: 0, revenue: 0, color: "#3b82f6" },
      "Instagram": { visits: 0, orders: 0, revenue: 0, color: "#a855f7" },
      "Organic Search (SEO)": { visits: 0, orders: 0, revenue: 0, color: "#10b981" },
      "Email Campaigns": { visits: 0, orders: 0, revenue: 0, color: "#f59e0b" },
      "Referral Links": { visits: 0, orders: 0, revenue: 0, color: "#06b6d4" },
      "Direct Traffic": { visits: 0, orders: 0, revenue: 0, color: "#71717a" }
    };

    // Map unique visitor sessions to original traffic source
    const sessionSources: Record<string, string> = {};
    rangeEvents.forEach(e => {
      if (e.session_id && !sessionSources[e.session_id]) {
        let src = "Direct Traffic";
        const utm = e.utm_source?.toLowerCase() || "";
        const ref = e.referrer?.toLowerCase() || "";

        if (utm.includes("tiktok") || utm.includes("tt")) src = "TikTok Ads";
        else if (utm.includes("facebook") || utm.includes("fb")) src = "Facebook Ads";
        else if (utm.includes("instagram") || utm.includes("ig")) src = "Instagram";
        else if (utm.includes("email") || utm.includes("newsletter")) src = "Email Campaigns";
        else if (ref.includes("google") || ref.includes("bing") || ref.includes("yahoo") || ref.includes("duckduckgo")) src = "Organic Search (SEO)";
        else if (ref && ref !== "direct" && !ref.includes("localhost") && !ref.includes("joeschool")) src = "Referral Links";

        sessionSources[e.session_id] = src;
        if (sources[src]) sources[src].visits += 1;
      }
    });

    // Attribute real orders to their original traffic source
    rangeOrders.forEach(o => {
      const matchingEvent = rangeEvents.find(e => e.session_id === o.payment_id);
      const src = matchingEvent ? sessionSources[matchingEvent.session_id] || "Direct Traffic" : "Direct Traffic";

      if (sources[src]) {
        sources[src].orders += 1;
        sources[src].revenue += Number(o.amount || 0);
      }
    });

    return Object.entries(sources).map(([name, data]) => {
      const cr = data.visits > 0 ? ((data.orders / data.visits) * 100).toFixed(1) + "%" : "0.0%";
      let roas = "∞";
      if (name === "TikTok Ads" && data.revenue > 0) {
        const cost = data.visits * 2.5; // Est 2.5 EGP per click
        roas = (data.revenue / cost).toFixed(1) + "x";
      } else if (name === "Facebook Ads" && data.revenue > 0) {
        const cost = data.visits * 3.2; // Est 3.2 EGP per click
        roas = (data.revenue / cost).toFixed(1) + "x";
      } else if (name === "Instagram" && data.revenue > 0) {
        const cost = data.visits * 2.8; // Est 2.8 EGP per click
        roas = (data.revenue / cost).toFixed(1) + "x";
      } else if (name === "Email Campaigns" && data.revenue > 0) {
        const cost = data.visits * 0.05; // Est 0.05 EGP per mail
        roas = (data.revenue / cost).toFixed(1) + "x";
      }

      return {
        name,
        visits: data.visits,
        orders: data.orders,
        revenue: data.revenue,
        cr,
        roas,
        color: data.color
      };
    });
  }, [analyticsEvents, filteredOrders, dateCutoff, stats.grossRevenue]);

  // Sales Conversion Funnel Engine (Direct SQL events clickstreams)
  const funnelMetrics = useMemo(() => {
    const rangeEvents = analyticsEvents.filter(e => new Date(e.created_at) >= dateCutoff);
    const completedCount = filteredOrders.filter(o => o.status === "completed").length;

    const visitorsCount = new Set(rangeEvents.map(e => e.session_id)).size;
    const productViews = rangeEvents.filter(e => e.event_name === "product_view" || e.event_name === "page_view").length;
    const addToCarts = rangeEvents.filter(e => e.event_name === "add_to_cart").length;
    const checkoutStarteds = rangeEvents.filter(e => e.event_name === "checkout_started").length;

    const finalPurchases = completedCount;
    const finalCheckouts = checkoutStarteds;
    const finalCarts = addToCarts;
    const finalViews = productViews;
    const finalVisitors = visitorsCount;

    const stages = [
      { name: "Total Visitors", count: finalVisitors, color: "#6366f1", label: "Initial site visits" },
      { name: "Product Views", count: finalViews, color: "#3b82f6", label: "Detail page views" },
      { name: "Add to Cart", count: finalCarts, color: "#a855f7", label: "Expressed purchase intent" },
      { name: "Checkout Started", count: finalCheckouts, color: "#f59e0b", label: "Entered checkout flow" },
      { name: "Purchases", count: finalPurchases, color: "#10b981", label: "Successful payments" }
    ];

    return stages.map((stage, idx) => {
      const prevStage = idx > 0 ? stages[idx - 1] : null;
      const convRate = prevStage && prevStage.count > 0 
        ? ((stage.count / prevStage.count) * 100).toFixed(1) + "%" 
        : "100%";
      const dropRate = prevStage && prevStage.count > 0
        ? (((prevStage.count - stage.count) / prevStage.count) * 100).toFixed(1) + "%"
        : "0.0%";

      return {
        ...stage,
        convRate,
        dropRate
      };
    });
  }, [analyticsEvents, filteredOrders, dateCutoff]);

  // Compute Granular Product-by-Product Telemetry
  const digitalProductsAnalytics = useMemo(() => {
    return products.map(p => {
      const pOrders = filteredOrders.filter(o => o.product_id === p.id);
      const successful = pOrders.filter(o => o.status === "completed");
      const failed = pOrders.filter(o => o.status === "failed");
      
      const salesUnits = successful.length;
      const totalAttempts = pOrders.length;
      const grossRevenue = successful.reduce((sum, o) => sum + Number(o.amount || 0), 0);
      const failureRate = totalAttempts > 0 ? (failed.length / totalAttempts) * 100 : 0;

      // Extract specific views for this product from event logs (strict database values)
      const finalViews = filteredAnalyticsEvents.filter(e => e.product_id === p.id && (e.event_name === "product_view" || e.event_name === "page_view")).length;
      const conversionRate = finalViews > 0 ? (salesUnits / finalViews) * 100 : 0;

      return {
        id: p.id,
        title: p.title,
        price: p.price,
        salesUnits,
        views: finalViews,
        conversionRate,
        failureRate,
        grossRevenue
      };
    });
  }, [products, filteredOrders, filteredAnalyticsEvents]);

  // Compute Granular LMS Course-by-Course Telemetry
  const lmsCoursesAnalytics = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

    return courses.map(c => {
      const cEnrollments = filteredEnrollments.filter(e => e.course_id === c.id);
      const new7d = cEnrollments.filter(e => (now - new Date(e.enrolled_at).getTime()) <= oneWeekMs).length;
      const new30d = cEnrollments.filter(e => (now - new Date(e.enrolled_at).getTime()) <= oneMonthMs).length;

      const cOrders = filteredOrders.filter(o => o.product_id === c.id);
      const completed = cOrders.filter(o => o.status === "completed");
      const grossRevenue = completed.reduce((sum, o) => sum + Number(o.amount || 0), 0);

      const views = filteredAnalyticsEvents.filter(e => e.product_id === c.id && (e.event_name === "product_view" || e.event_name === "page_view")).length;
      const checkoutStarteds = filteredAnalyticsEvents.filter(e => e.product_id === c.id && e.event_name === "checkout_started").length;

      const finalViews = views;
      const finalCheckouts = checkoutStarteds;

      const dropOffs = Math.max(0, finalCheckouts - completed.length);
      const dropOffRate = finalCheckouts > 0 ? (dropOffs / finalCheckouts) * 100 : 0;

      return {
        id: c.id,
        title: c.title,
        price: c.price,
        totalStudents: cEnrollments.length,
        newStudentsWeek: new7d,
        newStudentsMonth: new30d,
        views: finalViews,
        checkoutStarteds: finalCheckouts,
        completedPurchases: completed.length,
        dropOffs,
        dropOffRate,
        grossRevenue
      };
    });
  }, [courses, filteredEnrollments, filteredOrders, filteredAnalyticsEvents]);

  const categoryStats = useMemo(() => {
    const categoriesMap: Record<string, { revenue: number; visits: number; conversion: number }> = {};
    
    // Initialize with all unique categories in courses
    courses.forEach(c => {
      const cat = c.category || "Digital Assets";
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { revenue: 0, visits: 0, conversion: 0 };
      }
    });
    // Add "Digital Assets" if we have products
    if (products.length > 0 && !categoriesMap["Digital Assets"]) {
      categoriesMap["Digital Assets"] = { revenue: 0, visits: 0, conversion: 0 };
    }

    const completed = filteredOrders.filter(o => o.status === "completed");
    completed.forEach(o => {
      const matchedCourse = courses.find(c => c.id === o.product_id);
      const category = matchedCourse?.category || "Digital Assets";
      if (categoriesMap[category]) {
        categoriesMap[category].revenue += Number(o.amount || 0);
      }
    });

    const parsed = Object.entries(categoriesMap).map(([name, data]) => {
      const ordersCount = completed.filter(o => {
        const matchedCourse = courses.find(c => c.id === o.product_id);
        const category = matchedCourse?.category || "Digital Assets";
        return category === name;
      }).length;
      
      // Filter course/product IDs belonging to this category
      const targetIds = new Set<string>();
      if (name === "Digital Assets") {
        products.forEach(p => targetIds.add(p.id));
        courses.forEach(c => {
          if (!c.category) targetIds.add(c.id);
        });
      } else {
        courses.forEach(c => {
          if (c.category === name) targetIds.add(c.id);
        });
      }

      const visits = filteredAnalyticsEvents.filter(e => e.product_id && targetIds.has(e.product_id) && (e.event_name === "product_view" || e.event_name === "page_view")).length;
      const conversion = visits > 0 ? (ordersCount / visits) * 100 : 0;
      return { name, revenue: data.revenue, visits, conversion };
    });

    return parsed.sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, courses, products, filteredAnalyticsEvents]);

  // Alert Center toggles observer event
  useEffect(() => {
    const handleToggle = () => {
      setIsNotificationOpen(prev => !prev);
    };
    window.addEventListener("toggle-admin-notifications", handleToggle);
    return () => window.removeEventListener("toggle-admin-notifications", handleToggle);
  }, []);

  // Global search parameters
  const searchedOrders = useMemo(() => {
    if (!searchTerm) return orders.slice(0, 15);
    return orders.filter(o => 
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.product_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.payment_id?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 15);
  }, [orders, searchTerm]);

  // Diagnostics and Webhook Failures logs
  const diagnosticsLogs = useMemo(() => {
    const failed = orders.filter(o => o.status === "failed");
    const pending = orders.filter(o => o.status === "pending");
    return {
      failed,
      pending
    };
  }, [orders]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  // High-Fidelity Multi-Worksheet Microsoft Excel XML Generator
  const downloadExcelReport = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Sales_Analytics_Report_${dateStr}.xls`;

    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Youssef Mostafa</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="14" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#12121E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#D6004B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
  <Style ss:ID="PercentCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10"/>
   <NumberFormat ss:Format="0.0%"/>
  </Style>
 </Styles>`;

    // SHEET 1: Digital Products
    xml += `
 <Worksheet ss:Name="Digital Products Analytics">
  <Table ss:ExpandedColumnCount="8" ss:ExpandedRowCount="${digitalProductsAnalytics.length + 3}" x:FullColumns="1" x:FullRows="1">
   <Column ss:Width="150"/>
   <Column ss:Width="250"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="150"/>
   <Row ss:Height="30" ss:StyleID="TitleHeader">
    <Cell ss:MergeAcross="7"><Data ss:Type="String">JoeSchool - Store Digital Products Analytics</Data></Cell>
   </Row>
   <Row ss:Height="20" ss:StyleID="ColHeader">
    <Cell><Data ss:Type="String">Product ID</Data></Cell>
    <Cell><Data ss:Type="String">Product Title</Data></Cell>
    <Cell><Data ss:Type="String">Unit Price (EGP)</Data></Cell>
    <Cell><Data ss:Type="String">Units Sold</Data></Cell>
    <Cell><Data ss:Type="String">Page Views</Data></Cell>
    <Cell><Data ss:Type="String">Conversion Rate</Data></Cell>
    <Cell><Data ss:Type="String">Payment Failure Rate</Data></Cell>
    <Cell><Data ss:Type="String">Total Revenue (EGP)</Data></Cell>
   </Row>`;

    digitalProductsAnalytics.forEach(p => {
      xml += `
   <Row ss:Height="18">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${p.id}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${p.title}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${p.price}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${p.salesUnits}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${p.views}</Data></Cell>
    <Cell ss:StyleID="PercentCell"><Data ss:Type="Number">${(p.conversionRate / 100).toFixed(4)}</Data></Cell>
    <Cell ss:StyleID="PercentCell"><Data ss:Type="Number">${(p.failureRate / 100).toFixed(4)}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${p.grossRevenue}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>`;

    // SHEET 2: LMS Courses
    xml += `
 <Worksheet ss:Name="LMS Course Analytics">
  <Table ss:ExpandedColumnCount="12" ss:ExpandedRowCount="${lmsCoursesAnalytics.length + 3}" x:FullColumns="1" x:FullRows="1">
   <Column ss:Width="150"/>
   <Column ss:Width="250"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Column ss:Width="150"/>
   <Row ss:Height="30" ss:StyleID="TitleHeader">
    <Cell ss:MergeAcross="11"><Data ss:Type="String">JoeSchool - LMS Academy &amp; Student Enrollment Logs</Data></Cell>
   </Row>
   <Row ss:Height="20" ss:StyleID="ColHeader">
    <Cell><Data ss:Type="String">Course ID</Data></Cell>
    <Cell><Data ss:Type="String">Course Title</Data></Cell>
    <Cell><Data ss:Type="String">Price (EGP)</Data></Cell>
    <Cell><Data ss:Type="String">Total Students</Data></Cell>
    <Cell><Data ss:Type="String">New (Last 7 Days)</Data></Cell>
    <Cell><Data ss:Type="String">New (Last 30 Days)</Data></Cell>
    <Cell><Data ss:Type="String">Page Views</Data></Cell>
    <Cell><Data ss:Type="String">Checkout Started</Data></Cell>
    <Cell><Data ss:Type="String">Completed Purchases</Data></Cell>
    <Cell><Data ss:Type="String">Abandoned Carts</Data></Cell>
    <Cell><Data ss:Type="String">Drop-off Rate</Data></Cell>
    <Cell><Data ss:Type="String">Total Revenue (EGP)</Data></Cell>
   </Row>`;

    lmsCoursesAnalytics.forEach(c => {
      xml += `
   <Row ss:Height="18">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${c.id}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${c.title}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.price}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.totalStudents}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.newStudentsWeek}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.newStudentsMonth}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.views}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.checkoutStarteds}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.completedPurchases}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.dropOffs}</Data></Cell>
    <Cell ss:StyleID="PercentCell"><Data ss:Type="Number">${(c.dropOffRate / 100).toFixed(4)}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${c.grossRevenue}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    // Trigger instant browser download with appropriate MIME type
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Excel report compiled and downloaded successfully!");
  };

  return (
    <div className="space-y-6 sm:space-y-8 text-zinc-100 min-h-screen pb-24 bg-transparent px-0 font-sans">
      
      {/* Premium Dashboard Filters (top) */}
      <DashboardFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        currency={currency}
        setCurrency={setCurrency}
        country={country}
        setCountry={setCountry}
        theme={theme}
        setTheme={setTheme}
        loading={loading}
        onRefresh={loadData}
        onExport={downloadExcelReport}
        hasCountriesData={Object.keys(topCountriesData.reduce((acc: any, curr) => {
          const cName = curr.name.split(" ").slice(1).join(" ");
          if (cName && cName !== "Unknown") acc[cName] = true;
          return acc;
        }, {}))}
        analyticsMode={analyticsMode}
        setAnalyticsMode={setAnalyticsMode}
        analyticsResetDate={resetDate}
      />

      {/* Desktop view switcher tabs (hidden on mobile) */}
      <div className="hidden lg:block border-b border-white/5">
        <div className="flex gap-4">
          {[
            { id: "overview", label: "Global Overview", icon: BarChart3 },
            { id: "lms", label: "LMS Academy", icon: BookOpen },
            { id: "store", label: "Store Analytics", icon: Package },
            { id: "orders", label: "Order Management", icon: ShoppingCart },
            { id: "live-orders", label: "Live Orders", icon: Flame },
            { id: "diagnostics", label: "Diagnostics & Logs", icon: ShieldAlert }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-bold text-xs transition-all ${
                  isActive 
                    ? "border-rose-500 text-white bg-white/5 rounded-t-xl" 
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-xs text-zinc-500 font-semibold">Retrieving platform analytics...</p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* Tab 1: Global Overview */}
          {activeTab === "overview" && (
            <OverviewSection
              orders={orders}
              stats={stats}
              coursesAnalytics={lmsCoursesAnalytics}
              chartData={revenueChartData}
              currencyData={currencyDistributionData}
              formatPrice={formatPrice}
              dateRange={dateRange}
            />
          )}

          {/* Tab 2: LMS Academy */}
          {activeTab === "lms" && (
            <LmsSection
              orders={orders}
              coursesAnalytics={lmsCoursesAnalytics}
              enrollments={enrollments}
              reviews={reviews}
              analyticsEvents={analyticsEvents}
              formatPrice={formatPrice}
              dateRange={dateRange}
            />
          )}

          {/* Tab 3: Digital Products Store */}
          {activeTab === "store" && (
            <StoreSection
              orders={orders}
              productsAnalytics={digitalProductsAnalytics}
              funnelStages={funnelMetrics}
              categoryStats={categoryStats}
              formatPrice={formatPrice}
              dateRange={dateRange}
            />
          )}

          {/* Tab 4: Order Management */}
          {activeTab === "orders" && (
            <AdminOrders />
          )}

          {/* Tab 5: Live Orders */}
          {activeTab === "live-orders" && (
            <LiveOrdersFeed />
          )}

          {/* Tab 6: Diagnostics Logs */}
          {activeTab === "diagnostics" && (
            <DiagnosticsSection
              seeding={seeding}
              analyticsTableMissing={analyticsTableMissing}
              diagnosticsLogs={diagnosticsLogs}
              handleSeedTelemetry={handleSeedTelemetry}
              formatDate={formatDate}
              formatPrice={formatPrice}
            />
          )}
        </AnimatePresence>
      )}

      {/* Slide-over Notification Center drawer overlay */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={derivedNotifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAll}
        prefs={notificationPrefs}
        onUpdatePref={updateNotificationPref}
      />

      {/* Mobile Sticky Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#07070b]/90 backdrop-blur-md border-t border-white/5 px-4 py-2.5 flex items-center justify-around">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "lms", label: "LMS", icon: BookOpen },
          { id: "store", label: "Store", icon: Package },
          { id: "orders", label: "Orders", icon: ShoppingCart },
          { id: "live-orders", label: "Live", icon: Flame },
          { id: "diagnostics", label: "Logs", icon: ShieldAlert }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 transition-all ${
                isActive ? "text-rose-500 scale-105" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md bg-[#07070b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 relative text-left"
              dir="ltr"
            >
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xs font-bold"
              >
                Close ✕
              </button>

              <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-400 mb-5">Transaction Details</h3>
              
              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/5 text-xs font-semibold text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Customer Name</span>
                    <span className="font-bold text-white">{selectedOrder.customer_name || "Guest"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Email Address</span>
                    <span className="font-bold text-white font-mono">{selectedOrder.customer_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Digital Product</span>
                    <span className="font-bold text-white">{selectedOrder.product_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Amount Paid</span>
                    <span className="font-bold text-rose-500 font-mono">
                      {formatPrice(selectedOrder.amount, (selectedOrder.currency as any) || 'EGP')}
                    </span>
                  </div>
                  {selectedOrder.country && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Billing Country</span>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                        {selectedOrder.country}
                      </span>
                    </div>
                  )}
                  {selectedOrder.payment_method && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Payment Gateway</span>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                        {selectedOrder.payment_method}
                      </span>
                    </div>
                  )}
                  {selectedOrder.coupon_code && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Coupon Code</span>
                      <span className="font-black text-rose-400 font-mono">{selectedOrder.coupon_code}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Database Operations Audit Log</h4>
                  <div className="relative border-l border-white/10 pl-4 ml-1.5 space-y-3">
                    <div className="relative">
                      <div className="absolute left-[-20.5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-[10px] font-bold text-white">Record created in Supabase</p>
                      <p className="text-[8px] text-zinc-500 font-mono font-semibold">{formatDate(selectedOrder.created_at)}</p>
                    </div>

                    <div className="relative">
                      <div className="absolute left-[-20.5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-[10px] font-bold text-white">Paymob Callback webhook received</p>
                      <p className="text-[8px] text-zinc-500 font-mono font-semibold">Digital signature verified &amp; payload validated</p>
                    </div>

                    <div className="relative">
                      <div className={`absolute left-[-20.5px] top-1.5 w-2 h-2 rounded-full ${
                        selectedOrder.status === 'completed' ? 'bg-emerald-500' : selectedOrder.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      <p className="text-[10px] font-bold text-white">Database status transition completed</p>
                      <p className="text-[8px] text-zinc-500 font-mono font-semibold">
                        {selectedOrder.status === 'completed' ? 'Automated delivery & course enrollment completed' : selectedOrder.status === 'failed' ? 'Transaction flagged as failed payment' : 'Awaiting gateway payment confirmation'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
