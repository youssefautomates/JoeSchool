import React, { useState, useEffect } from "react";
import { X, Save, Upload, ShieldCheck, Sparkles, AlertCircle, Check } from "lucide-react";
import { Review } from "@/app/api/admin/reviews/route";
import { RatingPicker } from "./RatingPicker";
import { ReviewCard } from "./ReviewCard";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";



interface DisplayProduct {
  id: string;
  title: string;
  type?: "course" | "product" | "bundle";
}

interface ReviewEditorProps {
  review: Review | null; // null means adding a new review
  products: DisplayProduct[];
  onSave: (reviewData: Partial<Review>) => Promise<void>;
  onClose: () => void;
}

export function ReviewEditor({ review, products, onSave, onClose }: ReviewEditorProps) {
  const [formData, setFormData] = useState<Partial<Review>>({
    productId: "",
    firstName: "",
    lastName: "",
    rating: 5,
    text: "",
    isVerified: true,
    status: "visible",
    isFeatured: false,
    featuredPosition: 999,
    source: "manual_admin",
    sourceType: undefined,
    sourceId: ""
  });

  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // General draft cleanup on mount
  useEffect(() => {
    const saved = localStorage.getItem("review_editor_draft_v2");
    if (saved) {
      try {
        const { timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem("review_editor_draft_v2");
          console.log("[Draft Lifecycle] Cleaned up expired review draft on mount.");
        }
      } catch (_) {
        localStorage.removeItem("review_editor_draft_v2");
      }
    }
  }, []);

  // 1. Load initial review or check for autosave draft with 7-day expiration lifecycle
  useEffect(() => {
    if (review) {
      setFormData(review);
      setHasDraft(false);
    } else {
      const defaultProductId = products[0]?.id || "";
      const defaultProduct = products.find(p => p.id === defaultProductId);
      const defaultSourceType = defaultProduct?.type === "course" ? "course" : "digital_product";

      setFormData({
        productId: defaultProductId,
        firstName: "",
        lastName: "",
        rating: 5,
        text: "",
        isVerified: true,
        status: "visible",
        isFeatured: false,
        featuredPosition: 999,
        source: "manual_admin",
        sourceId: defaultProductId,
        sourceType: defaultSourceType
      });

      // Check localStorage for saved drafts (only for new reviews)
      const saved = localStorage.getItem("review_editor_draft_v2");
      if (saved) {
        try {
          const { data, timestamp } = JSON.parse(saved);
          
          // Check expiration (7 days = 7 * 24 * 60 * 60 * 1000 ms)
          const isExpired = Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000;
          if (isExpired) {
            localStorage.removeItem("review_editor_draft_v2");
            setHasDraft(false);
          } else if (data && (data.firstName || data.text)) {
            setHasDraft(true);
          }
        } catch (_) {}
      }
    }
  }, [review, products]);

  // 2. Autosave drafts to localStorage on inputs change (for new reviews only)
  useEffect(() => {
    if (!review) {
      const hasInputs = formData.firstName || formData.text || formData.lastName;
      if (hasInputs) {
        localStorage.setItem("review_editor_draft_v2", JSON.stringify({
          data: formData,
          timestamp: Date.now()
        }));
      }
    }
  }, [formData, review]);

  const handleRestoreDraft = () => {
    const saved = localStorage.getItem("review_editor_draft_v2");
    if (saved) {
      try {
        const { data } = JSON.parse(saved);
        setFormData(data);
        toast.success("تم استعادة المسودة بنجاح 📝");
      } catch (_) {
        toast.error("فشل استعادة المسودة");
      }
    }
    setHasDraft(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem("review_editor_draft_v2");
    setHasDraft(false);
    toast.info("تم تجاهل وحذف المسودة");
  };

  const handleChange = (key: keyof Review, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      if (key === "productId") {
        next.sourceId = value;
        const matching = products.find(p => p.id === value);
        if (matching) {
          next.sourceType = matching.type === "course" ? "course" : "digital_product";
        }
      }
      return next;
    });
  };



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clean and validate HTML injection & unicode space junk
    const cleanText = (formData.text || "").replace(/<\/?[^>]+(>|$)/g, "").trim();
    const cleanFirstName = (formData.firstName || "").replace(/<\/?[^>]+(>|$)/g, "").trim();
    const cleanLastName = (formData.lastName || "").replace(/<\/?[^>]+(>|$)/g, "").trim();

    if (!formData.productId || !cleanFirstName || !cleanText) {
      toast.error("يرجى ملء جميع الحقول المطلوبة بشكل صحيح (الاسم والتعليق لا يمكن أن يحتوي على مسافات فقط)");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        text: cleanText
      });
      // Clean up draft on successful save
      localStorage.removeItem("review_editor_draft_v2");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClose = () => {
    onClose();
  };

  // Find linked product name to display in the live preview
  const getSelectedProductName = () => {
    const selected = products.find(p => p.id === formData.productId);
    return selected ? selected.title : "اسم العنصر المرتبط";
  };

  // Construct a previewable review object to feed to ReviewCard
  const previewReview: Review = {
    id: formData.id || "preview-id",
    productId: formData.productId || "",
    firstName: formData.firstName || "اسم العميل",
    lastName: formData.lastName || "",
    rating: formData.rating || 5,
    text: formData.text || "اكتب هنا نص التقييم الذي أدلى به العميل ليظهر في المعاينة الحية مباشرة...",
    isVerified: formData.isVerified !== false,
    isHidden: formData.status === "hidden",
    createdAt: formData.createdAt || new Date().toISOString(),
    status: formData.status || "visible",
    isFeatured: formData.isFeatured || false,
    featuredPosition: formData.featuredPosition || 999,
    source: formData.source || "manual_admin",
    schemaVersion: 1
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-black/85 backdrop-blur-md" dir="rtl">
      {/* Side-by-Side Flex Layout */}
      <div className="flex flex-col lg:flex-row w-full max-w-[1400px] bg-[#050508] border-r border-white/10 shadow-2xl overflow-y-auto">
        
        {/* RIGHT COLUMN: Form Controls */}
        <div className="flex-1 p-6 md:p-10 border-l border-white/5 space-y-6">
          
          {/* Draft recovery notifier */}
          {hasDraft && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center justify-between gap-4 font-cairo text-xs font-bold text-rose-400 animate-pulse">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>تم العثور على مسودة محفوظة غير مكتملة. هل ترغب في استعادتها؟</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRestoreDraft}
                  className="px-3 py-1.5 bg-[#D6004B] text-white rounded-lg hover:bg-[#ff0059] cursor-pointer"
                >
                  استعادة
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 bg-white/5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  حذف
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <h2 className="text-xl font-black text-white font-alexandria">
                {review ? "تعديل تقييم العميل" : "إضافة تقييم جديد للمنصة"}
              </h2>
              <p className="text-zinc-500 text-[11px] md:text-xs font-cairo mt-1.5">
                قم بملء البيانات التالية بدقة. التغييرات تظهر في لوحة المعاينة مباشرة.
              </p>
            </div>
            
            <button
              onClick={handleCancelClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* 1. Product Link */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-300 font-bold font-cairo">العنصر المرتبط (الكورس أو المنتج الرقمي)</label>
              <select
                value={formData.productId}
                required
                onChange={(e) => handleChange("productId", e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs outline-none focus:border-rose-500/50 cursor-pointer"
              >
                <option value="" disabled className="bg-zinc-950 text-zinc-500">-- اختر الكورس أو المنتج --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#050508] text-white">
                    {p.title}
                  </option>
                ))}
              </select>
              {formData.sourceType && (
                <div className="flex items-center gap-2 mt-1 select-none">
                  <span className="bg-zinc-800/80 text-zinc-400 border border-zinc-700/30 px-2 py-0.5 rounded text-[9px] font-bold font-cairo">
                    نوع المصدر: {formData.sourceType === "course" ? "🎓 كورس تعليمي" : "🛍️ منتج رقمي"}
                  </span>
                  <span className="bg-zinc-800/80 text-zinc-500 border border-zinc-700/30 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                    معرّف المصدر: {formData.sourceId}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-300 font-bold font-cairo">الاسم الأول (يظهر بالكامل)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: يوسف"
                  value={formData.firstName || ""}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs outline-none focus:border-rose-500/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-300 font-bold font-cairo">اسم العائلة (يظهر الحرف الأول فقط)</label>
                <input
                  type="text"
                  placeholder="مثال: مصطفى"
                  value={formData.lastName || ""}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs outline-none focus:border-rose-500/50"
                />
              </div>
            </div>

            {/* 3. Rating Stars Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-300 font-bold font-cairo">التقييم بالنجوم (يدعم التقييم النصفي)</label>
              <RatingPicker 
                rating={formData.rating || 5} 
                onChange={(rating) => handleChange("rating", rating)} 
              />
            </div>
            {/* 5. Review Testimonial Text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-300 font-bold font-cairo">نص التقييم والمراجعة</label>
              <textarea
                value={formData.text || ""}
                required
                onChange={(e) => handleChange("text", e.target.value)}
                placeholder="اكتب التقييم والخبرة الفعلية التي ذكرها العميل..."
                className="w-full h-28 p-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs outline-none focus:border-rose-500/50 resize-none font-cairo leading-relaxed"
              />
            </div>

            {/* 6. Settings Toggles and Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
              
              {/* Soft Moderation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-300 font-bold font-cairo">حالة النشر والمراجعة</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-sans text-xs outline-none focus:border-rose-500/50 cursor-pointer"
                >
                  <option value="visible" className="bg-[#050508]">🟢 نشط وموافق عليه (ظاهر)</option>
                  <option value="pending" className="bg-[#050508]">⏳ قيد المراجعة والانتظار</option>
                  <option value="hidden" className="bg-[#050508]">🔴 مخفي ومحجوب</option>
                  <option value="archived" className="bg-[#050508]">📁 مؤرشف / محذوف سوفت</option>
                </select>
              </div>

              {/* Source tagging */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-300 font-bold font-cairo">مصدر التقييم</label>
                <select
                  value={formData.source}
                  onChange={(e) => handleChange("source", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-sans text-xs outline-none focus:border-rose-500/50 cursor-pointer"
                >
                  <option value="manual_admin" className="bg-[#050508]">لوحة تحكم المسؤول (يدوي)</option>
                  <option value="imported" className="bg-[#050508]">مستورد من منصة خارجية</option>
                  <option value="customer_submitted" className="bg-[#050508]">مضاف تلقائيًا من رأي عميل</option>
                </select>
              </div>

              {/* Verified Purchase Check */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 select-none cursor-pointer mt-2" onClick={() => handleChange("isVerified", !formData.isVerified)}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                  <span className="text-xs text-zinc-300 font-bold font-cairo">علامة مشتري موثق</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isVerified !== false}
                  onChange={() => {}}
                  className="rounded border-zinc-700 bg-white/5 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Featured Review Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 select-none cursor-pointer mt-2" onClick={() => handleChange("isFeatured", !formData.isFeatured)}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-rose-500 fill-current" />
                  <span className="text-xs text-zinc-300 font-bold font-cairo">تثبيت كتقييم مميز</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isFeatured || false}
                  onChange={() => {}}
                  className="rounded border-zinc-700 bg-white/5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
              </div>

              {/* Featured priority position */}
              {formData.isFeatured && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs text-zinc-300 font-bold font-cairo">ترتيب أولوية التثبيت (الأقل يظهر أولاً)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.featuredPosition || 0}
                    onChange={(e) => handleChange("featuredPosition", Number(e.target.value))}
                    className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-mono text-xs outline-none focus:border-rose-500/50"
                  />
                  <span className="text-[10px] text-zinc-500 font-bold font-cairo">
                    * يتم ترتيب التقييمات المميزة تصاعديًا من 0 إلى ما فوق لعرض الأهم في البداية.
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-5">
              <button
                type="button"
                onClick={handleCancelClose}
                className="h-11 px-6 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl font-bold text-xs transition-all font-cairo cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 px-8 bg-[#D6004B] hover:bg-[#ff0059] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>حفظ التقييم</span>
              </button>
            </div>
          </form>
        </div>

        {/* LEFT COLUMN: Live Preview Mode */}
        <div className="lg:w-[450px] bg-black/60 p-6 md:p-8 flex flex-col justify-start space-y-6 relative border-r border-white/5 select-none shrink-0 lg:h-screen lg:sticky lg:top-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-alexandria">
              <Sparkles className="w-4.5 h-4.5 text-rose-500 fill-current" />
              <span>معاينة حية للمظهر النهائي</span>
            </h3>
            <p className="text-zinc-500 text-[10px] font-cairo mt-1">
              هكذا سيبدو كارت التقييم داخل صفحات تفاصيل الكورسات أو المتجر.
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center py-10 lg:py-0">
            <div className="w-full max-w-[360px] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <ReviewCard
                review={previewReview}
                productName={getSelectedProductName()}
                onEdit={() => {}}
                onDelete={() => {}}
                onStatusChange={() => {}}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
