"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, ArrowLeft, BookOpen, ShoppingBag, Loader2, Sliders } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

// Import modular sub-components
import { ReviewSelectorPortal } from "./components/ReviewSelectorPortal";
import { ReviewAnalytics } from "./components/ReviewAnalytics";
import { ReviewFilters, FilterState } from "./components/ReviewFilters";
import { ReviewModerationTable } from "./components/ReviewModerationTable";
import { ReviewEditor } from "./components/ReviewEditor";
import { Review } from "@/app/api/admin/reviews/route";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface DisplayItem {
  id: string;
  title: string;
  category: string;
  type: "course" | "product" | "bundle";
  imageUrl?: string;
}

export default function ReviewsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [combinedItems, setCombinedItems] = useState<DisplayItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Navigation View State
  const [viewMode, setViewMode] = useState<"select" | "all" | "courses" | "products">("select");

  // Step-by-step selections for Course & Product views
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<string>("");
  
  // Search text inside dropdowns
  const [catSearch, setCatSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  
  // Open dropdown toggles
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  // Active moderation view triggers
  const [showActiveReviews, setShowActiveReviews] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    rating: "all",
    type: "all",
    status: "all",
    sort: "recent",
    isFeaturedFilter: false
  });

  // Editor states
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Pagination & Transaction states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const activeTransactions = useRef<Record<string, string>>({});

  const startTransaction = (reviewId: string): string => {
    const txId = Math.random().toString(36).substring(2, 15);
    activeTransactions.current[reviewId] = txId;
    return txId;
  };

  const verifyTransaction = (reviewId: string, txId: string): boolean => {
    return activeTransactions.current[reviewId] === txId;
  };

  const startBulkTransactions = (ids: string[]): string => {
    const txId = Math.random().toString(36).substring(2, 15);
    ids.forEach(id => {
      activeTransactions.current[id] = txId;
    });
    return txId;
  };

  const verifyBulkTransaction = (id: string, txId: string): boolean => {
    return activeTransactions.current[id] === txId;
  };

  // 1. Initial Data Fetch
  useEffect(() => {
    fetchData();
  }, [viewMode]);

  // 2. Parse URL Query Parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get("search") || "";
    const rating = params.get("rating") || "all";
    const type = params.get("type") || "all";
    const status = params.get("status") || "all";
    const sort = params.get("sort") || "recent";
    const isFeaturedFilter = params.get("featured") === "true";
    const pageVal = Number(params.get("page") || "1");
    const limitVal = Number(params.get("limit") || "10");
    
    if (search || rating !== "all" || type !== "all" || status !== "all" || sort !== "recent" || isFeaturedFilter || pageVal > 1 || limitVal !== 10) {
      setFilters({ search, rating, type, status, sort, isFeaturedFilter });
      setCurrentPage(pageVal);
      setItemsPerPage(limitVal);
      setViewMode("all"); // Auto-open all reviews if filters exist
    }
  }, []);

  // Reset page number on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // 3. Synchronize Filters state to URL query parameters with 250ms debounce
  useEffect(() => {
    if (viewMode === "select") return; // No query sync on selection view
    
    const handler = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.rating !== "all") params.set("rating", filters.rating);
      if (filters.type !== "all") params.set("type", filters.type);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.sort !== "recent") params.set("sort", filters.sort);
      if (filters.isFeaturedFilter) params.set("featured", "true");
      if (currentPage > 1) params.set("page", String(currentPage));
      if (itemsPerPage !== 10) params.set("limit", String(itemsPerPage));
      
      const queryStr = params.toString();
      const nextUrl = window.location.pathname + (queryStr ? `?${queryStr}` : "");
      window.history.replaceState(null, "", nextUrl);
    }, 250);

    return () => clearTimeout(handler);
  }, [filters, viewMode, currentPage, itemsPerPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch reviews
      const reviewsRes = await fetch("/api/admin/reviews");
      const reviewsData = await reviewsRes.json();
      if (!reviewsRes.ok) throw new Error(reviewsData.error);
      setReviews(reviewsData);

      // Fetch categories based on active workflow
      if (viewMode === "courses") {
        const { data: courseCats } = await supabase.from("course_categories").select("id, name, slug").order("order_index");
        setCategories(courseCats || []);
      } else if (viewMode === "products") {
        const { data: prodCats, error } = await supabase.from("product_categories").select("id, name, slug").order("order_index");
        if (error || !prodCats || prodCats.length === 0) {
          setCategories([
            { id: "1", name: "AI Content Creation", slug: "ai-content-creation" },
            { id: "2", name: "AI Animation", slug: "ai-animation" },
            { id: "3", name: "Creative Video Production", slug: "creative-video-production" },
            { id: "4", name: "Digital Storytelling", slug: "digital-storytelling" }
          ]);
        } else {
          setCategories(prodCats);
        }
      }

      // Fetch courses, products, bundles
      const [{ data: productsData }, { data: coursesData }, { data: bundlesData }] = await Promise.all([
        supabase.from("products").select("id, title, category, image_url, status").neq("status", "\u0645\u062e\u0641\u064a"),
        supabase.from("courses").select("id, title, category, image_url, status").neq("status", "hidden"),
        supabase.from("bundles").select("id, title, image_url, status").neq("status", "hidden")
      ]);

      const getProductCategory = (p: any) => {
        if (p.category) return p.category;
        const title = (p.title || "").toLowerCase();
        if (title.includes("animation") || title.includes("\u062a\u062d\u0631\u064a\u0643") || title.includes("\u0631\u0633\u0648\u0645")) return "AI Animation";
        if (title.includes("story") || title.includes("\u0642\u0635\u0635") || title.includes("\u0633\u0631\u062f")) return "Digital Storytelling";
        if (title.includes("video") || title.includes("\u0641\u064a\u062f\u064a\u0648") || title.includes("\u0625\u0646\u062a\u0627\u062c")) return "Creative Video Production";
        return "AI Content Creation";
      };

      const mapped: DisplayItem[] = [
        ...(productsData || []).map(p => ({ id: p.id, title: p.title, category: getProductCategory(p), type: "product" as const, imageUrl: p.image_url })),
        ...(coursesData || []).map(c => ({ id: c.id, title: c.title, category: c.category || "", type: "course" as const, imageUrl: c.image_url })),
        ...(bundlesData || []).map(b => ({ id: b.id, title: b.title, category: "\u0627\u0644\u0628\u0627\u0642\u0627\u062a", type: "bundle" as const, imageUrl: b.image_url }))
      ];
      setCombinedItems(mapped);

    } catch (err: any) {
      toast.error("Failed to load reviews and ratings data");
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      rating: "all",
      type: "all",
      status: "all",
      sort: "recent",
      isFeaturedFilter: false
    });
  };

  // ── BACKEND API & OPTIMISTIC UI OPERATIONS ────────────────────────────

  const handleSaveReview = async (reviewData: Partial<Review>) => {
    try {
      const isNew = !reviewData.id;
      const method = isNew ? "POST" : "PUT";
      
      const res = await fetch("/api/admin/reviews", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(isNew ? "Review added successfully 🎉" : "Review updated successfully ✨");
      setIsEditorOpen(false);
      setEditingReview(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save review");
    }
  };

  // Optimistic Single Deletion (Soft-Delete / Archiving or Permanent Delete if already archived)
  const handleDeleteReview = async (id: string, archiveReason?: string) => {
    const target = reviews.find(r => r.id === id);
    if (!target) return;

    const isArchived = target.status === "archived";
    const originalReview = { ...target };
    const txId = startTransaction(id);

    if (isArchived) {
      setReviews(prev => prev.filter(r => r.id !== id));
    } else {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "archived", isHidden: true, archiveReason } : r));
    }

    try {
      const queryParams = new URLSearchParams({ id });
      if (archiveReason) {
        queryParams.set("archiveReason", archiveReason);
      }
      const res = await fetch(`/api/admin/reviews?${queryParams.toString()}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(isArchived ? "Review permanently deleted" : "Review successfully moved to archive");
      fetchData();
    } catch {
      if (verifyTransaction(id, txId)) {
        if (isArchived) {
          setReviews(prev => [...prev, originalReview]);
        } else {
          setReviews(prev => prev.map(r => r.id === id ? originalReview : r));
        }
      }
      toast.error("Failed to execute action. Changes reverted.");
    }
  };

  // Optimistic Single Status Moderation
  const handleStatusChange = async (review: Review, status: "visible" | "hidden" | "pending" | "archived") => {
    const originalReview = { ...review };
    const txId = startTransaction(review.id);

    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status, isHidden: status === "hidden" || status === "archived" } : r));

    try {
      const res = await fetch(`/api/admin/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, status }),
      });
      if (!res.ok) throw new Error();
      
      toast.success(
        status === "visible" 
          ? "Review is now active and visible on the home page" 
          : status === "hidden" 
          ? "Review hidden successfully" 
          : status === "archived"
          ? "Review moved to archive"
          : "Review is now pending moderation"
      );
      fetchData();
    } catch {
      if (verifyTransaction(review.id, txId)) {
        setReviews(prev => prev.map(r => r.id === review.id ? originalReview : r));
      }
      toast.error("Failed to update status. Changes reverted.");
    }
  };

  // Optimistic Bulk Status Moderation
  const handleStatusChangeBulk = async (ids: string[], status: "visible" | "hidden" | "pending" | "archived") => {
    const originalReviews = reviews.filter(r => ids.includes(r.id)).map(r => ({ ...r }));
    const txId = startBulkTransactions(ids);

    setReviews(prev => prev.map(r => ids.includes(r.id) ? { ...r, status, isHidden: status === "hidden" || status === "archived" } : r));

    try {
      let action = "";
      let params = {};
      if (status === "visible") {
        action = "approve";
      } else if (status === "hidden") {
        action = "hide";
      } else if (status === "archived") {
        action = "delete";
      } else {
        action = "status";
        params = { status };
      }

      const res = await fetch(`/api/admin/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, params }),
      });
      if (!res.ok) throw new Error();
      toast.success("Selected reviews updated successfully");
      fetchData();
    } catch {
      setReviews(prev => prev.map(r => {
        if (ids.includes(r.id) && verifyBulkTransaction(r.id, txId)) {
          const original = originalReviews.find(orig => orig.id === r.id);
          return original ? original : r;
        }
        return r;
      }));
      toast.error("Failed to execute bulk action. Changes reverted.");
    }
  };

  // Optimistic Bulk Featured Tagging
  const handleFeatureBulk = async (ids: string[], isFeatured: boolean) => {
    const originalReviews = reviews.filter(r => ids.includes(r.id)).map(r => ({ ...r }));
    const txId = startBulkTransactions(ids);

    setReviews(prev => prev.map(r => ids.includes(r.id) ? { ...r, isFeatured } : r));

    try {
      const res = await fetch(`/api/admin/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: isFeatured ? "mark_featured" : "unfeature" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Bulk feature status updated successfully");
      fetchData();
    } catch {
      setReviews(prev => prev.map(r => {
        if (ids.includes(r.id) && verifyBulkTransaction(r.id, txId)) {
          const original = originalReviews.find(orig => orig.id === r.id);
          return original ? original : r;
        }
        return r;
      }));
      toast.error("Failed to update bulk feature status. Changes reverted.");
    }
  };

  // Optimistic Bulk Deletion (Soft-Delete / Archiving)
  const handleDeleteBulk = async (ids: string[], archiveReason?: string) => {
    const originalReviews = reviews.filter(r => ids.includes(r.id)).map(r => ({ ...r }));
    const txId = startBulkTransactions(ids);

    setReviews(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: "archived", isHidden: true, archiveReason } : r));

    try {
      const res = await fetch(`/api/admin/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "delete", params: { archiveReason } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Selected reviews archived successfully");
      fetchData();
    } catch {
      setReviews(prev => prev.map(r => {
        if (ids.includes(r.id) && verifyBulkTransaction(r.id, txId)) {
          const original = originalReviews.find(orig => orig.id === r.id);
          return original ? original : r;
        }
        return r;
      }));
      toast.error("Failed to archive reviews. Changes reverted.");
    }
  };

  // Helper product names dictionary
  const getProductNamesMap = () => {
    const map: Record<string, string> = {};
    combinedItems.forEach(item => {
      const prefix = item.type === "course" ? "🎓 Course" : item.type === "product" ? "🛍️ Product" : "📦 Bundle";
      map[item.id] = `${prefix} - ${item.title}`;
    });
    return map;
  };

  const getProductName = (id: string) => {
    const item = combinedItems.find(p => p.id === id);
    return item ? item.title : "Unknown Item";
  };

  // ── FILTERING & SORTING LOGIC ─────────────────────────────────────────

  const getFilteredReviews = () => {
    let list = [...reviews];

    // 1. Workflow Specific Filter (if Course or Product mode selected)
    if (viewMode === "courses" && showActiveReviews) {
      list = list.filter(r => r.productId === selectedItem);
    } else if (viewMode === "products" && showActiveReviews) {
      list = list.filter(r => r.productId === selectedItem);
    } else if (viewMode !== "all") {
      return [];
    }

    // 2. Archive Filter: Exclude archived reviews from all views by default unless explicitly chosen
    if (filters.status !== "archived") {
      list = list.filter(r => r.status !== "archived");
    }

    // 3. Search Box Filter
    if (filters.search.trim() !== "") {
      const searchLower = filters.search.toLowerCase();
      list = list.filter(r => {
        const studentName = `${r.firstName} ${r.lastName || ""}`.toLowerCase();
        const itemName = getProductName(r.productId).toLowerCase();
        const bodyText = (r.text || "").toLowerCase();
        return studentName.includes(searchLower) || itemName.includes(searchLower) || bodyText.includes(searchLower);
      });
    }

    // 4. Type Filter
    if (filters.type !== "all") {
      list = list.filter(r => {
        const item = combinedItems.find(p => p.id === r.productId);
        return item?.type === filters.type;
      });
    }

    // 5. Status Filter
    if (filters.status !== "all") {
      list = list.filter(r => r.status === filters.status);
    }

    // 6. Featured Filter
    if (filters.isFeaturedFilter) {
      list = list.filter(r => r.isFeatured);
    }

    // 7. Rating Filter
    if (filters.rating !== "all") {
      if (filters.rating === "high") {
        list = list.filter(r => r.rating >= 4);
      } else if (filters.rating === "low") {
        list = list.filter(r => r.rating < 3);
      } else {
        const ratingVal = parseFloat(filters.rating);
        list = list.filter(r => r.rating >= ratingVal);
      }
    }

    // 8. Sorting
    list.sort((a, b) => {
      if (filters.sort === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filters.sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (filters.sort === "highest") {
        return b.rating - a.rating;
      }
      if (filters.sort === "lowest") {
        return a.rating - b.rating;
      }
      return 0;
    });

    return list;
  };

  const filteredReviews = getFilteredReviews();

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReviews = filteredReviews.slice(startIndex, startIndex + itemsPerPage);

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  
  const getFilteredItems = () => {
    if (!selectedCat) return [];
    const itemType = viewMode === "courses" ? "course" : "product";
    return combinedItems.filter(item => 
      item.type === itemType && 
      item.category === selectedCat && 
      item.title.toLowerCase().includes(itemSearch.toLowerCase())
    );
  };
  const filteredItemList = getFilteredItems();

  const handleOpenAdd = () => {
    setEditingReview(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (review: Review) => {
    setEditingReview(review);
    setIsEditorOpen(true);
  };

  const handleBackToSelect = () => {
    setViewMode("select");
    setSelectedCat("");
    setSelectedItem("");
    setCatSearch("");
    setItemSearch("");
    setShowActiveReviews(false);
    handleResetFilters();
    // Clear URL parameters
    window.history.replaceState(null, "", window.location.pathname);
  };

  const getEditorProductsList = () => {
    return combinedItems.map(item => ({
      id: item.id,
      title: `${item.type === "course" ? "🎓 Course" : item.type === "product" ? "🛍️ Product" : "📦 Bundle"} - ${item.title}`,
      type: item.type
    }));
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-12 h-12 text-[#D6004B] animate-spin" />
        <span className="text-zinc-500 font-bold text-xs font-sans">Loading reviews management dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-2 md:p-6 font-sans" dir="ltr">
      
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2">
            {viewMode !== "select" && (
              <button
                onClick={handleBackToSelect}
                className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer font-sans text-xs flex items-center gap-1 mr-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            <h1 className="text-xl md:text-3xl font-black text-white font-sans leading-none">
              {viewMode === "select" 
                ? "Manage Customer Reviews" 
                : viewMode === "all" 
                ? "All Reviews & Feedback"
                : viewMode === "courses" 
                ? "Course Reviews" 
                : "Digital Product Reviews"}
            </h1>
          </div>
          <p className="text-zinc-500 text-xs mt-2 font-sans">
            {viewMode === "select"
              ? "Manage and moderate customer reviews displayed across the website to boost conversion rates and social proof."
              : `Browse, filter, and moderate reviews in the ${viewMode === "all" ? "entire platform" : viewMode === "courses" ? "courses" : "digital products"} section.`}
          </p>
        </div>

        {viewMode !== "select" && (
          <button
            onClick={handleOpenAdd}
            className="h-11 px-6 bg-[#D6004B] hover:bg-[#ff0059] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-[0_8px_20px_rgba(214,0,75,0.2)] cursor-pointer font-sans shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Manual Review</span>
          </button>
        )}
      </div>

      {/* 2. Main Portal Selection (Default Landing View) */}
      {viewMode === "select" && (
        <ReviewSelectorPortal onSelect={(mode) => setViewMode(mode)} />
      )}

      {/* 3. Multi-Step Filtering Layout */}
      {(viewMode === "courses" || viewMode === "products") && !showActiveReviews && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto bg-[#09090e]/60 border border-white/5 rounded-3xl p-8 backdrop-blur-xl space-y-6 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#D6004B]/5 rounded-full blur-2xl pointer-events-none" />
          
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4 font-sans">
            {viewMode === "courses" ? <BookOpen className="w-5 h-5 text-rose-500" /> : <ShoppingBag className="w-5 h-5 text-emerald-500" />}
            <span>{viewMode === "courses" ? "Filter Academy Courses" : "Filter Store Products"}</span>
          </h3>

          <div className="space-y-5">
            {/* STEP 1: Searchable Dropdown Category */}
            <div className="flex flex-col gap-2 relative">
              <label className="text-xs text-zinc-300 font-bold font-sans">Step 1: Select Category</label>
              
              <div 
                onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs flex items-center justify-between cursor-pointer focus:border-rose-500/50 hover:bg-white/[0.07] transition-all font-sans"
              >
                <span>{selectedCat || "Search and select category..."}</span>
                <Sliders className="w-4 h-4 text-zinc-500" />
              </div>

              {catDropdownOpen && (
                <div className="absolute top-[105%] left-0 right-0 bg-[#09090e] border border-white/10 rounded-xl p-3 z-30 shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs outline-none focus:border-rose-500/40 font-sans"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                    {filteredCategories.length === 0 ? (
                      <span className="text-[10px] text-zinc-600 block text-center py-3 font-sans">No matching categories</span>
                    ) : (
                      filteredCategories.map(cat => (
                        <div
                          key={cat.id}
                          onClick={() => {
                            setSelectedCat(cat.name);
                            setSelectedItem("");
                            setCatDropdownOpen(false);
                            setCatSearch("");
                          }}
                          className={`p-2.5 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors ${
                            selectedCat === cat.name ? "bg-[#D6004B]/10 text-rose-500" : "hover:bg-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {cat.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: Searchable Dropdown Product / Course */}
            <div className="flex flex-col gap-2 relative">
              <label className="text-xs text-zinc-300 font-bold font-sans">
                Step 2: Select {viewMode === "courses" ? "Course" : "Product"}
              </label>

              <div 
                onClick={() => selectedCat && setItemDropdownOpen(!itemDropdownOpen)}
                className={`w-full h-11 px-4 rounded-xl border text-xs flex items-center justify-between transition-all font-sans ${
                  selectedCat 
                    ? "bg-white/5 border-white/10 text-zinc-300 cursor-pointer hover:bg-white/[0.07]" 
                    : "bg-white/[0.01] border-white/5 text-zinc-600 cursor-not-allowed"
                }`}
              >
                <span>
                  {selectedItem 
                    ? combinedItems.find(i => i.id === selectedItem)?.title 
                    : selectedCat 
                    ? `Search and select ${viewMode === "courses" ? "course" : "product"}...` 
                    : `Please select a category first`}
                </span>
                <Sliders className="w-4 h-4 text-zinc-500" />
              </div>

              {itemDropdownOpen && selectedCat && (
                <div className="absolute top-[105%] left-0 right-0 bg-[#09090e] border border-white/10 rounded-xl p-3 z-30 shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    type="text"
                    placeholder={`Search ${viewMode === "courses" ? "course" : "product"}...`}
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs outline-none focus:border-rose-500/40 font-sans"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                    {filteredItemList.length === 0 ? (
                      <span className="text-[10px] text-zinc-600 block text-center py-3 font-sans">No matching items</span>
                    ) : (
                      filteredItemList.map(item => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedItem(item.id);
                            setItemDropdownOpen(false);
                            setItemSearch("");
                          }}
                          className={`p-2.5 rounded-lg text-xs font-bold font-sans cursor-pointer transition-colors ${
                            selectedItem === item.id ? "bg-[#D6004B]/10 text-rose-500" : "hover:bg-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {item.title}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: Show Reviews Now Button */}
            <button
              onClick={() => setShowActiveReviews(true)}
              disabled={!selectedCat || !selectedItem}
              className="w-full py-3.5 bg-[#D6004B] hover:bg-[#ff0059] text-white rounded-xl text-xs font-bold font-sans transition-all disabled:opacity-20 disabled:cursor-not-allowed active:scale-[0.98] shrink-0"
            >
              Show Reviews Now
            </button>
          </div>
        </motion.div>
      )}

      {/* 4. Active Moderation Panel View */}
      {(viewMode === "all" || showActiveReviews) && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Header Title inside specific workflows */}
          {showActiveReviews && (
            <div className="bg-[#09090e]/60 border border-rose-500/10 p-5 rounded-2xl flex items-center justify-between gap-4 font-sans">
              <div className="flex items-center gap-2">
                <span className="text-rose-500">📌</span>
                <span className="text-zinc-300 font-bold">Filtered Reviews for:</span>
                <span className="text-white font-black font-sans">{getProductName(selectedItem)}</span>
              </div>
              <button
                onClick={() => {
                  setShowActiveReviews(false);
                  setSelectedItem("");
                }}
                className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 transition-all font-bold cursor-pointer"
              >
                Change Course/Product
              </button>
            </div>
          )}

          {/* Analytics counters and distribution graphs + aggregations */}
          <ReviewAnalytics reviews={filteredReviews} items={combinedItems} />

          {/* Filters & saved presets */}
          <ReviewFilters 
            filters={filters} 
            onChange={(f) => setFilters(f)} 
            onReset={handleResetFilters} 
          />

          {/* Professional Moderation Table */}
          <ReviewModerationTable
            reviews={paginatedReviews}
            allReviewsCount={reviews.length}
            productNames={getProductNamesMap()}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteReview}
            onDeleteBulk={handleDeleteBulk}
            onStatusChange={handleStatusChange}
            onStatusChangeBulk={handleStatusChangeBulk}
            onFeatureBulk={handleFeatureBulk}
            serverSide={true}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredReviews.length}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}

      {/* 5. Create / Edit Editor Drawer */}
      {isEditorOpen && (
        <ReviewEditor
          review={editingReview}
          products={getEditorProductsList()}
          onSave={handleSaveReview}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingReview(null);
          }}
        />
      )}

    </div>
  );
}
