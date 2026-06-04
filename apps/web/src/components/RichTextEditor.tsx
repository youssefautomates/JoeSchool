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
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [imgStyle, setImgStyle] = useState<{ top: number; left: number } | null>(null);

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

  // Click handler to detect images inside editor or toolbar
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // If clicked inside the floating toolbar, do not close it
      if (target.closest(".image-toolbar-container")) {
        return;
      }

      if (target.tagName === "IMG" && editorRef.current?.contains(target)) {
        const img = target as HTMLImageElement;
        setSelectedImg(img);
        
        // Calculate position relative to editor container
        const rect = img.getBoundingClientRect();
        const editor = editorRef.current;
        const editorRect = editor.getBoundingClientRect();
        setImgStyle({
          top: rect.bottom - editorRect.top + editor.scrollTop + 8,
          left: Math.max(10, rect.left - editorRect.left + (rect.width - 320) / 2)
        });
      } else {
        setSelectedImg(null);
        setImgStyle(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  const resizeImage = (factor: number) => {
    if (!selectedImg) return;
    
    // Read the current style width or getBoundingClientRect width
    let currentWidth = parseFloat(selectedImg.style.width || "");
    if (isNaN(currentWidth) || !currentWidth) {
      currentWidth = selectedImg.getBoundingClientRect().width || selectedImg.clientWidth || 300;
    }
    
    // Calculate new width
    const newWidth = Math.max(30, Math.min(1200, Math.round(currentWidth * factor)));
    
    selectedImg.style.width = `${newWidth}px`;
    selectedImg.style.height = "auto";
    selectedImg.style.maxWidth = "100%"; // override any overriding css max-width
    
    handleInput();
    
    // Recalculate position
    setTimeout(() => {
      if (!selectedImg || !editorRef.current) return;
      const rect = selectedImg.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setImgStyle({
        top: rect.bottom - editorRect.top + editorRef.current.scrollTop + 8,
        left: Math.max(10, rect.left - editorRect.left + (rect.width - 320) / 2)
      });
    }, 50);
  };

  const setImageWidthPercent = (pct: number) => {
    if (!selectedImg) return;
    selectedImg.style.width = `${pct}%`;
    selectedImg.style.height = "auto";
    selectedImg.style.maxWidth = "100%";
    handleInput();

    // Recalculate position
    setTimeout(() => {
      if (!selectedImg || !editorRef.current) return;
      const rect = selectedImg.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setImgStyle({
        top: rect.bottom - editorRect.top + editorRef.current.scrollTop + 8,
        left: Math.max(10, rect.left - editorRect.left + (rect.width - 320) / 2)
      });
    }, 50);
  };

  const setImageAlign = (align: "left" | "center" | "right" | "none") => {
    if (!selectedImg) return;
    if (align === "left") {
      selectedImg.style.float = "left";
      selectedImg.style.margin = "0 0 16px 16px";
      selectedImg.style.display = "inline-block";
    } else if (align === "right") {
      selectedImg.style.float = "right";
      selectedImg.style.margin = "0 16px 16px 0";
      selectedImg.style.display = "inline-block";
    } else if (align === "center") {
      selectedImg.style.float = "none";
      selectedImg.style.margin = "16px auto";
      selectedImg.style.display = "block";
    } else {
      selectedImg.style.float = "none";
      selectedImg.style.margin = "0";
      selectedImg.style.display = "inline";
    }
    handleInput();

    // Recalculate position
    setTimeout(() => {
      if (!selectedImg || !editorRef.current) return;
      const rect = selectedImg.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setImgStyle({
        top: rect.bottom - editorRect.top + editorRef.current.scrollTop + 8,
        left: Math.max(10, rect.left - editorRect.left + (rect.width - 320) / 2)
      });
    }, 50);
  };

  const getImgWidthPercent = (): number => {
    if (!selectedImg || !editorRef.current) return 100;
    const styleWidth = selectedImg.style.width;
    if (styleWidth.endsWith("%")) {
      return parseInt(styleWidth) || 100;
    }
    const imgWidth = selectedImg.getBoundingClientRect().width;
    const editorWidth = editorRef.current.getBoundingClientRect().width || 1;
    return Math.min(100, Math.max(10, Math.round((imgWidth / editorWidth) * 100)));
  };


  const applyInlineStyle = (styleName: string, styleValue: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // No text selected

    const span = document.createElement("span");
    span.style.setProperty(styleName, styleValue);
    
    try {
      range.surroundContents(span);
    } catch (e) {
      // Bounding crossing fallback
      document.execCommand("styleWithCSS", false, "true");
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      const html = `<span style="${styleName}: ${styleValue}">${container.innerHTML}</span>`;
      document.execCommand("insertHTML", false, html);
    }
    
    handleInput();
    editorRef.current?.focus();
  };

  const scaleFontSize = (direction: "up" | "down") => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    let parent: HTMLElement | null = range.commonAncestorContainer as HTMLElement;
    if (parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentElement;
    }
    
    let currentSize = 16;
    if (parent) {
      const computedSize = window.getComputedStyle(parent).fontSize;
      const parsed = parseFloat(computedSize);
      if (!isNaN(parsed)) {
        currentSize = parsed;
      }
    }
    
    const newSize = direction === "up" ? currentSize + 2 : Math.max(8, currentSize - 2);
    applyInlineStyle("font-size", `${newSize}px`);
  };

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

          {/* Font Family Selector */}
          <select 
            onChange={(e) => {
              if (e.target.value) {
                applyInlineStyle("font-family", e.target.value);
              }
            }}
            defaultValue="Cairo"
            className="bg-[#0f0f15] border border-white/5 rounded-lg py-1 px-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/30 cursor-pointer h-8 font-bold"
            title="نوع الخط"
          >
            <option value="Cairo">Cairo (الافتراضي)</option>
            <option value="Alexandria">Alexandria</option>
            <option value="Tahoma">Tahoma</option>
            <option value="Arial">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
          </select>

          {/* Font Size Selector */}
          <select 
            onChange={(e) => {
              if (e.target.value) {
                applyInlineStyle("font-size", e.target.value);
              }
            }}
            defaultValue="16px"
            className="bg-[#0f0f15] border border-white/5 rounded-lg py-1 px-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500/30 cursor-pointer h-8 font-bold"
            title="حجم الخط"
          >
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="32px">32px</option>
            <option value="48px">48px</option>
          </select>

          {/* Font Size Scaling Buttons */}
          <button 
            type="button" 
            onClick={() => scaleFontSize("up")} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center justify-center font-black text-[10px]"
            title="تكبير الخط"
          >
            A+
          </button>
          <button 
            type="button" 
            onClick={() => scaleFontSize("down")} 
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
          .rich-editor-content img {
            transition: outline 0.15s ease-in-out;
            cursor: pointer;
          }
          .rich-editor-content img:hover {
            outline: 2px solid rgba(244, 63, 94, 0.4);
          }
          .rich-editor-content img:focus, .rich-editor-content img[data-selected] {
            outline: 3px solid rgba(244, 63, 94, 0.85);
          }
        `}} />
        <div className="relative w-full">
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

          {selectedImg && imgStyle && (
            <div 
              className="image-toolbar-container absolute bg-[#0b0b12]/95 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-2xl flex flex-wrap items-center gap-2 z-30 select-none animate-in fade-in zoom-in-95 duration-150"
              style={{ 
                top: `${imgStyle.top}px`, 
                left: `${imgStyle.left}px`,
                direction: "rtl"
              }}
            >
              <span className="text-[10px] text-zinc-400 font-bold px-1.5 border-l border-white/10">تحجيم الصورة:</span>
              
              <button 
                type="button" 
                onClick={() => resizeImage(1.15)} 
                className="px-2.5 py-1 bg-white/5 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold text-zinc-300 transition-colors"
                title="تكبير الحجم"
              >
                تكبير (+)
              </button>
              
              <button 
                type="button" 
                onClick={() => resizeImage(0.85)} 
                className="px-2.5 py-1 bg-white/5 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold text-zinc-300 transition-colors"
                title="تصغير الحجم"
              >
                تصغير (-)
              </button>

              <div className="w-px h-4 bg-white/10 mx-0.5" />

              {/* Slider Resizer */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-400">العرض:</span>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={getImgWidthPercent()} 
                  onChange={(e) => setImageWidthPercent(Number(e.target.value))}
                  className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500" 
                />
                <span className="text-[9px] text-zinc-400 font-mono w-6 text-left">{getImgWidthPercent()}%</span>
              </div>

              <div className="w-px h-4 bg-white/10 mx-0.5" />

              <button 
                type="button" 
                onClick={() => setImageWidthPercent(25)} 
                className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded-md text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
              >
                25%
              </button>
              <button 
                type="button" 
                onClick={() => setImageWidthPercent(50)} 
                className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded-md text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
              >
                50%
              </button>
              <button 
                type="button" 
                onClick={() => setImageWidthPercent(100)} 
                className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded-md text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
              >
                100%
              </button>

              <div className="w-px h-4 bg-white/10 mx-0.5" />
              <span className="text-[10px] text-zinc-400 font-bold px-1">المحاذاة:</span>

              <button 
                type="button" 
                onClick={() => setImageAlign("left")} 
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-zinc-300 transition-colors font-bold"
                title="محاذاة لليسار"
              >
                يسار
              </button>
              <button 
                type="button" 
                onClick={() => setImageAlign("center")} 
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-zinc-300 transition-colors font-bold"
                title="محاذاة للوسط"
              >
                وسط
              </button>
              <button 
                type="button" 
                onClick={() => setImageAlign("right")} 
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-zinc-300 transition-colors font-bold"
                title="محاذاة لليمين"
              >
                يمين
              </button>

              <div className="w-px h-4 bg-white/10 mx-0.5" />

              <button 
                type="button" 
                onClick={() => {
                  selectedImg.remove();
                  setSelectedImg(null);
                  setImgStyle(null);
                  handleInput();
                  toast.success("تم حذف الصورة بنجاح.");
                }} 
                className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
                title="حذف الصورة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
