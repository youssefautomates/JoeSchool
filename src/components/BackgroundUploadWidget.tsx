"use client";

import { useState, useEffect } from "react";
import { useUploadStore, UploadTask } from "@/store/useUploadStore";
import { X, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function UploadRow({ upload, onRemove, onCancel }: { upload: UploadTask; onRemove: () => void; onCancel: () => void }) {
  // Auto-hide successful uploads after 3 seconds
  useEffect(() => {
    if (upload.status === 'Ready') {
      const timer = setTimeout(() => {
        onRemove();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [upload.status, onRemove]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      className={`bg-[#0f0f15] border rounded-lg p-3 relative group transition-colors 
        ${upload.status === 'Ready' ? 'border-emerald-500/30 bg-emerald-950/20' : 
          upload.status === 'Failed' ? 'border-rose-500/30 bg-rose-950/20' : 'border-white/10'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-bold text-white truncate pl-6">{upload.title}</p>
        {upload.status === 'Failed' ? (
           <button onClick={onRemove} className="text-zinc-500 hover:text-white transition-colors absolute left-2 top-2"><X className="w-4 h-4" /></button>
        ) : upload.status === 'Uploading' || upload.status === 'Encoding' || upload.status === 'Queued' ? (
           <button onClick={onCancel} className="text-zinc-500 hover:text-rose-400 transition-colors absolute left-2 top-2"><X className="w-4 h-4" /></button>
        ) : (
           <button onClick={onRemove} className="text-emerald-500 hover:text-emerald-400 transition-colors absolute left-2 top-2"><CheckCircle className="w-4 h-4" /></button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {upload.status === 'Ready' ? (
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{upload.savedToDb ? "تم الحفظ تلقائياً" : "تم الرفع بنجاح"}</span>
          </div>
        ) : upload.status === 'Failed' ? (
          <div className="flex items-center gap-1.5 text-rose-500 text-[10px] font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>فشل - يرجى إعادة المحاولة</span>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex justify-between text-[10px] mb-1 font-bold text-zinc-400">
              <span>{
                upload.status === 'Queued' ? 'في الانتظار...' :
                upload.status === 'Uploading' ? 'جاري الرفع...' : 
                'جاري المعالجة...'
              }</span>
              <span>{upload.progress}%</span>
            </div>
            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  upload.status === 'Queued' ? 'bg-zinc-600' :
                  upload.status === 'Encoding' ? 'bg-amber-500' : 
                  'bg-rose-500'
                }`}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function BackgroundUploadWidget() {
  const { uploads, removeUpload, cancelUpload } = useUploadStore();
  const [isMinimized, setIsMinimized] = useState(false);

  const uploadEntries = Object.values(uploads);
  if (uploadEntries.length === 0) return null;

  const activeUploads = uploadEntries.filter(u => u.status === 'Uploading' || u.status === 'Encoding' || u.status === 'Queued').length;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-80 shadow-2xl" dir="rtl">
      <div className="bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div 
          className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-2">
            {activeUploads > 0 ? (
              <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
            <h3 className="font-alexandria font-bold text-sm text-white">
              {activeUploads > 0 ? `📤 رفع المحاضرات (${activeUploads} نشط)` : 'اكتملت جميع العمليات'}
            </h3>
          </div>
          <button className="text-zinc-400 hover:text-white transition-colors">
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Upload List */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div 
              initial={{ height: 0 }} 
              animate={{ height: "auto" }} 
              exit={{ height: 0 }}
              className="max-h-64 overflow-y-auto custom-scrollbar bg-black/40"
            >
              <div className="p-2 flex flex-col gap-2">
                <AnimatePresence>
                  {uploadEntries.map((upload) => (
                    <UploadRow 
                      key={upload.lessonId} 
                      upload={upload} 
                      onRemove={() => removeUpload(upload.lessonId)} 
                      onCancel={() => cancelUpload(upload.lessonId)} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
