"use client";

import { useState, useEffect } from "react";
import { 
  Folder, Image as ImageIcon, FileText, Video, Archive, 
  Search, Trash2, Copy, CheckCircle, Loader2, Upload, AlertTriangle
} from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

export default function AdminMediaLibraryPage() {
  const [bucket, setBucket] = useState<"course-images" | "course-materials">("course-images");
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [bucket]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient.storage.from(bucket).list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" }
      });

      if (error) {
        throw error;
      }

      setFiles((data as any[]) || []);
    } catch (err: any) {
      console.error("Error loading files:", err.message);
      // fallback mock list for standard safety if remote not initialized
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    try {
      const publicUrl = await uploadFile(selectedFile, bucket, "library");
      toast.success("تم رفع الملف بنجاح وإضافته إلى مكتبة الوسائط! 🚀");
      loadFiles();
    } catch (err: any) {
      toast.error(err.message || "خطأ أثناء رفع الملف.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الملف نهائياً؟ لا يمكن استعادة الملف بعد حذفه.")) return;
    try {
      const { error } = await supabaseClient.storage.from(bucket).remove([fileName]);
      if (error) throw error;
      toast.success("تم حذف الملف بنجاح!");
      loadFiles();
    } catch (err: any) {
      toast.error(`فشل حذف الملف: ${err.message}`);
    }
  };

  const handleCopyLink = (fileName: string) => {
    const { data: { publicUrl } } = supabaseClient.storage.from(bucket).getPublicUrl(fileName);
    navigator.clipboard.writeText(publicUrl);
    setCopiedFile(fileName);
    toast.success("تم نسخ الرابط المباشر إلى الحافظة! 🔗");
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // Calculations for storage size
  const totalSizeBytes = files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
  const totalSizeMB = Number((totalSizeBytes / (1024 * 1024)).toFixed(2));
  const storageLimitMB = 100; // 100MB target logic for client view
  const percentUsed = Math.min(100, Number(((totalSizeMB / storageLimitMB) * 100).toFixed(1)));

  // Filter files
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getFileIcon = (mime: string) => {
    if (!mime) return <FileText className="w-8 h-8 text-zinc-500" />;
    if (mime.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-rose-500" />;
    if (mime.startsWith("video/")) return <Video className="w-8 h-8 text-blue-500" />;
    if (mime.includes("pdf")) return <FileText className="w-8 h-8 text-emerald-500" />;
    if (mime.includes("zip") || mime.includes("rar")) return <Archive className="w-8 h-8 text-amber-500" />;
    return <FileText className="w-8 h-8 text-zinc-400" />;
  };

  return (
    <div className="space-y-8 pb-32">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-alexandria font-black text-white">مكتبة الوسائط السحابية</h1>
          <p className="text-zinc-400 text-sm mt-1">تصفح وارفع ونظم جميع الملفات والصور ومرفقات الكورسات المرفوعة على خوادم Supabase Storage.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR: Upload and Storage Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Storage Quota Card */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 space-y-4">
            <h3 className="font-alexandria font-bold text-white text-xs uppercase tracking-wider text-zinc-400">سعة التخزين الحالية</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-xs font-bold font-mono">
                <span className="text-white">{totalSizeMB} ميجابايت</span>
                <span className="text-zinc-500">من {storageLimitMB} ميجابايت</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    percentUsed > 80 ? "bg-red-500" : percentUsed > 50 ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-500">
                <span>{percentUsed}% مستخدمة</span>
                <span>باقي {Number((storageLimitMB - totalSizeMB).toFixed(1))} ميجابايت</span>
              </div>
            </div>

            {percentUsed > 80 && (
              <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-red-400 text-[11px] leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>اقتربت سعة التخزين المجانية من النفاد. قد ترغب في تنظيف الملفات القديمة.</span>
              </div>
            )}
          </div>

          {/* Quick Upload Button */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white">رفع ملف جديد لمكتبة الوسائط</h4>
              <p className="text-[10px] text-zinc-500 mt-1">الحد الأقصى لحجم الملف 20 ميجابايت</p>
            </div>
            
            <label className={cn(
              "h-11 w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/10",
              uploading && "opacity-50 pointer-events-none"
            )}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الرفع...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>اختر ملف للرفع</span>
                </>
              )}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* FILE EXPLORER */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs & Search */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Buckets selector */}
            <div className="flex gap-2">
              <button 
                onClick={() => setBucket("course-images")}
                className={cn(
                  "h-10 px-5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer",
                  bucket === "course-images" ? "bg-rose-600 text-white" : "bg-white/5 hover:bg-white/10 text-zinc-400"
                )}
              >
                <ImageIcon className="w-4 h-4" />
                <span>صور الكورسات والغلاف</span>
              </button>
              <button 
                onClick={() => setBucket("course-materials")}
                className={cn(
                  "h-10 px-5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer",
                  bucket === "course-materials" ? "bg-rose-600 text-white" : "bg-white/5 hover:bg-white/10 text-zinc-400"
                )}
              >
                <Folder className="w-4 h-4" />
                <span>ملفات ومرفقات المنهج</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="ابحث باسم الملف..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 pr-10 text-xs w-full focus:border-rose-500/50"
              />
            </div>
          </div>

          {/* Files Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-20 bg-[#0a0a0f] border border-white/5 rounded-3xl">
              <Folder className="w-16 h-16 text-zinc-700 mx-auto mb-4 animate-bounce" />
              <p className="text-zinc-500 font-bold mb-2">لا توجد ملفات متوفرة حالياً.</p>
              <p className="text-zinc-600 text-xs">ارفع أول ملف لك الآن أو عدل فلتر البحث.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map(file => {
                const isImage = file.metadata?.mimetype?.startsWith("image/");
                const { data: { publicUrl } } = supabaseClient.storage.from(bucket).getPublicUrl(file.name);

                return (
                  <div key={file.name} className="bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col group hover:border-white/10 transition-all">
                    {/* Visual Preview */}
                    <div className="h-28 bg-black/40 border-b border-white/5 relative flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img 
                          src={publicUrl} 
                          alt={file.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        getFileIcon(file.metadata?.mimetype)
                      )}
                      
                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleCopyLink(file.name)}
                          className="p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg transition-colors cursor-pointer"
                          title="نسخ الرابط المباشر"
                        >
                          {copiedFile === file.name ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDeleteFile(file.name)}
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="حذف الملف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                      <p className="text-xs font-bold text-white truncate text-right w-full" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>{Number(((file.metadata?.size || 0) / 1024).toFixed(1))} KB</span>
                        <span>{new Date(file.created_at).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
