"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Loader2, BookOpen, Trash2, Search, Plus, X, FileText, Shield, Award, 
  ArrowLeft, Settings, Activity, Wifi, WifiOff, Maximize, Minimize,
  PlayCircle, Play
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
import { trackMetaEvent } from "@/lib/metaPixel";

interface SecureVideoPlayerProps {
  lessonId: string;
  courseId: string;
  userId: string;
  onLessonComplete: () => void;
  onNextLesson?: () => void;
  nextLessonTitle?: string | null;
  courseImage?: string;
}

export default function SecureVideoPlayer({
  lessonId,
  courseId,
  userId,
  onLessonComplete,
  onNextLesson,
  nextLessonTitle,
  courseImage
}: SecureVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Core Player States
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [plyrReady, setPlyrReady] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEndedOverlay, setShowEndedOverlay] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const plyrRef = useRef<any>(null);
  const hlsRef = useRef<any>(null);

  // Smart Learning Experience States
  const [videoQuality, setVideoQuality] = useState<string>("auto");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  
  // Adaptive Buffer Recovery State
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferCount, setBufferCount] = useState(0);
  const lastTimeRef = useRef<number>(0);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Offline / Connection Detection States
  const [isOffline, setIsOffline] = useState(false);

  // Watch Heatmap & Analytics Engine States
  const [heatmapData, setHeatmapData] = useState<number[]>(new Array(30).fill(0));
  const [pauseCount, setPauseCount] = useState(0);
  const [totalWatchedSeconds, setTotalWatchedSeconds] = useState(0);
  const lastWatchedSecondRef = useRef<number>(-1);

  // Floating Picture-in-Picture State
  const [isFloating, setIsFloating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Automatic Continue Learning Countdown State
  const [countdown, setCountdown] = useState(5);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [autoPlayCancelled, setAutoPlayCancelled] = useState(false);

  // Smart Recommendations State
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);

  // Student Notes States
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Security / Anti-Capture States
  const [isBlurred, setIsBlurred] = useState(false);

  // Sync control refs to prevent redundant database writes
  const lastSyncTimeRef = useRef<number>(-1);
  const videoMilestonesRef = useRef<Set<number>>(new Set());

  // Double-tap Mobile Seek Gesture States
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const [showSeekIndicator, setShowSeekIndicator] = useState<{ show: boolean; direction: "forward" | "backward" }>({ show: false, direction: "forward" });

  // 1. Initialize Player and Fetch Progress
  const initPlayer = async () => {
    setLoading(true);
    setError(null);
    setShowEndedOverlay(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    lastSyncTimeRef.current = -1;
    lastWatchedSecondRef.current = -1;
    setPauseCount(0);
    setTotalWatchedSeconds(0);
    setHeatmapData(new Array(30).fill(0));
    setCountdown(5);
    setAutoPlayCancelled(false);
    setVideoUrl("");
    setPlyrReady(false);
    setResumeTime(0);

    try {
      const res = await fetch(`/api/video/stream/${lessonId}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "غير مصرح بمشاهدة هذا الفيديو");
        } else {
          setError("فشل الاتصال بخادم البث");
        }
        return;
      }

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setVideoUrl(data.url);
      setIframeSrc(data.embedUrl);

      // Get the last saved position for Resume Watching
      const progress = await getVideoProgress(userId, lessonId);
      const rTime = progress?.last_position || 0;
      setResumeTime(rTime);

      if (rTime > 0) {
        toast.success(`تم استئناف الدرس من ثانية ${rTime} 🔄`);
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء تحميل مشغل الفيديو المؤمن");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Student Lesson Notes
  const fetchNotes = async () => {
    try {
      const list = await getLessonNotes(userId, lessonId);
      setNotes(list);
    } catch (e) {}
  };

  useEffect(() => {
    initPlayer();
    fetchNotes();
    setHasStarted(false);
    videoMilestonesRef.current.clear();
  }, [lessonId]);

  // 3. Smart Recommendations Fetching
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const { data: currentCourse } = await supabaseClient
          .from("courses")
          .select("category")
          .eq("id", courseId)
          .maybeSingle();

        const cat = currentCourse?.category || "الأتمتة";

        const { data: related } = await supabaseClient
          .from("courses")
          .select("id, title, slug, image_url, price, category")
          .eq("category", cat)
          .neq("id", courseId)
          .limit(3);

        setRecommendedCourses(related || []);
      } catch (e) {
        console.error("Failed to load recommendations:", e);
      }
    };

    if (showEndedOverlay) {
      fetchRecommendations();
    }
  }, [showEndedOverlay, courseId]);

  // 4. Automatic Continue Learning Countdown
  useEffect(() => {
    if (showEndedOverlay && onNextLesson && nextLessonTitle && !autoPlayCancelled) {
      setCountdown(5);
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            onNextLesson();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [showEndedOverlay, onNextLesson, autoPlayCancelled]);

  // 5. Offline & Connection Failure Detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      toast.success("تم استعادة الاتصال بالشبكة بنجاح! ⚡");
      postPlayerMessage("play");
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error("انقطع الاتصال بالإنترنت. تم إيقاف التشغيل مؤقتاً 🌐");
      postPlayerMessage("pause");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 6. Floating Picture-in-Picture & Scroll Observer
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      if (!containerRef.current || isFullscreen) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Enable PiP if the main player scrolls completely out of viewport
      const outOfView = rect.bottom < 0;
      setIsFloating(outOfView && isPlaying);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPlaying, isFullscreen]);

  // 7. Security Checkers (Tab/Page Blur Screen Protection)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setIsBlurred(true);
        postPlayerMessage("pause");
      } else {
        setIsBlurred(false);
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // 8. Adaptive Buffer Recovery Check Loop
  useEffect(() => {
    if (!isPlaying || loading || error || showEndedOverlay || isOffline) {
      if (bufferTimerRef.current) clearInterval(bufferTimerRef.current);
      return;
    }

    bufferTimerRef.current = setInterval(() => {
      // If playing but current time is not moving, the video is buffering
      if (currentTime === lastTimeRef.current && currentTime > 0) {
        setIsBuffering(true);
        setBufferCount(prev => {
          const next = prev + 1;
          if (next === 3) {
            // Buffer recovery triggered: drop quality automatically to 480p/360p
            postPlayerMessage("setQuality", "480p");
            setVideoQuality("480p");
            toast.warning("تم اكتشاف بطء في اتصال الإنترنت. جاري خفض جودة التشغيل تلقائياً لتفادي التقطيع... ⚡");
          }
          return next;
        });
      } else {
        setIsBuffering(false);
        setBufferCount(0);
      }
      lastTimeRef.current = currentTime;
    }, 2000);

    return () => {
      if (bufferTimerRef.current) clearInterval(bufferTimerRef.current);
    };
  }, [isPlaying, currentTime, loading, error, showEndedOverlay, isOffline]);

  // 9. Keyboard Shortcuts Implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing notes
      if (
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          if (isPlaying) {
            postPlayerMessage("pause");
          } else {
            postPlayerMessage("play");
          }
          break;
        case "arrowright":
          e.preventDefault();
          seekSkip(10);
          break;
        case "arrowleft":
          e.preventDefault();
          seekSkip(-10);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "d": // Increase speed
          e.preventDefault();
          const nextSpeed = Math.min(2, playbackSpeed + 0.25);
          postPlayerMessage("setPlaybackSpeed", nextSpeed);
          setPlaybackSpeed(nextSpeed);
          toast.info(`سرعة التشغيل الحالية: ${nextSpeed}x`);
          break;
        case "s": // Decrease speed
          e.preventDefault();
          const prevSpeed = Math.max(0.5, playbackSpeed - 0.25);
          postPlayerMessage("setPlaybackSpeed", prevSpeed);
          setPlaybackSpeed(prevSpeed);
          toast.info(`سرعة التشغيل الحالية: ${prevSpeed}x`);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, playbackSpeed, currentTime, duration]);

  // PostMessage helper to talk with Bunny CDN Embedded player
  const postPlayerMessage = (event: string, value?: any) => {
    const iframe = containerRef.current?.querySelector("iframe");
    if (iframe?.contentWindow) {
      try {
        // Send in standard Player.js format (context: "player.js")
        iframe.contentWindow.postMessage(
          JSON.stringify({
            context: "player.js",
            method: event,
            value: value
          }),
          "*"
        );

        // Also send in custom event/value format (in case some wrapper uses it)
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: event,
            value: value
          }),
          "*"
        );

        // If event is speed or quality, try alternative method names to cover all possible specifications
        if (event === "setPlaybackSpeed") {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              context: "player.js",
              method: "setPlaybackRate",
              value: value
            }),
            "*"
          );
          iframe.contentWindow.postMessage(
            JSON.stringify({
              context: "player.js",
              method: "setSpeed",
              value: value
            }),
            "*"
          );
        } else if (event === "setQuality") {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              context: "player.js",
              method: "quality",
              value: value
            }),
            "*"
          );
        }
      } catch (e) {
        console.error("Failed to post message to iframe:", e);
      }
    }
  };

  const seekVideo = (time: number) => {
    postPlayerMessage("seek", time);
    setCurrentTime(time);
  };

  const seekSkip = (seconds: number) => {
    const targetTime = Math.min(Math.max(0, currentTime + seconds), duration || 99999);
    seekVideo(targetTime);
  };

  const toggleFullscreen = () => {
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
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Update Watch Analytics Engine & Heatmap
  const recordWatchSecond = (time: number) => {
    if (duration <= 0) return;
    const sec = Math.floor(time);
    
    // Accumulate total watch time metrics
    if (sec !== lastWatchedSecondRef.current) {
      setTotalWatchedSeconds(prev => prev + 1);
      lastWatchedSecondRef.current = sec;

      // Update Heatmap buckets (30 vertical zones)
      const bucketIndex = Math.min(29, Math.floor((time / duration) * 30));
      setHeatmapData(prev => {
        const next = [...prev];
        next[bucketIndex] = (next[bucketIndex] || 0) + 1;
        return next;
      });
    }
  };

  // Database synchronizer for progress tracking
  const syncProgress = async (watched: number, total: number, forceCompleted = false) => {
    if (watched <= 0 || total <= 0) return;
    const completed = forceCompleted || watched >= total * 0.92;
    try {
      await saveVideoProgress({
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        watched_seconds: Math.floor(watched),
        completed,
        last_position: Math.floor(watched)
      });
      lastSyncTimeRef.current = Math.floor(watched);
    } catch (e) {
      console.error("Failed to save progress update:", e);
    }
  };

  // 10. Listen for postMessage Event APIs from Bunny Stream Player
  useEffect(() => {
    const handlePlayerMessage = async (e: MessageEvent) => {
      if (!e.origin.includes("mediadelivery.net") && !e.origin.includes("bunnycdn.com")) return;

      try {
        let eventData = e.data;
        if (typeof eventData === "string") {
          eventData = JSON.parse(eventData);
        }

        if (eventData && typeof eventData === "object") {
          const eventName = eventData.event || eventData.eventName;
          
          if (eventName === "timeupdate" || eventName === "player:timeupdate") {
            const time = Number(eventData.value || eventData.currentTime);
            const dur = Number(eventData.duration || eventData.totalTime || duration);
            if (!isNaN(time)) {
              setCurrentTime(time);
              recordWatchSecond(time);
              if (!isNaN(dur) && dur > 0) {
                setDuration(dur);
                
                // Track 25%, 50%, and 75% watch milestones
                const progressPercent = Math.round((time / dur) * 100);
                const milestones = [25, 50, 75];
                milestones.forEach(m => {
                  if (progressPercent >= m && !videoMilestonesRef.current.has(m)) {
                    videoMilestonesRef.current.add(m);
                    trackMetaEvent("WatchMilestone", {
                      lesson_id: lessonId,
                      course_id: courseId,
                      progress: m
                    }, `milestone_${lessonId}_${m}`);
                  }
                });
              }

              // Auto-sync progress to database every 10 seconds
              const sec = Math.floor(time);
              if (sec % 10 === 0 && sec !== lastSyncTimeRef.current) {
                syncProgress(time, dur || duration);
              }
            }
          } else if (eventName === "durationchange" || eventName === "player:durationchange") {
            const dur = Number(eventData.value || eventData.duration);
            if (!isNaN(dur)) {
              setDuration(dur);
            }
          } else if (eventName === "ended" || eventName === "player:ended") {
            await handleVideoEnded();
          } else if (eventName === "play" || eventName === "player:play") {
            setIsPlaying(true);
            setHasStarted(true);
            trackMetaEvent("PlayVideo", { lesson_id: lessonId, course_id: courseId }, `play_${lessonId}_${Date.now()}`);
            if (duration > 0) {
              await syncProgress(currentTime, duration);
            }
          } else if (eventName === "pause" || eventName === "player:pause") {
            setIsPlaying(false);
            setPauseCount(prev => prev + 1);
            trackMetaEvent("PauseVideo", { lesson_id: lessonId, course_id: courseId }, `pause_${lessonId}_${Date.now()}`);
            if (duration > 0) {
              await syncProgress(currentTime, duration);
            }
          } else if (
            eventName === "ratechange" || 
            eventName === "playbackspeedchange" || 
            eventName === "speedchange" || 
            eventName === "player:ratechange" ||
            eventName === "player:speedchange"
          ) {
            const speed = Number(eventData.value || eventData.playbackRate || eventData.speed);
            if (!isNaN(speed) && speed > 0) {
              setPlaybackSpeed(speed);
            }
          } else if (
            eventName === "qualitychange" || 
            eventName === "renditionchange" || 
            eventName === "player:qualitychange" ||
            eventName === "player:renditionchange"
          ) {
            const quality = eventData.value || eventData.quality || eventData.rendition;
            if (quality) {
              setVideoQuality(String(quality));
            }
          }
        }
      } catch (err) {}
    };

    window.addEventListener("message", handlePlayerMessage);
    return () => {
      window.removeEventListener("message", handlePlayerMessage);
    };
  }, [currentTime, duration, lessonId, isPlaying]);

  const handleVideoEnded = async () => {
    setIsPlaying(false);
    setShowEndedOverlay(true);
    await syncProgress(duration || currentTime, duration || currentTime, true);
    trackMetaEvent("CompleteVideo", { lesson_id: lessonId, course_id: courseId }, `ended_${lessonId}`);
    onLessonComplete();
  };

  // Double-tap Mobile seek gesture detector
  const handleTouchStart = (e: React.TouchEvent) => {
    if (loading || error || isFloating) return;
    const now = Date.now();
    const tapInterval = now - lastTapRef.current.time;
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = touch.clientX - rect.left;
    const playerWidth = rect.width;

    if (tapInterval < 300) {
      if (clickX > playerWidth / 2) {
        seekSkip(10);
        setShowSeekIndicator({ show: true, direction: "forward" });
      } else {
        seekSkip(-10);
        setShowSeekIndicator({ show: true, direction: "backward" });
      }
      setTimeout(() => {
        setShowSeekIndicator(prev => ({ ...prev, show: false }));
      }, 800);
    }
    lastTapRef.current = { time: now, x: clickX };
  };

  // Notes Management Form Actions
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
    } catch (err) {
      toast.error("فشل حفظ الملاحظة");
    } finally {
      setSavingNote(false);
    }
  };

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

  // Compute maximum zone hits in Heatmap
  const maxZoneCount = Math.max(...heatmapData, 1);
  const completionPercentage = duration > 0 ? Math.min(100, Math.floor((totalWatchedSeconds / duration) * 100)) : 0;

  return (
    <div className="relative w-full h-full">
      {/* Scroll PiP Placeholder Spacer */}
      {isFloating && (
        <div className="w-full h-full bg-zinc-950/20 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-2 p-6 animate-pulse">
          <Activity className="w-8 h-8 text-[#D6004B]/60" />
          <p className="text-xs text-zinc-500 font-cairo">المحاضرة تعمل حالياً في المشغل العائم بالأسفل 📺</p>
        </div>
      )}

      <div 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        className={isFloating 
          ? "fixed bottom-6 left-6 w-80 sm:w-96 aspect-video z-50 shadow-2xl rounded-2xl border border-white/10 overflow-hidden bg-[#030303] animate-fade-in group select-none"
          : "relative w-full h-full rounded-3xl bg-[#030303] overflow-hidden group select-none shadow-2xl border border-white/5"
        }
      >
        {/* Close Button on Floating Player */}
        {isFloating && (
          <button 
            onClick={() => {
              postPlayerMessage("pause");
              setIsFloating(false);
            }}
            className="absolute top-2 left-2 z-40 p-1.5 bg-black/80 hover:bg-black border border-white/10 text-white rounded-full transition-colors cursor-pointer"
            title="إيقاف مؤقت وإغلاق المشغل"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 1. Official Bunny Embed Iframe (Direct Integration) */}
        {!loading && !error && iframeSrc && hasStarted && (
          <div className={`absolute inset-0 w-full h-full transition-all duration-500 z-0 ${isBlurred ? "blur-[30px] scale-[1.02] pointer-events-none" : ""}`}>
            <iframe
              src={`${iframeSrc}${iframeSrc.includes("?") ? "&" : "?"}autoplay=true&muted=true&preload=true`}
              className="w-full h-full border-none absolute inset-0 z-10"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin"
            />
          </div>
        )}

        {/* Custom Cover / Poster Overlay */}
        {!loading && !error && !hasStarted && (
          <div 
            onClick={() => {
              setHasStarted(true);
              setIsPlaying(true);
            }}
            className="absolute inset-0 w-full h-full z-20 flex flex-col items-center justify-center cursor-pointer group/cover transition-all duration-500 overflow-hidden rounded-3xl"
          >
            {/* Background cover image */}
            {courseImage ? (
              <img 
                src={courseImage} 
                alt="Course Cover" 
                className="absolute inset-0 w-full h-full object-cover group-hover/cover:scale-[1.03] transition-transform duration-700 brightness-[0.4]"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-[#0a0a0f]" />
            )}
            {/* Dark gradient shadow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-0" />
            
            {/* Glowing play button */}
            <button 
              className="relative z-10 w-20 h-20 bg-[#D6004B] hover:bg-[#ff005a] border-2 border-white/20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(214,0,75,0.4)] hover:shadow-[0_0_60px_rgba(214,0,75,0.6)] group-hover/cover:scale-110 active:scale-95 transition-all duration-350 cursor-pointer"
            >
              <PlayCircle className="w-10 h-10 text-white fill-current" />
            </button>
            <span className="relative z-10 text-[10px] sm:text-xs font-bold text-zinc-300 font-alexandria mt-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 group-hover/cover:text-white transition-colors">
              اضغط لبدء تشغيل المحاضرة الفنية الفخمة
            </span>
          </div>
        )}

        {/* 2. Security Anti-Capture Cover Overlay */}
        <AnimatePresence>
          {isBlurred && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md z-45 flex flex-col items-center justify-center gap-4 text-center p-6"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-[#D6004B] flex items-center justify-center shadow-[0_0_30px_rgba(214,0,75,0.2)] animate-pulse">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h4 className="font-alexandria font-black text-white text-base">تم إيقاف الفيديو لدواعي الأمان 🔒</h4>
                <p className="text-zinc-400 text-xs font-cairo leading-relaxed">
                  تم تعتيم الفيديو تلقائياً نظراً لعدم نشاط الصفحة أو محاولة تصوير شاشة العرض. يرجى التركيز في المحاضرة للاستمرار.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Offline Overlay Warning */}
        <AnimatePresence>
          {isOffline && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-x-0 top-0 bg-rose-600/90 backdrop-blur-md z-40 text-center py-2.5 px-4 flex items-center justify-center gap-2 text-white text-xs font-bold font-cairo"
            >
              <WifiOff className="w-4 h-4 animate-bounce" />
              <span>لقد انقطع الاتصال بالإنترنت حالياً. سيتم استئناف التشغيل تلقائياً فور استقرار الشبكة.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Smart Mobile Double Tap Seek Indicator overlay */}
        <AnimatePresence>
          {showSeekIndicator.show && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 bg-black/20 pointer-events-none z-30 flex items-center justify-center"
            >
              <div className="bg-black/80 backdrop-blur-md px-5 py-3 rounded-full flex items-center gap-2 text-white border border-white/10">
                <span className="text-xs font-alexandria font-black">
                  {showSeekIndicator.direction === "forward" ? "تقدم +10 ثوانٍ ⏩" : "رجوع -10 ثوانٍ ⏪"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Loading Skeleton Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-[#06060a] z-50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-[#D6004B] animate-spin" />
            <div className="text-center space-y-1">
              <h4 className="font-alexandria font-bold text-white text-sm">تحميل آمن للمحاضرة</h4>
              <p className="text-zinc-500 text-xs font-cairo">يتم تحضير مشغل البث المؤمن الموفر من جو سكول...</p>
            </div>
          </div>
        )}

        {/* 6. Error Display Panel */}
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
              onClick={() => initPlayer()}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold font-alexandria transition-all active:scale-95"
            >
              إعادة محاولة التحميل
            </button>
          </div>
        )}

        {/* 7. Enterprise DRM Branding & Controls Cluster (Premium Learning HUD) - Removed as requested */}

        {/* 8. Smart Interactive Learning Analytics overlay */}
        <AnimatePresence>
          {showAnalyticsPanel && !isFloating && (
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="absolute left-4 top-14 w-72 bg-[#09090e]/95 border border-white/10 rounded-2xl p-4 z-20 backdrop-blur-xl shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white">
                  <Activity className="w-4 h-4 text-[#D6004B]" />
                  <span className="font-alexandria font-bold text-xs">إحصائيات التعلم الذكية</span>
                </div>
                <button 
                  onClick={() => setShowAnalyticsPanel(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-500 font-cairo">وقت المشاهدة الفعلي</span>
                  <p className="text-xs font-bold text-white font-mono">{formatTime(totalWatchedSeconds)}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-500 font-cairo">مرات التوقف المؤقت</span>
                  <p className="text-xs font-bold text-white font-mono">{pauseCount}</p>
                </div>
              </div>

              {/* Progress completion bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-zinc-500 font-cairo">معدل الإكمال الفعلي</span>
                  <span className="text-[#D6004B] font-mono">{completionPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div style={{ width: `${completionPercentage}%` }} className="h-full bg-[#D6004B] rounded-full transition-all duration-500" />
                </div>
              </div>

              {/* Watch Heatmap Chart */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 font-bold font-cairo block">مناطق التركيز والتكرار 🔥</span>
                <div className="flex items-end gap-0.5 h-12 w-full px-2 bg-black/40 rounded-xl py-1 border border-white/5">
                  {heatmapData.map((count, idx) => {
                    const heightPercent = (count / maxZoneCount) * 100;
                    return (
                      <div 
                        key={idx}
                        style={{ height: `${Math.max(10, heightPercent)}%` }}
                        className={`flex-1 rounded-t transition-all duration-300 ${count > 0 ? "bg-gradient-to-t from-[#D6004B] to-rose-400/40" : "bg-zinc-800/40"}`}
                        title={`المنطقة ${idx + 1}: تم تشغيلها ${count} مرات`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-zinc-600 font-mono font-bold">
                  <span>البداية 0:00</span>
                  <span>النهاية {formatTime(duration)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 9. Built-in Student Notes slide-out panel */}
        <AnimatePresence>
          {showNotes && !isFloating && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-[#07070c]/95 border-l border-white/10 backdrop-blur-xl z-30 p-4 flex flex-col justify-between"
            >
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
                          onClick={() => seekVideo(note.timestamp_seconds)}
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

        {/* 10. Ended / Lesson Completed Overlay with countdown autoplay & recommendations */}
        <AnimatePresence>
          {showEndedOverlay && !isFloating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#06060a]/98 backdrop-blur-md z-40 flex flex-col justify-between p-6 text-center overflow-y-auto"
            >
              {/* Animated Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-[#D6004B]/5 rounded-full blur-[90px] pointer-events-none z-0"></div>

              {/* Header section (Countdown or completion status) */}
              <div className="z-10 space-y-4 pt-4 shrink-0">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <Award className="w-6 h-6 animate-bounce" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-alexandria font-black text-white text-base">تم إكمال الدرس بنجاح! 🎉</h4>
                  <p className="text-zinc-400 text-[11px] font-cairo">رائع! لقد أضفت تقدماً جديداً إلى ملفك الشخصي.</p>
                </div>

                {onNextLesson && nextLessonTitle && (
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-3 max-w-sm mx-auto space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-right">
                        <span className="text-[9px] text-[#D6004B] font-bold font-alexandria block uppercase tracking-wider">المحاضرة القادمة</span>
                        <span className="text-[11px] text-white font-bold font-cairo truncate block max-w-[200px]">{nextLessonTitle}</span>
                      </div>
                      
                      {!autoPlayCancelled && (
                        <div className="w-8 h-8 rounded-full border-2 border-[#D6004B] flex items-center justify-center text-[11px] font-bold text-white font-mono shrink-0 animate-pulse">
                          {countdown}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => {
                          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                          onNextLesson();
                        }}
                        className="flex-1 h-8 bg-[#D6004B] hover:bg-[#ff0059] text-white font-alexandria font-black text-[10px] rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md shadow-[#D6004B]/20 cursor-pointer"
                      >
                        <span>تشغيل الآن</span>
                        <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>

                      {!autoPlayCancelled ? (
                        <button 
                          onClick={() => {
                            setAutoPlayCancelled(true);
                            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                            toast.info("تم إلغاء التشغيل التلقائي");
                          }}
                          className="px-3 h-8 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-cairo text-[10px] rounded-xl cursor-pointer"
                        >
                          إلغاء
                        </button>
                      ) : (
                        <span className="px-3 h-8 bg-zinc-900 border border-zinc-800 text-zinc-500 font-cairo text-[10px] rounded-xl flex items-center justify-center">
                          التشغيل التلقائي موقوف
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations Section (Courses suggestions) */}
              {recommendedCourses.length > 0 && (
                <div className="z-10 my-4 shrink-0">
                  <h5 className="font-alexandria font-bold text-white text-[11px] text-right mb-3 px-1">كورسات أخرى قد تهمك 💡</h5>
                  <div className="grid grid-cols-3 gap-3">
                    {recommendedCourses.map(c => (
                      <a 
                        key={c.id} 
                        href={`/courses/${c.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white/5 border border-white/5 rounded-2xl p-2 text-right hover:border-white/10 transition-all flex flex-col gap-1.5 select-none"
                      >
                        <img 
                          src={c.image_url} 
                          alt={c.title} 
                          className="w-full aspect-[16/10] object-cover rounded-xl border border-white/5"
                        />
                        <span className="text-[9px] text-zinc-400 font-cairo block truncate font-bold">{c.title}</span>
                        <span className="text-[9px] text-[#D6004B] font-mono font-bold block">{c.price_egp || c.price ? `${c.price_egp || c.price} EGP` : "ميجاني"}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom footer button */}
              <div className="z-10 pb-2 shrink-0">
                <button 
                  onClick={() => setShowEndedOverlay(false)}
                  className="px-6 h-8.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-alexandria font-bold text-[10px] rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  إعادة تشغيل المحاضرة الحالية
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
