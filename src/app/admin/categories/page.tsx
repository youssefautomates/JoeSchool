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
  status: string; // "نشط" | "مسودة" | "مخفي"
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
            { id: "1", name: "الأتمتة", slug: "automation", order_index: 1 },
            { id: "2", name: "الذكاء الاصطناعي", slug: "artificial-intelligence", order_index: 2 },
            { id: "3", name: "صناعة المحتوى", slug: "content-creation", order_index: 3 }
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
      toast.error("حدث خطأ أثناء جلب تصنيفات الأكاديمية والمنتجات");
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
    
    if (title.includes("n8n") || title.includes("أتمتة") || categoryField.includes("أتمتة") || categoryField.includes("automation")) {
      return "الأتمتة";
    }
    if (title.includes("ai") || title.includes("ذكاء") || categoryField.includes("ذكاء") || categoryField.includes("ai")) {
      return "الذكاء الاصطناعي";
    }
    if (title.includes("content") || title.includes("صناعة") || categoryField.includes("صناعة") || categoryField.includes("content")) {
      return "صناعة المحتوى";
    }
    
    return "الأتمتة"; // Default fallback
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editForm.name || !editForm.slug) {
      toast.error("يرجى إدخال اسم القسم والـ Slug المعرّف له");
      return;
    }

    setIsSaving(true);
    const activeTable = viewTab === "courses" ? "course_categories" : "product_categories";
    const contextName = viewTab === "courses" ? "الكورسات" : "المنتجات الرقمية";
    try {
      if (isEditing === "new") {
        const { error } = await supabaseClient.from(activeTable).insert([{
          name: editForm.name,
          slug: editForm.slug,
          order_index: editForm.order_index || categories.length + 1
        }]);
        
        if (error) throw error;
        toast.success(`تم إضافة قسم ${contextName} الجديد بنجاح! 🎉`);
      } else {
        const { error } = await supabaseClient.from(activeTable).update({
          name: editForm.name,
          slug: editForm.slug,
          order_index: editForm.order_index
        }).eq("id", isEditing);

        if (error) throw error;
        toast.success(`تم تحديث قسم ${contextName} وحفظ التغييرات بنجاح! ✨`);
      }
      setIsEditing(null);
      await fetchCategoriesData();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء حفظ القسم. يرجى التحقق من عدم تكرار الـ Slug");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    const catCourses = courses.filter(c => c.category === catName);
    const catProducts = products.filter(p => p.category === catName);
    
    if (viewTab === "courses" && catCourses.length > 0) {
      toast.error(`لا يمكن حذف هذا القسم! يحتوي على ${catCourses.length} دورات نشطة حالياً. يرجى نقلها أولاً.`);
      return;
    }
    if (viewTab === "products" && catProducts.length > 0) {
      toast.error(`لا يمكن حذف هذا القسم! يحتوي على ${catProducts.length} منتجات نشطة حالياً. يرجى نقلها أولاً.`);
      return;
    }

    if (!window.confirm("هل أنت متأكد من حذف هذا القسم بالكامل؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    
    const activeTable = viewTab === "courses" ? "course_categories" : "product_categories";
    try {
      const { error } = await supabaseClient.from(activeTable).delete().eq("id", id);
      if (error) throw error;
      toast.success("تم حذف القسم المحدد بنجاح");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("حدث خطأ أثناء محاولة حذف القسم");
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
      
      toast.success("تم تغيير قسم الدورة ونقلها بنجاح! 📦");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("فشل في إعادة تصنيف الدورة التعليمية");
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
      
      toast.success("تم تغيير تصنيف المنتج ونقله بنجاح! 📦");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("فشل في إعادة تصنيف المنتج الرقمي");
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
      toast.success(nextStatus === "published" ? "تم تنشيط الدورة ونشرها للطلاب! 🟢" : "تم تحويل الدورة لوضع المسودة 🟡");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("فشل تغيير حالة الدورة");
    }
  };

  // Quick Action: Toggle product status
  const handleToggleProductStatus = async (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "نشط" ? "مسودة" : "نشط";
    try {
      const { error } = await supabaseClient
        .from("products")
        .update({ status: nextStatus })
        .eq("id", productId);

      if (error) throw error;
      toast.success(nextStatus === "نشط" ? "تم تنشيط المنتج للبيع بالمتجر! 🟢" : "تم تحويل المنتج لوضع المسودة 🟡");
      await fetchCategoriesData();
    } catch (err) {
      toast.error("فشل تغيير حالة المنتج");
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
    <div className="space-y-8 font-cairo text-right p-4 md:p-8" dir="rtl">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-alexandria font-black text-white">
            {viewTab === "products" ? "إدارة أقسام المنتجات الرقمية" : "إدارة أقسام الكورسات التعليمية"}
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            {viewTab === "products" 
              ? "تحكم كامل وتصنيف للمنتجات الرقمية داخل متجرك، استعرض محتوياتها وانقلها بمرونة."
              : "تحكم كامل بمسارات وأقسام الكورسات التعليمية داخل الأكاديمية ونظم دروسك بمرونة."}
          </p>
        </div>
        
        <button 
          onClick={startAddNew}
          className="flex items-center gap-2 bg-[#D6004B] hover:bg-[#ff0059] text-white px-5 py-2.5 rounded-xl font-bold font-alexandria text-xs transition-all active:scale-95 shadow-[0_8px_20px_rgba(214,0,75,0.2)] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* 3. Main content block */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-[#D6004B] animate-spin" />
          <span className="text-zinc-500 font-bold text-xs">جاري تحميل أقسام المنصة ومحتوياتها...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-16 text-center space-y-4 shadow-xl">
          <Layers className="w-14 h-14 text-zinc-700 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-alexandria font-bold text-white text-base">لا توجد أقسام مسجلة حتى الآن</h4>
            <p className="text-zinc-500 text-xs font-cairo">ابدأ بإضافة أول مسار تعليمي لتصنيف دورات متجرك الرقمي.</p>
          </div>
          <button 
            onClick={startAddNew}
            className="px-5 py-2 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xs cursor-pointer"
          >
            إضافة قسم جديد
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
              ? `${catCourses.length} دورات مسجلة`
              : `${catProducts.length} منتجات رقمية`;

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
                        <h3 className="font-alexandria font-bold text-white text-sm sm:text-base">{cat.name}</h3>
                        <span className="text-[10px] text-zinc-500 font-mono" dir="ltr">({cat.slug})</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 font-bold">
                        <span className="flex items-center gap-1">
                          {viewTab === "courses" ? <BookOpen className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                          <span>{countText}</span>
                        </span>
                        <span>•</span>
                        <span>الترتيب باللوحة: {cat.order_index}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    {/* Expand/Collapse Toggle */}
                    <button 
                      onClick={() => toggleCategoryExpand(cat.id)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title={isExpanded ? "طي القسم" : "توسيع وعرض المحتويات"}
                    >
                      {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                    </button>

                    {/* Edit button */}
                    <button 
                      onClick={() => startEdit(cat)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 border border-white/5 transition-all cursor-pointer"
                      title="تعديل تفاصيل القسم"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete button */}
                    <button 
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/5 transition-all cursor-pointer"
                      title="حذف القسم"
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
                              <h4 className="font-alexandria font-bold text-zinc-400 text-xs flex items-center gap-1.5">
                                <LayoutGrid className="w-4 h-4 text-[#D6004B]" />
                                <span>الأقسام التعليمية في ({cat.name}):</span>
                              </h4>
                            </div>

                            {catCourses.length === 0 ? (
                              <div className="py-10 text-center space-y-3 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                                <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                                <p className="text-zinc-500 text-xs font-bold font-cairo">لا توجد دورات مسجلة في هذا القسم حالياً.</p>
                                <a 
                                  href="/admin/courses" 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D6004B]/10 hover:bg-[#D6004B] text-[#D6004B] hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                >
                                  <span>+ إضافة دورة تعليمية جديدة</span>
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
                                          <span className="font-mono text-rose-400 font-black">{course.price === 0 ? "مجاني" : `$${course.price}`}</span>
                                          <span>•</span>
                                          <span>المستوى: {course.level || "غير مححدد"}</span>
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
                                          className="bg-transparent border-none text-[10px] text-zinc-300 focus:outline-none cursor-pointer font-bold font-cairo"
                                        >
                                          {categories.map((c) => (
                                            <option key={c.id} value={c.name} className="bg-[#0f0f15] text-zinc-300 font-bold">
                                              نقل لـ: {c.name}
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
                                        title={course.status === "published" ? "تعطيل الدورة" : "تنشيط الدورة"}
                                      >
                                        {course.status === "published" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        <span>{course.status === "published" ? "نشط" : "مسودة"}</span>
                                      </button>

                                      {/* Edit full details button */}
                                      <a
                                        href={`/admin/courses?edit=${course.id}`}
                                        className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                                        title="تعديل المنهج والتفاصيل"
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
                              <h4 className="font-alexandria font-bold text-zinc-400 text-xs flex items-center gap-1.5">
                                <LayoutGrid className="w-4 h-4 text-[#D6004B]" />
                                <span>المنتجات الرقمية في قسم ({cat.name}):</span>
                              </h4>
                            </div>

                            {catProducts.length === 0 ? (
                              <div className="py-10 text-center space-y-3 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                                <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                                <p className="text-zinc-500 text-xs font-bold font-cairo">لا توجد منتجات رقمية في هذا القسم حالياً.</p>
                                <a 
                                  href="/admin/products" 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D6004B]/10 hover:bg-[#D6004B] text-[#D6004B] hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                >
                                  <span>+ إضافة منتج جديد</span>
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
                                          <span className="font-mono text-emerald-400 font-black">{prod.price === 0 ? "مجاني" : `$${prod.price}`}</span>
                                          <span>•</span>
                                          <span className="text-zinc-400 flex items-center gap-0.5">
                                            <span>مبيعات:</span>
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
                                          className="bg-transparent border-none text-[10px] text-zinc-300 focus:outline-none cursor-pointer font-bold font-cairo"
                                        >
                                          {categories.map((c) => (
                                            <option key={c.id} value={c.name} className="bg-[#0f0f15] text-zinc-300 font-bold">
                                              نقل لـ: {c.name}
                                            </option>
                                          ))}
                                        </select>
                                        {switchingProductId === prod.id && (
                                          <Loader2 className="w-3 h-3 text-rose-500 animate-spin shrink-0" />
                                        )}
                                      </div>

                                      {/* Product Status Toggle */}
                                      <button
                                        onClick={() => handleToggleProductStatus(prod.id, prod.status || "مسودة")}
                                        className={cn(
                                          "h-8 px-2.5 rounded-xl border font-bold text-[10px] flex items-center gap-1.5 cursor-pointer transition-all",
                                          prod.status === "نشط"
                                            ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/30"
                                            : "bg-amber-950/40 border-amber-500/20 text-amber-400 hover:bg-amber-900/30"
                                        )}
                                        title={prod.status === "نشط" ? "تعطيل المنتج" : "تنشيط المنتج"}
                                      >
                                        {prod.status === "نشط" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        <span>{prod.status === "نشط" ? "نشط" : "مسودة"}</span>
                                      </button>

                                      {/* Edit full details button */}
                                      <a
                                        href={`/admin/products`}
                                        className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                                        title="تعديل تفاصيل وأسعار المنتج"
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
              className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-right"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsEditing(null)}
                className="absolute top-4 left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title */}
              <div>
                <h3 className="font-alexandria font-bold text-white text-base">
                  {viewTab === "courses" ? (
                    isEditing === "new" ? "إضافة قسم مسار تعليمي جديد" : "تعديل بيانات القسم الأكاديمي"
                  ) : (
                    isEditing === "new" ? "إضافة تصنيف منتجات رقمية جديد" : "تعديل بيانات تصنيف المنتجات الرقمية"
                  )}
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  {viewTab === "courses" 
                    ? "تحديد اسم القسم، والـ Slug المعرّف له في المتجر الرقمي، وترتيب ظهوره للطلاب."
                    : "تحديد اسم التصنيف والـ Slug الخاص بفرز وعرض المنتجات الرقمية للعملاء."}
                </p>
              </div>

              {/* Form fields */}
              <form onSubmit={handleSave} className="space-y-4">
                
                {/* 1. Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">
                    {viewTab === "courses" ? "اسم قسم الكورس (Category Name)" : "اسم تصنيف المنتجات (Category Name)"}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder={viewTab === "courses" ? "مثال: دورات الذكاء الاصطناعي" : "مثال: أدوات الذكاء الاصطناعي"}
                    value={editForm.name || ""}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setEditForm({
                        ...editForm,
                        name: nextName,
                        slug: isEditing === "new" ? generateSlug(nextName) : editForm.slug
                      });
                    }}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-[#D6004B] transition-all font-cairo text-zinc-300 w-full text-right"
                  />
                </div>

                {/* 2. Slug */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">معرّف الرابط (Slug)</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: ai-courses"
                    value={editForm.slug || ""}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-[#D6004B] transition-all font-mono text-zinc-300 w-full text-left"
                    dir="ltr"
                  />
                </div>

                {/* 3. Order index */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-bold">ترتيب الظهور في اللوحة (Order Index)</label>
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
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-10 px-6 bg-[#D6004B] hover:bg-[#ff0059] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>حفظ وتأكيد البيانات</span>
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
        <span className="text-zinc-500 font-bold text-xs mt-4">جاري تحميل لوحة التحكم...</span>
      </div>
    }>
      <CourseCategoriesAdminPageContent />
    </Suspense>
  );
}
