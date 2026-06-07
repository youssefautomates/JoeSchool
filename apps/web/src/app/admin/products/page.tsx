"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  Plus, Edit, Trash2, Video, Save, FileText, Link as LinkIcon, Download, 
  AlertCircle, Loader2, Image as ImageIcon, CheckCircle, Play, X, Sparkles, UploadCloud, FileUp, Globe, ArrowLeft, ArrowRight, Package, Eye
} from "lucide-react";
import { generateSlug, calcDiscount, type Product } from "@/lib/products";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/pricing";
import { uploadFile, uploadPrivateFile, deletePrivateFileFromUrl } from "@/lib/upload";
import { RichTextEditor } from "@/components/RichTextEditor";
import * as tus from "tus-js-client";

// ── Helper: Safe Image Src ───────────────────────────────────────────
function safeImageSrc(src: string) {
  if (!src) return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800";
  if (src.startsWith("file://")) return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800";
  return src;
}

// ── Helper: Pack/Unpack Tags ───────────────────────────────────────────
function unpackProduct(p: Product) {
  const tags = p.tags || [];
  
  // Unpack Arabic title (double safety: check new database field or metadata tag)
  const arabic_title = p.arabic_title || tags.find(t => t.startsWith("ar_title:"))?.replace("ar_title:", "") || "";
  
  // Unpack Video URL
  const video_url = tags.find(t => t.startsWith("video:"))?.replace("video:", "") || p.video_url || "";
  
  // Unpack 4 gallery slots (offset by 1, since slot 0 is cover)
  const gallery = Array(4).fill("");
  const mediaTags = tags.filter(t => t.startsWith("media:"));
  for (let i = 0; i < 4; i++) {
    const mediaTag = mediaTags.find(t => t.startsWith(`media:${i + 1}:image:`));
    if (mediaTag) {
      gallery[i] = mediaTag.split(":").slice(3).join(":");
    }
  }
  
  // Fallback to legacy gallery tags if no media tags exist
  const legacyGallery = tags.filter(t => t.startsWith("gallery:")).map(t => t.replace("gallery:", ""));
  for (let i = 0; i < 4; i++) {
    if (!gallery[i] && legacyGallery[i]) {
      gallery[i] = legacyGallery[i];
    }
  }

  const file_type = tags.find(t => t.startsWith("type:"))?.replace("type:", "") || p.file_type || "zip";
  const normalTags = tags.filter(t => 
    !t.startsWith("media:") && 
    !t.startsWith("video:") && 
    !t.startsWith("gallery:") && 
    !t.startsWith("type:") &&
    !t.startsWith("ar_title:")
  );
  
  return {
    ...p,
    arabic_title,
    video_url,
    gallery,
    file_type,
    displayTags: normalTags.join(", ")
  };
}

function packTags(form: any) {
  const tags: string[] = [];
  
  // Pack Arabic title into tags for compatibility
  if (form.arabic_title) {
    tags.push(`ar_title:${form.arabic_title}`);
  }
  
  // Pack Cover image into slide 0
  if (form.image_url) {
    tags.push(`media:0:image:${form.image_url}`);
  }
  
  // Pack Promo Video into tags and slide 0 if present
  if (form.video_url) {
    tags.push(`video:${form.video_url}`);
    tags.push(`media:0:video:${form.video_url}`);
  }
  
  // Pack gallery images as slides 1 to 4
  form.gallery.forEach((url: string, i: number) => {
    if (url) {
      tags.push(`media:${i + 1}:image:${url}`);
      tags.push(`gallery:${url}`); // legacy compat
    }
  });

  if (form.file_type) tags.push(`type:${form.file_type}`);
  
  if (form.displayTags) {
    form.displayTags.split(",").forEach((t: string) => {
      const trimmed = t.trim();
      if (trimmed) tags.push(trimmed);
    });
  }
  return tags;
}

// ── Upload Validation Safety Limits ──────────────────────────────────
const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

function validateImageFile(file: File): boolean {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    toast.error("Invalid image type. Allowed: JPEG, PNG, WebP, GIF, SVG.");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    toast.error("Image file is too large. Maximum size is 15MB.");
    return false;
  }
  return true;
}

function validateVideoFile(file: File): boolean {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    toast.error("Invalid video format. Allowed: MP4, MOV, WebM.");
    return false;
  }
  if (file.size > MAX_VIDEO_SIZE) {
    toast.error("Video file is too large. Maximum size is 500MB.");
    return false;
  }
  return true;
}

