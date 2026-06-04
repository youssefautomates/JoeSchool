import { supabaseClient } from "./supabaseClient";

/**
 * Uploads a file to Supabase Storage with size and extension validations
 * @param file The HTML File object to upload
 * @param bucket The targeted storage bucket name
 * @param folder Optional nested directory folder structure
 * @returns Public URL of the uploaded asset
 */
export async function uploadFile(
  file: File,
  bucket: "course-images" | "course-materials",
  folder: string = ""
): Promise<string> {
  // 1. File size validation (Max 20MB)
  const maxSize = 20 * 1024 * 1024; 
  if (file.size > maxSize) {
    throw new Error("حجم الملف يتعدى الحد الأقصى المسموح به (20 ميجابايت).");
  }

  // 2. Prevent malicious executable files
  const forbiddenExtensions = [".exe", ".bat", ".sh", ".cmd", ".msi", ".scr", ".js", ".vbs", ".html", ".htm"];
  const fileNameLower = file.name.toLowerCase();
  const hasForbiddenExt = forbiddenExtensions.some(ext => fileNameLower.endsWith(ext));
  if (hasForbiddenExt) {
    throw new Error("صيغة الملف غير مسموح بها لأسباب أمنية للحفاظ على سلامة الخادم.");
  }

  // 3. Image validation if uploaded to course-images
  if (bucket === "course-images") {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedImageTypes.includes(file.type)) {
      throw new Error("يرجى اختيار ملف صورة صالح (JPEG, PNG, WebP, SVG).");
    }
  }

  // 4. Sanitize file name (URL safe) and generate unique name
  const extension = file.name.split(".").pop();
  const baseName = file.name.substring(0, file.name.lastIndexOf(".")).replace(/[^a-zA-Z0-9]/g, "_");
  const sanitizedName = `${baseName}_${Date.now()}.${extension}`;
  const uniquePath = folder ? `${folder}/${sanitizedName}` : sanitizedName;

  // 5. Perform the Supabase Storage Upload
  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .upload(uniquePath, file, {
      cacheControl: "31536000", // 1 year caching for optimization
      upsert: true
    });

  if (error) {
    throw new Error(`فشل رفع الملف إلى الخادم: ${error.message}`);
  }

  // 6. Retrieve public URL
  const { data: { publicUrl } } = supabaseClient.storage
    .from(bucket)
    .getPublicUrl(uniquePath);

  return publicUrl;
}

/**
 * Safely removes a file from Supabase storage based on its public URL
 * @param url Public URL of the file
 * @param bucket Storage bucket name
 */
export async function deleteFileFromUrl(url: string, bucket: "course-images" | "course-materials"): Promise<void> {
  try {
    if (!url) return;
    const searchString = `/storage/v1/object/public/${bucket}/`;
    if (!url.includes(searchString)) return;

    const path = url.split(searchString)[1];
    if (path) {
      const { error } = await supabaseClient.storage.from(bucket).remove([path]);
      if (error) {
        console.error(`[STORAGE DELETE ERROR] ${error.message}`);
      }
    }
  } catch (e) {
    console.error("Failed to delete file from URL:", e);
  }
}

/**
 * Uploads a file to a private Supabase Storage bucket with size validations and progress callbacks
 * @param file The HTML File object
 * @param bucket Private storage bucket
 * @param folder Nested folder name
 * @param onProgress Callback to report upload percentage
 * @returns Public URL of the uploaded asset (requires Signed URL to view)
 */
export async function uploadPrivateFile(
  file: File,
  bucket: "course-videos" | "lesson-assets" | "lesson-thumbnails",
  folder: string = "",
  onProgress?: (percent: number) => void
): Promise<string> {
  // 1. Extensions check
  const forbiddenExtensions = [".exe", ".bat", ".sh", ".cmd", ".msi", ".scr", ".js", ".vbs", ".html", ".htm"];
  const fileNameLower = file.name.toLowerCase();
  const hasForbiddenExt = forbiddenExtensions.some(ext => fileNameLower.endsWith(ext));
  if (hasForbiddenExt) {
    throw new Error("صيغة الملف غير مسموح بها لأسباب أمنية للحفاظ على سلامة الخادم.");
  }

  // 2. Video large file size validation: up to 5GB
  const maxVideoSize = 5120 * 1024 * 1024; // 5GB
  if (bucket === "course-videos" && file.size > maxVideoSize) {
    throw new Error("حجم الفيديو يتعدى الحد الأقصى المسموح به (5 جيجابايت).");
  }

  // 3. Thumbnails validation
  if (bucket === "lesson-thumbnails") {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedImageTypes.includes(file.type)) {
      throw new Error("يرجى اختيار ملف صورة صالح (JPEG, PNG, WebP).");
    }
  }

  // 4. Sanitize file name and path
  const extension = file.name.split(".").pop();
  const baseName = file.name.substring(0, file.name.lastIndexOf(".")).replace(/[^a-zA-Z0-9]/g, "_");
  const sanitizedName = `${baseName}_${Date.now()}.${extension}`;
  const uniquePath = folder ? `${folder}/${sanitizedName}` : sanitizedName;

  // 5. Upload to Supabase Storage with onUploadProgress
  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .upload(uniquePath, file, {
      cacheControl: "31536000",
      upsert: true,
      onUploadProgress: (progress: any) => {
        if (onProgress) {
          const total = progress.total || file.size;
          const loaded = progress.loaded || 0;
          if (total > 0) {
            const pct = Math.min(100, Math.round((loaded / total) * 100));
            onProgress(pct);
          }
        }
      }
    } as any);

  if (error) {
    throw new Error(`فشل رفع الملف إلى الخادم الخاص: ${error.message}`);
  }

  // 6. Retrieve public Url reference template
  const { data: { publicUrl } } = supabaseClient.storage
    .from(bucket)
    .getPublicUrl(uniquePath);

  return publicUrl;
}

