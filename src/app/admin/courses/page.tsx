"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Edit, Trash2, BookOpen, Clock, 
  Video, Save, FileText, Link as LinkIcon, Download, 
  AlertCircle, Loader2, GripVertical, ChevronDown, ChevronUp, Image as ImageIcon, CheckCircle, Users, Award
} from "lucide-react";
import { 
  getCoursesList, upsertCourse, deleteCourse, getCourseBySlug, 
  upsertSection, deleteSection, upsertLesson, deleteLesson, 
  getEnrollmentsForAdmin,
  type LmsCourse, type LmsSection, type LmsLesson, type LmsEnrollment
} from "@/lib/coursesDb";
import { uploadFile, uploadPrivateFile, deletePrivateFileFromUrl, uploadFileChunked } from "@/lib/upload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabaseClient";
import { RichTextEditor } from "@/components/RichTextEditor";
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

// --- Sortable Section Component ---
function SortableSection({ section, index, onEdit, onDelete, onAddLesson, lessons, onEditLesson, onDeleteLesson, onLessonDragEnd, expanded, toggleExpand }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 };

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
          <div className="text-right">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-alexandria font-bold text-white text-sm md:text-base">{section.title}</h3>
              <span className="text-[10px] text-zinc-500 font-bold">({lessons?.length || 0} محاضرة)</span>
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
            <span>إضافة درس</span>
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 space-y-2 bg-black/30">
          {!lessons || lessons.length === 0 ? (
            <p className="text-zinc-600 text-xs py-4 text-center">لا توجد محاضرات في هذه الوحدة حتى الآن. اضغط إضافة درس للبدء.</p>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={(e) => onLessonDragEnd(e, section.id)}>
              <SortableContext items={lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                {lessons.map((les: any) => (
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
    <div ref={setNodeRef} style={style} className={cn("p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 flex items-center justify-between gap-4 transition-all group flex-wrap", isDragging && "opacity-50 border-emerald-500")}>
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-white text-zinc-600">
          <GripVertical className="w-4 h-4" />
        </div>
        {lesson.lecture_type === "video" && <Video className="w-4 h-4 text-rose-500" />}
        {lesson.lecture_type === "pdf" && <FileText className="w-4 h-4 text-emerald-500" />}
        {lesson.lecture_type === "link" && <LinkIcon className="w-4 h-4 text-sky-500" />}
        {lesson.lecture_type === "download" && <Download className="w-4 h-4 text-amber-500" />}
        {lesson.lecture_type === "text" && <FileText className="w-4 h-4 text-purple-500" />}
        
        <div className="text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-rose-400 transition-colors">{lesson.title}</h4>
            {lesson.is_preview && (
              <span className="bg-emerald-950 text-emerald-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-900/30">متاح مجاناً Preview</span>
            )}
          </div>
          {lesson.video_url && lesson.lecture_type === "video" && (
            <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono max-w-[200px] truncate">{lesson.video_url}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {lesson.duration_seconds > 0 && (
          <span className="text-[10px] text-zinc-500 font-bold bg-white/5 px-2 py-0.5 rounded ml-2">
            {Math.floor(lesson.duration_seconds / 60)} دقيقة
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
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [videoFileSize, setVideoFileSize] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [autoThumbnailUrl, setAutoThumbnailUrl] = useState<string | null>(null);

  // Attachment upload states
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentProgress, setAttachmentProgress] = useState<number | null>(null);

  // Clear upload states upon opening lesson modal
  useEffect(() => {
    if (showLessonModal) {
      setVideoUploadProgress(null);
      setVideoFileSize(null);
      setVideoFileName(null);
      setAutoThumbnailUrl(editingLesson?.attachment_url || null);
      setAttachmentUploading(false);
      setAttachmentProgress(null);
    }
  }, [showLessonModal]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setVideoFileSize(`${sizeInMB} MB`);
    setVideoUploadProgress(0);

    try {
      // 1. Auto read video duration in client-side JS
      const tempVideo = document.createElement("video");
      tempVideo.preload = "metadata";
      tempVideo.src = URL.createObjectURL(file);
      tempVideo.onloadedmetadata = () => {
        const durationSec = Math.round(tempVideo.duration);
        setEditingLesson(prev => ({
          ...prev,
          duration_seconds: durationSec
        }));
        URL.revokeObjectURL(tempVideo.src);
      };

      // 2. Auto extract video frame as thumbnail
      const generateAutoThumbnail = (videoFile: File): Promise<Blob | null> => {
        return new Promise((resolve) => {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.src = URL.createObjectURL(videoFile);
          video.muted = true;
          video.playsInline = true;
          video.onloadedmetadata = () => {
            video.currentTime = 1.0;
          };
          video.onseeked = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = 640;
              canvas.height = 360;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                  URL.revokeObjectURL(video.src);
                  resolve(blob);
                }, "image/jpeg", 0.85);
              } else {
                URL.revokeObjectURL(video.src);
                resolve(null);
              }
            } catch (e) {
              URL.revokeObjectURL(video.src);
              resolve(null);
            }
          };
          video.onerror = () => {
            URL.revokeObjectURL(video.src);
            resolve(null);
          };
        });
      };

      const thumbBlob = await generateAutoThumbnail(file);
      if (thumbBlob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAutoThumbnailUrl(reader.result as string);
        };
        reader.readAsDataURL(thumbBlob);

        const thumbFile = new File([thumbBlob], `thumb_${Date.now()}.jpg`, { type: "image/jpeg" });
        try {
          const uploadedThumbUrl = await uploadPrivateFile(thumbFile, "lesson-thumbnails", "auto");
          setEditingLesson(prev => ({
            ...prev,
            attachment_url: uploadedThumbUrl
          }));
        } catch (err) {}
      }

      // 3. Upload video file to private course-videos bucket
      const folderPath = selectedCourse ? selectedCourse.slug : "general";
      const uploadedVideoUrl = await uploadFileChunked(
        file,
        "course-videos",
        folderPath,
        (pct) => {
          setVideoUploadProgress(pct);
        }
      );

      setEditingLesson(prev => ({
        ...prev,
        video_url: uploadedVideoUrl
      }));

      toast.success("تم رفع الفيديو وتوليد لقطة الغلاف تلقائياً بنجاح! 🚀");
    } catch (err: any) {
      toast.error(err.message || "خطأ أثناء رفع الفيديو.");
      setVideoUploadProgress(null);
      setVideoFileName(null);
      setVideoFileSize(null);
    }
  };

  const handleVideoDelete = async () => {
    if (!editingLesson?.video_url) return;
    if (!confirm("هل أنت متأكد من حذف هذا الفيديو نهائياً من مساحة التخزين؟")) return;

    try {
      await deletePrivateFileFromUrl(editingLesson.video_url, "course-videos");
      if (editingLesson.attachment_url && editingLesson.attachment_url.includes("lesson-thumbnails")) {
        await deletePrivateFileFromUrl(editingLesson.attachment_url, "lesson-thumbnails");
      }
      
      setEditingLesson(prev => ({
        ...prev,
        video_url: "",
        attachment_url: ""
      }));
      setVideoUploadProgress(null);
      setVideoFileName(null);
      setVideoFileSize(null);
      setAutoThumbnailUrl(null);
      toast.success("تم حذف ملف الفيديو وصورة المعاينة بنجاح! 🗑️");
    } catch (err: any) {
      toast.error("فشل حذف الفيديو.");
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
          toast.error(`حجم الملف ${file.name} يتجاوز 100 ميجابايت.`);
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
      toast.success("تم رفع المرفقات بنجاح! 📂");
    } catch (err: any) {
      toast.error(err.message || "خطأ أثناء رفع المرفقات.");
    } finally {
      setAttachmentUploading(false);
      setAttachmentProgress(null);
    }
  };

  const handleAttachmentDelete = async (url: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الملف المرفق؟")) return;
    try {
      await deletePrivateFileFromUrl(url, "lesson-assets");
      setEditingLesson(prev => ({
        ...prev,
        attachments: (prev?.attachments || []).filter(a => a.url !== url)
      }));
      toast.success("تم حذف المرفق بنجاح.");
    } catch (e) {
      toast.error("فشل حذف المرفق.");
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
  const [testStudentName, setTestStudentName] = useState("يوسف أحمد");

  // Form State
  const [courseForm, setCourseForm] = useState<Partial<LmsCourse>>({
    title: "", slug: "", short_description: "", description: "",
    image_url: "", banner_url: "", price: 0, original_price: 0,
    is_free: false, is_featured: false, status: "draft", level: "مبتدئ", category: "الأتمتة",
    tags: [], requirements: [], what_will_learn: [], who_is_for: [],
    certificate_bg_url: "", certificate_text_color: "#000000",
    certificate_name_x: 50, certificate_name_y: 40,
    certificate_course_x: 50, certificate_course_y: 55,
    certificate_date_x: 50, certificate_date_y: 70
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
      price: 0, original_price: 0, is_free: false, is_featured: false, status: "draft", level: "مبتدئ", category: "الأتمتة",
      tags: [], requirements: [], what_will_learn: [], who_is_for: [],
      certificate_bg_url: "", certificate_text_color: "#000000",
      certificate_name_x: 50, certificate_name_y: 40, certificate_course_x: 50, certificate_course_y: 55, certificate_date_x: 50, certificate_date_y: 70
    });
    setView("form");
  };

  const handleEditCourse = async (course: LmsCourse) => {
    setSelectedCourse(course);
    setCourseForm({
      ...course,
      tags: course.tags || [], requirements: course.requirements || [],
      what_will_learn: course.what_will_learn || [], who_is_for: course.who_is_for || [],
      certificate_bg_url: course.certificate_bg_url || "",
      certificate_text_color: course.certificate_text_color || "#000000",
      certificate_name_x: course.certificate_name_x || 50,
      certificate_name_y: course.certificate_name_y || 40,
      certificate_course_x: course.certificate_course_x || 50,
      certificate_course_y: course.certificate_course_y || 55,
      certificate_date_x: course.certificate_date_x || 50,
      certificate_date_y: course.certificate_date_y || 70
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
    if (!courseForm.title) return toast.error("يرجى إدخال عنوان الكورس");
    try {
      const saved = await upsertCourse(courseForm as any);
      setSelectedCourse(saved);
      toast.success("تم حفظ بيانات الدورة بنجاح!");
      loadCourses();
    } catch (err) { toast.error("حدث خطأ أثناء حفظ الكورس"); }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكورس بالكامل؟")) return;
    await deleteCourse(id);
    toast.success("تم حذف الكورس بنجاح");
    loadCourses();
  };

  // --- Curriculum Actions ---
  const handleSaveSection = async () => {
    if (!editingSectionTitle || !selectedCourse) return;
    await upsertSection({
      id: editingSectionId || undefined,
      course_id: selectedCourse.id,
      title: editingSectionTitle,
      description: editingSectionDescription,
      sort_order: editingSectionId ? curriculumSections.find(s => s.id === editingSectionId)?.sort_order || 1 : curriculumSections.length + 1
    });
    setEditingSectionTitle(""); setEditingSectionDescription(""); setEditingSectionId(null); setShowSectionModal(false);
    toast.success("تم حفظ القسم");
    const { sections } = await getCourseBySlug(selectedCourse.slug);
    setCurriculumSections(sections);
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القسم بجميع دروسه؟")) return;
    await deleteSection(id);
    toast.success("تم حذف القسم");
    const { sections } = await getCourseBySlug(selectedCourse!.slug);
    setCurriculumSections(sections);
  };

  const handleSaveLesson = async () => {
    if (!editingLesson?.title || !selectedCourse) return toast.error("يرجى إدخال عنوان الدرس");
    const sectionId = editingLesson.section_id || activeSectionForLesson;
    if (!sectionId) return;
    await upsertLesson({ ...editingLesson, section_id: sectionId, title: editingLesson.title } as any);
    setShowLessonModal(false); setEditingLesson(null);
    toast.success("تم حفظ الدرس");
    const { sections } = await getCourseBySlug(selectedCourse.slug);
    setCurriculumSections(sections);
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الدرس؟")) return;
    await deleteLesson(id);
    toast.success("تم حذف الدرس");
    const { sections } = await getCourseBySlug(selectedCourse!.slug);
    setCurriculumSections(sections);
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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "image_url" | "banner_url" | "certificate_bg_url" | "attachment_url") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(fieldName);
    const bucket = fieldName === "attachment_url" ? "course-materials" : "course-images";
    try {
      const publicUrl = await uploadFile(file, bucket, fieldName === "attachment_url" ? "lessons" : "courses");
      if (fieldName === "attachment_url") {
        setEditingLesson(prev => ({ ...prev, attachment_url: publicUrl, attachment_name: file.name }));
      } else {
        setCourseForm(prev => ({ ...prev, [fieldName]: publicUrl }));
      }
      toast.success("تم رفع الملف بنجاح! 🚀");
    } catch (err: any) { toast.error(err.message || "خطأ أثناء الرفع."); } 
    finally { setUploadingField(null); }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-alexandria font-black text-white">إدارة الأقسام والكورسات</h1>
          <p className="text-zinc-400 text-sm mt-1">أنشئ ونظم أكاديميتك ومحاضراتك التفاعلية وحضر منهجك بكل مرونة وسهولة.</p>
        </div>
        {view === "list" && (
          <button onClick={handleCreateNewCourse} className="h-12 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer">
            <Plus className="w-5 h-5" /> <span>إضافة كورس جديد</span>
          </button>
        )}
        {view === "form" && (
          <button onClick={() => setView("list")} className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer">
            <span>العودة للقائمة</span>
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
              <p className="text-zinc-500 font-bold mb-4">لا توجد كورسات مضافة حالياً في الأكاديمية.</p>
              <button onClick={handleCreateNewCourse} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" /> أنشئ كورسك الأول الآن
              </button>
            </div>
          ) : (
            courses.map(course => (
              <div key={course.id} className="bg-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-white/10 transition-all group">
                <div className="relative h-44 bg-zinc-900 border-b border-white/5">
                  <img src={course.image_url} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 z-20 flex gap-2">
                    <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border", course.status === "published" ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" : "bg-amber-950 text-amber-400 border-amber-900/30")}>
                      {course.status === "published" ? "منشور" : "مسودة"}
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
                      <Edit className="w-3.5 h-3.5" /> <span>إدارة الكورس</span>
                    </button>
                    <button onClick={() => handleDeleteCourse(course.id)} className="h-10 rounded-xl bg-red-950/15 border border-red-900/10 hover:bg-red-950/30 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" /> <span>حذف</span>
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
                بيانات الكورس الأساسية
              </h2>
              <button onClick={handleSaveCourse} className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg text-xs cursor-pointer">
                <Save className="w-4 h-4" /> <span>حفظ التعديلات</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveCourse} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">عنوان الكورس *</label>
                <input required value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">الرابط الفريد (Slug)</label>
                <input value={courseForm.slug} onChange={e => setCourseForm({ ...courseForm, slug: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm text-zinc-300" />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">السعر بالجنيه المصري (EGP) *</label>
                <input type="number" required value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: Number(e.target.value) })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">السعر الأصلي قبل الخصم (EGP)</label>
                <input type="number" value={courseForm.original_price || ""} onChange={e => setCourseForm({ ...courseForm, original_price: Number(e.target.value) })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">مستوى الكورس</label>
                <select value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value as any })} className="bg-[#0f0f15] border border-white/5 rounded-xl py-3 px-4 text-sm">
                  <option value="مبتدئ">مبتدئ (Beginner)</option>
                  <option value="متوسط">متوسط (Intermediate)</option>
                  <option value="متقدم">متقدم (Advanced)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">تصنيف الكورس</label>
                <select value={courseForm.category} onChange={e => setCourseForm({ ...courseForm, category: e.target.value })} className="bg-[#0f0f15] border border-white/5 rounded-xl py-3 px-4 text-sm">
                  {(categories.length > 0 ? categories : ["دورات الأتمتة", "دورات صناعة المحتوى", "الدورات المجانية"]).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">حالة النشر</label>
                <select value={courseForm.status} onChange={e => setCourseForm({ ...courseForm, status: e.target.value as any })} className="bg-[#0f0f15] border border-white/5 rounded-xl py-3 px-4 text-sm">
                  <option value="draft">مسودة (Draft)</option>
                  <option value="published">منشور (Published)</option>
                  <option value="hidden">مخفي (Hidden)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">صورة غلاف الكورس (Thumbnail)</label>
                <div className="flex gap-2">
                  <input value={courseForm.image_url} onChange={e => setCourseForm({ ...courseForm, image_url: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm flex-1 text-zinc-300" />
                  <label className="h-[46px] px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    {uploadingField === "image_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 rotate-180" />}
                    <span>رفع صورة</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "image_url")} disabled={uploadingField !== null} />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-400">صورة البانر (Banner URL)</label>
                <div className="flex gap-2">
                  <input value={courseForm.banner_url || ""} onChange={e => setCourseForm({ ...courseForm, banner_url: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm flex-1 text-zinc-300" />
                  <label className="h-[46px] px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                    {uploadingField === "banner_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 rotate-180" />}
                    <span>رفع بانر</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "banner_url")} disabled={uploadingField !== null} />
                  </label>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 py-2 justify-center">
                <div className="flex items-center gap-3 select-none">
                  <input type="checkbox" id="isFreeCheckbox" checked={courseForm.is_free || false} onChange={e => setCourseForm({ ...courseForm, is_free: e.target.checked })} className="w-4 h-4 rounded accent-rose-600 cursor-pointer" />
                  <label htmlFor="isFreeCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer">
                    هذا الكورس مجاني بالكامل (Free Course)
                  </label>
                </div>
                <div className="flex items-center gap-3 select-none">
                  <input type="checkbox" id="isFeaturedCheckbox" checked={courseForm.is_featured || false} onChange={e => setCourseForm({ ...courseForm, is_featured: e.target.checked })} className="w-4 h-4 rounded accent-rose-600 cursor-pointer" />
                  <label htmlFor="isFeaturedCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer">
                    كورس مميز (يظهر في الصفحة الرئيسية كأكثر مبيعاً)
                  </label>
                </div>
              </div>

              {/* Coupon Management Block */}
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 md:col-span-2 space-y-4">
                <label className="text-xs font-bold text-rose-400 block font-alexandria">إدارة كوبونات الخصم لهذا الكورس</label>
                
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold">كود الكوبون (مثال: YA50)</span>
                    <input id="couponCodeInput" type="text" placeholder="YA50" className="bg-white/5 border border-white/5 rounded-lg py-2 px-3 text-xs w-36 uppercase font-mono" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold">نسبة الخصم %</span>
                    <input id="couponPercentInput" type="number" defaultValue="50" min="1" max="100" className="bg-white/5 border border-white/5 rounded-lg py-2 px-3 text-xs w-24 font-mono" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const codeEl = document.getElementById("couponCodeInput") as HTMLInputElement;
                      const percentEl = document.getElementById("couponPercentInput") as HTMLInputElement;
                      if (codeEl && percentEl) {
                        const code = codeEl.value.trim();
                        const percent = parseInt(percentEl.value);
                        if (!code || isNaN(percent) || percent < 1 || percent > 100) {
                          toast.error("يرجى إدخال قيم صحيحة للكوبون");
                          return;
                        }
                        const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
                        const newTag = `coupon:${cleanCode}:${percent}`;
                        const currentTags = courseForm.tags || [];
                        if (currentTags.some(t => t.startsWith(`coupon:${cleanCode}:`))) {
                          toast.error("هذا الكوبون موجود بالفعل");
                          return;
                        }
                        setCourseForm(prev => ({
                          ...prev,
                          tags: [...(prev.tags || []), newTag]
                        }));
                        codeEl.value = "";
                        toast.success(`تمت إضافة الكوبون ${cleanCode} بنجاح!`);
                      }
                    }}
                    className="h-9 px-4 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-lg font-bold text-xs flex items-center justify-center cursor-pointer"
                  >
                    <span>إضافة كود خصم</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {(courseForm.tags || [])
                    .filter(t => t.startsWith("coupon:"))
                    .map(t => {
                      const parts = t.split(":");
                      const code = parts[1];
                      const percent = parts[2];
                      return (
                        <div key={t} className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                          <span>{code} ({percent}%)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCourseForm(prev => ({
                                ...prev,
                                tags: (prev.tags || []).filter(tag => tag !== t)
                              }));
                              toast.success("تم حذف الكوبون");
                            }}
                            className="text-rose-500 hover:text-rose-300 font-sans"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  {!(courseForm.tags || []).some(t => t.startsWith("coupon:")) && (
                    <span className="text-zinc-600 text-xs italic">لا توجد كوبونات خصم نشطة لهذا الكورس حالياً.</span>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <RichTextEditor 
                  label="الوصف القصير والملخص السريع للكورس"
                  value={courseForm.short_description || ""}
                  onChange={val => setCourseForm({ ...courseForm, short_description: val })}
                  placeholder="اكتب هنا ملخصاً سريعاً ومقنعاً يظهر للطلاب في بطاقة الكورس..."
                />
              </div>
              
              <div className="md:col-span-2">
                <RichTextEditor 
                  label="الوصف الشامل والاحترافي للكورس"
                  value={courseForm.description || ""}
                  onChange={val => setCourseForm({ ...courseForm, description: val })}
                  placeholder="اكتب هنا محتوى ووصف الكورس بشكل احترافي وجاذب للطلاب..."
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
                  بناء منهج الكورس (Curriculum Builder)
                </h2>
                <button onClick={() => { setEditingSectionId(null); setEditingSectionTitle(""); setEditingSectionDescription(""); setShowSectionModal(true); }} className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 text-xs cursor-pointer">
                  <Plus className="w-4 h-4" /> <span>إضافة وحدة دراسية (Section)</span>
                </button>
              </div>

              {curriculumSections.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                  <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 font-bold text-sm">المنهج فارغ. أضف وحدة دراسية للبدء.</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
                  <SortableContext items={curriculumSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {curriculumSections.map((sec, index) => (
                      <SortableSection 
                        key={sec.id} 
                        index={index}
                        section={sec} 
                        lessons={sec.lessons}
                        expanded={expandedSections[sec.id]}
                        toggleExpand={(id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))}
                        onEdit={(s: any) => { setEditingSectionId(s.id); setEditingSectionTitle(s.title); setEditingSectionDescription(s.description || ""); setShowSectionModal(true); }}
                        onDelete={handleDeleteSection}
                        onAddLesson={(sId: string) => { setActiveSectionForLesson(sId); setEditingLesson({ title: "", video_url: "", duration_seconds: 300, is_preview: false, lecture_type: "video" }); setShowLessonModal(true); }}
                        onEditLesson={(les: any) => { setEditingLesson(les); setShowLessonModal(true); }}
                        onDeleteLesson={handleDeleteLesson}
                        onLessonDragEnd={onLessonDragEnd}
                      />
                    ))}
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
                  نظام إدارة المناهج والمحاضرات (LMS Builder) جاهز للعمل!
                </h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
                  أنت تبني مساراً تعليمياً عظيماً! 🚀 يرجى حفظ بيانات الكورس الأساسية أولاً (العنوان والسعر والغلاف) ليتم إنشاء الدورة في قاعدة البيانات، ثم سيفتح لك فوراً محرك بناء الوحدات، ورفع محاضرات الفيديو، وإدراج المرفقات وملفات PDF للطلاب بأسلوب السحب والإفلات الاحترافي!
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveCourse()}
                  className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات الكورس وتفعيل منشئ المحاضرات الآن 🚀</span>
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
                  منشئ الشهادات التلقائية (Certificate Builder)
                </h2>
                <button onClick={handleSaveCourse} className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg text-xs cursor-pointer">
                  <Save className="w-4 h-4" /> <span>حفظ إعدادات الشهادة</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-400">صورة خلفية الشهادة (Certificate Background)</label>
                    <div className="flex gap-2">
                      <input value={courseForm.certificate_bg_url || ""} onChange={e => setCourseForm({ ...courseForm, certificate_bg_url: e.target.value })} placeholder="رابط صورة الشهادة الفارغة..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm flex-1 text-zinc-300" />
                      <label className="h-[46px] px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                        {uploadingField === "certificate_bg_url" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        <span>رفع خلفية</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "certificate_bg_url")} disabled={uploadingField !== null} />
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-400">اسم الطالب للتجربة (المعاينة الحية)</label>
                    <input type="text" value={testStudentName} onChange={e => setTestStudentName(e.target.value)} placeholder="مثال: يوسف أحمد أو Youssef Ahmed..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50 text-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">موضع اسم الطالب أفقي (X %)</label>
                      <input type="number" value={courseForm.certificate_name_x} onChange={e => setCourseForm({...courseForm, certificate_name_x: Number(e.target.value)})} className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">موضع اسم الطالب عمودي (Y %)</label>
                      <input type="number" value={courseForm.certificate_name_y} onChange={e => setCourseForm({...courseForm, certificate_name_y: Number(e.target.value)})} className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm" />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">موضع التاريخ أفقي (X %)</label>
                      <input type="number" value={courseForm.certificate_date_x} onChange={e => setCourseForm({...courseForm, certificate_date_x: Number(e.target.value)})} className="bg-white/5 border border-white/5 rounded-xl py-2 px-4 text-sm" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400">موضع التاريخ عمودي (Y %)</label>
                      <input type="number" value={courseForm.certificate_date_y} onChange={e => setCourseForm({...courseForm, certificate_date_y: Number(e.target.value)})} className="bg-[#0f0f15] border border-white/5 rounded-xl py-2 px-4 text-sm" />
                    </div>
                  </div>
                </div>
                
                {/* Certificate Preview Box */}
                <div className="relative w-full aspect-[1.414/1] bg-white/5 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                  <style dangerouslySetInnerHTML={{__html: `
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Alexandria:wght@800;900&family=Alike&display=swap');
                  `}} />
                  {courseForm.certificate_bg_url ? (
                    <>
                      <img src={courseForm.certificate_bg_url} alt="Certificate Background" className="absolute inset-0 w-full h-full object-contain" />
                      <div className="absolute inset-0 z-10 font-bold" style={{ color: courseForm.certificate_text_color }}>
                        {/* Auto-detected Language Font Selection */}
                        <div 
                          className="absolute whitespace-nowrap text-xl sm:text-2xl lg:text-3xl transition-all" 
                          style={{ 
                            left: `${courseForm.certificate_name_x}%`, 
                            top: `${courseForm.certificate_name_y}%`, 
                            transform: 'translate(-50%, -50%)',
                            fontFamily: /[\u0600-\u06FF]/.test(testStudentName) ? "'Cairo', 'Alexandria', sans-serif" : "'Alike', serif",
                            fontWeight: /[\u0600-\u06FF]/.test(testStudentName) ? 900 : 'normal',
                          }}
                        >
                          {testStudentName || "[اسم الطالب هنا]"}
                        </div>
                        <div className="absolute whitespace-nowrap text-xs sm:text-sm font-mono" style={{ left: `${courseForm.certificate_date_x}%`, top: `${courseForm.certificate_date_y}%`, transform: 'translate(-50%, -50%)' }}>
                          {new Date().toLocaleDateString("ar-EG")}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-500 font-bold text-sm">الرجاء إدخال رابط أو رفع خلفية الشهادة لمعاينتها.</span>
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
                  منشئ الشهادات التلقائية للطلاب (Certificate Builder)
                </h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
                  امنح طلابك شهادات إكمال رسمية وموثقة بكود QR ديناميكي بمجرد إتمامهم متطلبات الدورة! يرجى حفظ بيانات الكورس الأساسية أولاً لتفعيل لوحة التحكم في تموضع الأسماء والتواريخ ولون النص فوق قالب شهادتك الخاصة.
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
                    لوحة متابعة تقدم الطلاب (Students Progress)
                  </h2>
                  {studentsData.length > 0 && (
                    <button 
                      onClick={() => {
                        let csvContent = "\uFEFF";
                        csvContent += "الاسم,البريد الإلكتروني,تاريخ التسجيل,الحالة\n";
                        studentsData.forEach(student => {
                          csvContent += `"${student.user_name || "طالب"}","${student.user_email}","${new Date(student.enrolled_at).toLocaleDateString("ar-EG")}","نشط"\n`;
                        });
                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", `طلاب_${selectedCourse?.title || "كورس"}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast.success("تم تصدير ملف الـ CSV بنجاح! 📂");
                      }}
                      className="h-9 px-4 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تصدير CSV</span>
                    </button>
                  )}
                </div>
                
                {studentsData.length === 0 ? (
                  <p className="text-zinc-500 text-center py-6 text-sm">لا يوجد طلاب مسجلين في هذا الكورس بعد.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-zinc-400">
                      <thead className="text-xs text-white uppercase bg-white/5">
                        <tr>
                          <th className="px-6 py-4 rounded-r-xl">اسم الطالب / البريد</th>
                          <th className="px-6 py-4">تاريخ الانضمام</th>
                          <th className="px-6 py-4">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsData.map(student => (
                          <tr key={student.id} className="border-b border-white/5 bg-white/[0.01]">
                            <td className="px-6 py-4 font-bold text-white flex flex-col">
                              <span>{student.user_name || "طالب"}</span>
                              <span className="text-[10px] text-zinc-500">{student.user_email}</span>
                            </td>
                            <td className="px-6 py-4">{new Date(student.enrolled_at).toLocaleDateString("ar-EG")}</td>
                            <td className="px-6 py-4">
                              <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-[10px]">مسجل (Active)</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}
      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <h3 className="font-alexandria font-bold text-white text-base">
              {editingSectionId ? "تعديل عنوان الوحدة الدراسية" : "إضافة وحدة دراسية جديدة"}
            </h3>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-bold">اسم الوحدة الدراسية *</label>
              <input required value={editingSectionTitle} onChange={e => setEditingSectionTitle(e.target.value)} placeholder="مثال: الوحدة الأولى: مقدمة..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-bold">وصف الوحدة الدراسية</label>
              <textarea rows={3} value={editingSectionDescription} onChange={e => setEditingSectionDescription(e.target.value)} placeholder="اكتب وصفاً أو تفاصيل مختصرة عن محتوى هذه الوحدة..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-rose-500/50" />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
              <button onClick={() => setShowSectionModal(false)} className="h-10 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs cursor-pointer">إلغاء</button>
              <button onClick={handleSaveSection} className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer">حفظ الوحدة</button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && editingLesson && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto py-10">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-rose-600/30">
            <h3 className="font-alexandria font-bold text-white text-base md:text-lg border-b border-white/5 pb-3">
              {editingLesson.id ? "تعديل تفاصيل المحاضرة" : "إضافة محاضرة/درس جديد"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs text-zinc-400 font-bold">عنوان المحاضرة *</label>
                <input required value={editingLesson.title} onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-bold">نوع المحاضرة والمحتوى</label>
                <select value={editingLesson.lecture_type} onChange={e => setEditingLesson({ ...editingLesson, lecture_type: e.target.value as any })} className="bg-[#0f0f15] border border-white/5 rounded-xl py-3 px-4 text-sm">
                  <option value="video">فيديو (مقطع مرئي)</option>
                  <option value="pdf">ملف دراسي PDF</option>
                  <option value="link">رابط خارجي (External Link)</option>
                  <option value="download">ملف مرفق للتحميل</option>
                  <option value="text">درس نصي (Text Lesson)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-bold">المدة (بالثواني)</label>
                <input type="number" value={editingLesson.duration_seconds} onChange={e => setEditingLesson({ ...editingLesson, duration_seconds: Number(e.target.value) })} className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm" />
              </div>
              
              {/* Video URL with Live Preview & Direct Upload to Private Supabase Storage */}
              {editingLesson.lecture_type === "video" && (
                <div className="flex flex-col gap-3 sm:col-span-2 space-y-2 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <label className="text-xs text-rose-400 font-black font-alexandria flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      <span>رفع واستضافة الفيديو الآمن (Private Streaming Host)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-bold">مدعوم بالكامل بواسطة Supabase Storage</span>
                  </div>

                  {/* Drag/Drop and File picker box */}
                  {!editingLesson.video_url && (
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
                        <div className="text-sm font-bold text-white">اسحب ملف الفيديو هنا أو اضغط للاستعراض</div>
                        <p className="text-zinc-500 text-xs font-cairo">
                          يدعم صيغ MP4, MKV, MOV, WebM حتى 5 جيجابايت
                        </p>
                      </div>

                      {/* Progress Bar overlay */}
                      {videoUploadProgress !== null && (
                        <div className="absolute inset-0 bg-[#0a0a0f]/95 rounded-xl flex flex-col items-center justify-center p-6 space-y-3 z-20">
                          <Loader2 className="w-8 h-8 text-[#D6004B] animate-spin" />
                          <div className="w-full max-w-xs space-y-1">
                            <div className="flex justify-between text-xs font-bold text-white">
                              <span>جاري رفع واستشفاف الفيديو...</span>
                              <span>{videoUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#D6004B] h-full transition-all duration-300"
                                style={{ width: `${videoUploadProgress}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 text-right">
                              اسم الملف: {videoFileName} ({videoFileSize})
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video URL Manual Backup and Edit */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold">مسار الفيديو الحالي في التخزين</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={editingLesson.video_url || ""} 
                        onChange={e => setEditingLesson({ ...editingLesson, video_url: e.target.value })} 
                        placeholder="مسار الفيديو أو رابط مباشر..." 
                        className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs flex-1 font-mono text-zinc-300" 
                      />
                      {editingLesson.video_url && (
                        <button 
                          type="button"
                          onClick={handleVideoDelete}
                          className="h-[46px] px-4 bg-red-950/20 hover:bg-red-950/40 text-red-500 border border-red-900/10 rounded-xl text-xs font-bold font-alexandria flex items-center justify-center transition-all cursor-pointer"
                        >
                          🗑️ حذف الفيديو
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Generated Thumbnail preview & details */}
                  {editingLesson.video_url && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      
                      {/* Video Player Preview */}
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-950 aspect-video relative flex flex-col justify-center items-center">
                        <span className="absolute top-2 right-2 bg-black/60 text-[9px] text-zinc-400 font-black px-2 py-0.5 rounded backdrop-blur z-20 font-alexandria uppercase tracking-wider">Video Stream Preview</span>
                        {editingLesson.video_url.startsWith("http") ? (
                          <video 
                            src={editingLesson.video_url} 
                            controls 
                            className="w-full h-full object-contain"
                            controlsList="nodownload"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Video className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-zinc-500 text-[11px] font-bold">الفيديو مسار محلي آمن في Supabase</p>
                          </div>
                        )}
                      </div>

                      {/* Auto-extracted Thumbnail Preview */}
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-950 aspect-video relative flex flex-col justify-center items-center">
                        <span className="absolute top-2 right-2 bg-black/60 text-[9px] text-emerald-400 font-black px-2 py-0.5 rounded backdrop-blur z-20 font-alexandria uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Auto-Extracted Thumbnail
                        </span>
                        
                        {autoThumbnailUrl ? (
                          <img 
                            src={autoThumbnailUrl} 
                            alt="Extracted frame" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-zinc-500 text-[11px] font-bold">لا توجد صورة مصغرة تلقائية بعد</p>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Lesson Attachments System */}
              <div className="flex flex-col gap-3 sm:col-span-2 space-y-2 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <label className="text-xs text-emerald-400 font-black font-alexandria flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>نظام الملفات المرفقة للمحاضرة (Lesson Attachments System)</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-bold">رفع ملفات PDF، ZIP، أكواد، ومشاريع...</span>
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
                    <div className="text-xs font-bold text-white">اسحب الملفات هنا أو اضغط للاستعراض</div>
                    <p className="text-zinc-500 text-[10px]">
                      يدعم PDF, ZIP, DOCX, XLSX, MP3, صور وملفات أكواد حتى 100 ميجابايت للملف
                    </p>
                  </div>

                  {attachmentUploading && (
                    <div className="absolute inset-0 bg-[#0a0a0f]/95 rounded-xl flex flex-col items-center justify-center p-4 space-y-2 z-20">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      <div className="w-full max-w-xs space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-white">
                          <span>جاري رفع المرفقات...</span>
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
                    <span className="text-[10px] text-zinc-500 font-bold block">الملفات المرفقة حالياً ({editingLesson.attachments.length})</span>
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
                  <label className="text-xs text-zinc-400 font-bold">الرابط الخارجي (External Link)</label>
                  <input type="text" value={editingLesson.external_link || ""} onChange={e => setEditingLesson({ ...editingLesson, external_link: e.target.value })} placeholder="https://..." className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-sm text-zinc-300" />
                </div>
              )}

              <div className="flex items-center gap-3 py-2 sm:col-span-2 select-none">
                <input type="checkbox" id="previewCheckbox" checked={editingLesson.is_preview} onChange={e => setEditingLesson({ ...editingLesson, is_preview: e.target.checked })} className="w-4 h-4 rounded accent-rose-600 cursor-pointer" />
                <label htmlFor="previewCheckbox" className="text-xs font-bold text-zinc-300 cursor-pointer">
                  اجعل هذا الدرس متاحاً للمشاهدة كعينة مجانية (Preview)
                </label>
              </div>

              <div className="sm:col-span-2">
                <RichTextEditor 
                  label="الوصف والتفاصيل الإضافية للمحاضرة"
                  value={editingLesson.content || ""}
                  onChange={val => setEditingLesson({ ...editingLesson, content: val })}
                  placeholder="اكتب هنا تفاصيل ومحتوى المحاضرة النصي أو الملاحظات الهامة للطلاب..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
              <button onClick={() => { setShowLessonModal(false); setEditingLesson(null); }} className="h-10 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs cursor-pointer">إلغاء</button>
              <button onClick={handleSaveLesson} className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer">حفظ المحاضرة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
