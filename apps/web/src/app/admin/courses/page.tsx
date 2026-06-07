"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, Edit, Trash2, BookOpen, Clock, 
  Video, Save, FileText, Link as LinkIcon, Download, 
  AlertCircle, Loader2, GripVertical, ChevronDown, ChevronUp, Image as ImageIcon, CheckCircle, Users, Award, Play, X, Sparkles
} from "lucide-react";
import { 
  getCoursesList, upsertCourse, deleteCourse, getCourseBySlug, 
  upsertSection, deleteSection, upsertLesson, deleteLesson, 
  getEnrollmentsForAdmin,
  type LmsCourse, type LmsSection, type LmsLesson, type LmsEnrollment
} from "@/lib/coursesDb";
import { uploadFile, uploadPrivateFile, deleteFileFromUrl, deletePrivateFileFromUrl, uploadFileChunked } from "@/lib/upload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabaseClient";
import { RichTextEditor } from "@/components/RichTextEditor";
import * as tus from "tus-js-client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to extract GUID from Bunny.net URL or read GUID directly
function extractBunnyVideoId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = trimmed.match(guidRegex);
  return match ? match[0] : null;
}

// --- Sortable Section Component ---
function SortableSection({ section, index, onEdit, onDelete, onAddLesson, lessons, onEditLesson, onDeleteLesson, onLessonDragEnd, expanded, toggleExpand }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 };

  const allLessons = lessons || [];

  return (
    <div ref={setNodeRef} style={style} className={cn("border border-white/5 bg-[#0f0f15] rounded-2xl overflow-hidden mb-4", isDragging && "opacity-50 border-rose-500")}>
      <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab hover:text-white text-zinc-500">
            <GripVertical className="w-5 h-5" />
          </div>
          <span className="w-8 h-8 rounded-lg bg-rose-600/10 text-rose-400 font-black text-xs flex items-center justify-center border border-rose-500/20 shrink-0">
            {index + 1}
          </span>
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-sans font-bold text-white text-sm md:text-base">{section.title}</h3>
              <span className="text-[10px] text-zinc-500 font-bold">({allLessons.length} lectures)</span>
            </div>
            {section.description && (
              <p className="text-[11px] text-zinc-400 mt-0.5 max-w-lg leading-relaxed">{section.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toggleExpand(section.id)} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onEdit(section)} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(section.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="h-6 w-[1px] bg-white/5 mx-2" />
          <button onClick={() => onAddLesson(section.id)} className="h-9 px-4 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lesson</span>
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 space-y-2 bg-black/30">
          {allLessons.length === 0 ? (
            <p className="text-zinc-600 text-xs py-4 text-center">No lectures in this section yet. Click Add Lesson to get started.</p>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={(e) => onLessonDragEnd(e, section.id)}>
              <SortableContext items={allLessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                {allLessons.map((les: any) => (
                  <SortableLesson key={les.id} lesson={les} onEdit={() => onEditLesson(les)} onDelete={() => onDeleteLesson(les.id)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

// --- Sortable Lesson Component ---
function SortableLesson({ lesson, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 };
  
  return (
    <div ref={setNodeRef} style={style} className={cn(
      "p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 flex items-center justify-between gap-4 transition-all group flex-wrap", 
      isDragging && "opacity-50 border-emerald-500"
    )}>
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-white text-zinc-600">
          <GripVertical className="w-4 h-4" />
        </div>
        {lesson.lecture_type === "video" && <Video className="w-4 h-4 text-rose-500" />}
        {lesson.lecture_type === "pdf" && <FileText className="w-4 h-4 text-emerald-500" />}
        {lesson.lecture_type === "link" && <LinkIcon className="w-4 h-4 text-sky-500" />}
        {lesson.lecture_type === "download" && <Download className="w-4 h-4 text-amber-500" />}
        {lesson.lecture_type === "text" && <FileText className="w-4 h-4 text-purple-500" />}
        
        <div className="text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-rose-400 transition-colors">{lesson.title}</h4>
            {lesson.is_preview ? (
              <span className="bg-emerald-950 text-emerald-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-900/30">Free Preview</span>
            ) : null}
          </div>
          {lesson.video_url && lesson.lecture_type === "video" && (
            <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono max-w-[200px] truncate">{lesson.video_url}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {lesson.duration_seconds > 0 && (
          <span className="text-[10px] text-zinc-500 font-bold bg-white/5 px-2 py-0.5 rounded ml-2">
            {(() => {
              const h = Math.floor(lesson.duration_seconds / 3600);
              const m = Math.floor((lesson.duration_seconds % 3600) / 60);
              if (h > 0) {
                return `${h}h ${m}m`;
              }
              return `${m} min`;
            })()}
          </span>
        )}
        <button onClick={onEdit} className="p-1.5 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer">
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ShowcaseAdminItem({ 
  vid, 
  idx, 
  onDelete, 
  onChangeTitle,
  onChangeThumbnail
}: { 
  vid: any; 
  idx: number; 
  onDelete: (id: string) => void; 
  onChangeTitle: (val: string) => void;
  onChangeThumbnail: (val: string) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const videoId = vid.videoId || vid.id;
    if (videoId) {
      fetch(`/api/video/showcase?videoId=${videoId}`)
        .then(res => res.json())
        .then(data => {
          if (data.url) setSignedUrl(data.url);
        })
        .catch(() => {});
    }
  }, [vid.id, vid.videoId]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadFile(file, "course-images", "courses");
      onChangeThumbnail(url);
      toast.success("Cover uploaded successfully! 🖼️");
    } catch (err: any) {
      toast.error(err.message || "Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const embedUrl = signedUrl || vid.playbackUrl;

  return (
    <div className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden p-2 flex flex-col justify-between group relative">
      <div className="aspect-[9/16] bg-zinc-950 rounded-lg overflow-hidden relative border border-white/5 mb-2">
        {vid.thumbnailUrl ? (
          <img src={vid.thumbnailUrl} alt="Cover preview" className="w-full h-full object-cover" />
        ) : embedUrl ? (
          <iframe 
            src={embedUrl}
            className="w-full h-full pointer-events-none border-0"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 animate-pulse flex items-center justify-center text-[10px] text-zinc-500 font-sans">Loading...</div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1.5 z-10">
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            <span className="text-[9px] text-zinc-400 font-sans">Uploading cover...</span>
          </div>
        )}
      </div>
      <div className="space-y-1.5 font-sans">
        <input 
          type="text" 
          value={vid.title || ""} 
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Video title..."
          className="w-full bg-white/5 border border-white/5 rounded-lg py-1 px-1.5 text-[10px] text-white focus:border-rose-500/50 outline-none" 
        />
        
        <div className="flex gap-1">
          <input 
            type="text" 
            value={vid.thumbnailUrl || ""} 
            onChange={(e) => onChangeThumbnail(e.target.value)}
            placeholder="Video cover URL..."
            className="w-full bg-white/5 border border-white/5 rounded-lg py-1 px-1.5 text-[9px] text-white focus:border-rose-500/50 outline-none" 
          />
          <label className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0">
            <ImageIcon className="w-3 h-3" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isUploading} />
          </label>
        </div>

        <button 
          type="button"
          onClick={() => onDelete(vid.id)} 
          className="w-full py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
        >
          Delete Video
        </button>
      </div>
    </div>
  );
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [selectedCourse, setSelectedCourse] = useState<LmsCourse | null>(null);
  
  // Drag & Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Curriculum State
  const [curriculumSections, setCurriculumSections] = useState<(LmsSection & { lessons: LmsLesson[] })[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [savingSection, setSavingSection] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  
  // Modal states
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<LmsLesson> | null>(null);
  const [activeSectionForLesson, setActiveSectionForLesson] = useState<string | null>(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [editingSectionDescription, setEditingSectionDescription] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  
  // Video direct secure upload states
  const [videoFileSize, setVideoFileSize] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [autoThumbnailUrl, setAutoThumbnailUrl] = useState<string | null>(null);

  // External Video states
  const [videoSourceTab, setVideoSourceTab] = useState<"upload" | "link">("upload");
  const [externalVideoInput, setExternalVideoInput] = useState("");
  const [fetchingVideoDetails, setFetchingVideoDetails] = useState(false);

  // Video upload states (local replacements for useUploadStore)
  const [bunnyUploadStatus, setBunnyUploadStatus] = useState<"Queued" | "Uploading" | "Encoding" | "Ready" | "Failed" | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [bunnyEncodeProgress, setBunnyEncodeProgress] = useState<number>(0);
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const pollingIntervalRef = useRef<any>(null);

  const cancelVideoUpload = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setBunnyUploadStatus(null);
    setVideoUploadProgress(null);
    setBunnyEncodeProgress(0);
  };

  useEffect(() => {
    return () => {
      if (tusUploadRef.current) tusUploadRef.current.abort();
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Attachment upload states
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentProgress, setAttachmentProgress] = useState<number | null>(null);

  // AI Enhancer State
  const [isEnhancing, setIsEnhancing] = useState(false);

  const initializedLessonIdRef = useRef<string | null>(null);

  // Clear upload states upon opening/closing lesson modal
  useEffect(() => {
    if (showLessonModal && editingLesson) {
      if (initializedLessonIdRef.current !== editingLesson.id) {
        initializedLessonIdRef.current = editingLesson.id || null;
        setVideoFileSize(null);
        setVideoFileName(null);
        setAutoThumbnailUrl(editingLesson.thumbnail_url || editingLesson.attachment_url || null);
        setAttachmentUploading(false);
        setAttachmentProgress(null);
        
        // Reset local upload progress/status
        setBunnyUploadStatus(null);
        setVideoUploadProgress(null);
        setBunnyEncodeProgress(0);
        
        // Reset external video states
        if (editingLesson.video_id) {
          setVideoSourceTab("link");
          setExternalVideoInput(editingLesson.video_id);
        } else {
          setVideoSourceTab("upload");
          setExternalVideoInput("");
        }
      }
    } else {
      cancelVideoUpload();
      initializedLessonIdRef.current = null;
    }
  }, [showLessonModal, editingLesson]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!editingLesson || !editingLesson.id) {
      toast.error("Error: Lesson ID not available");
      return;
    }

    setVideoFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setVideoFileSize(`${sizeInMB} MB`);

    if (tusUploadRef.current) tusUploadRef.current.abort();
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    setBunnyUploadStatus('Uploading');
    setVideoUploadProgress(0);
    setBunnyEncodeProgress(0);

    try {
      // 1. Auto read video duration in client-side JS
      const getDuration = () => new Promise<number>((resolve) => {
        const tempVideo = document.createElement("video");
        tempVideo.preload = "metadata";
        tempVideo.src = URL.createObjectURL(file);
        tempVideo.onloadedmetadata = () => {
          resolve(Math.round(tempVideo.duration));
          URL.revokeObjectURL(tempVideo.src);
        };
        tempVideo.onerror = () => {
          resolve(0);
          URL.revokeObjectURL(tempVideo.src);
        };
      });

      const durationSec = await getDuration();
      setEditingLesson(prev => prev ? { ...prev, duration_seconds: durationSec } : prev);

      // 2. Create placeholder and get TUS authorization via Backend API
      const createRes = await fetch(`/api/admin/bunny/create-video`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: editingLesson.title || file.name })
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(`Failed to create video container: ${errData.error || createRes.statusText}`);
      }
      const { videoId, signature, expiry, libraryId } = await createRes.json();

      // 3. Perform direct browser-to-Bunny upload using TUS
      const uploadPromise = new Promise<void>((resolve, reject) => {
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
            if (error.message && error.message.includes("abort")) {
              reject(new Error("ABORTED"));
            } else {
              reject(new Error(`Failed to upload video to Bunny Stream: ${error.message}`));
            }
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
            console.log(`TUS Direct Upload: chunk sent to Bunny - progress: ${percentage}%`);
            setVideoUploadProgress(percentage);
          },
          onSuccess: () => {
            console.log(`TUS Upload Complete - videoId: ${videoId}`);
            resolve();
          },
        });

        tusUploadRef.current = upload;
        upload.start();
      });

      await uploadPromise;

      // 4. Start polling status
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
            const thumbUrl = data.thumbnailUrl || `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}/thumbnail.jpg`;
            const finalDuration = data.length || durationSec || 0;
            
            setEditingLesson(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                video_id: videoId,
                video_url: playUrl,
                playback_url: playUrl,
                thumbnail_url: thumbUrl,
                duration_seconds: finalDuration
              };
            });
            setAutoThumbnailUrl(thumbUrl);
            
            toast.success(`Video "${editingLesson.title || file.name}" uploaded and processed successfully! 🚀`);
          } else if (data.status === 5 || data.status === 8) {
            clearInterval(interval);
            pollingIntervalRef.current = null;
            setBunnyUploadStatus('Failed');
            toast.error(`Failed to encode video "${file.name}" on Bunny Stream.`);
          } else {
            setBunnyEncodeProgress(data.encodeProgress || 0);
          }
        } catch (err: any) {
          console.warn("Error polling video status:", err.message || err);
        }
      }, 4000);

      pollingIntervalRef.current = interval;

    } catch (err: any) {
      if (err.message !== "ABORTED") {
        setBunnyUploadStatus('Failed');
        toast.error(err.message || `Error uploading video "${file.name}".`);
      }
      setVideoFileName(null);
      setVideoFileSize(null);
    }
  };

  const handleVideoDelete = async () => {
    if (bunnyUploadStatus === "Uploading" || bunnyUploadStatus === "Encoding") {
      cancelVideoUpload();
      toast.success("Upload cancelled successfully.");
      return;
    }

    const videoId = editingLesson?.video_id;
    const videoUrl = editingLesson?.video_url;
    if (!videoId && !videoUrl) return;
    if (!confirm("Are you sure you want to permanently delete this video?")) return;

    try {
      if (videoId) {
        const res = await fetch(`/api/admin/bunny/video?videoId=${videoId}`, {
          method: "DELETE"
        });
        if (!res.ok) {
          throw new Error("Failed to delete video from Bunny Stream.");
        }
      } else if (videoUrl) {
        await deletePrivateFileFromUrl(videoUrl, "course-videos");
        if (editingLesson.attachment_url && editingLesson.attachment_url.includes("lesson-thumbnails")) {
          await deletePrivateFileFromUrl(editingLesson.attachment_url, "lesson-thumbnails");
        }
      }
      
      setEditingLesson(prev => ({
        ...prev,
        video_url: "",
        video_id: "",
        playback_url: "",
        thumbnail_url: "",
        attachment_url: ""
      }));
      setVideoFileName(null);
      setVideoFileSize(null);
      setAutoThumbnailUrl(null);
      toast.success("Video file deleted successfully! 🗑️");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete video.");
    }
  };

  const handleFetchExternalVideo = async () => {
    if (!externalVideoInput) {
      toast.error("Please enter a Bunny.net video URL or ID");
      return;
    }
    const videoId = extractBunnyVideoId(externalVideoInput);
    if (!videoId) {
      toast.error("Could not extract a valid video GUID from the provided URL/ID");
      return;
    }

    setFetchingVideoDetails(true);
    try {
      // 1. Fetch library configurations from API (needed for embed URL construction)
      const configRes = await fetch("/api/admin/bunny/config");
      if (!configRes.ok) {
        throw new Error("Failed to load Bunny Stream configuration");
      }
      const { libraryId } = await configRes.json();

      // 2. Fetch video status and details
      const res = await fetch(`/api/admin/bunny/video?videoId=${videoId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch video details from Bunny.net. Verify the video ID exists in your Bunny library.");
      }
      const data = await res.json();

      // Construct standard play and thumbnail URL
      const playUrl = `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}/playlist.m3u8`;
      const thumbUrl = data.thumbnailUrl || `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}/thumbnail.jpg`;

      // 3. Update editing lesson state
      setEditingLesson(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          video_id: videoId,
          video_url: playUrl,
          playback_url: playUrl,
          duration_seconds: data.length || prev.duration_seconds || 0,
          title: (!prev.title || prev.title.trim() === "") ? data.title : prev.title, // Autofill only if empty
          thumbnail_url: thumbUrl
        };
      });

      toast.success("Video linked and details fetched successfully! 🎉");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error fetching video");
    } finally {
      setFetchingVideoDetails(false);
    }
  };

  // Attachment Upload Handler
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setAttachmentUploading(true);
    setAttachmentProgress(0);

    const uploaded = [...(editingLesson?.attachments || [])];
    const folderPath = selectedCourse ? selectedCourse.slug : "general";

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. File size validation (Max 100MB)
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 100MB limit.`);
          continue;
        }

        // Upload using uploadPrivateFile
        const url = await uploadPrivateFile(file, "lesson-assets", folderPath, (pct) => {
          setAttachmentProgress(pct);
        });

        uploaded.push({
          name: file.name,
          url,
          size: file.size,
          type: file.name.split('.').pop() || "unknown"
        });
      }

      setEditingLesson(prev => ({
        ...prev,
        attachments: uploaded
      }));
      toast.success("Attachments uploaded successfully! 📂");
    } catch (err: any) {
      toast.error(err.message || "Error uploading attachments.");
    } finally {
      setAttachmentUploading(false);
      setAttachmentProgress(null);
    }
  };

  const handleAttachmentDelete = async (url: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    try {
      await deletePrivateFileFromUrl(url, "lesson-assets");
      setEditingLesson(prev => ({
        ...prev,
        attachments: (prev?.attachments || []).filter(a => a.url !== url)
      }));
      toast.success("Attachment deleted successfully.");
    } catch (e) {
      toast.error("Failed to delete attachment.");
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'pdf') return '📄';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(t)) return '📦';
    if (['doc', 'docx'].includes(t)) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(t)) return '📊';
    if (t === 'mp3') return '🎵';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(t)) return '🖼️';
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'json', 'go', 'rs', 'c', 'cpp'].includes(t)) return '💻';
    return '📁';
  };

  // Analytics State
  const [studentsData, setStudentsData] = useState<LmsEnrollment[]>([]);
  const [testStudentName, setTestStudentName] = useState("John Smith");

  // Showcase Videos State
  const [showcaseUploading, setShowcaseUploading] = useState(false);
  const [showcaseProgress, setShowcaseProgress] = useState<number | null>(null);
  const [showcaseStatus, setShowcaseStatus] = useState<string | null>(null);

  // Promo Video State
  const [promoUploading, setPromoUploading] = useState(false);
  const [promoProgress, setPromoProgress] = useState<number | null>(null);
  const promoUploadXhrRef = useRef<XMLHttpRequest | null>(null);

  // Form State
  const [courseForm, setCourseForm] = useState<Partial<LmsCourse>>({
    title: "", slug: "", short_description: "", description: "",
    image_url: "", banner_url: "", price: 0, original_price: 0,
    price_egp: 0, original_price_egp: 0, price_usd: 0, original_price_usd: 0,
    is_free: false, is_featured: false, enable_gateway_fee: true, status: "draft", level: "Beginner", category: "AI Content Creation",
    tags: [], requirements: [], what_will_learn: [], who_is_for: [],
    certificate_bg_url: "", certificate_text_color: "#000000",
    certificate_name_x: 50, certificate_name_y: 40, certificate_name_size: 24,
    certificate_course_x: 50, certificate_course_y: 55,
    certificate_date_x: 50, certificate_date_y: 70, certificate_date_size: 14,
    showcase_videos: [],
    promo_video_id: ""
  });

  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => { 
    loadCourses(); 
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data } = await supabaseClient
        .from("course_categories")
        .select("name")
        .order("order_index", { ascending: true });
      if (data && data.length > 0) {
        setCategories(data.map((c: any) => c.name));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    const data = await getCoursesList();
    setCourses(data);
    setLoading(false);
  };

  const handleCreateNewCourse = () => {
    setSelectedCourse(null);
    setCurriculumSections([]);
    setCourseForm({
      title: "", slug: "", short_description: "", description: "",
      image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
      banner_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600",
      price: 0, original_price: 0,
      price_egp: 0, original_price_egp: 0, price_usd: 0, original_price_usd: 0,
      is_free: false, is_featured: false, enable_gateway_fee: true, status: "draft", level: "Beginner", category: "AI Content Creation",
      tags: [], requirements: [], what_will_learn: [], who_is_for: [],
      certificate_bg_url: "", certificate_text_color: "#000000",
      certificate_name_x: 50, certificate_name_y: 40, certificate_name_size: 24, certificate_course_x: 50, certificate_course_y: 55, certificate_date_x: 50, certificate_date_y: 70, certificate_date_size: 14,
      showcase_videos: []
    });
    setView("form");
  };

  const handleEditCourse = async (course: LmsCourse) => {
    setSelectedCourse(course);
    setCourseForm({
      ...course,
      price_egp: course.price_egp !== undefined && course.price_egp !== null ? Number(course.price_egp) : Number(course.price) || 0,
      original_price_egp: course.original_price_egp !== undefined && course.original_price_egp !== null ? Number(course.original_price_egp) : Number(course.original_price) || 0,
      price_usd: course.price_usd !== undefined && course.price_usd !== null ? Number(course.price_usd) : 0,
      original_price_usd: course.original_price_usd !== undefined && course.original_price_usd !== null ? Number(course.original_price_usd) : 0,
      enable_gateway_fee: course.enable_gateway_fee !== false,
      tags: course.tags || [], requirements: course.requirements || [],
      what_will_learn: course.what_will_learn || [], who_is_for: course.who_is_for || [],
      certificate_bg_url: course.certificate_bg_url || "",
      certificate_text_color: course.certificate_text_color || "#000000",
      certificate_name_x: course.certificate_name_x || 50,
      certificate_name_y: course.certificate_name_y || 40,
      certificate_name_size: course.certificate_name_size || 24,
      certificate_course_x: course.certificate_course_x || 50,
      certificate_course_y: course.certificate_course_y || 55,
      certificate_date_x: course.certificate_date_x || 50,
      certificate_date_y: course.certificate_date_y || 70,
      certificate_date_size: course.certificate_date_size || 14,
      showcase_videos: course.showcase_videos || [],
      promo_video_id: course.promo_video_id || ""
    });
    
    // Load curriculum & students
    const { sections } = await getCourseBySlug(course.slug);
    setCurriculumSections(sections);
    const expandAll = sections.reduce((acc, sec) => ({...acc, [sec.id]: true}), {});
    setExpandedSections(expandAll);

    // Mock students fetch (Replace with real logic if needed)
    const enrolls = await getEnrollmentsForAdmin();
    setStudentsData(enrolls.filter(e => e.course_id === course.id));
    
    setView("form");
  };

  const handleSaveCourse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!courseForm.title) return toast.error("Please enter a course title");
    try {
      const saved = await upsertCourse(courseForm as any);
      // Update selectedCourse so curriculum builder becomes available immediately
      setSelectedCourse(saved);
      // Reload the curriculum sections for the saved course
      const { sections } = await getCourseBySlug(saved.slug);
      setCurriculumSections(sections);
      const expandAll = sections.reduce((acc, sec) => ({...acc, [sec.id]: true}), {});
      setExpandedSections(expandAll);
      toast.success("Course saved successfully! You can now add sections and lessons.");
      loadCourses();
      // Stay in form view so user can continue building curriculum
    } catch (err) { 
      console.error(err);
      toast.error("Error saving course"); 
    }
  };

  const handleEnhanceDescription = async () => {
    if (!courseForm.description || courseForm.description.trim() === "") {
      return toast.error("Please enter a description to enhance with AI");
    }
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/admin/ai/enhance-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: courseForm.description }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Enhancement failed");
      }
      setCourseForm(prev => ({ ...prev, description: data.enhancedDescription }));
      toast.success("Description enhanced professionally using AI! ✨");
    } catch (err: any) {
      toast.error(err.message || "Error enhancing description");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleShowcaseVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentVideos = courseForm.showcase_videos || [];
    if (currentVideos.length + files.length > 10) {
      toast.error(`Cannot upload more than 10 videos. You have ${currentVideos.length} video(s) and selected ${files.length} more.`);
      return;
    }

    setShowcaseUploading(true);

    try {
      const configRes = await fetch("/api/admin/bunny/config");
      if (!configRes.ok) throw new Error("Failed to load Bunny Stream configuration");
      const { libraryId, apiKey } = await configRes.json();

      // Track progress of each file
      const loadedBytes = new Array(files.length).fill(0);
      const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

      const updateProgress = () => {
        const sumLoaded = loadedBytes.reduce((acc, b) => acc + b, 0);
        const percentage = Math.round((sumLoaded / totalBytes) * 100);
        setShowcaseProgress(percentage);
      };

      // Upload with a concurrency limit of 3 to speed up and prevent connection choking
      const concurrencyLimit = 3;
      let activeIndex = 0;
      let completedCount = 0;

      const uploadNext = async (): Promise<void> => {
        if (activeIndex >= files.length) return;
        
        const index = activeIndex++;
        const file = files[index];

        try {
          setShowcaseStatus(`Uploading ${files.length} videos (${files.length - completedCount} remaining)...`);

          // Create placeholder DIRECTLY from browser → Bunny API
          const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
            method: "POST",
            headers: {
              "AccessKey": apiKey,
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ title: `showcase-${selectedCourse?.id || 'course'}-${Date.now()}` })
          });
          if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Failed to create video container for ${file.name} (${createRes.status})`);
          }
          const createData = await createRes.json();
          const videoId = createData.guid;

          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              loadedBytes[index] = event.loaded;
              updateProgress();
            }
          });

          const uploadPromise = new Promise<void>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Failed to upload file ${file.name}`));
            };
            xhr.onerror = () => reject(new Error(`Connection error uploading ${file.name}`));
          });

          xhr.open("PUT", `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`);
          xhr.setRequestHeader("AccessKey", apiKey);
          xhr.send(file);

          await uploadPromise;

          const newVideo = {
            id: videoId,
            videoId: videoId,
            playbackUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`,
            thumbnailUrl: `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}/thumbnail.jpg`,
            title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
            order: 1
          };

          setCourseForm(prev => {
            const vids = prev.showcase_videos || [];
            return {
              ...prev,
              showcase_videos: [...vids, { ...newVideo, order: vids.length + 1 }]
            };
          });

          completedCount++;
          toast.success(`${file.name} uploaded successfully!`);
        } catch (err: any) {
          console.error(err);
          toast.error(err.message || `Failed to upload ${file.name}`);
          loadedBytes[index] = file.size; // mark progress complete so percentage updates
          updateProgress();
        }

        await uploadNext();
      };

      const promises: Promise<void>[] = [];
      for (let i = 0; i < Math.min(concurrencyLimit, files.length); i++) {
        promises.push(uploadNext());
      }
      await Promise.all(promises);

      toast.success("🚀 All selected videos uploaded! Remember to save the course to apply changes.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred during upload.");
    } finally {
      setShowcaseUploading(false);
      setShowcaseProgress(null);
      setShowcaseStatus(null);
      e.target.value = "";
    }
  };

  const handleDeleteShowcaseVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      await fetch(`/api/admin/bunny/video?videoId=${videoId}`, { method: "DELETE" });
      setCourseForm(prev => ({
        ...prev,
        showcase_videos: (prev.showcase_videos || []).filter((v: any) => v.id !== videoId)
      }));
      toast.success("Video deleted.");
    } catch (e) {
      toast.error("Failed to delete video.");
    }
  };

  const handleMoveShowcaseVideo = (index: number, direction: 'up' | 'down') => {
    const list = [...(courseForm.showcase_videos || [])];
    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    setCourseForm({ ...courseForm, showcase_videos: list });
  };

  const handlePromoVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (up to 300MB for promo video)
    const maxPromoSize = 300 * 1024 * 1024;
    if (file.size > maxPromoSize) {
      toast.error("File size exceeds the 300MB limit.");
      e.target.value = "";
      return;
    }

    setPromoUploading(true);
    setPromoProgress(0);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase credentials are missing.");
      }

      const extension = file.name.split(".").pop();
      const baseName = file.name.substring(0, file.name.lastIndexOf(".")).replace(/[^a-zA-Z0-9]/g, "_");
      const sanitizedName = `promo_${baseName}_${Date.now()}.${extension}`;
      const uniquePath = `courses/videos/${sanitizedName}`;

      const xhr = new XMLHttpRequest();
      promoUploadXhrRef.current = xhr;

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setPromoProgress(percentage);
        }
      });

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/course-images/${uniquePath}`;
            resolve(publicUrl);
          } else {
            reject(new Error(`Upload failed to Supabase: ${xhr.statusText} (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.onabort = () => reject(new Error("canceled"));
      });

      const uploadUrl = `${supabaseUrl}/storage/v1/object/course-images/${uniquePath}`;
      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("Authorization", `Bearer ${supabaseAnonKey}`);
      xhr.setRequestHeader("apikey", supabaseAnonKey);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);

      const publicUrl = await uploadPromise;

      setCourseForm(prev => ({
        ...prev,
        promo_video_id: publicUrl
      }));

      toast.success("Promo video uploaded successfully! Don't forget to save changes.");
    } catch (err: any) {
      if (err.message === "canceled") {
        toast.info("Upload cancelled.");
      } else {
        console.error(err);
        toast.error(err.message || "Error uploading video.");
      }
    } finally {
      setPromoUploading(false);
      setPromoProgress(null);
      promoUploadXhrRef.current = null;
      e.target.value = "";
    }
  };

  const handleCancelPromoUpload = () => {
    if (promoUploadXhrRef.current) {
      promoUploadXhrRef.current.abort();
    }
  };

  const handlePromoVideoDelete = async () => {
    const videoId = courseForm.promo_video_id;
    if (!videoId) return;
    if (!confirm("Are you sure you want to permanently delete the promo video for this course?")) return;

    try {
      if (videoId.startsWith("http")) {
        await deleteFileFromUrl(videoId, "course-images");
      } else {
        const res = await fetch(`/api/admin/bunny/video?videoId=${videoId}`, {
          method: "DELETE"
        });
        if (!res.ok) {
          throw new Error("Failed to delete video from Bunny Stream.");
        }
      }
      
      setCourseForm(prev => ({
        ...prev,
        promo_video_id: ""
      }));
      toast.success("Promo video deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Error deleting video.");
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this entire course?")) return;
    await deleteCourse(id);
    toast.success("Course deleted successfully");
    loadCourses();
  };

  // --- Curriculum Actions ---
  const handleSaveSection = async () => {
    if (!editingSectionTitle || !selectedCourse) return;
    setSavingSection(true);
    try {
      const savedSection = await upsertSection({
        id: editingSectionId || undefined,
        course_id: selectedCourse.id,
        title: editingSectionTitle,
        description: editingSectionDescription,
        sort_order: editingSectionId ? curriculumSections.find(s => s.id === editingSectionId)?.sort_order || 1 : curriculumSections.length + 1
      });

      // Optimistic state update
      setCurriculumSections(prev => {
        const existingIdx = prev.findIndex(s => s.id === savedSection.id);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = { ...savedSection, lessons: prev[existingIdx].lessons || [] };
          return updated;
        } else {
          return [...prev, { ...savedSection, lessons: [] }];
        }
      });

      setEditingSectionTitle(""); setEditingSectionDescription(""); setEditingSectionId(null); setShowSectionModal(false);
      toast.success("Section saved successfully");

      const { sections } = await getCourseBySlug(selectedCourse.slug);
      setCurriculumSections(sections);
    } catch (err: any) {
      console.error("Error saving section:", err);
      toast.error(err.message || "Error saving section to database");
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section and all its lessons?")) return;
    const prevSections = [...curriculumSections];
    setCurriculumSections(prev => prev.filter(s => s.id !== id));
    try {
      await deleteSection(id);
      toast.success("Section deleted successfully");
      const { sections } = await getCourseBySlug(selectedCourse!.slug);
      setCurriculumSections(sections);
    } catch (err: any) {
      console.error("Error deleting section:", err);
      setCurriculumSections(prevSections);
      toast.error("Failed to delete section. Please try again.");
    }
  };

  const handleSaveLesson = async () => {
    if (!editingLesson?.title || !selectedCourse) return toast.error("Please enter a lesson title");
    const sectionId = editingLesson.section_id || (editingLesson as any).module_id || activeSectionForLesson;
    if (!sectionId) return toast.error("Failed to identify section, please try again.");
    
    const finalVideoId = editingLesson.video_id || "";
    const finalVideoUrl = editingLesson.video_url || "";
    const finalPlaybackUrl = editingLesson.playback_url || "";
    const finalThumbUrl = editingLesson.thumbnail_url || "";
    const finalDuration = editingLesson.duration_seconds || 0;

    setSavingLesson(true);
    try {
      const savedLesson = await upsertLesson({
        ...editingLesson,
        video_id: finalVideoId,
        video_url: finalVideoUrl,
        playback_url: finalPlaybackUrl,
        thumbnail_url: finalThumbUrl,
        duration_seconds: finalDuration,
        section_id: sectionId,
        title: editingLesson.title
      } as any);
      
      setCurriculumSections(prev => {
        return prev.map(sec => {
          if (sec.id !== sectionId) return sec;
          const existingLessons = sec.lessons || [];
          const existingIdx = existingLessons.findIndex(l => l.id === savedLesson.id);
          let newLessons = [...existingLessons];
          if (existingIdx > -1) {
            newLessons[existingIdx] = savedLesson;
          } else {
            newLessons.push(savedLesson);
          }
          return { ...sec, lessons: newLessons };
        });
      });

      setShowLessonModal(false); 
      setEditingLesson(null);
      cancelVideoUpload();
      toast.success("Lesson saved successfully");

      const { sections } = await getCourseBySlug(selectedCourse.slug);
      setCurriculumSections(sections);
    } catch (err: any) {
      console.error("Error saving lesson:", err);
      toast.error(err.message || "Error saving lesson to database");
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    const prevSections = [...curriculumSections];
    setCurriculumSections(prev => {
      return prev.map(sec => ({
        ...sec,
        lessons: (sec.lessons || []).filter(l => l.id !== id)
      }));
    });
    try {
      await deleteLesson(id);
      toast.success("Lesson deleted successfully");
      const { sections } = await getCourseBySlug(selectedCourse!.slug);
      setCurriculumSections(sections);
    } catch (err: any) {
      console.error("Error deleting lesson:", err);
      setCurriculumSections(prevSections);
      toast.error("Failed to delete lesson. Please try again.");
    }
  };

  // --- Drag and Drop Logic ---
  const onSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = curriculumSections.findIndex(s => s.id === active.id);
    const newIndex = curriculumSections.findIndex(s => s.id === over.id);
    const newSections = arrayMove(curriculumSections, oldIndex, newIndex);
    setCurriculumSections(newSections);
    
    // Save to DB
    for (let i = 0; i < newSections.length; i++) {
      await upsertSection({ ...newSections[i], sort_order: i + 1 });
    }
  };

  const onLessonDragEnd = async (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const secIdx = curriculumSections.findIndex(s => s.id === sectionId);
    if (secIdx === -1) return;
    
    const lessons = [...curriculumSections[secIdx].lessons];
    const oldIndex = lessons.findIndex(l => l.id === active.id);
    const newIndex = lessons.findIndex(l => l.id === over.id);
    const newLessons = arrayMove(lessons, oldIndex, newIndex);
    
    const updatedSections = [...curriculumSections];
    updatedSections[secIdx].lessons = newLessons;
    setCurriculumSections(updatedSections);
    
    // Save to DB
    for (let i = 0; i < newLessons.length; i++) {
      await upsertLesson({ ...newLessons[i], sort_order: i + 1 });
    }
  };

  // --- Uploading ---
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "image_url" | "banner_url" | "certificate_bg_url" | "attachment_url" | "lesson_thumbnail_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(fieldName);
    const bucket = fieldName === "attachment_url" ? "course-materials" : "course-images";
    
    // Custom thumbnail upload goes to 'lessons/thumbnails' folder
    let folder = "courses";
    if (fieldName === "attachment_url") {
      folder = "lessons";
    } else if (fieldName === "lesson_thumbnail_url") {
      folder = "lessons/thumbnails";
    }

    try {
      const publicUrl = await uploadFile(file, bucket, folder);
      if (fieldName === "attachment_url") {
        setEditingLesson(prev => ({ ...prev, attachment_url: publicUrl, attachment_name: file.name }));
      } else if (fieldName === "lesson_thumbnail_url") {
        setEditingLesson(prev => ({ ...prev, thumbnail_url: publicUrl }));
      } else {
        setCourseForm(prev => ({ ...prev, [fieldName]: publicUrl }));
      }
      toast.success("File uploaded successfully! 🚀");
    } catch (err: any) {
      toast.error(err.message || "Upload error.");
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-sans font-black text-white">Course & Section Management</h1>
          <p className="text-zinc-400 text-sm mt-1">Create and organize your academy, lectures, and curriculum with full flexibility.</p>
        </div>
        {view === "list" && (
          <button onClick={handleCreateNewCourse} className="h-12 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer">
            <Plus className="w-5 h-5" /> <span>Add New Course</span>
          </button>
        )}
        {view === "form" && (
          <button onClick={() => setView("list")} className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer">
            <span>Back to List</span>
          </button>
        )}
      </div>

      {/* VIEW: LIST */}
      {view === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-96 rounded-3xl bg-white/5 animate-pulse" />)
          ) : courses.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl">
              <BookOpen className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold mb-4">No courses added yet in the academy.</p>
              <button onClick={handleCreateNewCourse} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" /> Create Your First Course Now
              </button>
            </div>
          ) : (
            courses.map(course => (
              <div key={course.id} className="bg-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-white/10 transition-all group">
                <div className="relative h-44 bg-zinc-900 border-b border-white/5">
                  <img src={course.image_url} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 z-20 flex gap-2">
                    <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border", course.status === "published" ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" : "bg-amber-950 text-amber-400 border-amber-900/30")}>
                      {course.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{course.category}</span>
                    <h3 className="text-lg font-alexandria font-bold text-white line-clamp-2">{course.title}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4">
                    <button onClick={() => handleEditCourse(course)} className="h-10 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <Edit className="w-3.5 h-3.5" /> <span>Manage Course</span>
                    </button>
                    <button onClick={() => handleDeleteCourse(course.id)} className="h-10 rounded-xl bg-red-950/15 border border-red-900/10 hover:bg-red-950/30 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" /> <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW: FORM / BUILDER / PROGRESS */}
      {view === "form" && (
        <div className="space-y-12">
          {/* Section 1: Basic Course Info */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
              <h2 className="text-xl font-alexandria font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-rose-500" />
                Course Basic Data
              </h2>
              <button onClick={handleSaveCourse} className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg text-xs cursor-pointer">
                <Save className="w-4 h-4" /> <span>Save Changes</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveCourse} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Course Title *</label>
                <input required value={courseForm.title || ""} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Unique Slug</label>
                <input value={courseForm.slug || ""} onChange={e => setCourseForm({ ...courseForm, slug: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm text-zinc-300" />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-rose-400">Price in EGP *</label>
                <input type="number" required value={courseForm.price_egp !== undefined ? courseForm.price_egp : courseForm.price} onChange={e => setCourseForm({ ...courseForm, price_egp: Number(e.target.value), price: Number(e.target.value) })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Original Price before discount (EGP)</label>
                <input type="number" value={courseForm.original_price_egp !== undefined ? (courseForm.original_price_egp || "") : (courseForm.original_price || "")} onChange={e => setCourseForm({ ...courseForm, original_price_egp: Number(e.target.value), original_price: Number(e.target.value) })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-emerald-400">Price in USD *</label>
                <input type="number" required value={courseForm.price_usd || 0} onChange={e => setCourseForm({ ...courseForm, price_usd: Number(e.target.value) })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Original Price before discount (USD)</label>
                <input type="number" value={courseForm.original_price_usd || ""} onChange={e => setCourseForm({ ...courseForm, original_price_usd: Number(e.target.value) })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Course Level</label>
                <select value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value as any })} className="bg-[#0f0f15] border border-white/5 rounded-xl py-3 px-4 text-sm">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Course Category</label>
                <select value={courseForm.category} onChange={e => setCourseForm({ ...courseForm, category: e.target.value })} className="bg-[#0f0f15] border border-white/5 rounded-xl py-3 px-4 text-sm">
                  {(categories.length > 0 ? categories : ["AI Content Creation", "AI Animation", "Creative Video Production", "Digital Storytelling", "Free Courses"]).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Publication Status</label>
                <select value={courseForm.status} onChange={e => setCourseForm({ ...courseForm, status: e.target.value as any })} className="bg-[#0f0f15] border border-white/5 rounded-xl py-3 px-4 text-sm">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Course Cover Image (shown on homepage and store cards)</label>
                <div className="flex gap-2">
                  <input value={courseForm.image_url || ""} onChange={e => setCourseForm({ ...courseForm, image_url: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm flex-1 text-zinc-300" />
                  <label className="h-[46px] px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    {uploadingField === "image_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 rotate-180" />}
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "image_url")} disabled={uploadingField !== null} />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Banner URL</label>
                <div className="flex gap-2">
                  <input value={courseForm.banner_url || ""} onChange={e => setCourseForm({ ...courseForm, banner_url: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm flex-1 text-zinc-300" />
                  <label className="h-[46px] px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    {uploadingField === "banner_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 rotate-180" />}
                    <span>Upload Banner</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "banner_url")} disabled={uploadingField !== null} />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">Course Promo Video (ID / URL)</label>
                <div className="flex gap-2">
                  <input 
                    value={courseForm.promo_video_id || ""} 
                    onChange={e => setCourseForm({ ...courseForm, promo_video_id: e.target.value })} 
                    placeholder={promoUploading ? "Uploading promo video..." : "Video ID or URL..."}
                    disabled={promoUploading}
                    className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm flex-1 text-zinc-300 disabled:opacity-50" 
                  />
                  {courseForm.promo_video_id && !promoUploading && (
                    <button
                      type="button"
                      onClick={handlePromoVideoDelete}
                      className="h-[46px] px-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                  {promoUploading ? (
                    <button
                      type="button"
                      onClick={handleCancelPromoUpload}
                      className="h-[46px] px-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel ({promoProgress}%)</span>
                    </button>
                  ) : (
                    <label className="h-[46px] px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <Video className="w-4 h-4" />
                      <span>Upload Video</span>
                      <input type="file" accept="video/*" className="hidden" onChange={handlePromoVideoUpload} disabled={promoUploading} />
                    </label>
                  )}
                </div>
                {promoProgress !== null && (
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-rose-600 h-full transition-all duration-300" style={{ width: `${promoProgress}%` }} />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-4 py-2 justify-center">
                <div className="flex items-center gap-3 select-none">
                  <input type="checkbox" id="isFreeCheckbox" checked={courseForm.is_free || false} onChange={e => setCourseForm({ ...courseForm, is_free: e.target.checked })} className="w-4 h-4 rounded accent-rose-600 cursor-pointer" />
                  <label htmlFor="isFreeCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer">
                    This course is completely free
                  </label>
                </div>
                <div className="flex items-center gap-3 select-none">
                  <input type="checkbox" id="isFeaturedCheckbox" checked={courseForm.is_featured || false} onChange={e => setCourseForm({ ...courseForm, is_featured: e.target.checked })} className="w-4 h-4 rounded accent-rose-600 cursor-pointer" />
                  <label htmlFor="isFeaturedCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer">
                    Featured course
                  </label>
                </div>
                <div className="flex flex-col gap-1 bg-white/[0.01] border border-white/5 rounded-xl p-3 select-none">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="courseEnableGatewayFeeCheckbox" 
                      checked={courseForm.enable_gateway_fee !== false} 
                      onChange={e => setCourseForm({ ...courseForm, enable_gateway_fee: e.target.checked })} 
                      className="w-4 h-4 rounded accent-rose-600 cursor-pointer" 
                    />
                    <label htmlFor="courseEnableGatewayFeeCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer">
                      Enable Payment Processing Fee Recovery (3%)
                    </label>
                  </div>
                  <p className="text-[10px] text-zinc-500 pl-7 leading-relaxed">
                    Adds a small processing fee during checkout to help cover secure payment gateway transaction costs.
                  </p>
                </div>
              </div>

              
              <div className="md:col-span-2">
                <RichTextEditor 
                  label="Short Summary & Quick Overview"
                  value={courseForm.short_description || ""}
                  onChange={val => setCourseForm({ ...courseForm, short_description: val })}
                  placeholder="Write a short, compelling summary visible on the course card..."
                />
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">Full & Professional Course Description</span>
                  <button
                    type="button"
                    onClick={handleEnhanceDescription}
                    disabled={isEnhancing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold font-sans transition-all shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEnhancing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Enhance with AI ✨</span>
                  </button>
                </div>
                <RichTextEditor 
                  label=""
                  value={courseForm.description || ""}
                  onChange={val => setCourseForm({ ...courseForm, description: val })}
                  placeholder="Write course content and description in a professional, student-engaging way..."
                />
              </div>
            </form>
          </div>

          {/* Section 2: Curriculum Builder (ONLY IF SAVED ONCE) */}
          {selectedCourse ? (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <h2 className="text-xl font-alexandria font-bold text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-rose-500" />
                  Curriculum Builder
                </h2>
                <button onClick={() => { setEditingSectionId(null); setEditingSectionTitle(""); setEditingSectionDescription(""); setShowSectionModal(true); }} className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 text-xs cursor-pointer">
                  <Plus className="w-4 h-4" /> <span>Add Study Section</span>
                </button>
              </div>

              {curriculumSections.length === 0 && !savingSection ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                  <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 font-bold text-sm">Curriculum is empty. Add a study section to get started.</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
                  <SortableContext items={curriculumSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      <AnimatePresence initial={false}>
                        {curriculumSections.map((sec, index) => (
                          <motion.div
                            key={sec.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <SortableSection 
                              index={index}
                              section={sec} 
                              lessons={sec.lessons}
                              expanded={expandedSections[sec.id]}
                              toggleExpand={(id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))}
                              onEdit={(s: any) => { setEditingSectionId(s.id); setEditingSectionTitle(s.title); setEditingSectionDescription(s.description || ""); setShowSectionModal(true); }}
                              onDelete={handleDeleteSection}
                              onAddLesson={(sId: string) => { setActiveSectionForLesson(sId); setEditingLesson({ id: `les-${Date.now()}`, title: "", video_url: "", duration_seconds: 300, is_preview: false, lecture_type: "video" }); setShowLessonModal(true); }}
                              onEditLesson={(les: any) => { setEditingLesson(les); setShowLessonModal(true); }}
                              onDeleteLesson={handleDeleteLesson}
                              onLessonDragEnd={onLessonDragEnd}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Skeleton loader for saving a new section */}
                      {savingSection && !editingSectionId && (
                        <div className="border border-white/5 bg-[#0f0f15]/50 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse">
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-5 h-5 rounded bg-white/5" />
                            <div className="w-8 h-8 rounded-lg bg-white/5" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-white/10 rounded w-1/3" />
                              <div className="h-3 bg-white/5 rounded w-1/2" />
                            </div>
                          </div>
                          <div className="w-24 h-8 bg-white/5 rounded-lg" />
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          ) : (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl space-y-6">
              {/* Decorative radial glow */}
              <div className="absolute w-80 h-80 bg-rose-500/5 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

              <div className="mx-auto w-20 h-20 rounded-full bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 animate-pulse">
                <Video className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="font-alexandria font-bold text-white text-lg md:text-xl">
                  Curriculum & Lecture Management (LMS Builder) Ready to go!
                </h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
                  You're building a great learning path! 🚀 Please save the basic course data first (title, price, and cover) to create the course in the database, then you'll instantly get access to the curriculum builder, video lecture uploads, and drag-and-drop PDF/attachment management.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveCourse()}
                  className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Course Data & Activate Lecture Builder 🚀</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Certificate Builder */}
          {selectedCourse ? (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <h2 className="text-xl font-alexandria font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Automatic Certificate Builder
                </h2>
                <button onClick={handleSaveCourse} className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg text-xs cursor-pointer">
                  <Save className="w-4 h-4" /> <span>Save Certificate Settings</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-400">Certificate Background Image</label>
                    <div className="flex gap-2">
                      <input value={courseForm.certificate_bg_url || ""} onChange={e => setCourseForm({ ...courseForm, certificate_bg_url: e.target.value })} placeholder="Certificate background URL..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm flex-1 text-zinc-300" />
                      <label className="h-[46px] px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                        {uploadingField === "certificate_bg_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        <span>Upload Background</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "certificate_bg_url")} disabled={uploadingField !== null} />
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-400">Test Student Name (Live Preview)</label>
                    <input type="text" value={testStudentName} onChange={e => setTestStudentName(e.target.value)} placeholder="e.g. John Smith..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50 text-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">Student Name Horizontal Position (X %)</label>
                      <input type="number" value={courseForm.certificate_name_x ?? ""} onChange={e => setCourseForm({...courseForm, certificate_name_x: Number(e.target.value)})} className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm text-white" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">Student Name Vertical Position (Y %)</label>
                      <input type="number" value={courseForm.certificate_name_y ?? ""} onChange={e => setCourseForm({...courseForm, certificate_name_y: Number(e.target.value)})} className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm text-white" />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">Date Horizontal Position (X %)</label>
                      <input type="number" value={courseForm.certificate_date_x ?? ""} onChange={e => setCourseForm({...courseForm, certificate_date_x: Number(e.target.value)})} className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm text-white" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">Date Vertical Position (Y %)</label>
                      <input type="number" value={courseForm.certificate_date_y ?? ""} onChange={e => setCourseForm({...courseForm, certificate_date_y: Number(e.target.value)})} className="bg-[#0f0f15] border border-white/5 rounded-xl py-2 px-4 text-sm text-white" />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-rose-400">Student Name Font Size (px)</label>
                      <input type="number" value={courseForm.certificate_name_size ?? ""} onChange={e => setCourseForm({...courseForm, certificate_name_size: Number(e.target.value)})} className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm text-white" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">Date Font Size (px)</label>
                      <input type="number" value={courseForm.certificate_date_size ?? ""} onChange={e => setCourseForm({...courseForm, certificate_date_size: Number(e.target.value)})} className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Certificate Preview Box */}
                <div 
                  className="relative w-full aspect-[1.414/1] bg-white/5 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center"
                  style={{ containerType: 'inline-size' } as React.CSSProperties}
                >
                  <style dangerouslySetInnerHTML={{__html: `
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Alexandria:wght@800;900&family=Alike&display=swap');
                  `}} />
                  {courseForm.certificate_bg_url ? (
                    <>
                      <img src={courseForm.certificate_bg_url} alt="Certificate Background" className="absolute inset-0 w-full h-full object-contain" />
                      <div className="absolute inset-0 z-10 font-bold" style={{ color: courseForm.certificate_text_color }}>
                        <div 
                          className="absolute whitespace-nowrap transition-all" 
                          style={{ 
                            left: `${courseForm.certificate_name_x}%`, 
                            top: `${courseForm.certificate_name_y}%`, 
                            fontSize: `calc((${(() => {
                              const nameLength = (testStudentName || "[Student Name]").length;
                              let lengthScale = 1.0;
                              if (nameLength > 35) lengthScale = 0.55;
                              else if (nameLength > 28) lengthScale = 0.65;
                              else if (nameLength > 20) lengthScale = 0.8;
                              return (courseForm.certificate_name_size || 24) * lengthScale;
                            })()} / 800) * 100cqw)`,
                            transform: 'translate(-50%, -50%)',
                            fontWeight: 'normal',
                          }}
                        >
                          {testStudentName || "[Student Name Here]"}
                        </div>
                        <div 
                          className="absolute whitespace-nowrap font-mono" 
                          style={{ 
                            left: `${courseForm.certificate_date_x}%`, 
                            top: `${courseForm.certificate_date_y}%`, 
                            fontSize: `calc((${courseForm.certificate_date_size || 14} / 800) * 100cqw)`,
                            transform: 'translate(-50%, -50%)' 
                          }}
                        >
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-500 font-bold text-sm">Please enter a URL or upload a certificate background to preview it.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl space-y-6">
              {/* Decorative radial glow */}
              <div className="absolute w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="font-alexandria font-bold text-white text-lg md:text-xl">
                  Automatic Student Certificates Builder
                </h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
                  Grant your students official completion certificates with a dynamic QR code once they complete course requirements! Please save the basic course data first to activate the name, date, and text color positioning panel over your custom certificate template.
                </p>
              </div>
            </div>
          )}

          {/* Section 3.5: Showcase Videos Builder */}
          {selectedCourse ? (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <h2 className="text-xl font-alexandria font-bold text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-rose-500" />
                  Student Results Showcase Videos
                </h2>
                <div className="flex items-center gap-2">
                  <label className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 text-xs cursor-pointer transition-all select-none">
                    <Plus className="w-4 h-4" /> <span>Upload Video (max 10)</span>
                    <input type="file" accept="video/*" multiple className="hidden" onChange={handleShowcaseVideoUpload} disabled={showcaseUploading} />
                  </label>
                  <button type="button" onClick={() => handleSaveCourse()} className="h-10 px-5 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-xl font-bold flex items-center gap-2 text-xs transition-all cursor-pointer">
                    <Save className="w-4 h-4" /> <span>Save Changes</span>
                  </button>
                </div>
              </div>

              {showcaseUploading && (
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-400">Upload Status: {showcaseStatus}</span>
                    <span className="text-rose-400">{showcaseProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-600 transition-all duration-300" style={{ width: `${showcaseProgress || 0}%` }} />
                  </div>
                </div>
              )}

              {(!courseForm.showcase_videos || courseForm.showcase_videos.length === 0) ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                  <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 font-bold text-sm">No showcase videos uploaded yet. Upload vertical videos (9:16) to display on the course page.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5">
                  {courseForm.showcase_videos.map((vid: any, idx: number) => (
                    <ShowcaseAdminItem
                      key={vid.id || idx}
                      vid={vid}
                      idx={idx}
                      onDelete={handleDeleteShowcaseVideo}
                      onChangeTitle={(val) => {
                        setCourseForm(prev => {
                          const list = [...(prev.showcase_videos || [])];
                          list[idx] = { ...list[idx], title: val };
                          return { ...prev, showcase_videos: list };
                        });
                      }}
                      onChangeThumbnail={(val) => {
                        setCourseForm(prev => {
                          const list = [...(prev.showcase_videos || [])];
                          list[idx] = { ...list[idx], thumbnailUrl: val };
                          return { ...prev, showcase_videos: list };
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl space-y-6 mt-8">
              <div className="absolute w-80 h-80 bg-rose-500/5 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="mx-auto w-20 h-20 rounded-full bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <Video className="w-10 h-10" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="font-sans font-bold text-white text-lg md:text-xl">Student Results Showcase Videos</h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
                  Upload vertical (TikTok/Reels) videos showcasing your students' results to encourage new buyers! Please save the course first to get started.
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Students Progress Dashboard */}
          {selectedCourse && (
             <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                  <h2 className="text-xl font-alexandria font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Students Progress Dashboard
                  </h2>
                  {studentsData.length > 0 && (
                    <button 
                      onClick={() => {
                        let csvContent = "\uFEFF";
                        csvContent += "Name,Email,Enrollment Date,Status\n";
                        studentsData.forEach(student => {
                          csvContent += `"${student.user_name || "Student"}","${student.user_email}","${new Date(student.enrolled_at).toLocaleDateString("en-US")}","Active"\n`;
                        });
                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", `students_${selectedCourse?.title || "course"}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success("CSV file exported successfully! 📂");
                      }}
                      className="h-9 px-4 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
                
                {studentsData.length === 0 ? (
                  <p className="text-zinc-500 text-center py-6 text-sm">No students enrolled in this course yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-zinc-400">
                      <thead className="text-xs text-white uppercase bg-white/5">
                        <tr>
                          <th className="px-6 py-4 rounded-l-xl">Student Name / Email</th>
                          <th className="px-6 py-4">Join Date</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsData.map(student => (
                          <tr key={student.id} className="border-b border-white/5 bg-white/[0.01]">
                            <td className="px-6 py-4 font-bold text-white flex flex-col">
                              <span>{student.user_name || "Student"}</span>
                              <span className="text-[10px] text-zinc-500">{student.user_email}</span>
                            </td>
                            <td className="px-6 py-4">{new Date(student.enrolled_at).toLocaleDateString("en-US")}</td>
                            <td className="px-6 py-4">
                              <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-[10px]">Active</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          )}

          {/* Save Course Footer Action */}
          <div className="flex items-center justify-between bg-[#0a0a0f]/90 backdrop-blur-md border border-white/5 p-6 rounded-3xl shadow-2xl mt-8">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-white font-sans">Save All Changes</span>
              <span className="text-zinc-500 text-xs">Save all current course, curriculum, and certificate details to the database</span>
            </div>
            <button 
              type="button"
              onClick={() => handleSaveCourse()} 
              className="h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              <Save className="w-5 h-5" /> <span>Save Full Course 🚀</span>
            </button>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <h3 className="font-sans font-bold text-white text-base">
              {editingSectionId ? "Edit Study Section Title" : "Add New Study Section"}
            </h3>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-bold">Section Name *</label>
              <input required disabled={savingSection} value={editingSectionTitle} onChange={e => setEditingSectionTitle(e.target.value)} placeholder="e.g. Unit 1: Introduction..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50 text-white disabled:opacity-50" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-bold">Section Description</label>
              <textarea rows={3} disabled={savingSection} value={editingSectionDescription} onChange={e => setEditingSectionDescription(e.target.value)} placeholder="Write a brief overview of this section's content..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50 text-white disabled:opacity-50" />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
              <button disabled={savingSection} onClick={() => setShowSectionModal(false)} className="h-10 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50 text-white">Cancel</button>
              <button disabled={savingSection || !editingSectionTitle} onClick={handleSaveSection} className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {savingSection ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Save Section</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && editingLesson && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto py-10">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-rose-600/30">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-sans font-bold text-white text-base md:text-lg">
                {editingLesson.id ? "Edit Lecture Details" : "Add New Lecture/Lesson"}
              </h3>
              <button 
                onClick={() => { 
                  if (bunnyUploadStatus === 'Uploading' || bunnyUploadStatus === 'Encoding') {
                    if (!confirm("A video is currently uploading or processing. Closing will cancel the upload. Are you sure?")) {
                      return;
                    }
                    cancelVideoUpload();
                  }
                  setShowLessonModal(false); 
                  setEditingLesson(null); 
                }} 
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-zinc-400 font-bold">Lecture Title *</label>
                <input required value={editingLesson.title || ""} onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-zinc-400 font-bold">Lecture Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 h-[46px]">
                    <input 
                      type="number" 
                      min={0}
                      placeholder="0"
                      value={Math.floor((editingLesson.duration_seconds || 0) / 3600) || ""} 
                      onChange={e => {
                        const h = Math.max(0, parseInt(e.target.value) || 0);
                        const m = Math.floor(((editingLesson.duration_seconds || 0) % 3600) / 60);
                        const s = (editingLesson.duration_seconds || 0) % 60;
                        setEditingLesson({
                          ...editingLesson,
                          duration_seconds: (h * 3600) + (m * 60) + s
                        });
                      }} 
                      className="bg-transparent border-0 w-full text-sm focus:ring-0 text-white outline-none" 
                    />
                    <span className="text-xs text-zinc-500 font-bold shrink-0">hr</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 h-[46px]">
                    <input 
                      type="number" 
                      min={0}
                      max={59}
                      placeholder="0"
                      value={Math.floor(((editingLesson.duration_seconds || 0) % 3600) / 60) || ""} 
                      onChange={e => {
                        const h = Math.floor((editingLesson.duration_seconds || 0) / 3600);
                        const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                        const s = (editingLesson.duration_seconds || 0) % 60;
                        setEditingLesson({
                          ...editingLesson,
                          duration_seconds: (h * 3600) + (m * 60) + s
                        });
                      }} 
                      className="bg-transparent border-0 w-full text-sm focus:ring-0 text-white outline-none" 
                    />
                    <span className="text-xs text-zinc-500 font-bold shrink-0">min</span>
                  </div>
                </div>
              </div>
              
              {/* Video URL with Live Preview & Direct Upload */}
              {editingLesson.lecture_type === "video" && (
                <div className="flex flex-col gap-3 sm:col-span-2 space-y-2 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <label className="text-xs text-rose-400 font-black font-sans flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      <span>Secure Video Upload & Hosting (Private Streaming)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-bold">Private Video Hosting</span>
                  </div>

                  {/* Tab Selector - Only show if video is not yet uploaded/linked */}
                  {!(editingLesson.video_url || editingLesson.video_id) && bunnyUploadStatus !== "Encoding" && (
                    <div className="flex p-1 bg-white/5 border border-white/5 rounded-xl gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setVideoSourceTab("upload")}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 font-sans flex items-center justify-center gap-1.5 cursor-pointer",
                          videoSourceTab === "upload" 
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" 
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Download className="w-3.5 h-3.5 rotate-180" />
                        <span>Upload Local Video File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoSourceTab("link")}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 font-sans flex items-center justify-center gap-1.5 cursor-pointer",
                          videoSourceTab === "link" 
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" 
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Link External Video</span>
                      </button>
                    </div>
                  )}

                  {/* Drag/Drop and File picker box (Upload Tab) */}
                  {videoSourceTab === "upload" && !(editingLesson.video_url || editingLesson.video_id) && bunnyUploadStatus !== "Encoding" && (
                    <div className="border-2 border-dashed border-white/10 hover:border-rose-500/40 rounded-xl p-8 text-center transition-all bg-black/25 relative group">
                      <input 
                        type="file" 
                        accept="video/*" 
                        onChange={handleVideoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        disabled={videoUploadProgress !== null}
                      />
                      
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                          <Download className="w-6 h-6 rotate-180" />
                        </div>
                        <div className="text-sm font-bold text-white">Drag video file here or click to browse</div>
                        <p className="text-zinc-500 text-xs font-sans">
                          Uploads directly to streaming server (supports very large files)
                        </p>
                      </div>

                      {/* Progress Bar overlay */}
                      {videoUploadProgress !== null && (
                        <div className="absolute inset-0 bg-[#0a0a0f]/95 rounded-xl flex flex-col items-center justify-center p-6 space-y-3 z-20">
                          <Loader2 className="w-8 h-8 text-[#D6004B] animate-spin" />
                          <div className="w-full max-w-xs space-y-1">
                            <div className="flex justify-between text-xs font-bold text-white">
                              <span>Uploading video to server...</span>
                              <span>{videoUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#D6004B] h-full transition-all duration-300"
                                style={{ width: `${videoUploadProgress}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 text-right">
                              File: {videoFileName} ({videoFileSize})
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* External Link Input Box (Link Tab) */}
                  {videoSourceTab === "link" && !(editingLesson.video_url || editingLesson.video_id) && (
                    <div className="bg-black/25 border border-white/5 rounded-xl p-6 space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-400 font-bold font-sans">Enter a video URL or ID</label>
                        <p className="text-[10px] text-zinc-500 leading-normal mb-1 font-sans">
                          e.g. embed URL, playback URL, or raw video GUID. We'll extract the video ID and fetch full details automatically.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={externalVideoInput}
                            onChange={e => setExternalVideoInput(e.target.value)}
                            placeholder="https://iframe.mediadelivery.net/embed/..."
                            className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs font-mono text-zinc-300 flex-1 focus:border-rose-500/50 outline-none"
                            disabled={fetchingVideoDetails}
                          />
                          <button
                            type="button"
                            onClick={handleFetchExternalVideo}
                            disabled={fetchingVideoDetails || !externalVideoInput}
                            className="h-[46px] px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {fetchingVideoDetails ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Fetching...</span>
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-4 h-4" />
                                <span>Fetch Details</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Polling/Encoding Progress container */}
                  {bunnyUploadStatus === "Encoding" && (
                    <div className="border border-dashed border-amber-500/20 rounded-xl p-8 text-center bg-black/25 relative">
                      <div className="space-y-3 max-w-md mx-auto">
                        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
                        <div className="text-sm font-bold text-white">Encoding & processing video on server</div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full transition-all duration-300"
                            style={{ width: `${bunnyEncodeProgress || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 font-bold">
                          <span>Encode Progress: {bunnyEncodeProgress || 0}%</span>
                          <span>Please don't close the window...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Video URL Manual Backup and Edit */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold">Current Video Path or Video ID</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={editingLesson.video_id || editingLesson.video_url || ""} 
                        onChange={e => setEditingLesson({ ...editingLesson, video_url: e.target.value })} 
                        placeholder="Video path or Video ID..." 
                        className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs flex-1 font-mono text-zinc-300" 
                      />
                      {(editingLesson.video_url || editingLesson.video_id) && (
                        <button 
                          type="button"
                          onClick={handleVideoDelete}
                          className="h-[46px] px-4 bg-red-950/20 hover:bg-red-950/40 text-red-500 border border-red-900/10 rounded-xl text-xs font-bold font-sans flex items-center justify-center transition-all cursor-pointer"
                        >
                          🗑️ Delete Video
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Generated Thumbnail preview & details */}
                  {(editingLesson.video_url || editingLesson.video_id || bunnyUploadStatus === "Encoding") && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      
                      {/* Video Player Preview */}
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-950 aspect-video relative flex flex-col justify-center items-center">
                        <span className="absolute top-2 right-2 bg-black/60 text-[9px] text-zinc-400 font-black px-2 py-0.5 rounded backdrop-blur z-20 font-sans uppercase tracking-wider">Video Player Preview</span>
                        {bunnyUploadStatus === "Encoding" ? (
                          <div className="text-center p-4 flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                            <p className="text-amber-400 text-[11px] font-bold">Preparing video for playback...</p>
                            <span className="text-[10px] text-zinc-500 font-mono">Video encode progress: {bunnyEncodeProgress}%</span>
                          </div>
                        ) : editingLesson.video_url?.startsWith("http") ? (
                          <video 
                            src={editingLesson.video_url} 
                            controls 
                            className="w-full h-full object-contain"
                            controlsList="nodownload"
                          />
                        ) : editingLesson.video_id ? (
                          <iframe 
                            src={`https://iframe.mediadelivery.net/embed/666491/${editingLesson.video_id}?autoplay=false&responsive=true`}
                            className="w-full h-full border-none"
                            allowFullScreen
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Video className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-zinc-500 text-[11px] font-bold">Video is privately hosted</p>
                          </div>
                        )}
                      </div>

                      {/* Auto-extracted Thumbnail Preview */}
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-950 aspect-video relative flex flex-col justify-center items-center">
                        <span className="absolute top-2 right-2 bg-black/60 text-[9px] text-emerald-400 font-black px-2 py-0.5 rounded backdrop-blur z-20 font-sans uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Thumbnail Cover
                        </span>
                        
                        {editingLesson.thumbnail_url || autoThumbnailUrl ? (
                          <img 
                            src={editingLesson.thumbnail_url || autoThumbnailUrl || ""} 
                            alt="Extracted frame" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-zinc-500 text-[11px] font-bold">Thumbnail will be fetched automatically once the video is ready</p>
                          </div>
                        )}
                      </div>

                      {/* Custom cover section */}
                      <div className="sm:col-span-2 border-t border-white/5 pt-4 space-y-3">
                        <label className="text-xs font-bold text-zinc-400 font-sans block">Custom Lecture Cover</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={editingLesson.thumbnail_url || ""} 
                            onChange={e => setEditingLesson(prev => prev ? { ...prev, thumbnail_url: e.target.value } : prev)} 
                            placeholder="Enter a cover image URL or upload an image..." 
                            className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs flex-1 text-zinc-300 focus:border-rose-500/50 outline-none" 
                          />
                          <label className="h-[46px] px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors select-none shrink-0">
                            {uploadingField === "lesson_thumbnail_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            <span>Upload Cover</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={e => handleFileUpload(e, "lesson_thumbnail_url")} 
                              disabled={uploadingField !== null} 
                            />
                          </label>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-normal font-sans">
                          Optional. If left blank, the default automatic video screenshot will be used.
                        </p>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Lesson Attachments System */}
              <div className="flex flex-col gap-3 sm:col-span-2 space-y-2 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <label className="text-xs text-emerald-400 font-black font-sans flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>Lesson Attachments System</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-bold">Upload PDFs, ZIPs, code, and project files...</span>
                </div>

                {/* Upload zone */}
                <div className="border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-xl p-6 text-center transition-all bg-black/25 relative group">
                  <input 
                    type="file" 
                    multiple
                    onChange={handleAttachmentUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    disabled={attachmentUploading}
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-white">Drag files here or click to browse</div>
                    <p className="text-zinc-500 text-[10px]">
                      Supports PDF, ZIP, DOCX, XLSX, MP3, images and code files up to 100MB per file
                    </p>
                  </div>

                  {attachmentUploading && (
                    <div className="absolute inset-0 bg-[#0a0a0f]/95 rounded-xl flex flex-col items-center justify-center p-4 space-y-2 z-20">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      <div className="w-full max-w-xs space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-white">
                          <span>Uploading attachments...</span>
                          <span>{attachmentProgress !== null ? `${attachmentProgress}%` : ""}</span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${attachmentProgress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attached Files List */}
                {editingLesson.attachments && editingLesson.attachments.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] text-zinc-500 font-bold block">Currently Attached Files ({editingLesson.attachments.length})</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {editingLesson.attachments.map((file, idx) => (
                        <div key={file.url || idx} className="p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between gap-3 group transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg shrink-0">{getFileIcon(file.type)}</span>
                            <div className="min-w-0 leading-tight">
                              <p className="text-xs font-bold text-white truncate max-w-[160px]">{file.name}</p>
                              <span className="text-[9px] text-zinc-500 font-bold font-mono">{formatBytes(file.size)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAttachmentDelete(file.url)}
                            className="p-1 rounded bg-red-950/20 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {editingLesson.lecture_type === "link" && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs text-zinc-400 font-bold">External Link</label>
                  <input type="text" value={editingLesson.external_link || ""} onChange={e => setEditingLesson({ ...editingLesson, external_link: e.target.value })} placeholder="https://..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm text-zinc-300" />
                </div>
              )}

              <div className="flex items-center gap-3 py-2 sm:col-span-2 select-none">
                <input type="checkbox" id="previewCheckbox" checked={editingLesson.is_preview} onChange={e => setEditingLesson({ ...editingLesson, is_preview: e.target.checked })} className="w-4 h-4 rounded accent-rose-600 cursor-pointer" />
                <label htmlFor="previewCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer">
                  Make this lesson available as a free preview
                </label>
              </div>

              <div className="sm:col-span-2">
                <RichTextEditor 
                  label="Lecture Description & Additional Details"
                  value={editingLesson.content || ""}
                  onChange={val => setEditingLesson({ ...editingLesson, content: val })}
                  placeholder="Write lecture content, notes, or important information for students here..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
              <button disabled={savingLesson} onClick={() => { 
                if (bunnyUploadStatus === 'Uploading' || bunnyUploadStatus === 'Encoding') {
                  if (!confirm("A video is currently uploading or processing. Closing will cancel the upload. Are you sure?")) {
                    return;
                  }
                  cancelVideoUpload();
                }
                setShowLessonModal(false); 
                setEditingLesson(null); 
              }} className="h-10 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50 text-white">Cancel</button>
              <button 
                disabled={savingLesson || !editingLesson.title || bunnyUploadStatus === "Uploading" || bunnyUploadStatus === "Encoding"} 
                onClick={handleSaveLesson} 
                className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Save Lecture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
