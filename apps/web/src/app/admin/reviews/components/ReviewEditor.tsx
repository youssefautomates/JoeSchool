import React, { useState, useEffect } from "react";
import { X, Save, Upload, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
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
        toast.success("Draft restored successfully 📝");
      } catch (_) {
        toast.error("Failed to restore draft");
      }
    }
    setHasDraft(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem("review_editor_draft_v2");
    setHasDraft(false);
    toast.info("Draft discarded");
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
      toast.error("Please fill in all required fields correctly (name and review text cannot contain only spaces)");
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
    return selected ? selected.title : "Linked item name";
  };

  // Construct a previewable review object to feed to ReviewCard
  const previewReview: Review = {
    id: formData.id || "preview-id",
    productId: formData.productId || "",
    firstName: formData.firstName || "Customer Name",
    lastName: formData.lastName || "",
    rating: formData.rating || 5,
    text: formData.text || "Type review text here to see it in the live preview...",
    avatarUrl: formData.avatarUrl,
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
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-black/85 backdrop-blur-md font-sans" dir="ltr">
      {/* Side-by-Side Flex Layout */}
      <div className="flex flex-col lg:flex-row w-full max-w-[1400px] bg-white border-r border-zinc-200 shadow-sm border border-zinc-200/60 overflow-y-auto">
        
        {/* RIGHT COLUMN: Form Controls */}
        <div className="flex-1 p-6 md:p-10 border-r border-zinc-200/60 space-y-6">
          
          {/* Draft recovery notifier */}
          {hasDraft && (
            <div className="bg-brand-500/10 border border-zinc-200/60 p-4 rounded-2xl flex items-center justify-between gap-4 font-sans text-xs font-bold text-yellow-500 animate-pulse">
              <div className="flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                <span>An incomplete saved draft was found. Do you want to restore it?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRestoreDraft}
                  className="px-3 py-1.5 bg-[#1D4ED8] text-white rounded-2xl hover:bg-[#3B82F6] cursor-pointer"
                >
                  Restore
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 bg-zinc-100/40 text-zinc-500 hover:text-zinc-900 rounded-2xl cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-zinc-200/60 pb-5">
            <div className="text-left">
              <h2 className="text-xl font-black text-zinc-900 font-sans">
                {review ? "Edit Customer Review" : "Add New Review"}
              </h2>
              <p className="text-zinc-500 text-[11px] md:text-xs font-sans mt-1.5">
                Fill out the following information accurately. Changes will appear instantly in the preview.
              </p>
            </div>
            
            <button
              onClick={handleCancelClose}
              className="p-2 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6 text-left">
            
            {/* 1. Product Link */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-700 font-bold font-sans">Linked Item (Course or Digital Product)</label>
              <select
                value={formData.productId}
                required
                onChange={(e) => handleChange("productId", e.target.value)}
                className="w-full h-11 px-4 rounded-2xl bg-zinc-100/40 border border-zinc-200 text-zinc-700 text-xs outline-none focus:border-zinc-200/60 cursor-pointer"
              >
                <option value="" disabled className="bg-zinc-950 text-zinc-500">-- Select Course or Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} className="bg-white text-zinc-900">
                    {p.title}
                  </option>
                ))}
              </select>
              {formData.sourceType && (
                <div className="flex items-center gap-2 mt-1 select-none">
                  <span className="bg-zinc-800/80 text-zinc-500 border border-zinc-700/30 px-2 py-0.5 rounded text-[9px] font-bold font-sans">
                    Source Type: {formData.sourceType === "course" ? "🎓 Course" : "🛍️ Product"}
                  </span>
                  <span className="bg-zinc-800/80 text-zinc-500 border border-zinc-700/30 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                    Source ID: {formData.sourceId}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs text-zinc-700 font-bold font-sans">First Name (Fully visible)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John"
                  value={formData.firstName || ""}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className="h-11 px-4 rounded-2xl bg-zinc-100/40 border border-zinc-200 text-zinc-700 text-xs outline-none focus:border-zinc-200/60"
                />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs text-zinc-700 font-bold font-sans">Last Name (First letter only)</label>
                <input
                  type="text"
                  placeholder="e.g. Doe"
                  value={formData.lastName || ""}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className="h-11 px-4 rounded-2xl bg-zinc-100/40 border border-zinc-200 text-zinc-700 text-xs outline-none focus:border-zinc-200/60"
                />
              </div>
            </div>

            {/* 3. Rating Stars Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-700 font-bold font-sans">Rating Stars (Supports half stars)</label>
              <RatingPicker 
                rating={formData.rating || 5} 
                onChange={(rating) => handleChange("rating", rating)} 
              />
            </div>


            {/* 5. Review Testimonial Text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-700 font-bold font-sans">Review Text</label>
              <textarea
                value={formData.text || ""}
                required
                onChange={(e) => handleChange("text", e.target.value)}
                placeholder="Write the review text and experience shared by the customer..."
                className="w-full h-28 p-4 rounded-2xl bg-zinc-100/40 border border-zinc-200 text-zinc-700 text-xs outline-none focus:border-zinc-200/60 resize-none font-sans leading-relaxed"
              />
            </div>

            {/* 6. Settings Toggles and Dropdowns */}
            <div className="flex flex-col gap-1.5 bg-zinc-50/40 border border-zinc-200/60 p-5 rounded-2xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-700 font-bold font-sans">Publishing Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-zinc-100/40 border border-zinc-200 text-zinc-700 font-sans text-xs outline-none focus:border-zinc-200/60 cursor-pointer"
                >
                  <option value="visible" className="bg-white">🟢 Active & Approved (Visible)</option>
                  <option value="pending" className="bg-white">⏳ Pending Moderation</option>
                  <option value="hidden" className="bg-white">🔴 Hidden</option>
                  <option value="archived" className="bg-white">📁 Archived / Soft Deleted</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200/60 pt-5">
              <button
                type="button"
                onClick={handleCancelClose}
                className="h-11 px-6 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-700 rounded-2xl font-bold text-xs transition-all font-sans cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 px-8 bg-[#1D4ED8] hover:bg-[#3B82F6] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-zinc-300 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Review</span>
              </button>
            </div>
          </form>
        </div>

        {/* LEFT COLUMN: Live Preview Mode */}
        <div className="lg:w-[450px] bg-black/60 p-6 md:p-8 flex flex-col justify-start space-y-6 relative border-l border-zinc-200/60 select-none shrink-0 lg:h-screen lg:sticky lg:top-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="border-b border-zinc-200/60 pb-4 text-left">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 font-sans">
              <Sparkles className="w-4.5 h-4.5 text-yellow-500 fill-current" />
              <span>Live Preview</span>
            </h3>
            <p className="text-zinc-500 text-[10px] font-sans mt-1">
              This is how the review card will look on the course details or store page.
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
