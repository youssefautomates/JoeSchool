"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  Plus, Trash2, Edit2, Loader2, ImageIcon, 
  Video, FileText, Image as ImageIcon2, 
  Globe, Layout, ChevronRight, X, Save, UploadCloud, FileUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generateSlug, calcDiscount, type Product } from "@/lib/products";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Helper: Safe Image Src ───────────────────────────────────────────
function safeImageSrc(src: string) {
  if (!src) return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800";
  if (src.startsWith("file://")) return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800";
  return src;
}

// ── Helper: Pack/Unpack Tags ───────────────────────────────────────────
function unpackProduct(p: Product) {
  const video_url = p.tags?.find(t => t.startsWith("video:"))?.replace("video:", "") || "";
  const gallery = p.tags?.filter(t => t.startsWith("gallery:"))?.map(t => t.replace("gallery:", "")) || [];
  const file_type = p.tags?.find(t => t.startsWith("type:"))?.replace("type:", "") || "zip";
  const normalTags = p.tags?.filter(t => !t.startsWith("video:") && !t.startsWith("gallery:") && !t.startsWith("type:")) || [];
  
  return {
    ...p,
    video_url,
    gallery,
    file_type,
    displayTags: normalTags.join(", ")
  };
}

function packTags(form: any) {
  const tags: string[] = [];
  if (form.video_url) tags.push(`video:${form.video_url}`);
  if (form.gallery && form.gallery.length > 0) {
    form.gallery.forEach((url: string) => {
      if (url.trim()) tags.push(`gallery:${url.trim()}`);
    });
  }
  if (form.file_type) tags.push(`type:${form.file_type}`);
  if (form.displayTags) {
    form.displayTags.split(",").forEach((t: string) => {
      const trimmed = t.trim();
      if (trimmed) tags.push(trimmed);
    });
  }
  return tags;
}

