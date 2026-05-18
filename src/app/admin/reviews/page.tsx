"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Star, Save, Trash2, Plus, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/products";

interface Review {
  id: string;
  productId: string;
  firstName: string;
  lastName: string;
  rating: number;
  text: string;
  avatarUrl: string;
  gender?: string;
  isVerified: boolean;
  isHidden: boolean;
  createdAt: string;
}

const MALE_SEEDS = ["Felix", "Oliver", "Charlie", "Jack", "Liam", "Noah", "James", "Ethan"];
const FEMALE_SEEDS = ["Mia", "Lily", "Emma", "Sara", "Luna", "Aria", "Zoe", "Chloe"];

const getAvatarUrl = (firstName: string, gender?: string) => {
  const seeds = gender === "female" ? FEMALE_SEEDS : MALE_SEEDS;
  let hash = 0;
  for (let i = 0; i < firstName.length; i++) {
    hash = firstName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const chosen = seeds[Math.abs(hash) % seeds.length];
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${chosen}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;
};

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // New review state
  const [newReview, setNewReview] = useState({
    productId: "",
    firstName: "",
    lastName: "",
    rating: 5,
    text: "",
    avatarUrl: "",
    gender: "male",
    isVerified: true,
    isHidden: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, { data: productsData }] = await Promise.all([
        fetch("/api/admin/reviews"),
        supabase.from("products").select("id, title, image_url").neq("status", "مخفي")
      ]);
      
      const reviewsData = await reviewsRes.json();
      if (!reviewsRes.ok) throw new Error(reviewsData.error);
      
      setReviews(reviewsData);
      if (productsData) setProducts(productsData as Product[]);
      
    } catch (err) {
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newReview.productId || !newReview.firstName || !newReview.text) {
      toast.error("يرجى تعبئة الحقول الأساسية (المنتج، الاسم، النص)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("تم إضافة التقييم بنجاح");
      setReviews([data.review, ...reviews]);
      setIsAdding(false);
      setNewReview({
        productId: products[0]?.id || "",
        firstName: "",
        lastName: "",
        rating: 5,
        text: "",
        avatarUrl: "",
        gender: "male",
        isVerified: true,
        isHidden: false,
      });
    } catch (err) {
      toast.error("فشل حفظ التقييم");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setReviews(reviews.filter(r => r.id !== id));
      toast.success("تم الحذف بنجاح");
    } catch {
      toast.error("فشل الحذف");
    }
  };

  const handleToggleHide = async (review: Review) => {
    try {
      const res = await fetch(`/api/admin/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, isHidden: !review.isHidden }),
      });
      if (!res.ok) throw new Error();
      setReviews(reviews.map(r => r.id === review.id ? { ...r, isHidden: !r.isHidden } : r));
      toast.success(review.isHidden ? "تم إظهار التقييم" : "تم إخفاء التقييم");
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.title || "منتج غير معروف";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-2 md:p-8 font-cairo">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-alexandria font-black text-white mb-3">إدارة التقييمات</h1>
          <p className="text-zinc-400">تحكم كامل في آراء العملاء المعروضة على صفحات المنتجات</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="h-12 px-6 bg-[#D6004B] hover:bg-[#ff0059] text-white font-bold rounded-xl flex items-center gap-2 transition-all"
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? "إلغاء الإضافة" : "إضافة تقييم جديد"}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0a0a0f] p-8 rounded-[2rem] border border-white/5 mb-8">
              <h3 className="text-2xl font-alexandria font-bold text-white mb-6">إنشاء تقييم جديد</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3 md:col-span-2">
                  <Label className="text-zinc-300 font-bold">المنتج المرتبط بالتقييم</Label>
                  <select 
                    value={newReview.productId}
                    onChange={(e) => setNewReview({...newReview, productId: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-cairo outline-none focus:border-rose-500"
                  >
                    <option value="" disabled className="bg-zinc-900 text-zinc-400">-- اختر منتجاً --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="bg-zinc-900 text-white">{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <Label className="text-zinc-300 font-bold">الاسم الأول (يظهر كامل)</Label>
                  <Input 
                    value={newReview.firstName}
                    onChange={(e) => setNewReview({...newReview, firstName: e.target.value})}
                    placeholder="مثال: أحمد"
                    className="h-12 bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-zinc-300 font-bold">اسم العائلة (يظهر الحرف الأول فقط)</Label>
                  <Input 
                    value={newReview.lastName}
                    onChange={(e) => setNewReview({...newReview, lastName: e.target.value})}
                    placeholder="مثال: محمود"
                    className="h-12 bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-zinc-300 font-bold">جنس صاحب التقييم (للأفاتار الكرتوني)</Label>
                  <select 
                    value={newReview.gender}
                    onChange={(e) => setNewReview({...newReview, gender: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-cairo outline-none focus:border-rose-500"
                  >
                    <option value="male" className="bg-zinc-900 text-white">ذكر 🧔</option>
                    <option value="female" className="bg-zinc-900 text-white">أنثى 👩</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <Label className="text-zinc-300 font-bold">التقييم (عدد النجوم)</Label>
                  <div className="flex gap-2 bg-white/5 p-3 rounded-xl border border-white/10 w-fit cursor-pointer">
                    {[1,2,3,4,5].map(star => (
                      <Star 
                        key={star} 
                        onClick={() => setNewReview({...newReview, rating: star})}
                        className={`w-6 h-6 transition-colors ${newReview.rating >= star ? 'text-yellow-400 fill-current' : 'text-zinc-600'}`} 
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label className="text-zinc-300 font-bold">رابط صورة رمزية مخصصة (اختياري - يغطي على الأفاتار الكرتوني)</Label>
                  <Input 
                    value={newReview.avatarUrl}
                    onChange={(e) => setNewReview({...newReview, avatarUrl: e.target.value})}
                    placeholder="https://example.com/avatar.png"
                    className="h-12 bg-white/5 border-white/10 text-white dir-ltr text-left"
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label className="text-zinc-300 font-bold">نص التقييم</Label>
                  <textarea 
                    value={newReview.text}
                    onChange={(e) => setNewReview({...newReview, text: e.target.value})}
                    placeholder="اكتب ما قاله العميل..."
                    className="w-full h-32 p-4 rounded-xl bg-white/5 border border-white/10 text-white font-cairo outline-none focus:border-rose-500 resize-none custom-scrollbar"
                  />
                </div>

                <div className="space-y-4 md:col-span-2 bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <Label className="text-zinc-300 font-bold">علامة مشترٍ موثوق (Verified Purchase)</Label>
                    </div>
                    <Switch 
                      checked={newReview.isVerified}
                      onCheckedChange={(c) => setNewReview({...newReview, isVerified: c})}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-white/10">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 text-zinc-400 font-bold hover:text-white transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 bg-[#D6004B] hover:bg-[#ff0059] text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                  حفظ التقييم
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.length === 0 && !isAdding && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/5 rounded-[2rem] border border-white/5 border-dashed">
            <MessageSquareQuote className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-2xl font-alexandria font-bold text-white mb-2">لا توجد تقييمات بعد</h3>
            <p className="text-zinc-500">ابدأ بإضافة أول تقييم لزيادة الثقة والمبيعات.</p>
          </div>
        )}

        {reviews.map(review => (
          <div key={review.id} className={`bg-[#0a0a0f] p-6 rounded-[2rem] border transition-all ${review.isHidden ? 'border-red-500/30 opacity-50' : 'border-white/5 hover:border-rose-500/30'} flex flex-col`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white/10 relative">
                  {review.avatarUrl && !review.avatarUrl.includes("pravatar") ? (
                    <img src={review.avatarUrl} alt={review.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <img src={getAvatarUrl(review.firstName, review.gender)} alt={review.firstName} className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <h4 className="text-white font-alexandria font-bold text-sm">
                    {review.firstName} {review.lastName ? review.lastName.charAt(0) + "." : ""}
                  </h4>
                  {review.isVerified && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-bold">مشترٍ موثوق</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5 text-yellow-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-zinc-700 fill-transparent'}`} />
                ))}
              </div>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed mb-6 flex-1 italic">"{review.text}"</p>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>المنتج:</span>
                <span className="text-zinc-300 font-bold truncate max-w-[150px]">{getProductName(review.productId)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleHide(review)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${review.isHidden ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                >
                  {review.isHidden ? "إظهار" : "إخفاء"}
                </button>
                <button
                  onClick={() => handleDelete(review.id)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