/**
 * Safely removes a private file from Supabase storage based on its URL
 */
export async function deletePrivateFileFromUrl(
  url: string,
  bucket: "course-videos" | "lesson-assets" | "lesson-thumbnails"
): Promise<void> {
  try {
    if (!url) return;
    const searchString = `/storage/v1/object/public/${bucket}/`;
    const searchStringPrivate = `/storage/v1/object/sign/${bucket}/`;
    let path = "";
    
    if (url.includes(searchString)) {
      path = url.split(searchString)[1];
    } else if (url.includes(searchStringPrivate)) {
      path = url.split(searchStringPrivate)[1].split("?")[0];
    } else if (!url.startsWith("http")) {
      path = url;
    }
    
    if (path) {
      const decodedPath = decodeURIComponent(path);
      const { error } = await supabaseClient.storage.from(bucket).remove([decodedPath]);
      if (error) {
        console.error(`[PRIVATE STORAGE DELETE ERROR] ${error.message}`);
      }
    }
  } catch (e) {
    console.error("Failed to delete private file:", e);
  }
}

/**
 * High-Speed Chunked Resumable Uploader for large files (Production-Level)
 */
export async function uploadFileChunked(
  file: File,
  bucket: "course-videos" | "lesson-assets",
  folder: string = "",
  onProgress?: (percent: number) => void
): Promise<string> {
  const singleUploadLimit = 5 * 1024 * 1024 * 1024; // 5GB (Direct client-to-Supabase upload bypasses serverless memory and timeout limits)
  if (file.size <= singleUploadLimit) {
    // Upload as a single file to get smooth, continuous progress updates
    return uploadPrivateFile(file, bucket as any, folder, onProgress);
  }

  const chunkSize = 5 * 1024 * 1024; // 5MB chunks for better reliability and frequent progress updates
  const totalChunks = Math.ceil(file.size / chunkSize);

  const extension = file.name.split(".").pop();
  const baseName = file.name.substring(0, file.name.lastIndexOf(".")).replace(/[^a-zA-Z0-9]/g, "_");
  const uploadId = `${baseName}_${Date.now()}`;
  
  console.log(`[CHUNK UPLOAD] Slicing ${file.name} (${file.size} bytes) into ${totalChunks} parts.`);

  let uploadedBytes = 0;
  const chunkPaths: string[] = [];
  const maxConcurrency = 3;
  const queue = Array.from({ length: totalChunks }, (_, i) => i);
  const activeUploads: Promise<void>[] = [];

  const uploadChunkWithRetry = async (chunkIndex: number, retryCount = 0): Promise<void> => {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);
    const chunkFile = new File([chunkBlob], `${file.name}.part_${chunkIndex}`);

    const chunkPath = folder 
      ? `${folder}/${uploadId}/${chunkIndex}.part` 
      : `${uploadId}/${chunkIndex}.part`;

    try {
      const { error } = await supabaseClient.storage
        .from(bucket)
        .upload(chunkPath, chunkFile, {
          cacheControl: "3600",
          upsert: true
        });

      if (error) throw error;
      
      chunkPaths.push(chunkPath);
      uploadedBytes += (end - start);
      if (onProgress) {
        const pct = Math.round((uploadedBytes / file.size) * 100);
        onProgress(pct);
      }
    } catch (err: any) {
      if (retryCount < 3) {
        console.warn(`[CHUNK UPLOAD] Retry chunk ${chunkIndex} (Attempt ${retryCount + 1}/3)...`);
        return uploadChunkWithRetry(chunkIndex, retryCount + 1);
      } else {
        throw new Error(`فشل رفع جزء المحاضرة رقم ${chunkIndex}: ${err.message}`);
      }
    }
  };

  for (const chunkIndex of queue) {
    if (activeUploads.length >= maxConcurrency) {
      await Promise.race(activeUploads);
    }
    const p = uploadChunkWithRetry(chunkIndex).then(() => {
      activeUploads.splice(activeUploads.indexOf(p), 1);
    });
    activeUploads.push(p);
  }
  await Promise.all(activeUploads);

  console.log(`[CHUNK UPLOAD] Merging parts...`);
  const finalPath = folder ? `${folder}/${uploadId}.${extension}` : `${uploadId}.${extension}`;
  
  const mergeRes = await fetch("/api/admin/upload/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket,
      chunkPaths: chunkPaths.sort((a, b) => {
        const idxA = parseInt(a.substring(a.lastIndexOf("/") + 1).split(".")[0]);
        const idxB = parseInt(b.substring(b.lastIndexOf("/") + 1).split(".")[0]);
        return idxA - idxB;
      }),
      finalPath
    })
  });

  const mergeData = await mergeRes.json();
  if (!mergeRes.ok || !mergeData.success) {
    throw new Error(mergeData.error || "فشل معالجة ودمج ملف المحاضرة.");
  }

  const { data: { publicUrl } } = supabaseClient.storage
    .from(bucket)
    .getPublicUrl(finalPath);

  return publicUrl;
}