// ── File Upload Hook ──────────────────────────────────────────────────
function useFileUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File, folder: string = "products") => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      toast.error(`فشل الرفع: ${err.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}

// ── Product Form Dialog ────────────────────────────────────────────────
function ProductFormDialog({ open, onClose, onSaved, initial }: { open: boolean; onClose: () => void; onSaved: () => void; initial?: Product | null; }) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "media" | "files" | "seo">("general");
  const { upload, uploading } = useFileUpload();
  
  const [form, setForm] = useState<any>({
    title: "", slug: "", description: "", short_description: "",
    price: "", original_price: "", status: "نشط",
    is_featured: false, image_url: "", file_url: "", category: "", 
    video_url: "", gallery: [""], file_type: "zip", displayTags: "",
    seo_title: "", seo_description: ""
  });

  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        const unpacked = unpackProduct(initial);
        setForm({
          title: unpacked.title, slug: unpacked.slug,
          description: unpacked.description || "", short_description: unpacked.short_description || "",
          price: String(unpacked.price), original_price: String(unpacked.original_price || ""),
          status: unpacked.status, is_featured: unpacked.is_featured,
          image_url: unpacked.image_url || "", file_url: unpacked.file_url || "",
          category: unpacked.category || "", 
          video_url: unpacked.video_url,
          gallery: unpacked.gallery.length > 0 ? unpacked.gallery : [""],
          file_type: unpacked.file_type,
          displayTags: unpacked.displayTags,
          seo_title: unpacked.seo_title || "",
          seo_description: unpacked.seo_description || ""
        });
      } else {
        setForm({
          title: "", slug: "", description: "", short_description: "",
          price: "", original_price: "", status: "نشط",
          is_featured: false, image_url: "", file_url: "", category: "", 
          video_url: "", gallery: [""], file_type: "zip", displayTags: "",
          seo_title: "", seo_description: ""
        });
      }
      setActiveTab("general");
    }
  }, [open, initial]);

  async function handleSave() {
    if (!form.title.trim()) { toast.error("اسم المنتج مطلوب"); return; }
    if (!form.price || isNaN(Number(form.price))) { toast.error("السعر غير صالح"); return; }

    setSaving(true);
    const price = parseFloat(form.price);
    const orig = form.original_price ? parseFloat(form.original_price) : null;
    
    const payload = {
      title: form.title.trim(),
      slug: form.slug || generateSlug(form.title),
      description: form.description,
      short_description: form.short_description,
      price,
      original_price: orig,
      discount_pct: calcDiscount(price, orig),
      status: form.status,
      is_featured: form.is_featured,
      image_url: form.image_url || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800",
      file_url: form.file_url || null,
      category: form.category || null,
      tags: packTags(form),
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null
    };

    try {
      if (initial) {
        const { error } = await supabase.from("products").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("تم تحديث المنتج");
      } else {
        const { error } = await supabase.from("products").insert({ ...payload, sales: 0, views: 0 });
        if (error) throw error;
        toast.success("تم إضافة المنتج");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  const addGalleryItem = () => setForm({ ...form, gallery: [...form.gallery, ""] });
  const updateGalleryItem = (index: number, val: string) => {
    const newGallery = [...form.gallery];
    newGallery[index] = val;
    setForm({ ...form, gallery: newGallery });
  };
  const removeGalleryItem = (index: number) => {
    const newGallery = form.gallery.filter((_: any, i: number) => i !== index);
    setForm({ ...form, gallery: newGallery.length > 0 ? newGallery : [""] });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "image" | "video" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await upload(file);
    if (url) {
      if (target === "image") setForm({ ...form, image_url: url });
      if (target === "video") setForm({ ...form, video_url: url });
      if (target === "file") setForm({ ...form, file_url: url });
      toast.success("تم رفع الملف بنجاح");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-white/8 text-white sm:max-w-4xl max-h-[95vh] overflow-hidden p-0 rounded-[2rem]" style={{ background: "#080810", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex h-full min-h-[600px]">
          {/* Sidebar Tabs */}
          <div className="w-64 border-l border-white/5 bg-black/20 p-6 flex flex-col gap-2">
            <DialogHeader className="mb-8">
              <DialogTitle className="font-alexandria text-xl pr-2" style={{ color: "#ffffff" }}>
                {initial ? "تعديل المنتج" : "منتج جديد"}
              </DialogTitle>
            </DialogHeader>
            
            {[
              { id: "general", label: "المعلومات العامة", icon: Layout },
              { id: "media", label: "الوسائط والمعرض", icon: Video },
              { id: "files", label: "الملفات الرقمية", icon: FileText },
              { id: "seo", label: "إعدادات SEO", icon: Globe },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-cairo text-sm font-bold transition-all",
                  activeTab === tab.id 
                    ? "bg-[#D6004B] text-white shadow-lg shadow-[#D6004B]/20" 
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            <div className="mt-auto pt-6 border-t border-white/5">
               <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-cairo text-sm font-bold text-zinc-500 hover:bg-white/5 transition-all"
                >
                  إلغاء التغييرات
                </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {activeTab === "general" && (
                    <div className="grid gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>عنوان المنتج *</Label>
                        <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} placeholder="مثال: حزمة قوالب n8n الاحترافية" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>السعر الحالي (ج.م) *</Label>
                          <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>السعر الأصلي (للخصم)</Label>
                          <Input type="number" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})} className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>الحالة</Label>
                          <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="w-full h-12 rounded-xl px-4 text-white appearance-none outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }}>
                            <option value="نشط">نشط (يظهر في المتجر)</option>
                            <option value="مسودة">مسودة (للمعاينة فقط)</option>
                            <option value="مخفي">مخفي (لا يظهر نهائياً)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>التصنيف</Label>
                          <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} placeholder="مثال: n8n, Workflows" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>وصف مختصر</Label>
                        <Input value={form.short_description} onChange={e => setForm({...form, short_description: e.target.value})} className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} placeholder="يظهر تحت العنوان مباشرة" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>الوصف الكامل</Label>
                        <textarea 
                          value={form.description} 
                          onChange={e => setForm({...form, description: e.target.value})} 
                          rows={6}
                          className="w-full p-4 rounded-xl text-white font-cairo text-sm outline-none resize-none" 
                          style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                          placeholder="اكتب وصفاً تفصيلياً للمنتج..."
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === "media" && (
                    <div className="grid gap-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <ImageIcon2 className="w-4 h-4 text-rose-500" />
                             <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>الصورة الأساسية (Thumbnail)</Label>
                           </div>
                           <button 
                            onClick={() => imgRef.current?.click()} 
                            disabled={uploading}
                            className="text-[10px] font-bold text-rose-500 flex items-center gap-1 hover:underline"
                           >
                              <UploadCloud className="w-3.5 h-3.5" />
                              رفع من الكمبيوتر
                           </button>
                           <input type="file" ref={imgRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "image")} />
                        </div>
                        <Input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} dir="ltr" className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} placeholder="رابط الصورة المباشر..." />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-rose-500" />
                            <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>رابط الفيديو التعريفي</Label>
                          </div>
                           <button 
                            onClick={() => vidRef.current?.click()} 
                            disabled={uploading}
                            className="text-[10px] font-bold text-rose-500 flex items-center gap-1 hover:underline"
                           >
                              <UploadCloud className="w-3.5 h-3.5" />
                              رفع فيديو
                           </button>
                           <input type="file" ref={vidRef} className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, "video")} />
                        </div>
                        <Input value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})} dir="ltr" className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} placeholder="رابط فيديو MP4 أو YouTube..." />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4 text-rose-500" />
                            <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>معرض الصور (Gallery)</Label>
                          </div>
                          <button onClick={addGalleryItem} className="text-xs font-bold text-rose-500 flex items-center gap-1 hover:underline">
                            <Plus className="w-3 h-3" /> إضافة صورة للمرض
                          </button>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {form.gallery.map((url: string, idx: number) => (
                            <div key={idx} className="flex gap-2">
                              <Input 
                                value={url} 
                                onChange={e => updateGalleryItem(idx, e.target.value)} 
                                dir="ltr" 
                                className="h-11 rounded-xl text-white flex-1" 
                                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} 
                                placeholder="رابط صورة إضافية..." 
                              />
                              <button 
                                onClick={() => removeGalleryItem(idx)}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors"
                                style={{ background: "rgba(255,255,255,0.03)" }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "files" && (
                    <div className="grid gap-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-emerald-500" />
                            <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>رابط الملف الرقمي للتسليم</Label>
                          </div>
                           <button 
                            onClick={() => fileRef.current?.click()} 
                            disabled={uploading}
                            className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 hover:underline"
                           >
                              <FileUp className="w-3.5 h-3.5" />
                              رفع ملف
                           </button>
                           <input type="file" ref={fileRef} className="hidden" onChange={(e) => handleFileUpload(e, "file")} />
                        </div>
                        <Input value={form.file_url} onChange={e => setForm({...form, file_url: e.target.value})} dir="ltr" className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} placeholder="رابط التحميل المباشر..." />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>صيغة الملف</Label>
                          <select value={form.file_type} onChange={e => setForm({...form, file_type: e.target.value})} className="w-full h-12 rounded-xl px-4 text-white outline-none appearance-none" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }}>
                            <option value="zip">ZIP / Archive</option>
                            <option value="pdf">PDF Document</option>
                            <option value="json">JSON File</option>
                            <option value="video">MP4 Video</option>
                            <option value="link">External Link</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>الكلمات الدلالية (Tags)</Label>
                          <Input value={form.displayTags} onChange={e => setForm({...form, displayTags: e.target.value})} className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} placeholder="قالب، n8n، أتمتة" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "seo" && (
                    <div className="grid gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>عنوان SEO (Meta Title)</Label>
                        <Input value={form.seo_title} onChange={e => setForm({...form, seo_title: e.target.value})} className="h-12 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} placeholder="يظهر في نتائج البحث" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold" style={{ color: "#d4d4d8" }}>وصف SEO (Meta Description)</Label>
                        <textarea 
                          value={form.seo_description} 
                          onChange={e => setForm({...form, seo_description: e.target.value})} 
                          rows={4}
                          className="w-full p-4 rounded-xl text-white font-cairo text-sm outline-none resize-none" 
                          style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                          placeholder="وصف مختصر..."
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer Buttons */}
            <div className="p-8 border-t border-white/5 flex items-center justify-between bg-black/20">
               <div className="text-xs text-zinc-600 font-cairo">
                  {uploading ? (
                    <span className="text-rose-500 flex items-center gap-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" /> جاري رفع الملف...
                    </span>
                  ) : "* الحقول المميزة بعلامة مطلوبة"}
               </div>
               <Button 
                onClick={handleSave} 
                disabled={saving || uploading} 
                className="h-14 px-10 rounded-2xl font-alexandria font-black text-lg transition-all active:scale-95"
                style={{ 
                  background: "linear-gradient(135deg, #D6004B, #ff2d6b)", 
                  boxShadow: "0 8px 32px rgba(214,0,75,0.4)",
                  color: "#ffffff"
                }}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الحفظ...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-5 h-5" />
                    حفظ المنتج بالكامل
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Dialog ────────────────────────────────────────────────────────
function DeleteDialog({ product, onClose, onDeleted }: { product: Product; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast.success("تم الحذف بنجاح");
      onDeleted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "فشل الحذف");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#080810] border-red-500/20 text-white sm:max-w-md rounded-[2rem] p-8">
        <DialogHeader><DialogTitle className="text-red-500 font-alexandria text-xl">حذف المنتج نهائياً</DialogTitle></DialogHeader>
        <p className="py-6 text-zinc-400 font-cairo leading-relaxed">أنت على وشك حذف <span className="text-white font-bold">"{product.title}"</span>.</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 font-cairo">إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleting} variant="destructive" className="flex-1 h-12 rounded-xl font-cairo bg-red-600 hover:bg-red-700">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الحذف"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────
export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const hasFetched = useRef(false);

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data as Product[]);
    } catch (err: any) {
      console.error("[FETCH_ERROR]", err);
      setError(err.message || "فشل تحميل المنتجات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchProducts();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-2 md:p-4" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-alexandria font-black" style={{ color: "#ffffff" }}>إدارة المنتجات</h1>
          <p className="font-cairo text-sm mt-1" style={{ color: "#52525b" }}>إجمالي {products.length} منتج مسجل في النظام</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-6 h-12 rounded-2xl font-cairo font-bold text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #D6004B, #ff2d6b)", boxShadow: "0 8px 32px rgba(214,0,75,0.35)" }}
        >
          <Plus className="w-5 h-5" /> إضافة منتج جديد
        </button>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-[2.5rem]" style={{ background: "rgba(16,16,26,0.8)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <TableHead className="font-cairo text-right py-6 pr-8 text-xs uppercase tracking-widest font-black" style={{ color: "#71717a" }}>المنتج</TableHead>
                <TableHead className="font-cairo text-right text-xs uppercase tracking-widest font-black" style={{ color: "#71717a" }}>السعر</TableHead>
                <TableHead className="font-cairo text-right text-xs uppercase tracking-widest font-black" style={{ color: "#71717a" }}>المبيعات</TableHead>
                <TableHead className="font-cairo text-right text-xs uppercase tracking-widest font-black" style={{ color: "#71717a" }}>الحالة</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell className="py-6 pr-8 animate-pulse"><div className="h-10 w-full bg-white/5 rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-white/5 rounded" /></TableCell>
                    <TableCell><div className="h-4 w-8 bg-white/5 rounded" /></TableCell>
                    <TableCell><div className="h-6 w-16 bg-white/5 rounded" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-zinc-600 font-cairo">لا توجد منتجات.</TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="py-5 pr-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 relative overflow-hidden shrink-0 flex items-center justify-center border border-white/5">
                          {p.image_url ? (
                            <Image 
                              src={safeImageSrc(p.image_url)} 
                              alt={p.title} 
                              fill 
                              className="object-cover" 
                              sizes="56px" 
                              unoptimized={p.image_url.startsWith("file://")}
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-zinc-600" />
                          )}
                        </div>
                        <div className="font-cairo">
                          <div className="font-bold text-white text-base group-hover:text-rose-500 transition-colors">{p.title}</div>
                          {p.short_description && <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{p.short_description}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-alexandria font-bold text-white">{p.price} ج.م</TableCell>
                    <TableCell className="text-zinc-400 font-bold">{p.sales || 0}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "font-cairo px-3 py-1 rounded-lg border-none",
                        p.status === 'نشط' ? "bg-emerald-500/10 text-emerald-400" :
                        p.status === 'مسودة' ? "bg-amber-500/10 text-amber-400" :
                        "bg-zinc-800 text-zinc-500"
                      )}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pl-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-10 w-10 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-white/10 hover:text-white transition-all outline-none">
                          <ChevronRight className="w-5 h-5 rotate-90" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0d0d1a] border-white/10 p-2 rounded-2xl">
                          <DropdownMenuItem onClick={() => setEditProduct(p)} className="cursor-pointer text-zinc-300 hover:bg-white/5 rounded-xl p-3 font-cairo gap-3">
                            <Edit2 className="w-4 h-4 text-rose-500" /> تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteProduct(p)} className="cursor-pointer text-red-400 hover:bg-red-500/10 rounded-xl p-3 font-cairo gap-3">
                            <Trash2 className="w-4 h-4" /> حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ProductFormDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={fetchProducts} />
      {editProduct && <ProductFormDialog open initial={editProduct} onClose={() => setEditProduct(null)} onSaved={fetchProducts} />}
      {deleteProduct && <DeleteDialog product={deleteProduct} onClose={() => setDeleteProduct(null)} onDeleted={fetchProducts} />}
    </div>
  );
}
