import { create } from 'zustand';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabaseClient';
import { upsertLesson } from '@/lib/coursesDb';

export type UploadStatus = 'Queued' | 'Uploading' | 'Encoding' | 'Ready' | 'Failed';

export interface UploadTask {
  lessonId: string;
  title: string;
  status: UploadStatus;
  progress: number;
  videoId?: string;
  xhr?: XMLHttpRequest;
  pollingInterval?: any;
  courseId?: string;
  sectionId?: string;
  isNewLesson?: boolean;
  savedToDb?: boolean;
  file?: File;
  meta?: any;
  playUrl?: string;
  thumbUrl?: string;
  duration_seconds?: number;
}

interface UploadStore {
  uploads: Record<string, UploadTask>;
  addUpload: (lessonId: string, task: Omit<UploadTask, 'lessonId'>) => void;
  updateProgress: (lessonId: string, progress: number) => void;
  updateStatus: (lessonId: string, status: UploadStatus, videoId?: string) => void;
  removeUpload: (lessonId: string) => void;
  cancelUpload: (lessonId: string) => void;
  startBackgroundUpload: (lessonId: string, file: File, meta?: { courseId: string; sectionId: string; title: string; isNewLesson: boolean }) => Promise<void>;
  processQueue: () => void;
  executeUpload: (lessonId: string) => Promise<void>;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  uploads: {},

  addUpload: (lessonId, task) => set((state) => ({
    uploads: { ...state.uploads, [lessonId]: { ...task, lessonId } }
  })),

  updateProgress: (lessonId, progress) => set((state) => {
    const upload = state.uploads[lessonId];
    if (!upload) return state;
    return {
      uploads: { ...state.uploads, [lessonId]: { ...upload, progress } }
    };
  }),

  updateStatus: (lessonId, status, videoId) => set((state) => {
    const upload = state.uploads[lessonId];
    if (!upload) return state;
    return {
      uploads: { 
        ...state.uploads, 
        [lessonId]: { ...upload, status, ...(videoId ? { videoId } : {}) } 
      }
    };
  }),

  removeUpload: (lessonId) => set((state) => {
    const newUploads = { ...state.uploads };
    const upload = newUploads[lessonId];
    if (upload) {
      if (upload.xhr) upload.xhr.abort();
      if (upload.pollingInterval) clearInterval(upload.pollingInterval);
      delete newUploads[lessonId];
    }
    return { uploads: newUploads };
  }),

  cancelUpload: (lessonId) => {
    get().removeUpload(lessonId);
    toast.error("تم إلغاء الرفع");
  },

  startBackgroundUpload: async (lessonId, file, meta) => {
    // 1. Initial State - Add to queue
    get().addUpload(lessonId, {
      title: meta?.title || file.name,
      status: 'Queued',
      progress: 0,
      courseId: meta?.courseId,
      sectionId: meta?.sectionId,
      isNewLesson: meta?.isNewLesson,
      savedToDb: false,
      file,
      meta,
    });
    
    get().processQueue();
  },

  processQueue: () => {
    const state = get();
    const uploads = Object.values(state.uploads);
    const activeCount = uploads.filter(u => u.status === 'Uploading').length;
    
    // Limit to 1 active network upload at a time for maximum stability
    if (activeCount < 1) {
      const nextUpload = uploads.find(u => u.status === 'Queued');
      if (nextUpload && nextUpload.file) {
        state.executeUpload(nextUpload.lessonId);
      }
    }
  },

  executeUpload: async (lessonId) => {
    const task = get().uploads[lessonId];
    if (!task || !task.file) return;
    
    const { file, meta } = task;
    get().updateStatus(lessonId, 'Uploading');

    try {
      // 2. Fetch configurations
      const configRes = await fetch("/api/admin/bunny/config");
      if (!configRes.ok) {
        throw new Error("فشل تحميل إعدادات Bunny Stream. تأكد من إعداد متغيرات البيئة.");
      }
      const { libraryId, apiKey } = await configRes.json();

      // 3. Create placeholder via Backend API to avoid CORS and hide API Key
      const createRes = await fetch(`/api/admin/bunny/video`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: meta?.title || file.name })
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(`فشل إنشاء حاوية الفيديو: ${errData.error || createRes.statusText}`);
      }
      const createData = await createRes.json();
      const videoId = createData.videoId;

