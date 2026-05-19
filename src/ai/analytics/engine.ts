import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface AnalyticsContext {
  summary: {
    totalRevenue: number;
    netProfit: number;
    totalOrders: number;
    completedOrders: number;
    failedOrders: number;
    pendingOrders: number;
    conversionRate: number;
    averageOrderValue: number;
    totalCustomers: number;
    repeatPurchaseRate: number;
  };
  courses: {
    total: number;
    list: Array<{ id: string; title: string; price: number; status: string; lessons_count: number; category: string }>;
    totalEnrollments: number;
    averageRating: number;
    studentProgressCount: number;
  };
  products: {
    total: number;
    list: Array<{ id: string; title: string; price: number; sales: number; status: string; category: string }>;
    bestSeller: string;
  };
  bundles: {
    total: number;
    list: Array<{ id: string; title: string; price: number; status: string }>;
  };
  marketing: {
    couponsCount: number;
    wishlistCount: number;
    reviewsCount: number;
  };
}

export async function getLiveAnalyticsContext(): Promise<AnalyticsContext> {
  // Safe fetch helper with default fallbacks
  const safeFetch = async (table: string, select = "*", limit = 1000) => {
    try {
      const { data, error } = await supabaseAdmin.from(table).select(select).limit(limit);
      if (error) {
        console.warn(`[AI Engine] Error fetching table '${table}':`, error.message);
        return [];
      }
      return data || [];
    } catch (e: any) {
      console.warn(`[AI Engine] Critical fail fetching '${table}':`, e.message);
      return [];
    }
  };

  // Run all queries concurrently for maximum performance
  const [
    rawOrders,
    rawProducts,
    rawCourses,
    rawEnrollments,
    rawProgress,
    rawReviews,
    rawCoupons,
    rawBundles,
    rawWishlist
  ] = await Promise.all([
    safeFetch("orders", "*", 5000),
    safeFetch("products", "*", 1000),
    safeFetch("courses", "id,title,price,status,lessons_count,category", 1000),
    safeFetch("enrollments", "id,course_id,status", 3000),
    safeFetch("user_course_progress", "id", 10000),
    safeFetch("reviews", "rating", 1000),
    safeFetch("coupons", "id", 500),
    safeFetch("bundles", "id,title,price,status", 500),
    safeFetch("wishlist_items", "id", 2000)
  ]);

  // 1. Calculate orders & revenue metrics
  const totalOrders = rawOrders.length;
  const completedOrdersList = rawOrders.filter((o: any) => o.status === "completed");
  const completedOrders = completedOrdersList.length;
  const failedOrders = rawOrders.filter((o: any) => o.status === "failed").length;
  const pendingOrders = rawOrders.filter((o: any) => o.status === "pending").length;

  const totalRevenue = completedOrdersList.reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);
  const netProfit = totalRevenue * 0.85; // 85% margin
  const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

  // Customers AOV & Repeat purchasers
  const uniqueEmails = new Set(rawOrders.map((o: any) => (o.customer_email || "").toLowerCase().trim()).filter(Boolean));
  const totalCustomers = uniqueEmails.size;

  const customerCounts: { [email: string]: number } = {};
  rawOrders.forEach((o: any) => {
    if (!o.customer_email) return;
    const email = o.customer_email.toLowerCase().trim();
    customerCounts[email] = (customerCounts[email] || 0) + 1;
  });
  const repeatCustomersCount = Object.values(customerCounts).filter((c) => c > 1).length;
  const repeatPurchaseRate = totalCustomers > 0 ? (repeatCustomersCount / totalCustomers) * 100 : 0;

  // 2. Products insights
  const productList = rawProducts.map((p: any) => ({
    id: p.id,
    title: p.title,
    price: Number(p.price || 0),
    sales: Number(p.sales || 0),
    status: p.status || "مسودة",
    category: p.category || ""
  }));

  let bestSeller = "لا يوجد";
  if (productList.length > 0) {
    const sorted = [...productList].sort((a, b) => b.sales - a.sales);
    bestSeller = sorted[0].title;
  }

  // 3. Courses insights
  const courseList = rawCourses.map((c: any) => ({
    id: c.id,
    title: c.title,
    price: Number(c.price || 0),
    status: c.status || "draft",
    lessons_count: Number(c.lessons_count || 0),
    category: c.category || ""
  }));

  const totalReviewsCount = rawReviews.length;
  const averageRating = totalReviewsCount > 0 
    ? rawReviews.reduce((sum: number, r: any) => sum + Number(r.rating || 5), 0) / totalReviewsCount 
    : 5.0;

  return {
    summary: {
      totalRevenue,
      netProfit,
      totalOrders,
      completedOrders,
      failedOrders,
      pendingOrders,
      conversionRate,
      averageOrderValue,
      totalCustomers,
      repeatPurchaseRate
    },
    courses: {
      total: courseList.length,
      list: courseList,
      totalEnrollments: rawEnrollments.length,
      averageRating,
      studentProgressCount: rawProgress.length
    },
    products: {
      total: productList.length,
      list: productList,
      bestSeller
    },
    bundles: {
      total: rawBundles.length,
      list: rawBundles.map((b: any) => ({
        id: b.id,
        title: b.title,
        price: Number(b.price || 0),
        status: b.status
      }))
    },
    marketing: {
      couponsCount: rawCoupons.length,
      wishlistCount: rawWishlist.length,
      reviewsCount: totalReviewsCount
    }
  };
}
