"use client";

import React, { useRef, useEffect, useState } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Video as VideoIcon,
  Undo, Redo, Sparkles, Trash2, Highlighter, Palette, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, label, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<"image" | "video">("image");
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  // Sync internal editor HTML with external value ONLY if they differ
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      updateActiveStates();
    }
  };

  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveStates();
    editorRef.current?.focus();
  };

  const updateActiveStates = () => {
    setActiveStates({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikethrough: document.queryCommandState("strikethrough"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  };

  const handleAddLink = () => {
    const url = prompt("أدخل رابط التشعب (URL):", "https://");
    if (url) {
      execCmd("createLink", url);
    }
  };

  const handleAddImage = () => {
    const url = prompt("أدخل رابط الصورة (يمكنك نسخه من مكتبة الوسائط السحابية):", "https://");
    if (url) {
      execCmd("insertImage", url);
    }
    setShowMediaMenu(false);
  };

  const triggerFileUpload = (type: "image" | "video") => {
    setUploadType(type);
    setShowMediaMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "image" ? "image/*" : "video/*";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(uploadType === "image" ? "جاري رفع الصورة إلى الخادم..." : "جاري رفع مقطع الفيديو إلى الخادم...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "courses-media");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "فشل رفع الملف");
      }

      if (uploadType === "image") {
        execCmd("insertImage", data.url);
        toast.success("تم رفع وإدراج الصورة بنجاح!", { id: toastId });
      } else {
        const videoHtml = `<br><video controls src="${data.url}" style="max-width: 100%; border-radius: 12px; margin: 12px 0; display: block;" class="luxury-video-embed"></video><br>`;
        execCmd("insertHTML", videoHtml);
        toast.success("تم رفع وإدراج الفيديو بنجاح!", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "حدث خطأ أثناء رفع الملف", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCmd("formatBlock", e.target.value);
  };

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCmd("foreColor", e.target.value);
  };

  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCmd("backColor", e.target.value);
  };

  return (
    <div className="flex flex-col gap-2 w-full font-cairo">
      {label && (
        <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>{label}</span>
        </label>
      )}
      
      {/* Hidden file input for media uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      <div className="bg-[#07070b] border border-white/5 focus-within:border-rose-500/50 rounded-2xl overflow-hidden shadow-2xl transition-all flex flex-col">
        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-[#0a0a0f] border-b border-white/5 select-none relative z-20">
          
          {/* Format Block Selector */}
          <select 
            onChange={handleFormatChange}
            defaultValue="<p>"
            className="bg-[#0f0f15] border border-white/5 rounded-lg py-1 px-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/30 cursor-pointer h-8 font-bold"
            title="تنسيق الفقرة"
          >
            <option value="<p>">نص عادي (Normal)</option>
            <option value="<h1>">عنوان رئيسي (H1)</option>
            <option value="<h2>">عنوان متوسط (H2)</option>
            <option value="<h3>">عنوان فرعي (H3)</option>
            <option value="<blockquote>">اقتباس (Quote)</option>
          </select>

          {/* Font Size Selector */}
          <select 
            onChange={(e) => {
              if (e.target.value) {
                execCmd("fontSize", e.target.value);
                e.target.value = ""; // reset selection
              }
            }}
            defaultValue=""
            className="bg-[#0f0f15] border border-white/5 rounded-lg py-1 px-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/30 cursor-pointer h-8 font-bold"
            title="حجم الخط"
          >
            <option value="" disabled>حجم الخط</option>
            <option value="1">صغير جداً (10px)</option>
            <option value="2">صغير (13px)</option>
            <option value="3">عادي (16px)</option>
            <option value="4">متوسط (18px)</option>
            <option value="5">كبير (24px)</option>
            <option value="6">كبير جداً (32px)</option>
            <option value="7">ضخم (48px)</option>
          </select>

          {/* Font Size Scaling Buttons */}
          <button 
            type="button" 
            onClick={() => execCmd("increaseFontSize")} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center justify-center font-black text-[10px]"
            title="تكبير الخط"
          >
            A+
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("decreaseFontSize")} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center justify-center font-black text-[10px]"
            title="تصغير الخط"
          >
            A-
          </button>

          <div className="w-px h-6 bg-white/5 mx-1 hidden sm:block" />

          {/* History */}
          <button 
            type="button" 
            onClick={() => execCmd("undo")} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="تراجع"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("redo")} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="إعادة"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-6 bg-white/5 mx-1" />

          {/* Text Styles */}
          <button 
            type="button" 
            onClick={() => execCmd("bold")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.bold ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="خط عريض"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("italic")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.italic ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="خط مائل"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("underline")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.underline ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="تحته خط"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("strikeThrough")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.strikethrough ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="يتوسطه خط"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-6 bg-white/5 mx-1" />

          {/* Alignments */}
          <button 
            type="button" 
            onClick={() => execCmd("justifyLeft")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.justifyLeft ? "bg-rose-600 text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="محاذاة لليسار"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("justifyCenter")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.justifyCenter ? "bg-rose-600 text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="محاذاة للوسط"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("justifyRight")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.justifyRight ? "bg-rose-600 text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="محاذاة لليمين"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("justifyFull")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.justifyFull ? "bg-rose-600 text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="محاذاة كاملة"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-6 bg-white/5 mx-1" />

          {/* Lists */}
          <button 
            type="button" 
            onClick={() => execCmd("insertUnorderedList")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.insertUnorderedList ? "bg-rose-600 text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="قائمة نقطية"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button" 
            onClick={() => execCmd("insertOrderedList")} 
            className={cn(
              "p-2 rounded-lg transition-all cursor-pointer",
              activeStates.insertOrderedList ? "bg-rose-600 text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="قائمة رقمية"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-6 bg-white/5 mx-1" />

          {/* Colors */}
          <label className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer relative flex items-center justify-center" title="لون النص">
            <Palette className="w-3.5 h-3.5" />
            <input type="color" onChange={handleTextColorChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          </label>
          <label className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer relative flex items-center justify-center" title="لون خلفية النص">
            <Highlighter className="w-3.5 h-3.5" />
            <input type="color" onChange={handleBgColorChange} defaultValue="#ffff00" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          </label>

          <div className="w-px h-6 bg-white/5 mx-1" />

          {/* Insertions */}
          <button 
            type="button" 
            onClick={handleAddLink} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="إدراج رابط تشعبي"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          {/* Media upload with absolute luxury dropdown menu */}
          <div className="relative">
            <button 
              type="button" 
              onClick={() => setShowMediaMenu(!showMediaMenu)} 
              className={cn(
                "p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center",
                showMediaMenu ? "bg-rose-600 text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
              title="إدراج صورة أو فيديو من الجهاز"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>

            {showMediaMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMediaMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col p-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-right w-full font-bold"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                    إدراج صورة من رابط
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFileUpload("image")}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-right w-full font-bold"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    رفع صورة من جهازك
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFileUpload("video")}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-right w-full font-bold"
                  >
                    <VideoIcon className="w-3.5 h-3.5 text-blue-500" />
                    رفع فيديو من جهازك
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Clear format */}
          <button 
            type="button" 
            onClick={() => execCmd("removeFormat")} 
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer ml-auto"
            title="مسح التنسيقات"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* EDITOR AREA */}
        <style dangerouslySetInnerHTML={{__html: `
          .rich-editor-content:empty::before {
            content: attr(data-placeholder);
            color: #52525b;
            font-style: italic;
            cursor: text;
          }
        `}} />
        <div 
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onSelect={updateActiveStates}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          data-placeholder={placeholder || "اكتب هنا تفاصيل المحتوى الدراسي الفاخر..."}
          className="rich-editor-content min-h-[160px] max-h-[350px] p-4 text-sm text-zinc-200 outline-none overflow-y-auto scrollbar-thin scrollbar-thumb-rose-600/20 bg-black/25 leading-relaxed text-right w-full font-sans rtl select-text"
          style={{ direction: 'rtl' }}
        />
      </div>
    </div>
  );
}
