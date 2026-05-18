"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { Plus, Trash2, Edit2, Loader2, Save, X, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  order_index: number;
}

export default function CourseCategoriesAdminPage() {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CourseCategory>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabaseClient
      .from("course_categories")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      if (error.code !== "42P01") { // Ignore table not found initially
        toast.error("حدث خطأ أثناء جلب الأقسام");
      }
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async () => {
    if (!editForm.name || !editForm.slug) {
      toast.error("يرجى إدخال اسم القسم والرابط (Slug)");
      return;
    }

    setIsSaving(true);
    if (isEditing === "new") {
      const { error } = await supabaseClient.from("course_categories").insert([{
        name: editForm.name,
        slug: editForm.slug,
        order_index: editForm.order_index || categories.length + 1
      }]);
      
      if (error) {
        toast.error("حدث خطأ أثناء إضافة القسم. تأكد من عدم تكرار الـ Slug");
      } else {
        toast.success("تم إضافة القسم بنجاح");
        setIsEditing(null);
        fetchCategories();
      }
    } else {
      const { error } = await supabaseClient.from("course_categories").update({
        name: editForm.name,
        slug: editForm.slug,
        order_index: editForm.order_index
      }).eq("id", isEditing);

      if (error) {
        toast.error("حدث خطأ أثناء تحديث القسم");
      } else {
        toast.success("تم تحديث القسم بنجاح");
        setIsEditing(null);
        fetchCategories();
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا القسم؟ قد يؤثر ذلك على الدورات المرتبطة به.")) return;
    
    const { error } = await supabaseClient.from("course_categories").delete().eq("id", id);
    if (error) {
      toast.error("حدث خطأ أثناء حذف القسم");
    } else {
      toast.success("تم حذف القسم بنجاح");
      fetchCategories();
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
    return name.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "");
  };

  return (
    <div className="p-4 md:p-8 space-y-8 font-cairo">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-alexandria font-black text-white">إدارة أقسام الدورات</h1>
          <p className="text-zinc-400 mt-2 text-sm md:text-base">تحكم كامل بتصنيفات ومسارات التعلم المعروضة في المنصة.</p>
        </div>
        <button 
          onClick={startAddNew}
          disabled={isEditing === "new"}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          إضافة قسم جديد
        </button>
      </div>

      <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-zinc-400 text-sm font-bold">
                  <th className="p-4">الترتيب</th>
                  <th className="p-4">اسم القسم</th>
                  <th className="p-4">الـ Slug</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {isEditing === "new" && (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 bg-emerald-500/10"
                    >
                      <td className="p-4">
                        <input 
                          type="number" 
                          value={editForm.order_index || ""} 
                          onChange={(e) => setEditForm({ ...editForm, order_index: Number(e.target.value) })}
                          className="w-16 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white text-center"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="text" 
                          value={editForm.name || ""} 
                          placeholder="مثال: دورات التسويق"
                          onChange={(e) => {
                            setEditForm({ 
                              ...editForm, 
                              name: e.target.value,
                              slug: generateSlug(e.target.value)
                            });
                          }}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="text" 
                          value={editForm.slug || ""} 
                          onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-300 text-left font-mono text-sm"
                          dir="ltr"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={handleSave} disabled={isSaving} className="p-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-colors">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setIsEditing(null)} className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )}

                  {categories.map((cat) => (
                    <tr key={cat.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      {isEditing === cat.id ? (
                        <>
                          <td className="p-4">
                            <input 
                              type="number" 
                              value={editForm.order_index || ""} 
                              onChange={(e) => setEditForm({ ...editForm, order_index: Number(e.target.value) })}
                              className="w-16 bg-[#0f0f15] border border-white/10 rounded-lg px-2 py-1 text-white text-center"
                            />
                          </td>
                          <td className="p-4">
                            <input 
                              type="text" 
                              value={editForm.name || ""} 
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full bg-[#0f0f15] border border-white/10 rounded-lg px-3 py-1.5 text-white"
                            />
                          </td>
                          <td className="p-4">
                            <input 
                              type="text" 
                              value={editForm.slug || ""} 
                              onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                              className="w-full bg-[#0f0f15] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-300 text-left font-mono text-sm"
                              dir="ltr"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={handleSave} disabled={isSaving} className="p-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-colors">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setIsEditing(null)} className="p-2 bg-zinc-500/20 hover:bg-zinc-500 text-zinc-400 hover:text-white rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 font-mono text-zinc-400">#{cat.order_index}</td>
                          <td className="p-4 font-bold text-white flex items-center gap-2">
                            <AlignLeft className="w-4 h-4 text-emerald-500" />
                            {cat.name}
                          </td>
                          <td className="p-4 font-mono text-sm text-zinc-500" dir="ltr">{cat.slug}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(cat)} className="p-2 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {categories.length === 0 && isEditing !== "new" && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-zinc-500">
                        لا توجد أقسام حالياً. الرجاء إضافة قسم جديد.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