      get().updateStatus(lessonId, 'Uploading', videoId);

      // 4. Perform direct browser-to-Bunny upload using XHR
      const xhr = new XMLHttpRequest();
      
      // Store XHR so we can cancel it
      set((state) => {
        const upload = state.uploads[lessonId];
        if (!upload) return state;
        return {
          uploads: { ...state.uploads, [lessonId]: { ...upload, xhr } }
        };
      });

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          get().updateProgress(lessonId, percentage);
        }
      });

      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`فشل رفع الفيديو إلى Bunny Stream. رمز الاستجابة: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("حدث خطأ في الاتصال أثناء الرفع."));
        xhr.onabort = () => reject(new Error("ABORTED"));
      });

      xhr.open("PUT", `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`);
      xhr.setRequestHeader("AccessKey", apiKey);
      xhr.send(file);

      await uploadPromise;

      // 5. Start polling status
      get().updateStatus(lessonId, 'Encoding');
      get().updateProgress(lessonId, 0);
      get().processQueue(); // Network upload is done, trigger next in queue!

      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/bunny/video?videoId=${videoId}`);
          if (!res.ok) return;
          const data = await res.json();
          
          if (data.status === 3 || data.status === 4) {
            clearInterval(interval);
            get().updateStatus(lessonId, 'Ready');
            get().updateProgress(lessonId, 100);
            
            const playUrl = `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}/playlist.m3u8`;
            const thumbUrl = data.thumbnailUrl || `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}/thumbnail.jpg`;
            
            const task = get().uploads[lessonId];
            const duration_seconds = data.length || task?.meta?.duration_seconds || 0;
            
            // Store final URLs in state so UI can grab them if user clicks "Save" AFTER upload finishes
            set((state) => ({
              uploads: {
                ...state.uploads,
                [lessonId]: {
                  ...state.uploads[lessonId],
                  playUrl,
                  thumbUrl,
                  duration_seconds,
                  savedToDb: true
                }
              }
            }));

            // Always use update() to prevent wiping out user data like description or sort_order!
            // If the user hasn't clicked "Save" yet, this update will do nothing (0 rows updated), 
            // but the UI will grab the urls from the store when they DO click Save!
            await supabaseClient.from("course_lessons").update({
              video_id: videoId,
              video_url: playUrl,
              playback_url: playUrl,
              thumbnail_url: thumbUrl,
              duration_seconds,
              video_processing_status: 'completed',
              upload_progress: 100
            }).eq("id", lessonId);
            
            toast.success(`اكتمل رفع ومعالجة الفيديو "${task?.title}" بنجاح! 🚀`);
          } else if (data.status === 5 || data.status === 8) {
            clearInterval(interval);
            get().updateStatus(lessonId, 'Failed');
            toast.error(`فشل تشفير الفيديو "${file.name}" على Bunny Stream.`);
          } else {
            get().updateProgress(lessonId, data.encodeProgress || 0);
          }
        } catch (err: any) {
          console.warn("Error polling video status:", err.message || err);
        }
      }, 4000);

      // Store interval so we can cancel it
      set((state) => {
        const upload = state.uploads[lessonId];
        if (!upload) return state;
        return {
          uploads: { ...state.uploads, [lessonId]: { ...upload, pollingInterval: interval } }
        };
      });

    } catch (err: any) {
      if (err.message !== "ABORTED") {
        get().updateStatus(lessonId, 'Failed');
        toast.error(err.message || `خطأ أثناء رفع الفيديو "${task.file?.name}".`);
      }
      get().processQueue(); // Advance queue on failure
    }
  }
}));
