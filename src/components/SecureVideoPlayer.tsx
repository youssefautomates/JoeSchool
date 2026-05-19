"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, RotateCcw, RotateCw, Loader2, PlayCircle,
  Volume1, ChevronRight, HelpCircle, Shield, Sparkles,
  Award, ArrowLeft, BookOpen, Trash2, Search, Plus, X, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  getVideoProgress, 
  saveVideoProgress, 
  getLessonNotes, 
  saveLessonNote, 
  deleteLessonNote, 
  LessonNote 
} from "@/lib/coursesDb";
import { supabaseClient } from "@/lib/supabaseClient";

interface SecureVideoPlayerProps {
  lessonId: string;
  courseId: string;
  userId: string;
  onLessonComplete: () => void;
  onNextLesson?: () => void;
  nextLessonTitle?: string | null;
}

export default function SecureVideoPlayer({
  lessonId,
  courseId,
  userId,
  onLessonComplete,
  onNextLesson,
  nextLessonTitle
}: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Video State
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showEndedOverlay, setShowEndedOverlay] = useState(false);
  
  // Security / Anti-Piracy State
  const [isBlurred, setIsBlurred] = useState(false);
  const [devToolsDetected, setDevToolsDetected] = useState(false);
  
  // Student Notes State
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);



  // 3. DevTools and Visibility/Screen Recording Detections
  useEffect(() => {
    // A. Blur if tab loses focus or visibility changes
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setIsBlurred(true);
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } else {
        setIsBlurred(false);
      }
    };

    const handleBlur = () => {
      setIsBlurred(true);
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };

    // B. Docked DevTools Detection via dimension checks
    const checkDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      
      if (widthDiff > threshold || heightDiff > threshold) {
        setDevToolsDetected(true);
        setIsBlurred(true);
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } else {
        setDevToolsDetected(false);
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("resize", checkDevTools);
    
    // Regular check interval
    const devToolsInterval = setInterval(checkDevTools, 2000);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("resize", checkDevTools);
      clearInterval(devToolsInterval);
    };
  }, []);

  // 4. Fetch Secure Stream Source
  const fetchSignedUrl = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Direct call to our secure API streaming endpoint (by default proxy stream layer is active)
      const res = await fetch(`/api/video/stream/${lessonId}`);
      const data = await res.json();
      if (res.ok && data.url) {
        setVideoUrl(data.url);
        setError(null);
      } else {
        setError(data.error || "فشل تحميل المحاضرة الآمنة");
      }
    } catch (err) {
      setError("خطأ في الاتصال بخادم تشفير الفيديو");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 5. Fetch Student Lesson Notes
  const fetchNotes = async () => {
    try {
      const list = await getLessonNotes(userId, lessonId);
      setNotes(list);
    } catch (e) {}
  };

  useEffect(() => {
    fetchSignedUrl();
    fetchNotes();
    setIsPlaying(false);
    setShowEndedOverlay(false);
    setShowNotes(false);
    
    // Auto-refresh token in background every 4 minutes before expiry
    const interval = setInterval(() => {
      fetchSignedUrl(true);
    }, 240000);

    return () => clearInterval(interval);
  }, [lessonId]);

  // 6. Resume Watching Load Progress
  useEffect(() => {
    const initProgress = async () => {
      if (!videoRef.current || !videoUrl) return;
      try {
        const progress = await getVideoProgress(userId, lessonId);
        if (progress && progress.last_position > 0) {
          if (progress.last_position < (videoRef.current.duration || 99999) - 10) {
            videoRef.current.currentTime = progress.last_position;
            toast.success(`تم استئناف الدرس من ثانية ${progress.last_position} 🔄`);
          }
        }
      } catch (e) {}
    };

    if (!loading && videoUrl) {
      const timer = setTimeout(initProgress, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, videoUrl, lessonId]);

  // 7. Auto Sync Progress loop (every 10 seconds)
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (!videoRef.current || loading || error || !videoUrl || isBlurred) return;
      
      const video = videoRef.current;
      const watched = Math.floor(video.currentTime);
      const total = Math.floor(video.duration || 0);
      if (total === 0) return;

      const completed = watched >= total * 0.92; // 92% complete mark

      await saveVideoProgress({
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        watched_seconds: watched,
        completed,
        last_position: watched
      });
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [userId, courseId, lessonId, loading, error, videoUrl, isBlurred]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showNotes) {
          setShowControls(false);
          setShowSpeedMenu(false);
        }
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showNotes]);

  // Player Control Handlers
  const handlePlayPause = () => {
    if (isBlurred || devToolsDetected) return;
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setShowEndedOverlay(false);
    }
    resetControlsTimeout();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = Number(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const vol = Number(e.target.value);
    setVolume(vol);
    videoRef.current.volume = vol;
    setIsMuted(vol === 0);
    resetControlsTimeout();
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    resetControlsTimeout();
  };

  const handleSpeedChange = (rate: number) => {
    if (!videoRef.current) return;
    setPlaybackRate(rate);
    videoRef.current.playbackRate = rate;
    setShowSpeedMenu(false);
    resetControlsTimeout();
  };

  const handleFullscreenToggle = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
    resetControlsTimeout();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      Math.max(0, videoRef.current.currentTime + seconds),
      duration
    );
    resetControlsTimeout();
  };

  const handleVideoEnded = async () => {
    setIsPlaying(false);
    setShowEndedOverlay(true);
    
    await saveVideoProgress({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      watched_seconds: Math.floor(duration),
      completed: true,
      last_position: Math.floor(duration)
    });
    
    onLessonComplete();
  };

  // Add a lesson note at exact second
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const timestamp = Math.floor(currentTime);
      await saveLessonNote(userId, courseId, lessonId, timestamp, noteText.trim());
      setNoteText("");
      toast.success("تم حفظ الملاحظة بنجاح 📝");
      fetchNotes();
    } catch (e) {
      toast.error("فشل حفظ الملاحظة");
    } finally {
      setSavingNote(false);
    }
  };

  // Delete a lesson note
  const handleDeleteNote = async (id: string) => {
    try {
      await deleteLessonNote(id);
      toast.success("تم حذف الملاحظة");
      fetchNotes();
    } catch (e) {
      toast.error("فشل حذف الملاحظة");
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const filteredNotes = notes.filter(n => 
    n.note_content.toLowerCase().includes(noteSearch.toLowerCase())
  );

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && !showNotes && setShowControls(false)}
      className="relative w-full aspect-video rounded-3xl bg-[#030305] border border-white/5 overflow-hidden group select-none shadow-2xl flex items-center justify-center"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. Visibility & Anti-Screen Capture Blur filter */}
      <div className={`absolute inset-0 w-full h-full transition-all duration-500 z-0 ${isBlurred ? "blur-[30px] scale-[1.02] pointer-events-none" : ""}`}>
        
        {/* Standard Video Element */}
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            onClick={handlePlayPause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain cursor-pointer"
            preload="auto"
            playsInline
            controlsList="nodownload nofullscreen"
            disablePictureInPicture
            disableRemotePlayback
          />
        )}
      </div>

      {/* 2. Security Alerts (DevTools Detected or Tab Blur Warning) */}
      <AnimatePresence>
        {(isBlurred || devToolsDetected) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex flex-col items-center justify-center gap-4 text-center p-6"
          >
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-[#D6004B] flex items-center justify-center shadow-[0_0_30px_rgba(214,0,75,0.2)] animate-pulse">
              <Shield className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h4 className="font-alexandria font-black text-white text-base">تم إيقاف الفيديو لدواعي الأمان 🔒</h4>
              <p className="text-zinc-400 text-xs font-cairo leading-relaxed">
                {devToolsDetected 
                  ? "تم اكتشاف محاولة فتح أدوات المطور (DevTools). يرجى إغلاق النافذة الجانبية للاستمرار في مشاهدة المحتوى الفني بأمان."
                  : "تم تعتيم الفيديو تلقائياً نظراً لعدم نشاط الصفحة أو محاولة تصوير شاشة العرض. يرجى التركيز في المحاضرة للاستمرار."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* 4. Loading Skeleton Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#06060a] z-50 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-[#D6004B] animate-spin" />
          <div className="text-center space-y-1">
            <h4 className="font-alexandria font-bold text-white text-sm">جاري التشفير والتحميل الآمن</h4>
            <p className="text-zinc-500 text-xs font-cairo">يتم الاتصال بخادم البث المباشر الموفر من يوسف أوتوميتس...</p>
          </div>
        </div>
      )}

      {/* 5. Error Display */}
      {error && (
        <div className="absolute inset-0 bg-[#08080c] z-50 flex flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md">
            <h4 className="font-alexandria font-bold text-white text-base">بث غير مصرح به أو رابط منتهي</h4>
            <p className="text-zinc-500 text-xs leading-relaxed font-cairo">
              {error === "يجب الاشتراك في هذا الكورس أولاً لمشاهدة الفيديو"
                ? "عذراً، هذا الكورس مغلق حالياً. يرجى الاشتراك للوصول إلى المحاضرة."
                : "جلسة العرض غير مصرح بها أو منتهية الصلاحية. يرجى التأكد من تسجيل الدخول وإعادة المحاولة."}
            </p>
          </div>
          <button 
            onClick={() => fetchSignedUrl()}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold font-alexandria transition-all active:scale-95"
          >
            إعادة محاولة التحميل
          </button>
        </div>
      )}

      {/* 6. Shield DRM Branding Overlay */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/5 px-2.5 py-1.5 rounded-lg text-[9px] text-zinc-400 font-bold opacity-60 pointer-events-none tracking-widest font-alexandria">
        <Shield className="w-3 h-3 text-[#D6004B]" />
        <span>بث مشفر وآمن Enterprise-Grade</span>
      </div>

      {/* 7. Custom Control Center */}
      <AnimatePresence>
        {showControls && !loading && !error && !isBlurred && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 z-10 pointer-events-none flex flex-col justify-between p-4"
          >
            {/* Top Bar inside player */}
            <div className="w-full flex items-center justify-between pointer-events-auto">
              <span className="text-[10px] text-zinc-400 font-bold font-mono">
                {playbackRate !== 1 ? `سرعة التشغيل: ${playbackRate}x` : ""}
              </span>
            </div>

            {/* Middle Play/Skip Overlay */}
            <div className="flex items-center justify-center gap-8 pointer-events-auto my-auto self-center">
              <button 
                onClick={() => handleSkip(-10)} 
                className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 border border-white/5 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-90 cursor-pointer"
                title="رجوع 10 ثواني"
              >
                <RotateCcw className="w-5 h-5 text-zinc-300" />
              </button>

              <button 
                onClick={handlePlayPause}
                className="w-16 h-16 rounded-full bg-[#D6004B] hover:bg-[#ff0059] text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg shadow-[#D6004B]/30 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
              </button>

              <button 
                onClick={() => handleSkip(10)} 
                className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 border border-white/5 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-90 cursor-pointer"
                title="تسريع 10 ثواني"
              >
                <RotateCw className="w-5 h-5 text-zinc-300" />
              </button>
            </div>

            {/* Bottom Controls Panel */}
            <div className="w-full space-y-3 pointer-events-auto">
              
              {/* Progress Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-zinc-400 font-bold shrink-0">{formatTime(currentTime)}</span>
                <input 
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/10 hover:h-1.5 rounded-lg appearance-none cursor-pointer accent-[#D6004B] transition-all"
                />
                <span className="text-[10px] font-mono text-zinc-400 font-bold shrink-0">{formatTime(duration)}</span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between">
                
                {/* Volume & Details */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 group/volume">
                    <button 
                      onClick={handleToggleMute}
                      className="text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : volume < 0.3 ? <Volume1 className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/volume:w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Right controls: Notes, Speed, Fullscreen */}
                <div className="flex items-center gap-3 relative">
                  
                  {/* Notes Button trigger */}
                  <button 
                    onClick={() => setShowNotes(!showNotes)}
                    className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer text-xs font-bold font-alexandria ${showNotes ? "bg-[#D6004B]/20 border-[#D6004B] text-white" : "hover:bg-white/5 border-transparent hover:border-white/5 text-zinc-300 hover:text-white"}`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>ملاحظاتي</span>
                  </button>
                  
                  {/* Speed Trigger */}
                  <button 
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="h-8 px-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 text-zinc-300 hover:text-white text-xs font-bold font-alexandria flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Settings className="w-4.5 h-4.5" />
                    <span>{playbackRate}x</span>
                  </button>

                  {/* Playback rate popup */}
                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-11 right-12 bg-[#0d0d13] border border-white/10 rounded-xl p-1.5 shadow-xl min-w-[100px] z-30"
                      >
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => handleSpeedChange(rate)}
                            className={`w-full px-3 py-1.5 rounded-lg text-right text-xs font-alexandria transition-colors hover:bg-white/5 cursor-pointer block ${playbackRate === rate ? "text-[#D6004B] font-black" : "text-zinc-400 font-bold"}`}
                          >
                            {rate === 1 ? "عادي 1.0x" : `${rate}x`}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Fullscreen Trigger */}
                  <button 
                    onClick={handleFullscreenToggle}
                    className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  >
                    {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
                  </button>

                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. Built-in interactive Notes slide-out panel */}
      <AnimatePresence>
        {showNotes && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-80 bg-[#07070c]/95 border-l border-white/10 backdrop-blur-xl z-30 p-4 flex flex-col justify-between"
          >
            {/* Header */}
            <div className="space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <FileText className="w-4 h-4 text-[#D6004B]" />
                  <span className="font-alexandria font-bold text-xs">ملاحظات المحاضرة</span>
                </div>
                <button 
                  onClick={() => setShowNotes(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="ابحث في ملاحظاتك..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-1.5 pr-8 pl-3 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-[#D6004B] font-cairo"
                />
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto my-4 space-y-2 pr-1 custom-scrollbar">
              {filteredNotes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <BookOpen className="w-8 h-8 text-zinc-600 mb-2" />
                  <p className="text-[10px] text-zinc-500 font-cairo">لا توجد ملاحظات مسجلة بعد.</p>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div 
                    key={note.id}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group/note space-y-1.5 text-right relative"
                  >
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover/note:opacity-100 text-zinc-500 hover:text-rose-500 transition-opacity p-0.5 rounded cursor-pointer"
                        title="حذف الملاحظة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = note.timestamp_seconds;
                            setCurrentTime(note.timestamp_seconds);
                            if (videoRef.current.paused) handlePlayPause();
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-[#D6004B]/10 hover:bg-[#D6004B]/20 text-[#D6004B] font-mono text-[9px] font-bold cursor-pointer"
                        title="انتقل إلى هذه الثانية"
                      >
                        {formatTime(note.timestamp_seconds)}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-cairo whitespace-pre-wrap">{note.note_content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Footer Form */}
            <form onSubmit={handleAddNote} className="space-y-2 shrink-0 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold font-cairo">
                <span>عند ثانية: {formatTime(currentTime)}</span>
                <span>اكتب ملاحظة جديدة</span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="سجل فكرتك أو فك الشفرة هنا..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/5 rounded-xl py-2 px-3 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-[#D6004B] font-cairo"
                />
                <button 
                  type="submit"
                  disabled={savingNote || !noteText.trim()}
                  className="w-9 h-9 shrink-0 bg-[#D6004B] hover:bg-[#ff0059] disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                >
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. Ended / Lecture Finished Overlay with Next Lesson CTA */}
      <AnimatePresence>
        {showEndedOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#06060a]/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="absolute w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] bg-[#D6004B]/5 rounded-full blur-[80px] pointer-events-none z-0 animate-pulse"></div>

            <div className="z-10 space-y-6 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <Award className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-alexandria font-black text-white text-base">تم إكمال المحاضرة بنجاح! 🎉</h4>
                <p className="text-zinc-400 text-xs font-cairo leading-relaxed">أحسنت صنعاً! لقد أتممت هذا الدرس وخطوت خطوة أخرى في مسارك التدريبي.</p>
              </div>

              {onNextLesson && nextLessonTitle ? (
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      setShowEndedOverlay(false);
                      onNextLesson();
                    }}
                    className="w-full h-11 bg-[#D6004B] hover:bg-[#ff0059] text-white font-alexandria font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_8px_20px_rgba(214,0,75,0.25)] hover:shadow-[0_12px_25px_rgba(214,0,75,0.4)] cursor-pointer"
                  >
                    <span>الانتقال للمحاضرة التالية</span>
                    <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  </button>
                  <p className="text-zinc-500 text-[10px] font-bold truncate max-w-xs mx-auto font-cairo">
                    التالي: {nextLessonTitle}
                  </p>
                </div>
              ) : (
                <button 
                  onClick={() => setShowEndedOverlay(false)}
                  className="px-6 h-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-alexandria font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  إغلاق وإعادة المشاهدة
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
