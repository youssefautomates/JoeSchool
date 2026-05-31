"use client";
 
import { useState, useEffect, Suspense } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { getCoursesList, type LmsCourse } from "@/lib/coursesDb";
import { 
  Plus, Trash2, Edit2, Loader2, Save, X, AlignLeft, 
  ChevronDown, ChevronUp, BookOpen, ExternalLink, Layers,
  ArrowLeftRight, AlertCircle, Eye, EyeOff, LayoutGrid,
  ShoppingBag, Sparkles, DollarSign, Tag
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
 
interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  order_index: number;
}
 
interface DigitalProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  original_price?: number;
  status: string; // "نشط" | "مسودة" | "مخفي" -> "active" | "draft" | "hidden"
  image_url?: string;
  category?: string;
  sales?: number;
  level?: string;
}
 
function CourseCategoriesAdminPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "products" ? "products" : "courses";

  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dashboard Level Switcher: Courses vs Digital Products
  const [viewTab, setViewTab] = useState<"courses" | "products">(initialTab);
 
  // Expanded Categories State
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
   
  // Action Modals & Forms State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CourseCategory>>({});
  const [isSaving, setIsSaving] = useState(false);
 
  // Quick Action Switch Category State
  const [switchingCourseId, setSwitchingCourseId] = useState<string | null>(null);
  const [switchingProductId, setSwitchingProductId] = useState<string | null>(null);
 
  const fetchCategoriesData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch categories based on viewTab
      const activeTable = viewTab === "courses" ? "course_categories" : "product_categories";
      const { data: catData, error: catError } = await supabaseClient
        .from(activeTable)
        .select("*")
        .order("order_index", { ascending: true });
 
      if (catError) {
        if (activeTable === "product_categories") {
          console.warn("product_categories table not found. Using static categories fallback.");
          setCategories([
            { id: "1", name: "AI Content Creation", slug: "ai-content-creation", order_index: 1 },
            { id: "2", name: "AI Animation", slug: "ai-animation", order_index: 2 },
            { id: "3", name: "Creative Video Production", slug: "creative-video-production", order_index: 3 },
            { id: "4", name: "Digital Storytelling", slug: "digital-storytelling", order_index: 4 }
          ]);
        } else {
          throw catError;
        }
      } else {
        setCategories(catData || []);
      }
 
      // 2. Fetch courses
      const courseList = await getCoursesList();
      setCourses(courseList || []);
 
      // 3. Fetch digital products
      const { data: prodData, error: prodError } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!prodError && prodData) {
        setProducts(prodData as DigitalProduct[]);
      }
    } catch (error: any) {
      console.error(error);
      toast.error("An error occurred while fetching categories and products");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCategoriesData();
  }, [viewTab]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "products" || tab === "courses") {
      setViewTab(tab);
    }
  }, [searchParams]);
 
  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };
 
  const getProductCategory = (prod: DigitalProduct) => {
    const categoryField = prod.category || "";
    
    // 1. If it matches a category in the categories state
    if (categories.some(c => c.name === categoryField)) {
      return categoryField;
    }
    
    // 2. Fallback heuristic rules (sync with storefront homepage)
    const title = (prod.title || "").toLowerCase();
    
    if (title.includes("animation") || title.includes("تحريك") || title.includes("رسوم") || categoryField.includes("animation") || categoryField.includes("رسوم")) {
      return "AI Animation";
    }
    if (title.includes("story") || title.includes("قصص") || title.includes("سرد") || categoryField.includes("storytelling") || categoryField.includes("قصص")) {
      return "Digital Storytelling";
    }
    if (title.includes("video") || title.includes("فيديو") || title.includes("إنتاج") || categoryField.includes("video") || categoryField.includes("إنتاج")) {
      return "Creative Video Production";
    }
    
    return "AI Content Creation"; // Default fallback
  };
 
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editForm.name || !editForm.slug) {
      toast.error("Please enter the category name and its unique Slug identifier");
      return;
    }
 
    setIsSaving(true);
    const activeTable = viewTab === "courses" ? "course_categories" : "product_categories";
    const contextName = viewTab === "courses" ? "Courses" : "Digital Products";
    try {
      if (isEditing === "new") {
        const { error } = await supabaseClient.from(activeTable).insert([{
          name: editForm.name,
          slug: editForm.slug,
          order_index: editForm.order_index || categories.length + 1
        }]);
        
        if (error) throw error;
        toast.success(`New ${contextName} category successfully added! 🎉`);
      } else {
        const { error } = await supabaseClient.from(activeTable).update({
          name: editForm.name,
          slug: editForm.slug,
          order_index: editForm.order_index
        }).eq("id", isEditing);
 
        if (error) throw error;
        toast.success(`Category details updated successfully! ✨`);
      }
      setIsEditing(null);
      await fetchCategoriesData();
    } catch (err: any) {
      toast.error(err.message || "Error saving category. Please ensure the Slug is not duplicated");
    } finally {
      setIsSaving(false);
    }
  };
 
  const handleDelete = async (id: string, catName: string) => {
    const catCourses = courses.filter(c => c.category === catName);
    const catProducts = products.filter(p => p.category === catName || getProductCategory(p) === catName);
    
    if (viewTab === "courses" && catCourses.length > 0) {
      toast.error(`Cannot delete category! It contains ${catCourses.length} active courses. Please reassign them first.`);
      return;
    }
    if (viewTab === "products" && catProducts.length > 0) {
      toast.error(`Cannot delete category! It contains ${catProducts.length} active products. Please reassign them first.`);
      return;
    }
 
    if (!window.confirm("Are you sure you want to permanently delete this category? This action cannot be undone.")) return;
    
    const activeTable = viewTab === "courses" ? "course_categories" : "product_categories";
    try {
      const { error } = await supabaseClient.from(activeTable).delete().eq("id", id);
      if (error) throw error;
      toast.success("Category deleted successfully");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("An error occurred while deleting the category");
    }
  };
 
  // Quick Action: Switch a Course's Category instantly
  const handleQuickSwitchCategory = async (courseId: string, newCategoryName: string) => {
    setSwitchingCourseId(courseId);
    try {
      const { error } = await supabaseClient
        .from("courses")
        .update({ category: newCategoryName })
        .eq("id", courseId);
 
      if (error) throw error;
      
      toast.success("Course category reassigned and moved successfully! 📦");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("Failed to reclassify course");
    } finally {
      setSwitchingCourseId(null);
    }
  };
 
  // Quick Action: Switch a Product's Category instantly
  const handleQuickSwitchProductCategory = async (productId: string, newCategoryName: string) => {
    setSwitchingProductId(productId);
    try {
      const { error } = await supabaseClient
        .from("products")
        .update({ category: newCategoryName })
        .eq("id", productId);
 
      if (error) throw error;
      
      toast.success("Product category reassigned and moved successfully! 📦");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("Failed to reclassify digital product");
    } finally {
      setSwitchingProductId(null);
    }
  };
 
  // Quick Action: Toggle course status
  const handleToggleCourseStatus = async (courseId: string, currentStatus: "draft" | "published" | "hidden") => {
    const nextStatus = currentStatus === "published" ? "draft" : "published";
    try {
      const { error } = await supabaseClient
        .from("courses")
        .update({ status: nextStatus })
        .eq("id", courseId);
 
      if (error) throw error;
      toast.success(nextStatus === "published" ? "Course is now active and published to students! 🟢" : "Course successfully reverted to Draft mode 🟡");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("Failed to change course status");
    }
  };
 
  // Quick Action: Toggle product status
  const handleToggleProductStatus = async (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "نشط" || currentStatus === "active" ? "مسودة" : "نشط";
    try {
      const { error } = await supabaseClient
        .from("products")
        .update({ status: nextStatus })
        .eq("id", productId);
 
      if (error) throw error;
      toast.success(nextStatus === "نشط" ? "Product activated for sale in the storefront! 🟢" : "Product successfully set to Draft mode 🟡");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("Failed to change product status");
    }
  };
 
  const startAddNew = () => {
    setEditForm({ name: "", slug: "", order_index: categories.length + 1 });
    setIsEditing("new");
  };
 
  const startEdit = (cat: CourseCategory) => {
    setEditForm(cat);
    setIsEditing(cat.id);
  };
 
  const generateSlug = (name: string) => {
    return name.trim().toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]/g, "");
  };
 
  return (
    <div className="space-y-8 font-sans text-left p-4 md:p-8" dir="ltr">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white">
            {viewTab === "products" ? "Digital Product Categories" : "LMS Course Categories"}
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            {viewTab === "products" 
              ? "Full control and grouping of digital products within your store. Explore contents and manage assignments."
              : "Complete control of academic course categories and paths inside the academy. Keep your curriculum organized."}
          </p>
        </div>
        
        <button 
          onClick={startAddNew}
          className="flex items-center gap-2 bg-[#D6004B] hover:bg-[#ff0059] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-[0_8px_20px_rgba(214,0,75,0.2)] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>
 
      {/* 3. Main content block */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-[#D6004B] animate-spin" />
          <span className="text-zinc-500 font-bold text-xs">Loading platform categories and assets...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-16 text-center space-y-4 shadow-xl">
          <Layers className="w-14 h-14 text-zinc-700 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-bold text-white text-base">No categories registered yet</h4>
            <p className="text-zinc-500 text-xs font-sans">Start by adding your first academic track or store category.</p>
          </div>
          <button 
            onClick={startAddNew}
            className="px-5 py-2 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xs cursor-pointer"
          >
            Add New Category
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catCourses = courses.filter(c => c.category === cat.name);
            const catProducts = products.filter(p => {
              const assignedCategory = p.category || getProductCategory(p);
              return assignedCategory === cat.name;
            });
            const isExpanded = !!expandedCategories[cat.id];
 
            const countText = viewTab === "courses" 
              ? `${catCourses.length} Courses Registered`
              : `${catProducts.length} Digital Products`;
 
            return (
              <div 
                key={cat.id}
                className={cn(
                  "bg-[#0a0a0f] border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl",
                  isExpanded ? "border-[#D6004B]/30 shadow-[#D6004B]/5" : "border-white/5 hover:border-white/10"
                )}
              >
                {/* Accordion Row Header */}
                <div 
                  onClick={() => toggleCategoryExpand(cat.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none bg-white/[0.01] hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Index Indicator */}
                    <span className="font-mono font-black text-[#D6004B] text-[13px] bg-[#D6004B]/10 border border-[#D6004B]/20 w-8 h-8 rounded-lg flex items-center justify-center">
                      #{cat.order_index}
                    </span>
                    
                    {/* Category Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm sm:text-base">{cat.name}</h3>
                        <span className="text-[10px] text-zinc-500 font-mono">({cat.slug})</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 font-bold">
                        <span className="flex items-center gap-1">
                          {viewTab === "courses" ? <BookOpen className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                          <span>{countText}</span>
                        </span>
                        <span>•</span>
                        <span>Dashboard Index: {cat.order_index}</span>
                      </div>
                    </div>
                  </div>
 
                  {/* Actions Column */}
                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    {/* Expand/Collapse Toggle */}
                    <button 
                      onClick={() => toggleCategoryExpand(cat.id)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title={isExpanded ? "Collapse" : "Expand Details"}
                    >
                      {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                    </button>
 
                    {/* Edit button */}
                    <button 
                      onClick={() => startEdit(cat)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 border border-white/5 transition-all cursor-pointer"
                      title="Edit Category Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
 
                    {/* Delete button */}
                    <button 
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/5 transition-all cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
 
                {/* Collapsible Nested Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-white/5 bg-black/40"
                    >
                      <div className="p-6 space-y-4">
                        
                        {/* Tab-Specific Content rendering */}
                        {viewTab === "courses" ? (
                          <>
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <h4 className="font-bold text-zinc-400 text-xs flex items-center gap-1.5">
                                <LayoutGrid className="w-4 h-4 text-[#D6004B]" />
                                <span>Academic Courses inside ({cat.name}):</span>
                              </h4>
                            </div>
 
                            {catCourses.length === 0 ? (
                              <div className="py-10 text-center space-y-3 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                                <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                                <p className="text-zinc-500 text-xs font-bold font-sans">No courses assigned to this category currently.</p>
                                <a 
                                  href="/admin/courses" 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D6004B]/10 hover:bg-[#D6004B] text-[#D6004B] hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                >
                                  <span>+ Add New Course</span>
                                </a>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {catCourses.map((course) => (
                                  <div 
                                    key={course.id}
                                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between gap-4 text-xs font-bold text-zinc-300"
                                  >
                                    <div className="flex items-center gap-3">
                                      {course.image_url ? (
                                        <img 
                                          src={course.image_url} 
                                          alt={course.title} 
                                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 shrink-0">
                                          <BookOpen className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-white text-[13px] font-bold line-clamp-1">{course.title}</span>
                                        <div className="flex items-center gap-2.5 mt-1 text-[10px] text-zinc-500 font-bold">
                                          <span className="font-mono text-rose-400 font-black">{course.price === 0 ? "Free" : `$${course.price}`}</span>
                                          <span>•</span>
                                          <span>Level: {course.level || "Unspecified"}</span>
                                        </div>
                                      </div>
                                    </div>
 
                                    {/* Quick Course Controls */}
                                    <div className="flex items-center gap-3 shrink-0">
                                      
                                      {/* Quick Switch Category Selector */}
                                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl hover:border-white/20 transition-all">
                                        <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                        <select
                                          value={course.category}
                                          disabled={switchingCourseId === course.id}
                                          onChange={(e) => handleQuickSwitchCategory(course.id, e.target.value)}
                                          className="bg-transparent border-none text-[10px] text-zinc-300 focus:outline-none cursor-pointer font-bold font-sans"
                                        >
                                          {categories.map((c) => (
                                            <option key={c.id} value={c.name} className="bg-[#0f0f15] text-zinc-300 font-bold">
                                              Move to: {c.name}
                                            </option>
                                          ))}
                                        </select>
                                        {switchingCourseId === course.id && (
                                          <Loader2 className="w-3 h-3 text-rose-500 animate-spin shrink-0" />
                                        )}
                                      </div>
 
                                      {/* Status Toggle Button */}
                                      <button
                                        onClick={() => handleToggleCourseStatus(course.id, course.status || "draft")}
                                        className={cn(
                                          "h-8 px-2.5 rounded-xl border font-bold text-[10px] flex items-center gap-1.5 cursor-pointer transition-all",
                                          course.status === "published"
                                            ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/30"
                                            : "bg-amber-950/40 border-amber-500/20 text-amber-400 hover:bg-amber-900/30"
                                        )}
                                        title={course.status === "published" ? "Disable Course" : "Publish Course"}
                                      >
                                        {course.status === "published" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        <span>{course.status === "published" ? "Active" : "Draft"}</span>
                                      </button>
 
                                      {/* Edit full details button */}
                                      <a
                                        href={`/admin/courses?edit=${course.id}`}
                                        className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                                        title="Edit curriculum & details"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
 
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Products Rendering Panel */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <h4 className="font-bold text-zinc-400 text-xs flex items-center gap-1.5">
                                <LayoutGrid className="w-4 h-4 text-[#D6004B]" />
                                <span>Digital Products in Category ({cat.name}):</span>
                              </h4>
                            </div>
 
                            {catProducts.length === 0 ? (
                              <div className="py-10 text-center space-y-3 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                                <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                                <p className="text-zinc-500 text-xs font-bold font-sans">No digital products assigned to this category currently.</p>
                                <a 
                                  href="/admin/products" 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D6004B]/10 hover:bg-[#D6004B] text-[#D6004B] hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                >
                                  <span>+ Add New Product</span>
                                </a>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {catProducts.map((prod) => (
                                  <div 
                                    key={prod.id}
                                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between gap-4 text-xs font-bold text-zinc-300"
                                  >
                                    <div className="flex items-center gap-3">
                                      {prod.image_url ? (
                                        <img 
                                          src={prod.image_url} 
                                          alt={prod.title} 
                                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 shrink-0">
                                          <ShoppingBag className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-white text-[13px] font-bold line-clamp-1">{prod.title}</span>
                                        <div className="flex items-center gap-2.5 mt-1 text-[10px] text-zinc-500 font-bold">
                                          <span className="font-mono text-emerald-400 font-black">{prod.price === 0 ? "Free" : `$${prod.price}`}</span>
                                          <span>•</span>
                                          <span className="text-zinc-400 flex items-center gap-0.5">
                                            <span>Sales:</span>
                                            <span className="text-white font-mono">{prod.sales || 0}</span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>
 
                                    {/* Quick Product Controls */}
                                    <div className="flex items-center gap-3 shrink-0">
                                      
                                      {/* Quick Switch Category Selector */}
                                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl hover:border-white/20 transition-all">
                                        <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                        <select
                                          value={prod.category || getProductCategory(prod) || ""}
                                          disabled={switchingProductId === prod.id}
                                          onChange={(e) => handleQuickSwitchProductCategory(prod.id, e.target.value)}
                                          className="bg-transparent border-none text-[10px] text-zinc-300 focus:outline-none cursor-pointer font-bold font-sans"
                                        >
                                          {categories.map((c) => (
                                            <option key={c.id} value={c.name} className="bg-[#0f0f15] text-zinc-300 font-bold">
                                              Move to: {c.name}
                                            </option>
                                          ))}
                                        </select>
                                        {switchingProductId === prod.id && (
                                          <Loader2 className="w-3 h-3 text-rose-500 animate-spin shrink-0" />
                                        )}
                                      </div>
 
                                      {/* Product Status Toggle */}
                                      <button
                                        onClick={() => handleToggleProductStatus(prod.id, prod.status || "draft")}
                                        className={cn(
                                          "h-8 px-2.5 rounded-xl border font-bold text-[10px] flex items-center gap-1.5 cursor-pointer transition-all",
                                          prod.status === "نشط" || prod.status === "active"
                                            ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/30"
                                            : "bg-amber-950/40 border-amber-500/20 text-amber-400 hover:bg-amber-900/30"
                                        )}
                                        title={prod.status === "نشط" || prod.status === "active" ? "Deactivate Product" : "Activate Product"}
                                      >
                                        {prod.status === "نشط" || prod.status === "active" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        <span>{prod.status === "نشط" || prod.status === "active" ? "Active" : "Draft"}</span>
                                      </button>
 
                                      {/* Edit full details button */}
                                      <a
                                        href={`/admin/products`}
                                        className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                                        title="Edit product details & prices"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
 
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
 
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
 
      {/* ── ADD/EDIT CATEGORY MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-left"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsEditing(null)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
 
              {/* Title */}
              <div>
                <h3 className="font-bold text-white text-base">
                  {viewTab === "courses" ? (
                    isEditing === "new" ? "Add New Academic Track" : "Edit Academic Category Details"
                  ) : (
                    isEditing === "new" ? "Add New Product Category" : "Edit Product Category Details"
                  )}
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  {viewTab === "courses" 
                    ? "Specify the category name, its unique storefront URL Slug, and display ordering sequence."
                    : "Define the category name and Slug used for sorting and displaying digital products."}
                </p>
              </div>
 
              {/* Form fields */}
              <form onSubmit={handleSave} className="space-y-4">
                
                {/* 1. Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">
                    {viewTab === "courses" ? "Course Category Name" : "Product Category Name"}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder={viewTab === "courses" ? "e.g., Artificial Intelligence" : "e.g., Automation Tools"}
                    value={editForm.name || ""}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setEditForm({
                        ...editForm,
                        name: nextName,
                        slug: isEditing === "new" ? generateSlug(nextName) : editForm.slug
                      });
                    }}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-[#D6004B] transition-all font-sans text-zinc-300 w-full"
                  />
                </div>
 
                {/* 2. Slug */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">URL Identifier (Slug)</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., ai-courses"
                    value={editForm.slug || ""}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-[#D6004B] transition-all font-mono text-zinc-300 w-full"
                  />
                </div>
 
                {/* 3. Order index */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">Display Priority Order Index</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={editForm.order_index || ""}
                    onChange={(e) => setEditForm({ ...editForm, order_index: Number(e.target.value) })}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-[#D6004B] transition-all font-mono text-zinc-300 w-full text-center"
                  />
                </div>
 
                {/* Action CTA Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(null)}
                    className="h-10 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
 
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-10 px-6 bg-[#D6004B] hover:bg-[#ff0059] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
 
              </form>
 
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
    </div>
  );
}
 
export default function CourseCategoriesAdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
        <Loader2 className="w-10 h-10 text-[#D6004B] animate-spin" />
        <span className="text-zinc-500 font-bold text-xs mt-4">Loading dashboard control panel...</span>
      </div>
    }>
      <CourseCategoriesAdminPageContent />
    </Suspense>
  );
}
