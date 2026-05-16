"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generateSlug, calcDiscount } from "@/lib/products";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  original_price: number | null;
  discount_pct: number | null;
  status: "نشط" | "مسودة" | "مخفي";
  is_featured: boolean;
  image_url: string;
  file_url: string | null;
  category: string | null;
  tags: string[] | null;
  sales: number;
}

// ── Product Form Dialog ────────────────────────────────────────────────
function ProductFormDialog({ open, onClose, onSaved, initial }: { open: boolean; onClose: () => void; onSaved: () => void; initial?: Product | null; }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", slug: "", description: "", short_description: "",
    price: "", original_price: "", status: "نشط" as Product["status"],
    is_featured: false, image_url: "", file_url: "", category: "", tags: ""
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          title: initial.title, slug: initial.slug,
          description: initial.description || "", short_description: initial.short_description || "",
          price: String(initial.price), original_price: String(initial.original_price || ""),
          status: initial.status, is_featured: initial.is_featured,
          image_url: initial.image_url || "", file_url: initial.file_url || "",
          category: initial.category || "", tags: (initial.tags || []).join(", ")
        });
      } else {
        setForm({
          title: "", slug: "", description: "", short_description: "",
          price: "", original_price: "", status: "نشط",
          is_featured: false, image_url: "", file_url: "", category: "", tags: ""
        });
      }
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
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-white/8 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.08)" }}>
        <DialogHeader>
          <DialogTitle className="font-alexandria text-2xl" style={{ color: "#ffffff" }}>{initial ? "تعديل المنتج" : "منتج جديد"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 font-cairo">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: "#d4d4d8" }}>اسم المنتج *</Label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="h-11 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold" style={{ color: "#d4d4d8" }}>السعر *</Label>
              <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="h-11 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold" style={{ color: "#d4d4d8" }}>الحالة</Label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="w-full h-11 rounded-xl px-3 text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }}>
                <option value="نشط">نشط</option>
                <option value="مسودة">مسودة</option>
                <option value="مخفي">مخفي</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: "#d4d4d8" }}>وصف قصير</Label>
            <Input value={form.short_description} onChange={e => setForm({...form, short_description: e.target.value})} className="h-11 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: "#d4d4d8" }}>رابط الصورة</Label>
            <Input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} dir="ltr" className="h-11 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: "#d4d4d8" }}>رابط الملف</Label>
            <Input value={form.file_url} onChange={e => setForm({...form, file_url: e.target.value})} dir="ltr" className="h-11 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)" }} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white hover:bg-white/5 rounded-xl">إلغاء</Button>
          <Button onClick={handleSave} disabled={saving} className="text-white rounded-xl" style={{ background: "linear-gradient(135deg, #D6004B, #ff2d6b)", boxShadow: "0 4px 16px rgba(214,0,75,0.3)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ المنتج"}
          </Button>
        </DialogFooter>
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
      <DialogContent className="bg-[#0a0a0f] border-red-500/20 text-white sm:max-w-md rounded-3xl">
        <DialogHeader><DialogTitle className="text-red-500">حذف المنتج</DialogTitle></DialogHeader>
        <p className="py-4 text-zinc-400">هل أنت متأكد من حذف "{product.title}"؟</p>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">إلغاء</Button>
          <Button onClick={handleDelete} disabled={deleting} variant="destructive" className="bg-red-500 hover:bg-red-600">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الحذف"}
          </Button>
        </DialogFooter>
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

  // Single source of truth for fetching
  async function fetchProducts() {
    setLoading(true);
    console.log("[FETCH_START] Requesting products...");
    try {
      // Diagnostic Query
      const res = await supabase
        .from("products")
        .select("id, title") // Minimal columns to isolate missing column errors
        .limit(5);
        
      console.log("[DEBUG_RESPONSE_METADATA]", {
        status: res.status,
        statusText: res.statusText,
        count: res.count,
        hasData: !!res.data,
        dataLength: res.data?.length
      });

      if (res.error) {
        console.error("[RAW_SUPABASE_ERROR]", JSON.stringify(res.error, null, 2));
        throw res.error;
      }
      
      // Update state with partial data for now to keep table from crashing
      setProducts((res.data as any) || []);
      console.log(`[FETCH_DONE] Fetched ${res.data?.length || 0} products.`);
    } catch (err: any) {
      console.error("[FETCH_ERROR]", err);
      console.error("[RAW_CATCH_ERROR]", JSON.stringify(err, null, 2));
      setError(err.message || err.details || err.hint || "Unknown fetch error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Only run fetch exactly once on mount
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchProducts();
  }, []); // Strictly empty dependency array

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-2 md:p-8" style={{ background: "#080810", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-alexandria font-black" style={{ color: "#ffffff" }}>المنتجات</h1>
          <p className="font-cairo text-sm mt-1" style={{ color: "#52525b" }}>نسخة مستقرة · Stable Architecture</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-5 h-11 rounded-xl font-cairo font-bold text-white text-sm transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #D6004B, #ff2d6b)", boxShadow: "0 4px 20px rgba(214,0,75,0.35)" }}
        >
          <Plus className="w-4 h-4" /> إضافة منتج
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-cairo">
          حدث خطأ: {error}
        </div>
      )}

      {/* Stable Table */}
      <div className="overflow-hidden rounded-2xl" style={{ background: "rgba(16,16,26,0.8)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <TableHead className="font-cairo text-right py-5 pr-6 text-xs uppercase tracking-widest font-bold" style={{ color: "#71717a" }}>المنتج</TableHead>
                <TableHead className="font-cairo text-right text-xs uppercase tracking-widest font-bold" style={{ color: "#71717a" }}>السعر</TableHead>
                <TableHead className="font-cairo text-right text-xs uppercase tracking-widest font-bold" style={{ color: "#71717a" }}>المبيعات</TableHead>
                <TableHead className="font-cairo text-right text-xs uppercase tracking-widest font-bold" style={{ color: "#71717a" }}>الحالة</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500 font-cairo animate-pulse">
                    جاري التحميل بأمان...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-zinc-500 font-cairo">
                    لا توجد منتجات مسجلة.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="py-4 pr-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 relative overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image_url ? (
                            <Image src={p.image_url} alt={p.title} fill className="object-cover" sizes="48px" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="font-cairo">
                          <div className="font-bold text-white">{p.title}</div>
                          {p.short_description && <div className="text-xs text-zinc-500">{p.short_description}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-white">{p.price} ج.م</TableCell>
                    <TableCell className="text-zinc-400">{p.sales || 0}</TableCell>
                    <TableCell>
                      <Badge className={
                        p.status === 'نشط' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        p.status === 'مسودة' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-zinc-800 text-zinc-500"
                      }>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 text-zinc-500 hover:bg-zinc-800 hover:text-white rounded-lg flex items-center justify-center outline-none">
                          ...
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800">
                          <DropdownMenuItem onClick={() => setEditProduct(p)} className="cursor-pointer text-zinc-300 hover:bg-zinc-800">
                            <Edit2 className="w-4 h-4 ml-2" /> تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteProduct(p)} className="cursor-pointer text-red-400 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4 ml-2" /> حذف
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

      {/* Modals */}
      <ProductFormDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={fetchProducts} />
      {editProduct && (
        <ProductFormDialog open initial={editProduct} onClose={() => setEditProduct(null)} onSaved={fetchProducts} />
      )}
      {deleteProduct && (
        <DeleteDialog product={deleteProduct} onClose={() => setDeleteProduct(null)} onDeleted={fetchProducts} />
      )}
    </div>
  );
}