// ── Reorder Helper ───────────────────────────────────────────────────
function arraySwap<T>(arr: T[], indexA: number, indexB: number): T[] {
  const copy = [...arr];
  const temp = copy[indexA];
  copy[indexA] = copy[indexB];
  copy[indexB] = temp;
  return copy;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "form">("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form State
  const [form, setForm] = useState<any>({
    title: "", arabic_title: "", slug: "", description: "", short_description: "",
    price_egp: "", original_price_egp: "", price_usd: "", original_price_usd: "",
    status: "Active", is_featured: false, enable_gateway_fee: true,
    image_url: "", video_url: "", gallery: ["", "", "", ""],
    file_url: "", file_type: "zip", displayTags: "",
    seo_title: "", seo_description: ""
  });

  // Upload States
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Video direct Bunny upload states
  const [bunnyUploadStatus, setBunnyUploadStatus] = useState<"Queued" | "Uploading" | "Encoding" | "Ready" | "Failed" | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [bunnyEncodeProgress, setBunnyEncodeProgress] = useState<number>(0);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoFileSize, setVideoFileSize] = useState<string | null>(null);
  const [videoSourceTab, setVideoSourceTab] = useState<"upload" | "link">("upload");
  const [externalVideoInput, setExternalVideoInput] = useState("");
  const [fetchingVideoDetails, setFetchingVideoDetails] = useState(false);

  const tusUploadRef = useRef<tus.Upload | null>(null);
  const pollingIntervalRef = useRef<any>(null);

  // Load Initial Data
  useEffect(() => {
    fetchProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("name")
        .order("order_index", { ascending: true });
      if (!error && data) {
        setCategories(data.map((c: any) => c.name));
      }
    } catch (e) {
      console.warn("Could not load categories dynamically:", e);
    }
  };

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
      toast.error(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  // Toggles & Initializers
  const handleCreateNewProduct = () => {
    setSelectedProduct(null);
    setForm({
      title: "", arabic_title: "", slug: "", description: "", short_description: "",
      price_egp: "", original_price_egp: "", price_usd: "", original_price_usd: "",
      status: "Active", is_featured: false, enable_gateway_fee: true,
      image_url: "", video_url: "", gallery: ["", "", "", ""],
      file_url: "", file_type: "zip", displayTags: "",
      seo_title: "", seo_description: ""
    });
    setBunnyUploadStatus(null);
    setVideoUploadProgress(null);
    setBunnyEncodeProgress(0);
    setVideoFileName(null);
    setVideoFileSize(null);
    setVideoSourceTab("upload");
    setExternalVideoInput("");
    setView("form");
  };

  const handleEditProduct = (product: Product) => {
    const unpacked = unpackProduct(product);
    setSelectedProduct(product);
    setForm({
      title: unpacked.title || "",
      arabic_title: unpacked.arabic_title || "",
      slug: unpacked.slug || "",
      description: unpacked.description || "",
      short_description: unpacked.short_description || "",
      price_egp: unpacked.price_egp !== undefined && unpacked.price_egp !== null ? String(unpacked.price_egp) : String(unpacked.price || ""),
      original_price_egp: unpacked.original_price_egp !== undefined && unpacked.original_price_egp !== null ? String(unpacked.original_price_egp) : String(unpacked.original_price || ""),
      price_usd: unpacked.price_usd !== undefined && unpacked.price_usd !== null ? String(unpacked.price_usd) : "",
      original_price_usd: unpacked.original_price_usd !== undefined && unpacked.original_price_usd !== null ? String(unpacked.original_price_usd) : "",
      status: unpacked.status === "\u0646\u0634\u0637" ? "Active" : unpacked.status === "\u0645\u0633\u0648\u062f\u0629" ? "Draft" : unpacked.status === "\u0645\u062e\u0641\u064a" ? "Hidden" : unpacked.status,
      is_featured: !!unpacked.is_featured,
      enable_gateway_fee: unpacked.enable_gateway_fee !== false,
      image_url: unpacked.image_url || "",
      video_url: unpacked.video_url || "",
      gallery: Array.isArray(unpacked.gallery) ? [...unpacked.gallery] : ["", "", "", ""],
      file_url: unpacked.file_url || "",
      file_type: unpacked.file_type || "zip",
      displayTags: unpacked.displayTags || "",
      seo_title: unpacked.seo_title || "",
      seo_description: unpacked.seo_description || ""
    });

    setBunnyUploadStatus(null);
    setVideoUploadProgress(null);
    setBunnyEncodeProgress(0);
    setVideoFileName(null);
    setVideoFileSize(null);
    
    if (unpacked.video_url) {
      setVideoSourceTab("link");
      setExternalVideoInput(unpacked.video_url);
    } else {
      setVideoSourceTab("upload");
      setExternalVideoInput("");
    }

    setView("form");
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Product deleted successfully!");
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  // Image Client Upload Handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "image_url" | number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file)) return;

    const pathNamespace = field === "image_url" ? "products/covers" : "products/gallery";
    const uploadFieldKey = typeof field === "number" ? `gallery-${field}` : field;

    setUploadingField(uploadFieldKey);
    setUploadProgress(0);

    try {
      // Direct client-side storage upload (Course system style)
      const url = await uploadFile(file, "course-images", pathNamespace);
      if (!url) throw new Error("Upload returned an empty URL");

      if (field === "image_url") {
        setForm((prev: any) => ({ ...prev, image_url: url }));
      } else {
        const newGallery = [...form.gallery];
        newGallery[field] = url;
        setForm((prev: any) => ({ ...prev, gallery: newGallery }));
      }
      toast.success("Image uploaded successfully! 🖼️");
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploadingField(null);
      setUploadProgress(null);
    }
  };

  // Private File Deliverable Upload Handler
  const handleDeliverableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size is too large. Maximum size is 500MB.");
      return;
    }

    setUploadingField("file_url");
    setUploadProgress(0);

    try {
      // Direct upload to private bucket under products/downloads namespace
      const url = await uploadPrivateFile(file, "lesson-assets", "products/downloads", (pct) => {
        setUploadProgress(pct);
      });

      if (!url) throw new Error("Upload returned an empty URL");

      setForm((prev: any) => ({ ...prev, file_url: url }));
      toast.success("Private deliverable file uploaded! 🔒");
    } catch (err: any) {
      toast.error(err.message || "File upload failed");
    } finally {
      setUploadingField(null);
      setUploadProgress(null);
    }
  };

  // Bunny Stream Video Upload Handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateVideoFile(file)) return;

    setVideoFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setVideoFileSize(`${sizeInMB} MB`);

    cancelVideoUpload();

    setBunnyUploadStatus('Uploading');
    setVideoUploadProgress(0);
    setBunnyEncodeProgress(0);

    try {
      // 1. Create placeholder and retrieve TUS credentials from backend
      const createRes = await fetch(`/api/admin/bunny/create-video`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: form.title || file.name })
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || createRes.statusText);
      }
      const { videoId, signature, expiry, libraryId } = await createRes.json();

      // 2. Perform client-side direct TUS upload to Bunny Stream
      const upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          AuthorizationSignature: signature,
          AuthorizationExpire: expiry.toString(),
          VideoId: videoId,
          LibraryId: libraryId,
        },
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          if (!error.message.includes("abort")) {
            throw new Error(error.message);
          }
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setVideoUploadProgress(percentage);
        },
        onSuccess: () => {
          // Polling status
          setBunnyUploadStatus('Encoding');
          setVideoUploadProgress(0);

          const interval = setInterval(async () => {
            try {
              const res = await fetch(`/api/admin/bunny/video?videoId=${videoId}`);
              if (!res.ok) return;
              const data = await res.json();
              
              if (data.status === 3 || data.status === 4) {
                clearInterval(interval);
                pollingIntervalRef.current = null;
                setBunnyUploadStatus('Ready');
                setVideoUploadProgress(100);
                
                const playUrl = `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}/playlist.m3u8`;
                setForm((prev: any) => ({ ...prev, video_url: playUrl }));
                toast.success(`Video processed successfully! 🚀`);
              } else if (data.status === 5 || data.status === 8) {
                clearInterval(interval);
                pollingIntervalRef.current = null;
                setBunnyUploadStatus('Failed');
                toast.error("Failed to encode video on Bunny Stream.");
              } else {
                setBunnyEncodeProgress(data.encodeProgress || 0);
              }
            } catch (err: any) {
              console.warn("Polling error:", err);
            }
          }, 4000);

          pollingIntervalRef.current = interval;
        },
      });

      tusUploadRef.current = upload;
      upload.start();

    } catch (err: any) {
      setBunnyUploadStatus('Failed');
      toast.error(err.message || "Bunny Stream upload failed");
      setVideoFileName(null);
      setVideoFileSize(null);
    }
  };

  const cancelVideoUpload = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleLinkExternalVideo = () => {
    if (!externalVideoInput) {
      toast.error("Please enter a video URL or ID");
      return;
    }
    setForm((prev: any) => ({ ...prev, video_url: externalVideoInput }));
    toast.success("External video link set!");
  };

  // Safe Deletes (No hard-deletes from storage without explicit actions)
  const handleDeleteMedia = (field: "image_url" | "video_url" | number) => {
    if (!confirm("Remove this media URL? (The file remains in storage unless explicitly deleted)")) return;
    if (field === "image_url") {
      setForm((prev: any) => ({ ...prev, image_url: "" }));
    } else if (field === "video_url") {
      setForm((prev: any) => ({ ...prev, video_url: "" }));
      cancelVideoUpload();
      setBunnyUploadStatus(null);
      setVideoUploadProgress(null);
    } else {
      const newGallery = [...form.gallery];
      newGallery[field] = "";
      setForm((prev: any) => ({ ...prev, gallery: newGallery }));
    }
  };

  // Save Functionality
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Product title is required"); return; }
    if (!form.price_egp || isNaN(Number(form.price_egp))) { toast.error("Price in EGP is invalid"); return; }

    setSaving(true);
    const price_egp = parseFloat(form.price_egp);
    const original_price_egp = form.original_price_egp ? parseFloat(form.original_price_egp) : null;
    const price_usd = form.price_usd ? parseFloat(form.price_usd) : 0;
    const original_price_usd = form.original_price_usd ? parseFloat(form.original_price_usd) : null;

    let finalImageUrl = form.image_url || "";
    if (!finalImageUrl) {
      finalImageUrl = form.gallery.find((g: string) => g) || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800";
    }

    const mappedStatus = form.status === "Active" ? "\u0646\u0634\u0637" : form.status === "Draft" ? "\u0645\u0633\u0648\u062f\u0629" : "\u0645\u062e\u0641\u064a";
    
    // Category mapping: match dynamic category strings or fallback
    let mappedCategory = form.category;
    if (form.category === "Automation") mappedCategory = "\u0627\u0644\u0623\u062a\u0645\u062a\u0629";
    else if (form.category === "Artificial Intelligence") mappedCategory = "\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a";
    else if (form.category === "Content Creation") mappedCategory = "\u0635\u0646\u0627\u0639\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649";

    const payload = {
      title: form.title.trim(),
      arabic_title: form.arabic_title.trim() || null, // Write directly to schema column
      slug: form.slug.trim() || generateSlug(form.title),
      description: form.description,
      short_description: form.short_description,
      price: price_egp,
      original_price: original_price_egp,
      price_egp,
      original_price_egp,
      price_usd,
      original_price_usd,
      discount_pct: calcDiscount(price_egp, original_price_egp),
      status: mappedStatus,
      is_featured: form.is_featured,
      enable_gateway_fee: form.enable_gateway_fee !== false,
      image_url: finalImageUrl,
      file_url: form.file_url || null,
      category: mappedCategory,
      tags: packTags(form),
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null
    };

    try {
      if (selectedProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", selectedProduct.id);
        if (error) throw error;
        toast.success("Product updated successfully! 🎉");
      } else {
        const { error } = await supabase.from("products").insert({ ...payload, sales: 0, views: 0 });
        if (error) throw error;
        toast.success("Product created successfully! 🚀");
      }
      fetchProducts();
      setView("list");
    } catch (err: any) {
      toast.error(err.message || "Failed to save product changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-2 md:p-6 text-left font-sans" style={{ minHeight: "100vh" }} dir="ltr">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white font-sans tracking-tight">
            {view === "list" ? "Digital Products Hub" : selectedProduct ? "Edit Product Asset" : "Add Product Asset"}
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            {view === "list" 
              ? `${products.length} registered digital products in the store database`
              : "Premium workspace for uploading, pricing, and configuring digital assets"}
          </p>
        </div>
        
        {view === "list" ? (
          <button
            onClick={handleCreateNewProduct}
            className="flex items-center justify-center gap-2 px-6 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-lg shadow-rose-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Product
          </button>
        ) : (
          <button
            onClick={() => setView("list")}
            className="flex items-center justify-center gap-2 px-6 h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs border border-white/5 transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" /> Back to Hub
          </button>
        )}
      </div>

      {/* VIEW: LIST (Matching Courses visual card grid) */}
      {view === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-96 rounded-3xl bg-white/5 animate-pulse" />)
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl">
              <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold mb-4">No digital products registered yet.</p>
              <button onClick={handleCreateNewProduct} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" /> Create Your First Product
              </button>
            </div>
          ) : (
            products.map((p) => {
              return (
                <div key={p.id} className="bg-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-white/10 transition-all group">
                  <div className="relative h-44 bg-zinc-900 border-b border-white/5">
                    <img src={safeImageSrc(p.image_url)} alt={p.title} className="w-full h-full object-cover opacity-85 group-hover:scale-103 transition-transform duration-500" />
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border border-none",
                        p.status === '\u0646\u0634\u0637' || p.status === 'Active' || (p.status as string) === 'active' ? "bg-emerald-950 text-emerald-400" :
                        p.status === '\u0645\u0633\u0648\u062f\u0629' || p.status === 'Draft' || (p.status as string) === 'draft' ? "bg-amber-950 text-amber-400" :
                        "bg-zinc-800 text-zinc-400"
                      )}>
                        {p.status === '\u0646\u0634\u0637' || p.status === 'Active' || (p.status as string) === 'active' ? 'Active' : p.status === '\u0645\u0633\u0648\u062f\u0629' || p.status === 'Draft' || (p.status as string) === 'draft' ? 'Draft' : p.status === '\u0645\u062e\u0641\u064a' || p.status === 'Hidden' || (p.status as string) === 'hidden' ? 'Hidden' : p.status}
                      </span>
                      {p.is_featured && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-900/30">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                        {p.category === "\u0627\u0644\u0623\u062a\u0645\u062a\u0629" || p.category === "Automation" ? "Automation" : p.category === "\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a" || p.category === "Artificial Intelligence" ? "Artificial Intelligence" : p.category === "\u0635\u0646\u0627\u0639\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649" || p.category === "Content Creation" ? "Content Creation" : p.category}
                      </span>
                      <h3 className="text-base font-alexandria font-bold text-white line-clamp-2">{p.title}</h3>
                      {p.arabic_title && <p className="text-xs text-zinc-400 font-bold font-cairo line-clamp-1">{p.arabic_title}</p>}
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-rose-400 text-sm font-bold font-sans">
                          {formatPrice(Number(p.price_egp || p.price), 'EGP').replace("EGP", "L.E")}
                        </span>
                        <span className="text-emerald-400 text-[10px] font-sans">
                          ${p.price_usd || 0}
                        </span>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Sales & Views</span>
                        <span className="text-zinc-400 text-xs font-bold font-sans mt-0.5">
                          {p.sales || 0} purchases / {p.views || 0} clicks
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleEditProduct(p)} className="h-10 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                        <Edit className="w-3.5 h-3.5" /> <span>Manage Asset</span>
                      </button>
                      <button onClick={() => handleDeleteProduct(p.id, p.title)} className="h-10 rounded-xl bg-red-950/15 border border-red-900/10 hover:bg-red-950/30 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW: FORM (Premium Rebuilt Workspace) */}
      {view === "form" && (
        <form onSubmit={handleSave} className="space-y-10">
          
          {/* Section 1: Basic Digital Product Info */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
              <h2 className="text-lg font-alexandria font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-rose-500" />
                Product Details
              </h2>
              <button
                type="submit"
                disabled={saving || uploadingField !== null}
                className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg text-xs cursor-pointer disabled:opacity-55"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">English Title (Main) *</label>
                <input 
                  required 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm focus:border-rose-500/50 text-white outline-none" 
                  placeholder="e.g. n8n Professional Templates Bundle" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Arabic Title Support</label>
                <input 
                  value={form.arabic_title} 
                  onChange={e => setForm({ ...form, arabic_title: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm focus:border-rose-500/50 text-white outline-none text-left font-sans" 
                  placeholder="e.g. Premium Automation Templates Bundle" 
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Slug</label>
                <input 
                  value={form.slug} 
                  onChange={e => setForm({ ...form, slug: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm text-zinc-300 outline-none" 
                  placeholder="auto-generated-slug" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Category Selector</label>
                <select 
                  value={form.category} 
                  onChange={e => setForm({ ...form, category: e.target.value })} 
                  className="bg-[#0f0f15] border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white outline-none cursor-pointer"
                >
                  {(categories.length > 0 ? categories : ["AI Content Creation", "AI Animation", "Creative Video Production", "Digital Storytelling"]).map((cat) => (
                    <option key={cat} value={cat} className="bg-[#0f0f15]">{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Product Status</label>
                <select 
                  value={form.status} 
                  onChange={e => setForm({ ...form, status: e.target.value as any })} 
                  className="bg-[#0f0f15] border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white outline-none cursor-pointer"
                >
                  <option value="Active" className="bg-[#0f0f15]">Active (Visible in store)</option>
                  <option value="Draft" className="bg-[#0f0f15]">Draft (Internal preview)</option>
                  <option value="Hidden" className="bg-[#0f0f15]">Hidden (Completely invisible)</option>
                </select>
              </div>

              <div className="flex items-center gap-4 bg-white/[0.01] border border-white/5 rounded-xl p-4 mt-4">
                <input 
                  type="checkbox" 
                  id="isFeaturedProductCheckbox"
                  checked={form.is_featured} 
                  onChange={e => setForm({ ...form, is_featured: e.target.checked })} 
                  className="w-4 h-4 text-rose-600 border-white/10 rounded focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="isFeaturedProductCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer select-none">
                  Featured Product (Highlight in main storefront collection)
                </label>
              </div>

              <div className="flex flex-col gap-1.5 bg-white/[0.01] border border-white/5 rounded-xl p-4 mt-2">
                <div className="flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    id="enableGatewayFeeCheckbox"
                    checked={form.enable_gateway_fee !== false} 
                    onChange={e => setForm({ ...form, enable_gateway_fee: e.target.checked })} 
                    className="w-4 h-4 text-rose-600 border-white/10 rounded focus:ring-rose-500 cursor-pointer accent-rose-600"
                  />
                  <label htmlFor="enableGatewayFeeCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer select-none">
                    Enable Payment Processing Fee Recovery (3%)
                  </label>
                </div>
                <p className="text-[10px] text-zinc-500 pl-8 leading-relaxed">
                  Adds a small processing fee during checkout to help cover secure payment gateway transaction costs.
                </p>
              </div>

            </div>
          </div>

          {/* Section 2: Pricing System */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-lg font-alexandria font-bold text-white mb-6 border-b border-white/5 pb-4">
              Pricing System
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-rose-400">Price in EGP *</label>
                <input 
                  type="number" 
                  required 
                  value={form.price_egp} 
                  onChange={e => setForm({ ...form, price_egp: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm focus:border-rose-500/50 text-white outline-none" 
                  placeholder="e.g. 500" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Original Price (EGP) - Crossed out</label>
                <input 
                  type="number" 
                  value={form.original_price_egp} 
                  onChange={e => setForm({ ...form, original_price_egp: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm focus:border-rose-500/50 text-white outline-none" 
                  placeholder="e.g. 1000" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-emerald-400">Price in USD *</label>
                <input 
                  type="number" 
                  required 
                  value={form.price_usd} 
                  onChange={e => setForm({ ...form, price_usd: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm focus:border-emerald-550/50 text-white outline-none" 
                  placeholder="e.g. 15" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Original Price (USD) - Crossed out</label>
                <input 
                  type="number" 
                  value={form.original_price_usd} 
                  onChange={e => setForm({ ...form, original_price_usd: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm focus:border-emerald-550/50 text-white outline-none" 
                  placeholder="e.g. 30" 
                />
              </div>

            </div>
          </div>

          {/* Section 3: Descriptions */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-lg font-alexandria font-bold text-white mb-6 border-b border-white/5 pb-4">
              Description Workspace
            </h2>
            <div className="space-y-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Short Compelling Overview</label>
                <input 
                  value={form.short_description} 
                  onChange={e => setForm({ ...form, short_description: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white focus:border-rose-500/50 outline-none" 
                  placeholder="Appears directly under the title in card previews" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Full & Professional Rich description</label>
                <RichTextEditor 
                  label=""
                  value={form.description}
                  onChange={val => setForm((prev: any) => ({ ...prev, description: val }))}
                  placeholder="Write a highly-converting description detail for your storefront..."
                />
              </div>

            </div>
          </div>

          {/* Section 4: Advanced Media & Gallery System */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-lg font-alexandria font-bold text-white mb-6 border-b border-white/5 pb-4">
              Media & Assets System
            </h2>
            
            <div className="space-y-8">
              
              {/* Cover Image Upload (Course design style with Drag & Drop overlay) */}
              <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-rose-500" />
                  <span className="text-sm font-bold text-white">Cover Display Image (JPEG/PNG/WebP, max 15MB)</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* Drag-Drop Box */}
                  <div className="border-2 border-dashed border-white/10 hover:border-rose-500/40 rounded-xl p-8 text-center transition-all bg-black/25 relative group min-h-[140px] flex items-center justify-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, "image_url")}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      disabled={uploadingField === "image_url"}
                    />
                    
                    <div className="space-y-2">
                      <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-rose-500 mx-auto transition-colors" />
                      <div className="text-xs font-bold text-white">Drag cover image here or click to browse</div>
                      <p className="text-[10px] text-zinc-500">Public bucket: products/covers/</p>
                    </div>

                    {uploadingField === "image_url" && (
                      <div className="absolute inset-0 bg-[#0a0a0f]/95 rounded-xl flex flex-col items-center justify-center p-4 z-20">
                        <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                        <span className="text-[10px] text-zinc-400 font-bold mt-2">Uploading image...</span>
                      </div>
                    )}
                  </div>

                  {/* Preview Container */}
                  <div className="bg-black/35 rounded-xl p-4 border border-white/5 flex flex-col justify-center gap-3">
                    {form.image_url ? (
                      <div className="flex items-center gap-4">
                        <div className="relative w-28 aspect-video rounded-lg overflow-hidden border border-white/10 shrink-0">
                          <Image src={form.image_url} alt="Cover Preview" fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-zinc-500 block truncate font-mono">{form.image_url}</span>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteMedia("image_url")} 
                            className="mt-2 text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Cover
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-650 italic text-center py-6">No cover image uploaded. Will default to first gallery slot.</p>
                    )}
                    <input 
                      value={form.image_url} 
                      onChange={e => setForm({ ...form, image_url: e.target.value })} 
                      className="bg-white/5 border border-white/5 rounded-lg py-2 px-3 text-xs text-zinc-300 outline-none mt-1" 
                      placeholder="Or enter direct cover URL..." 
                    />
                  </div>

                </div>
              </div>

              {/* Promo Video (Course system implementation) */}
              <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-rose-500" />
                  <span className="text-sm font-bold text-white">Promotional Video Workspace (Max 500MB)</span>
                </div>

                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setVideoSourceTab("upload")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer",
                      videoSourceTab === "upload" ? "bg-rose-600 text-white" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    Upload Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSourceTab("link")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer",
                      videoSourceTab === "link" ? "bg-rose-600 text-white" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    Link External
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {videoSourceTab === "upload" && (
                    <div className="border-2 border-dashed border-white/10 hover:border-rose-500/40 rounded-xl p-8 text-center transition-all bg-black/25 relative group min-h-[140px] flex items-center justify-center">
                      <input 
                        type="file" 
                        accept="video/*" 
                        onChange={handleVideoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        disabled={bunnyUploadStatus === "Uploading" || bunnyUploadStatus === "Encoding"}
                      />
                      <div className="space-y-2">
                        <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-rose-500 mx-auto transition-colors" />
                        <div className="text-xs font-bold text-white">Drag video here or click to browse</div>
                        <p className="text-[10px] text-zinc-500">Supports direct upload pipeline to Bunny Stream</p>
                      </div>

                      {videoUploadProgress !== null && bunnyUploadStatus === "Uploading" && (
                        <div className="absolute inset-0 bg-[#0a0a0f]/95 rounded-xl flex flex-col items-center justify-center p-6 space-y-2 z-20">
                          <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                          <div className="w-full max-w-xs space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-white">
                              <span>Uploading to Bunny Stream...</span>
                              <span>{videoUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                              <div className="bg-rose-500 h-full" style={{ width: `${videoUploadProgress}%` }} />
                            </div>
                            <p className="text-[9px] text-zinc-500 truncate">{videoFileName} ({videoFileSize})</p>
                          </div>
                        </div>
                      )}

                      {bunnyUploadStatus === "Encoding" && (
                        <div className="absolute inset-0 bg-[#0a0a0f]/95 rounded-xl flex flex-col items-center justify-center p-6 space-y-2 z-20">
                          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                          <div className="w-full max-w-xs space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-white animate-pulse">
                              <span>Processing & Encoding video...</span>
                              <span>{bunnyEncodeProgress}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full" style={{ width: `${bunnyEncodeProgress}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {videoSourceTab === "link" && (
                    <div className="bg-black/35 rounded-xl p-6 border border-white/5 space-y-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-zinc-400">Video Link / Bunny HLS URL / YouTube URL</label>
                        <div className="flex gap-2">
                          <input 
                            value={externalVideoInput} 
                            onChange={e => setExternalVideoInput(e.target.value)} 
                            className="bg-white/5 border border-white/5 rounded-lg py-2 px-3 text-xs text-white outline-none flex-1" 
                            placeholder="https://iframe.mediadelivery.net/play/..."
                          />
                          <button 
                            type="button" 
                            onClick={handleLinkExternalVideo} 
                            className="px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Set Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Video Preview */}
                  <div className="bg-black/35 rounded-xl p-4 border border-white/5 min-h-[140px] flex flex-col justify-center items-center">
                    {form.video_url ? (
                      <div className="w-full space-y-3">
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/10">
                          {form.video_url.includes('youtube.com') || form.video_url.includes('youtu.be') ? (
                            <iframe 
                              src={`https://www.youtube.com/embed/${form.video_url.split('v=')[1]?.split('&')[0] || form.video_url.split('/').pop()}`}
                              className="w-full h-full border-none"
                              allowFullScreen
                            />
                          ) : (
                            <video src={form.video_url} className="w-full h-full object-cover" controls preload="metadata" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 truncate font-mono max-w-[180px]">{form.video_url}</span>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteMedia("video_url")} 
                            className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Video
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-650 italic text-center py-6">No promotional video linked or uploaded.</p>
                    )}
                  </div>

                </div>
              </div>

              {/* Gallery Items Upload Grid (4 slots, move & shift support) */}
              <div className="space-y-4">
                <span className="text-sm font-bold text-white block">Additional Image Gallery (JPEG/PNG/WebP, max 15MB)</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {form.gallery.map((url: string, idx: number) => {
                    const isUploading = uploadingField === `gallery-${idx}`;
                    return (
                      <div 
                        key={idx} 
                        className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between items-stretch gap-3 relative group"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 block">Gallery Slot {idx + 1}</span>
                        
                        {/* Drag and drop upload card */}
                        <div className="relative aspect-square rounded-xl overflow-hidden border border-dashed border-white/10 hover:border-rose-500/30 flex flex-col items-center justify-center bg-black/25">
                          {url ? (
                            <>
                              <img src={url} alt={`Gallery Slot ${idx}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <UploadCloud className="w-5 h-5 text-white" />
                                <span className="text-[9px] font-bold text-white uppercase">Replace</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-6 h-6 text-zinc-500 group-hover:text-rose-500 mb-1 transition-colors" />
                              <span className="text-[8px] font-black text-zinc-500 uppercase">Browse</span>
                            </>
                          )}

                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleImageUpload(e, idx)} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={isUploading}
                          />

                          {isUploading && (
                            <div className="absolute inset-0 bg-[#0a0a0f]/95 rounded-xl flex flex-col items-center justify-center z-20">
                              <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                              <span className="text-[8px] text-zinc-400 font-bold mt-2">Uploading...</span>
                            </div>
                          )}
                        </div>

                        {/* Input URL for manual backup */}
                        <input 
                          value={url} 
                          onChange={(e) => {
                            const newG = [...form.gallery];
                            newG[idx] = e.target.value;
                            setForm({ ...form, gallery: newG });
                          }}
                          className="bg-white/5 border border-white/5 rounded-lg py-1.5 px-2 text-[10px] text-zinc-300 outline-none font-mono" 
                          placeholder="Gallery URL..." 
                        />

                        {/* Slide tools: swap order (Move Left / Move Right), delete */}
                        {url && (
                          <div className="flex items-center justify-between border-t border-white/5 pt-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const swapped = arraySwap(form.gallery, idx, idx - 1);
                                  setForm((prev: any) => ({ ...prev, gallery: swapped }));
                                  toast.success("Shifted item left!");
                                }}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === form.gallery.length - 1}
                                onClick={() => {
                                  const swapped = arraySwap(form.gallery, idx, idx + 1);
                                  setForm((prev: any) => ({ ...prev, gallery: swapped }));
                                  toast.success("Shifted item right!");
                                }}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMedia(idx)}
                              className="p-1 rounded bg-red-950/15 border border-red-900/10 hover:bg-red-950/30 text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Section 5: Deliverables Workspace */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-lg font-alexandria font-bold text-white mb-6 border-b border-white/5 pb-4">
              Digital Deliverables
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold text-zinc-400 flex items-center justify-between">
                  <span>File Deliverable URL (Protected downloads)</span>
                  <label className="text-emerald-400 text-xs hover:underline flex items-center gap-1 cursor-pointer">
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload deliverable (Direct private storage)</span>
                    <input 
                      type="file" 
                      onChange={handleDeliverableUpload}
                      className="hidden" 
                      disabled={uploadingField !== null}
                    />
                  </label>
                </label>
                <div className="flex gap-2">
                  <input 
                    value={form.file_url} 
                    onChange={e => setForm({ ...form, file_url: e.target.value })} 
                    className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white focus:border-rose-500/50 outline-none flex-1 font-mono" 
                    placeholder="https://... (Deliverable file download URL)" 
                  />
                  {form.file_url && (
                    <button 
                      type="button"
                      onClick={() => setForm({ ...form, file_url: "" })}
                      className="p-3 bg-red-950/15 border border-red-900/10 text-red-500 rounded-xl flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {uploadingField === "file_url" && (
                  <div className="w-full bg-white/5 rounded-lg p-3 flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-400 font-bold">Uploading secure deliverable file: {uploadProgress}%</span>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">File Format Extension</label>
                <select 
                  value={form.file_type} 
                  onChange={e => setForm({ ...form, file_type: e.target.value })} 
                  className="bg-[#0f0f15] border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white outline-none cursor-pointer"
                >
                  <option value="zip" className="bg-[#0f0f15]">ZIP / Rar Archive</option>
                  <option value="pdf" className="bg-[#0f0f15]">PDF Document</option>
                  <option value="json" className="bg-[#0f0f15]">JSON Workflow File</option>
                  <option value="video" className="bg-[#0f0f15]">MP4 Video Deliverable</option>
                  <option value="link" className="bg-[#0f0f15]">External Redirection Link</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Search Keywords (Tags - comma separated)</label>
                <input 
                  value={form.displayTags} 
                  onChange={e => setForm({ ...form, displayTags: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white focus:border-rose-500/50 outline-none" 
                  placeholder="e.g. n8n, workflow, template" 
                />
              </div>

            </div>
          </div>

          {/* Section 6: SEO Metadata */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-lg font-alexandria font-bold text-white mb-6 border-b border-white/5 pb-4">
              SEO Engine Settings
            </h2>
            <div className="grid grid-cols-1 gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Meta Title</label>
                <input 
                  value={form.seo_title} 
                  onChange={e => setForm({ ...form, seo_title: e.target.value })} 
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white focus:border-rose-500/50 outline-none" 
                  placeholder="Title shown on Search Engines" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Meta Description</label>
                <textarea 
                  value={form.seo_description} 
                  onChange={e => setForm({ ...form, seo_description: e.target.value })} 
                  rows={4}
                  className="bg-white/5 border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white focus:border-rose-500/50 outline-none resize-none" 
                  placeholder="Short summary paragraph shown in search indexes..."
                />
              </div>

            </div>
          </div>

          {/* Footer Save Row */}
          <div className="p-6 bg-[#0a0a0f] border border-white/5 rounded-3xl flex items-center justify-between shadow-2xl">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">* Indicated fields are required</span>
            <button
              type="submit"
              disabled={saving || uploadingField !== null}
              className="h-14 px-10 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl hover:shadow-rose-600/30 cursor-pointer disabled:opacity-55"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Saving Product...
                </span>
              ) : "Save Product Asset"}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
