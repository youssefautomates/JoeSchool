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
