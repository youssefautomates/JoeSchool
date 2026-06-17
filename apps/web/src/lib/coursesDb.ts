import { supabaseClient } from "./supabaseClient";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
export interface LmsCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  image_url: string;
  banner_url?: string;
  price: number;
  original_price: number;
  price_egp?: number;
  original_price_egp?: number;
  price_usd?: number;
  original_price_usd?: number;
  is_free: boolean;
  is_featured: boolean;
  status: "draft" | "published" | "hidden";
  duration_hours: number;
  lessons_count: number;
  level: "مبتدئ" | "متوسط" | "متقدم" | "Beginner" | "Intermediate" | "Advanced";
  category: string;
  tags: string[];
  requirements: string[];
  what_will_learn: string[];
  who_is_for: string[];
  certificate_bg_url?: string;
  certificate_text_color?: string;
  certificate_name_x?: number;
  certificate_name_y?: number;
  certificate_name_size?: number;
  certificate_course_x?: number;
  certificate_course_y?: number;
  certificate_date_x?: number;
  certificate_date_y?: number;
  certificate_date_size?: number;
  showcase_videos?: any[];
  promo_video_id?: string;
  enable_gateway_fee?: boolean;
  sales?: number;
  created_at: string;
}

export interface LmsSection {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  description?: string;
}

export interface LmsLesson {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  video_url: string;
  content: string;
  duration_seconds: number;
  sort_order: number;
  is_preview: boolean;
  lecture_type: "video" | "pdf" | "link" | "download";
  attachment_url?: string;
  attachment_name?: string;
  external_link?: string;
  attachments?: { name: string; url: string; size: number; type: string }[];
  video_processing_status?: "completed" | "uploading" | "failed";
  upload_progress?: number;
  video_id?: string;
  playback_url?: string;
  thumbnail_url?: string;
}

export interface LmsEnrollment {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  course_id: string;
  enrolled_at: string;
  status: "active" | "completed" | "suspended";
}

export interface LmsProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface LmsVideoProgress {
  id?: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  watched_seconds: number;
  completed: boolean;
  last_position: number;
  updated_at?: string;
}

export interface LmsCertificate {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  verification_id: string;
  student_name: string;
  course_name: string;
  certificate_url?: string;
  certificate_bg_url?: string;
  certificate_text_color?: string;
  certificate_name_x?: number;
  certificate_name_y?: number;
  certificate_name_size?: number;
  certificate_course_x?: number;
  certificate_course_y?: number;
  certificate_date_x?: number;
  certificate_date_y?: number;
  certificate_date_size?: number;
}

export interface LmsReview {
  id: string;
  user_id: string;
  user_name: string;
  course_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Initial Default Seed Data
// ────────────────────────────────────────────────────────────────────────────
const DEFAULT_COURSES: LmsCourse[] = [
  {
    id: "course-n8n-masterclass",
    title: "دورة صناعة المحتوى بالذكاء الاصطناعي",
    slug: "n8n-masterclass",
    description: "احترف توليد الفيديوهات والتصميمات الرقمية وبناء القصص البصرية الجذابة باستخدام أقوى أدوات الذكاء الاصطناعي التوليدي في دقائق.",
    short_description: "احترف صناعة المحتوى البصري وتوليد الفيديوهات والصور والقصص بنقرة واحدة باستخدام الذكاء الاصطناعي.",
    image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
    banner_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=60",
    price: 149,
    original_price: 299,
    is_free: false,
    is_featured: true,
    status: "published",
    duration_hours: 14,
    lessons_count: 12,
    level: "متقدم",
    category: "صناعة المحتوى",
    tags: ["الذكاء الاصطناعي التوليدي", "صناعة المحتوى", "الفيديو الرقمي"],
    requirements: ["معرفة أساسية بمتصفحات الويب", "حسابات تجريبية على أدوات توليد الصور والفيديو"],
    what_will_learn: [
      "كتابة السيناريو البصري وتوليد الأفكار بالذكاء الاصطناعي.",
      "توليد الشخصيات الكرتونية والقصصية بتطابق كامل.",
      "تحريك الشخصيات وتوليد مقاطع الفيديو بجودة عالية.",
      "تركيب الصوت والمونتاج الإبداعي للإنتاج النهائي."
    ],
    who_is_for: ["منشئو المحتوى الرقمي واليوتيوبرز", "المسوقون وأصحاب المشاريع الإبداعية", "المستقلون الراغبون بتقديم خدمات صناعة الفيديو"],
    created_at: new Date().toISOString()
  },
  {
    id: "course-ai-agents",
    title: "بناء وكلاء الذكاء الاصطناعي AI Agents",
    slug: "ai-agents",
    description: "دليلك الشامل لتصميم وتطوير وكلاء ذكاء اصطناعي واعين ومستقلين قادرين على اتخاذ القرارات وإنجاز المهام بالكامل بشكل تلقائي.",
    short_description: "دليلك الشامل لتصميم وتطوير وكلاء ذكاء اصطناعي واعين ومستقلين يتخذون القرارات تلقائياً.",
    image_url: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60",
    banner_url: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1600&auto=format&fit=crop&q=60",
    price: 99,
    original_price: 199,
    is_free: false,
    is_featured: false,
    status: "published",
    duration_hours: 8,
    lessons_count: 8,
    level: "متوسط",
    category: "الذكاء الاصطناعي",
    tags: ["AI", "وكلاء الذكاء الاصطناعي", "LangChain"],
    requirements: ["معرفة أولية بـ ChatGPT", "الرغبة في إنتاج محتوى إبداعي"],
    what_will_learn: [
      "الفرق بين شات بوت العادي ووكلاء الذكاء الاصطناعي.",
      "بناء فريق عمل مستقل من الوكلاء المستقلين.",
      "ربط الوكلاء بالإنترنت للحصول على بيانات محدثة.",
      "حفظ ذاكرة الوكيل الطويلة والقصيرة المدى."
    ],
    who_is_for: ["رواد الأعمال التقنيون", "مديرو المشاريع الرقمية", "مهندسو الذكاء الاصطناعي المبتدئون"],
    created_at: new Date().toISOString()
  }
];

const DEFAULT_SECTIONS: LmsSection[] = [
  { id: "sec-1", course_id: "course-n8n-masterclass", title: "الوحدة الأولى: أساسيات صناعة المحتوى وتوليد الأفكار", sort_order: 1 },
  { id: "sec-2", course_id: "course-n8n-masterclass", title: "الوحدة الثانية: تحريك الصور وتوليد مقاطع الفيديو", sort_order: 2 },
  { id: "sec-3", course_id: "course-ai-agents", title: "الوحدة الأولى: المفاهيم الأساسية للوكلاء المستقلين", sort_order: 1 }
];

const DEFAULT_LESSONS: LmsLesson[] = [
  // n8n Masterclass Lessons
  {
    id: "les-n8n-1",
    section_id: "sec-1",
    title: "مقدمة الدورة وخارطة الطريق نحو الاحتراف",
    slug: "n8n-intro",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Preview link
    content: "مرحباً بكم في الدورة! في هذا الدرس سنتعرف على خارطة الطريق الكاملة لنصبح محترفي صناعة محتوى بالذكاء الاصطناعي، والفرص الكبيرة المتاحة في السوق.",
    duration_seconds: 420,
    sort_order: 1,
    is_preview: true,
    lecture_type: "video"
  },
  {
    id: "les-n8n-2",
    section_id: "sec-1",
    title: "شرح واجهة أدوات التوليد وتحريك الصور والوجوه",
    slug: "n8n-ui-nodes",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    content: "جولة سريعة داخل واجهات أدوات توليد وتحريك الصور، وكيفية إعداد الشخصيات والوجوه لتبدو ناطقة ومتحركة بمرونة عالية.",
    duration_seconds: 780,
    sort_order: 2,
    is_preview: false,
    lecture_type: "video"
  },
  {
    id: "les-n8n-3",
    section_id: "sec-1",
    title: "تحميل الملف المرفق لكتاب خارطة طريق صناعة المحتوى",
    slug: "n8n-roadmap-pdf",
    video_url: "",
    content: "دليل دراسي شامل بصيغة PDF يلخص لك جميع مفاهيم الدورة ويساعدك في متابعة تطبيق الدروس العملي بنجاح.",
    duration_seconds: 0,
    sort_order: 3,
    is_preview: true,
    lecture_type: "pdf",
    attachment_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    attachment_name: "خارطة_طريق_صناعة_المحتوى.pdf"
  },
  {
    id: "les-n8n-4",
    section_id: "sec-2",
    title: "شرح مفهوم السيناريو البصري وتنسيق المشاهد",
    slug: "n8n-json-basics",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    content: "تعلّم كيفية صياغة السيناريو البصري وتنسيق المشاهد وتوليد الأصول المترابطة لتبدو القصة متناسقة تماماً.",
    duration_seconds: 900,
    sort_order: 1,
    is_preview: false,
    lecture_type: "video"
  },
  // AI Agents Lessons
  {
    id: "les-ai-1",
    section_id: "sec-3",
    title: "مفهوم وكلاء الذكاء الاصطناعي وهيكلية عملهم",
    slug: "ai-agents-concept",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    content: "مفهوم شامل يوضح الفارق الجوهري بين المحادثة البسيطة العادية وبين الوكيل الذي يمتلك صلاحية اتخاذ القرار واستخدام الأدوات.",
    duration_seconds: 540,
    sort_order: 1,
    is_preview: true,
    lecture_type: "video"
  },
  {
    id: "les-ai-2",
    section_id: "sec-3",
    title: "تهيئة البيئة البرمجية وتثبيت المكتبات المطلوبة",
    slug: "ai-setup-libraries",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    content: "خطوة بخطوة نقوم بتثبيت الأدوات وتهيئتها على جهاز الكمبيوتر للبدء الفوري ببناء الوكلاء بشكل عملي.",
    duration_seconds: 680,
    sort_order: 2,
    is_preview: false,
    lecture_type: "video"
  }
];

// ────────────────────────────────────────────────────────────────────────────
// Client-side Local Storage Database Helper Class
// ────────────────────────────────────────────────────────────────────────────
class LocalLmsDb {
  private isClient = typeof window !== "undefined";

  private get<T>(key: string, fallback: T): T {
    if (!this.isClient) return fallback;
    const item = localStorage.getItem(`youssef_lms_${key}`);
    return item ? JSON.parse(item) : fallback;
  }

  private set<T>(key: string, val: T): void {
    if (this.isClient) {
      localStorage.setItem(`youssef_lms_${key}`, JSON.stringify(val));
    }
  }

  // Courses
  getCourses(): LmsCourse[] {
    return this.get<LmsCourse[]>("courses", DEFAULT_COURSES);
  }

  saveCourses(courses: LmsCourse[]): void {
    this.set("courses", courses);
  }

  // Sections
  getSections(): LmsSection[] {
    return this.get<LmsSection[]>("sections", DEFAULT_SECTIONS);
  }

  saveSections(sections: LmsSection[]): void {
    this.set("sections", sections);
  }

  // Lessons
  getLessons(): LmsLesson[] {
    return this.get<LmsLesson[]>("lessons", DEFAULT_LESSONS);
  }

  saveLessons(lessons: LmsLesson[]): void {
    this.set("lessons", lessons);
  }

  // Enrollments
  getEnrollments(): LmsEnrollment[] {
    return this.get<LmsEnrollment[]>("enrollments", []);
  }

  saveEnrollments(enrollments: LmsEnrollment[]): void {
    this.set("enrollments", enrollments);
  }

  // Progress
  getProgress(): LmsProgress[] {
    return this.get<LmsProgress[]>("progress", []);
  }

  saveProgress(progress: LmsProgress[]): void {
    this.set("progress", progress);
  }

  // Certificates
  getCertificates(): LmsCertificate[] {
    return this.get<LmsCertificate[]>("certificates", []);
  }

  saveCertificates(certificates: LmsCertificate[]): void {
    this.set("certificates", certificates);
  }

  // Reviews
  getReviews(): LmsReview[] {
    return this.get<LmsReview[]>("reviews", []);
  }

  saveReviews(reviews: LmsReview[]): void {
    this.set("reviews", reviews);
  }
}

const localDb = new LocalLmsDb();

// ────────────────────────────────────────────────────────────────────────────
// Unified Operations Layer (Supabase with Client Storage Fallback)
// ────────────────────────────────────────────────────────────────────────────

// 1. Fetch Courses
export async function getCoursesList(opts: { category?: string; status?: string } = {}): Promise<LmsCourse[]> {
  try {
    let query = supabaseClient.from("courses").select("*");
    if (opts.category && opts.category !== "الكل") query = query.eq("category", opts.category);
    if (opts.status) query = query.eq("status", opts.status);
    
    const { data, error } = await query;
    if (!error && data) {
      return data as LmsCourse[];
    }
  } catch (e) {}

  // Fallback
  let courses = localDb.getCourses();
  if (opts.category && opts.category !== "الكل") {
    courses = courses.filter(c => c.category === opts.category);
  }
  if (opts.status) {
    courses = courses.filter(c => c.status === opts.status);
  }
  return courses;
}

// 2. Fetch Single Course by Slug (along with populated curriculum!)
export async function getCourseBySlug(slug: string): Promise<{ course: LmsCourse | null; sections: (LmsSection & { lessons: LmsLesson[] })[] }> {
  try {
    const { data: course, error } = await supabaseClient.from("courses").select("*").eq("slug", slug).maybeSingle();
    if (!error && course) {
      const { data: sections } = await supabaseClient.from("course_modules").select("*").eq("course_id", course.id).order("sort_order", { ascending: true }).order("id", { ascending: true });
      const populated: any[] = [];
      if (sections) {
        for (const sec of sections) {
          const { data: lessons } = await supabaseClient.from("course_lessons").select("*").eq("module_id", sec.id).order("sort_order", { ascending: true }).order("id", { ascending: true });
          populated.push({ ...sec, lessons: lessons || [] });
        }
      }

      // ── Auto-compute real stats from actual curriculum ──────────────────
      const allLessonsFlat: any[] = populated.flatMap(sec => sec.lessons || []);
      const computedLessonsCount = allLessonsFlat.length;
      const totalSeconds = allLessonsFlat.reduce((acc: number, l: any) => acc + (Number(l.duration_seconds) || 0), 0);
      const computedDurationHours = totalSeconds > 0 ? Number((totalSeconds / 3600).toFixed(1)) : (course.duration_hours || 0);

      const enrichedCourse: LmsCourse = {
        ...(course as LmsCourse),
        lessons_count: computedLessonsCount || course.lessons_count || 0,
        duration_hours: computedDurationHours,
      };
      // ────────────────────────────────────────────────────────────────────

      return { course: enrichedCourse, sections: populated };
    }
  } catch (e) {}

  // Fallback
  const courses = localDb.getCourses();
  const found = courses.find(c => c.slug === slug) || null;
  if (!found) return { course: null, sections: [] };

  const allSections = localDb.getSections().filter(s => s.course_id === found.id).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const allLessons = localDb.getLessons();

  const populated = allSections.map(sec => {
    const lessons = allLessons.filter(l => l.section_id === sec.id).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    return { ...sec, lessons };
  });

  // ── Auto-compute real stats from fallback curriculum ──────────────────
  const allLessonsFlat = populated.flatMap(sec => sec.lessons);
  const computedLessonsCount = allLessonsFlat.length;
  const totalSeconds = allLessonsFlat.reduce((acc, l) => acc + (Number(l.duration_seconds) || 0), 0);
  const computedDurationHours = totalSeconds > 0 ? Number((totalSeconds / 3600).toFixed(1)) : (found.duration_hours || 0);

  const enrichedCourse: LmsCourse = {
    ...found,
    lessons_count: computedLessonsCount || found.lessons_count || 0,
    duration_hours: computedDurationHours,
  };
  // ────────────────────────────────────────────────────────────────────

  return { course: enrichedCourse, sections: populated };
}

// 3. Upsert Course
export async function upsertCourse(course: Partial<LmsCourse> & { title: string }): Promise<LmsCourse> {
  const id = course.id || `course-${Date.now()}`;
  const slug = course.slug || course.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/g, "");
  const record: LmsCourse = {
    id,
    title: course.title,
    slug,
    description: course.description || "",
    short_description: course.short_description || "",
    image_url: course.image_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
    banner_url: course.banner_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600",
    price: Number(course.price_egp) || Number(course.price) || 0,
    original_price: Number(course.original_price_egp) || Number(course.original_price) || 0,
    price_egp: Number(course.price_egp) || Number(course.price) || 0,
    original_price_egp: Number(course.original_price_egp) || Number(course.original_price) || 0,
    price_usd: Number(course.price_usd) || 0,
    original_price_usd: Number(course.original_price_usd) || 0,
    is_free: course.is_free ?? false,
    is_featured: course.is_featured ?? false,
    status: course.status || "draft",
    duration_hours: Number(course.duration_hours) || 0,
    lessons_count: Number(course.lessons_count) || 0,
    level: course.level || "Beginner",
    category: course.category || "الأتمتة",
    tags: course.tags || [],
    requirements: course.requirements || [],
    what_will_learn: course.what_will_learn || [],
    who_is_for: course.who_is_for || [],
    certificate_bg_url: course.certificate_bg_url,
    certificate_text_color: course.certificate_text_color || "#000000",
    certificate_name_x: course.certificate_name_x || 50,
    certificate_name_y: course.certificate_name_y || 40,
    certificate_name_size: Number(course.certificate_name_size) || 24,
    certificate_course_x: course.certificate_course_x || 50,
    certificate_course_y: course.certificate_course_y || 55,
    certificate_date_x: course.certificate_date_x || 50,
    certificate_date_y: course.certificate_date_y || 70,
    certificate_date_size: Number(course.certificate_date_size) || 14,
    showcase_videos: course.showcase_videos || [],
    promo_video_id: course.promo_video_id,
    enable_gateway_fee: course.enable_gateway_fee !== false,
    created_at: course.created_at || new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseClient.from("courses").upsert(record).select().single();
    if (error) {
      console.error("Supabase upsert error:", error);
      throw new Error(error.message);
    }
    if (data) return data as LmsCourse;
  } catch (e: any) {
    console.error("Supabase upsert exception:", e);
    throw e;
  }

  // Fallback
  const list = localDb.getCourses();
  const idx = list.findIndex(c => c.id === id);
  if (idx > -1) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  localDb.saveCourses(list);
  return record;
}

// 4. Delete Course
export async function deleteCourse(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient.from("courses").delete().eq("id", id);
    if (!error) return true;
  } catch (e) {}

  // Fallback
  const list = localDb.getCourses().filter(c => c.id !== id);
  localDb.saveCourses(list);
  
  // Clean up sections/lessons locally
  const secs = localDb.getSections().filter(s => s.course_id !== id);
  localDb.saveSections(secs);
  return true;
}

// 5. Sections CRUD
export async function upsertSection(section: Partial<LmsSection> & { course_id: string; title: string }): Promise<LmsSection> {
  const id = section.id || `sec-${Date.now()}`;
  const record: LmsSection = {
    id,
    course_id: section.course_id,
    title: section.title,
    sort_order: section.sort_order || 1,
    description: section.description || ""
  };

  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabase) {
    try {
      const { data, error } = await supabaseClient.from("course_modules").upsert({
        id: record.id,
        course_id: record.course_id,
        title: record.title,
        sort_order: record.sort_order,
        description: record.description
      }).select().single();
      
      if (error) {
        console.error("Supabase upsertSection error:", error);
        throw new Error(error.message || "Failed to upsert section in database");
      }
      if (data) return data as LmsSection;
    } catch (e: any) {
      console.error("Catch upsertSection error:", e);
      throw e;
    }
  }

  // Fallback
  const list = localDb.getSections();
  const idx = list.findIndex(s => s.id === id);
  if (idx > -1) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  localDb.saveSections(list);
  return record;
}

export async function deleteSection(id: string): Promise<boolean> {
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabase) {
    try {
      const { data: mod } = await supabaseClient.from("course_modules").select("course_id").eq("id", id).maybeSingle();
      const courseIdToSync = mod?.course_id;

      const { error } = await supabaseClient.from("course_modules").delete().eq("id", id);
      if (error) {
        console.error("Supabase deleteSection error:", error);
        throw new Error(error.message || "Failed to delete section from database");
      }

      if (courseIdToSync) {
        await syncCourseStatsInDb(courseIdToSync);
      }
      return true;
    } catch (e: any) {
      console.error("Catch deleteSection error:", e);
      throw e;
    }
  }

  // Fallback
  const list = localDb.getSections().filter(s => s.id !== id);
  localDb.saveSections(list);

  // Clean lessons
  const lessons = localDb.getLessons().filter(l => l.section_id !== id);
  localDb.saveLessons(lessons);
  return true;
}

// Helper to sync course stats (lessons count and duration) dynamically in Supabase
export async function syncCourseStatsInDb(courseId: string): Promise<void> {
  try {
    const { data: modules, error: mError } = await supabaseClient
      .from("course_modules")
      .select("id")
      .eq("course_id", courseId);
    
    if (mError || !modules) return;

    let computedLessonsCount = 0;
    let computedDurationHours = 0;

    if (modules.length > 0) {
      const moduleIds = modules.map(m => m.id);
      const { data: lessons, error: lError } = await supabaseClient
        .from("course_lessons")
        .select("duration_seconds")
        .in("module_id", moduleIds);

      if (lessons && !lError) {
        computedLessonsCount = lessons.length;
        const totalSeconds = lessons.reduce((acc, l) => acc + (Number(l.duration_seconds) || 0), 0);
        computedDurationHours = totalSeconds > 0 ? Number((totalSeconds / 3600).toFixed(1)) : 0;
      }
    }

    await supabaseClient
      .from("courses")
      .update({
        lessons_count: computedLessonsCount,
        duration_hours: computedDurationHours
      })
      .eq("id", courseId);
  } catch (e) {
    console.error("[syncCourseStatsInDb] Error syncing course stats in DB:", e);
  }
}

export async function upsertLesson(lesson: Partial<LmsLesson> & { section_id: string; title: string }): Promise<LmsLesson> {
  const id = lesson.id || `les-${Date.now()}`;
  const slug = lesson.slug || (lesson.title.toLowerCase().replace(/\s+/g, "-") + "-" + Math.random().toString(36).substring(2, 8));
  const record: LmsLesson = {
    id,
    section_id: lesson.section_id,
    title: lesson.title,
    slug,
    video_url: lesson.video_url || "",
    content: lesson.content || "",
    duration_seconds: Number(lesson.duration_seconds) || 0,
    sort_order: lesson.sort_order || 1,
    is_preview: lesson.is_preview || false,
    lecture_type: lesson.lecture_type || "video",
    attachment_url: lesson.attachment_url,
    attachment_name: lesson.attachment_name,
    external_link: lesson.external_link,
    attachments: lesson.attachments || [],
    video_processing_status: lesson.video_processing_status || "completed",
    upload_progress: lesson.upload_progress !== undefined ? lesson.upload_progress : 100,
    video_id: lesson.video_id,
    playback_url: lesson.playback_url,
    thumbnail_url: lesson.thumbnail_url
  };

  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabase) {
    try {
      let data, error;
      
      // 3 retries for network drops
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await supabaseClient.from("course_lessons").upsert({
          id: record.id,
          module_id: record.section_id,
          title: record.title,
          slug: record.slug,
          video_url: record.video_url,
          content: record.content,
          duration_seconds: record.duration_seconds,
          sort_order: record.sort_order,
          is_preview: record.is_preview,
          lecture_type: record.lecture_type,
          attachment_url: record.attachment_url,
          attachment_name: record.attachment_name,
          external_link: record.external_link,
          attachments: record.attachments,
          video_processing_status: record.video_processing_status,
          upload_progress: record.upload_progress,
          video_id: record.video_id,
          playback_url: record.playback_url,
          thumbnail_url: record.thumbnail_url
        }).select().single();
        
        data = res.data;
        error = res.error;
        
        if (!error || !error.message?.includes("fetch")) break;
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      }
      
      if (!error && data) {
        const { data: mod } = await supabaseClient.from("course_modules").select("course_id").eq("id", record.section_id).maybeSingle();
        if (mod?.course_id) {
          await syncCourseStatsInDb(mod.course_id);
        }

        return {
          ...data,
          section_id: data.module_id
        } as LmsLesson;
      } else if (error) {
        console.warn("[upsertLesson] Supabase error:", error.message);
        const { data: fallbackData, error: fallbackError } = await supabaseClient.from("course_lessons").upsert({
          id: record.id,
          module_id: record.section_id,
          title: record.title,
          slug: record.slug,
          video_url: record.video_url,
          content: record.content,
          duration_seconds: record.duration_seconds,
          sort_order: record.sort_order,
          is_preview: record.is_preview,
          lecture_type: record.lecture_type,
          attachment_url: record.attachment_url,
          attachment_name: record.attachment_name,
          external_link: record.external_link
        }).select().single();
        
        if (fallbackError) {
          console.warn("Supabase upsertLesson fallback error:", fallbackError.message);
          throw new Error(fallbackError.message || "Failed to upsert lesson in database");
        }
        if (fallbackData) {
          const { data: mod } = await supabaseClient.from("course_modules").select("course_id").eq("id", record.section_id).maybeSingle();
          if (mod?.course_id) {
            await syncCourseStatsInDb(mod.course_id);
          }

          return {
            ...fallbackData,
            section_id: fallbackData.module_id,
            attachments: record.attachments,
            video_processing_status: record.video_processing_status,
            upload_progress: record.upload_progress,
            video_id: record.video_id,
            playback_url: record.playback_url,
            thumbnail_url: record.thumbnail_url
          } as LmsLesson;
        }
      }
    } catch (e: any) {
      console.error("[upsertLesson] Exception during upsert:", e);
      throw e;
    }
  }

  // Fallback
  const list = localDb.getLessons();
  const idx = list.findIndex(l => l.id === id);
  if (idx > -1) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  localDb.saveLessons(list);

  // Update total course lessons count & hours
  updateCourseCountsByLesson(lesson.section_id);

  return record;
}

export async function deleteLesson(id: string): Promise<boolean> {
  // Retrieve section_id for later update
  const old = localDb.getLessons().find(l => l.id === id);
  const secId = old?.section_id;

  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabase) {
    try {
      const { data: lessonData } = await supabaseClient.from("course_lessons").select("module_id").eq("id", id).maybeSingle();
      let courseIdToSync = null;
      if (lessonData?.module_id) {
        const { data: mod } = await supabaseClient.from("course_modules").select("course_id").eq("id", lessonData.module_id).maybeSingle();
        courseIdToSync = mod?.course_id;
      }

      const { error } = await supabaseClient.from("course_lessons").delete().eq("id", id);
      if (error) {
        console.error("Supabase deleteLesson error:", error);
        throw new Error(error.message || "Failed to delete lesson from database");
      }

      if (courseIdToSync) {
        await syncCourseStatsInDb(courseIdToSync);
      }

      return true;
    } catch (e: any) {
      console.error("Catch deleteLesson error:", e);
      throw e;
    }
  }

  // Fallback
  const list = localDb.getLessons().filter(l => l.id !== id);
  localDb.saveLessons(list);

  if (secId) updateCourseCountsByLesson(secId);
  return true;
}

// Internal helper to update total courses length
function updateCourseCountsByLesson(sectionId: string) {
  const sections = localDb.getSections();
  const sec = sections.find(s => s.id === sectionId);
  if (!sec) return;

  const lessons = localDb.getLessons();
  const courseLessons = lessons.filter(l => {
    const lSec = sections.find(s => s.id === l.section_id);
    return lSec?.course_id === sec.course_id;
  });

  const totalHours = courseLessons.reduce((acc, cur) => acc + (cur.duration_seconds || 0), 0) / 3600;

  const courses = localDb.getCourses();
  const cIdx = courses.findIndex(c => c.id === sec.course_id);
  if (cIdx > -1) {
    courses[cIdx].lessons_count = courseLessons.length;
    courses[cIdx].duration_hours = Number(totalHours.toFixed(1));
    localDb.saveCourses(courses);
  }
}

// 7. Enrollments Management
export async function checkEnrollment(userId: string, courseId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.from("enrollments").select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
    if (!error && data) return true;
  } catch (e) {}

  // Fallback
  const enrollments = localDb.getEnrollments();
  return enrollments.some(e => e.user_id === userId && e.course_id === courseId);
}

export async function enrollUser(userId: string, courseId: string, details?: { email?: string; name?: string }): Promise<LmsEnrollment> {
  const record: LmsEnrollment = {
    id: `enroll-${Date.now()}`,
    user_id: userId,
    user_email: details?.email || "student@joeschool.com",
    user_name: details?.name || "طالب جو سكول",
    course_id: courseId,
    enrolled_at: new Date().toISOString(),
    status: "active"
  };

  try {
    const { data, error } = await supabaseClient.from("enrollments").insert({
      user_id: userId,
      course_id: courseId,
      user_name: details?.name || "طالب جو سكول",
      user_email: details?.email || "student@joeschool.com",
      status: "active"
    }).select().single();
    if (!error && data) return data as LmsEnrollment;
  } catch (e) {}

  // Fallback
  const enrolls = localDb.getEnrollments();
  const exists = enrolls.find(e => e.user_id === userId && e.course_id === courseId);
  if (exists) return exists;

  enrolls.push(record);
  localDb.saveEnrollments(enrolls);
  return record;
}

export async function getEnrollmentsForAdmin(): Promise<LmsEnrollment[]> {
  // Aggregates standard mock lists with detailed student information
  try {
    const { data, error } = await supabaseClient.from("enrollments").select("*");
    if (!error && data) return data as LmsEnrollment[];
  } catch (e) {}

  // Fallback
  return localDb.getEnrollments();
}

export async function getUserEnrollments(userId: string, userEmail?: string): Promise<string[]> {
  try {
    if (userEmail) {
      try {
        const emailLower = userEmail.toLowerCase().trim();
        
        // 1. Sync pending orders first (Self-healing)
        const { data: pendingOrders } = await supabaseClient
          .from("orders")
          .select("id, payment_id, product_id, product_title, customer_name, amount")
          .eq("customer_email", emailLower)
          .eq("status", "pending");

        if (pendingOrders && pendingOrders.length > 0) {
          const apiKey = process.env.PAYMOB_API_KEY;
          const secretKey = process.env.PAYMOB_SECRET_KEY;
          
          if (apiKey && secretKey) {
            // Get Paymob Auth Token
            const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ api_key: apiKey }),
            });
            if (authRes.ok) {
              const authData = await authRes.json();
              const authToken = authData.token;
              
              for (const order of pendingOrders) {
                let isPaid = false;
                const paymentId = order.payment_id;
                
                // Special Manual Match for reported student Boody X (abdo.ibraheem.plaer@gmail.com)
                if (emailLower === "abdo.ibraheem.plaer@gmail.com") {
                  isPaid = true;
                }
                
                // A. Check by Intention ID if applicable
                if (!isPaid && paymentId && paymentId.startsWith("pi_")) {
                  try {
                    const intRes = await fetch(`https://accept.paymob.com/v1/intention/${paymentId}/`, {
                      method: "GET",
                      headers: { "Authorization": `Token ${secretKey}` }
                    });
                    if (intRes.ok) {
                      const intData = await intRes.json();
                      if (intData.status === "PAID" || intData.confirmed === true) {
                        isPaid = true;
                      } else if (intData.payment_methods) {
                        for (const pm of intData.payment_methods) {
                          if (pm.status === "PAID" || pm.confirmed === true) {
                            isPaid = true;
                            break;
                          }
                        }
                      }
                    }
                  } catch (e) {}
                }
                
                // B. Check by numeric Order ID if applicable
                if (!isPaid && paymentId && /^\d+$/.test(paymentId)) {
                  try {
                    const ordRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymentId}`, {
                      method: "GET",
                      headers: { "Authorization": `Bearer ${authToken}` }
                    });
                    if (ordRes.ok) {
                      const ordData = await ordRes.json();
                      if (ordData.payment_status === "PAID" || ordData.paid_amount_cents > 0) {
                        isPaid = true;
                      }
                    }
                  } catch (e) {}
                }
                
                if (isPaid) {
                  // Mark the order as completed in Supabase
                  await supabaseClient
                    .from("orders")
                    .update({ status: "completed" })
                    .eq("id", order.id);
                  console.log(`[SYNC_ENROLLMENT] Auto-completed order ${order.id} for ${emailLower}`);
                }
              }
            }
          }
        }
        
        // 2. Sync all completed orders to enrollments table and associate customer_id if null
        const { data: completedOrders } = await supabaseClient
          .from("orders")
          .select("id, product_id, product_title, customer_name, customer_id")
          .eq("customer_email", emailLower)
          .eq("status", "completed");

        if (completedOrders && completedOrders.length > 0) {
          for (const order of completedOrders) {
            // Update customer_id in orders table if it is currently null
            if (!order.customer_id) {
              await supabaseClient
                .from("orders")
                .update({ customer_id: userId })
                .eq("id", order.id);
              console.log(`[SYNC_ENROLLMENT] Updated customer_id to ${userId} for order ${order.id}`);
            }

            const isCourse = order.product_id?.startsWith("course-") || 
                             order.product_title?.includes("دورة") || 
                             order.product_title?.includes("كورس");
            
            if (isCourse) {
              let courseId = order.product_id;
              if (!courseId.startsWith("course-")) {
                const { data: coursesList } = await supabaseClient.from("courses").select("id, title");
                if (coursesList) {
                  const matched = coursesList.find(c => 
                    c.id === order.product_id ||
                    c.title.toLowerCase().includes(order.product_title.toLowerCase()) ||
                    order.product_title.toLowerCase().includes(c.title.toLowerCase())
                  );
                  if (matched) courseId = matched.id;
                }
              }

              // Check if enrollment exists
              const { data: existing } = await supabaseClient
                .from("enrollments")
                .select("id")
                .eq("user_id", userId)
                .eq("course_id", courseId)
                .maybeSingle();

              if (!existing) {
                console.log(`[SYNC_ENROLLMENT] Auto-enrolling ${userId} in course ${courseId}`);
                await supabaseClient.from("enrollments").insert({
                  user_id: userId,
                  course_id: courseId,
                  user_name: order.customer_name || "طالب جو سكول",
                  user_email: emailLower,
                  status: "active"
                });
              }
            }
          }
        }
      } catch (syncErr) {
        console.error("[SYNC_ENROLLMENT] Self-healing sync failed:", syncErr);
      }
    }

    // 3. Query the enrollments
    let query = supabaseClient.from("enrollments").select("course_id");
    if (userEmail) {
      query = query.or(`user_id.eq.${userId},user_email.eq.${userEmail}`);
    } else {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query;
    if (!error && data) return data.map(d => d.course_id);
  } catch (e) {}

  // Fallback
  return localDb.getEnrollments().filter(e => e.user_id === userId || (userEmail && e.user_email === userEmail)).map(e => e.course_id);
}

// 8. Progress and Complete tracking
export async function getLessonProgress(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseClient.from("user_course_progress").select("lesson_id").eq("user_id", userId);
    if (!error && data) return data.map(d => d.lesson_id);
  } catch (e) {}

  // Fallback
  const prog = localDb.getProgress();
  return prog.filter(p => p.user_id === userId).map(p => p.lesson_id);
}

export async function toggleLessonCompleted(userId: string, lessonId: string, courseId: string, studentName?: string): Promise<{ completed: boolean; percent: number; certIssued?: LmsCertificate }> {
  // Fallback toggling
  const list = localDb.getProgress();
  const idx = list.findIndex(p => p.user_id === userId && p.lesson_id === lessonId);
  let completed = false;

  if (idx > -1) {
    list.splice(idx, 1);
  } else {
    list.push({
      id: `prog-${Date.now()}`,
      user_id: userId,
      lesson_id: lessonId,
      completed_at: new Date().toISOString()
    });
    completed = true;
  }
  localDb.saveProgress(list);

  // Direct Supabase syncing
  try {
    if (completed) {
      await supabaseClient.from("user_course_progress").insert({ user_id: userId, lesson_id: lessonId });
    } else {
      await supabaseClient.from("user_course_progress").delete().eq("user_id", userId).eq("lesson_id", lessonId);
    }
  } catch (e) {}

  // Compute total percentage completed
  const { percent, isFinished } = await getCourseProgressPercent(userId, courseId);

  // Automate certificate generation on 100% completion
  let certIssued: LmsCertificate | undefined;
  if (isFinished) {
    const name = studentName || "طالب جو سكول";
    certIssued = await issueCertificate(userId, courseId, name);
  }

  return { completed, percent, certIssued };
}

export async function getCourseProgressPercent(userId: string, courseId: string): Promise<{ percent: number; completedCount: number; totalCount: number; isFinished: boolean }> {
  let courseSlug = "";
  try {
    const { data } = await supabaseClient.from("courses").select("slug").eq("id", courseId).maybeSingle();
    if (data?.slug) {
      courseSlug = data.slug;
    }
  } catch (e) {}

  if (!courseSlug) {
    courseSlug = localDb.getCourses().find(c => c.id === courseId)?.slug || "";
  }

  const { sections } = await getCourseBySlug(courseSlug);
  const allLessons = sections.flatMap(s => s.lessons);
  const totalCount = allLessons.length;
  if (totalCount === 0) return { percent: 0, completedCount: 0, totalCount: 0, isFinished: false };

  const completedLessons = await getLessonProgress(userId);
  const courseCompletedIds = allLessons.filter(l => completedLessons.includes(l.id));
  const completedCount = courseCompletedIds.length;
  
  const percent = Math.min(100, Math.round((completedCount / totalCount) * 100));
  return {
    percent,
    completedCount,
    totalCount,
    isFinished: percent === 100
  };
}

// 9. Certificates issuing
export async function issueCertificate(userId: string, courseId: string, studentName: string): Promise<LmsCertificate> {
  // Fetch course details from Supabase if possible, otherwise fallback to localDb
  let courseDetails: any = null;
  try {
    const { data } = await supabaseClient.from("courses").select("*").eq("id", courseId).maybeSingle();
    if (data) {
      courseDetails = data;
    }
  } catch (e) {}

  if (!courseDetails) {
    const courses = localDb.getCourses();
    courseDetails = courses.find(course => course.id === courseId);
  }

  const courseName = courseDetails?.title || "دورة تعليمية احترافية";

  const certs = localDb.getCertificates();
  const exists = certs.find(cert => cert.user_id === userId && cert.course_id === courseId);
  if (exists) {
    return {
      ...exists,
      course_name: courseName,
      certificate_bg_url: courseDetails?.certificate_bg_url || "",
      certificate_text_color: courseDetails?.certificate_text_color || "#000000",
      certificate_name_x: courseDetails?.certificate_name_x || 50,
      certificate_name_y: courseDetails?.certificate_name_y || 40,
      certificate_name_size: courseDetails?.certificate_name_size || 24,
      certificate_course_x: courseDetails?.certificate_course_x || 50,
      certificate_course_y: courseDetails?.certificate_course_y || 55,
      certificate_date_x: courseDetails?.certificate_date_x || 50,
      certificate_date_y: courseDetails?.certificate_date_y || 70,
      certificate_date_size: courseDetails?.certificate_date_size || 14
    };
  }

  const verificationId = `YA-CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const record: LmsCertificate = {
    id: `cert-${Date.now()}`,
    user_id: userId,
    course_id: courseId,
    issued_at: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    verification_id: verificationId,
    student_name: studentName,
    course_name: courseName,
    certificate_bg_url: courseDetails?.certificate_bg_url || "",
    certificate_text_color: courseDetails?.certificate_text_color || "#000000",
    certificate_name_x: courseDetails?.certificate_name_x || 50,
    certificate_name_y: courseDetails?.certificate_name_y || 40,
    certificate_name_size: courseDetails?.certificate_name_size || 24,
    certificate_course_x: courseDetails?.certificate_course_x || 50,
    certificate_course_y: courseDetails?.certificate_course_y || 55,
    certificate_date_x: courseDetails?.certificate_date_x || 50,
    certificate_date_y: courseDetails?.certificate_date_y || 70,
    certificate_date_size: courseDetails?.certificate_date_size || 14
  };

  certs.push(record);
  localDb.saveCertificates(certs);

  try {
    await supabaseClient.from("certificates").insert({
      user_id: userId,
      course_id: courseId,
      certificate_url: verificationId
    });
  } catch (e) {}

  return record;
}

export async function getUserCertificates(userId: string): Promise<LmsCertificate[]> {
  try {
    const { data, error } = await supabaseClient.from("certificates").select("*").eq("user_id", userId);
    if (!error && data) {
      const populated = [];
      const courses = await getCoursesList();
      for (const d of data) {
        let c = courses.find(course => course.id === d.course_id);
        
        // If course is not found in getCoursesList cache/filters, query directly from Supabase
        if (!c) {
          try {
            const { data: dbCourse } = await supabaseClient.from("courses").select("*").eq("id", d.course_id).maybeSingle();
            if (dbCourse) {
              c = dbCourse as any;
            }
          } catch (e) {}
        }
        
        // Fetch user enrolled name for this specific course
        const { data: enroll } = await supabaseClient
          .from("enrollments")
          .select("user_name")
          .eq("user_id", userId)
          .eq("course_id", d.course_id)
          .maybeSingle();

        populated.push({
          ...d,
          course_name: c?.title || "دورة تعليمية احترافية",
          certificate_bg_url: c?.certificate_bg_url || "",
          certificate_text_color: c?.certificate_text_color || "#000000",
          certificate_name_x: c?.certificate_name_x || 50,
          certificate_name_y: c?.certificate_name_y || 40,
          certificate_name_size: c?.certificate_name_size || 24,
          certificate_course_x: c?.certificate_course_x || 50,
          certificate_course_y: c?.certificate_course_y || 55,
          certificate_date_x: c?.certificate_date_x || 50,
          certificate_date_y: c?.certificate_date_y || 70,
          certificate_date_size: c?.certificate_date_size || 14,
          issued_at: new Date(d.created_at || d.issued_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          verification_id: d.certificate_url || d.id,
          student_name: enroll?.user_name || "طالب جو سكول"
        });
      }
      return populated as LmsCertificate[];
    }
  } catch (e) {}

  const certs = localDb.getCertificates().filter(c => c.user_id === userId);
  const courses = localDb.getCourses();
  const enrolls = localDb.getEnrollments();
  return certs.map(c => {
    const course = courses.find(co => co.id === c.course_id);
    const enroll = enrolls.find(e => e.user_id === userId && e.course_id === c.course_id);
    return {
      ...c,
      course_name: course?.title || c.course_name || "دورة تعليمية احترافية",
      certificate_bg_url: course?.certificate_bg_url || "",
      certificate_text_color: course?.certificate_text_color || "#000000",
      certificate_name_x: course?.certificate_name_x || 50,
      certificate_name_y: course?.certificate_name_y || 40,
      certificate_name_size: course?.certificate_name_size || 24,
      certificate_course_x: course?.certificate_course_x || 50,
      certificate_course_y: course?.certificate_course_y || 55,
      certificate_date_x: course?.certificate_date_x || 50,
      certificate_date_y: course?.certificate_date_y || 70,
      certificate_date_size: course?.certificate_date_size || 14,
      verification_id: c.verification_id || c.certificate_url || c.id,
      student_name: enroll?.user_name || c.student_name || "طالب جو سكول"
    };
  });
}

export async function getCertificatesForAdmin(): Promise<LmsCertificate[]> {
  try {
    const { data, error } = await supabaseClient.from("certificates").select("*");
    if (!error && data) return data as LmsCertificate[];
  } catch (e) {}

  return localDb.getCertificates();
}

export async function getCertificateByVerificationId(id: string): Promise<LmsCertificate | null> {
  try {
    const { data, error } = await supabaseClient.from("certificates").select("*").eq("certificate_url", id).maybeSingle();
    if (!error && data) {
      // Find course details
      const { data: course } = await supabaseClient.from("courses").select("*").eq("id", data.course_id).maybeSingle();
      // Fetch user name from enrollments
      const { data: enroll } = await supabaseClient
        .from("enrollments")
        .select("user_name")
        .eq("user_id", data.user_id)
        .eq("course_id", data.course_id)
        .maybeSingle();

      return {
        ...data,
        course_name: course?.title || "دورة تعليمية احترافية",
        certificate_bg_url: course?.certificate_bg_url || "",
        certificate_text_color: course?.certificate_text_color || "#000000",
        certificate_name_x: course?.certificate_name_x || 50,
        certificate_name_y: course?.certificate_name_y || 40,
        certificate_name_size: course?.certificate_name_size || 24,
        certificate_course_x: course?.certificate_course_x || 50,
        certificate_course_y: course?.certificate_course_y || 55,
        certificate_date_x: course?.certificate_date_x || 50,
        certificate_date_y: course?.certificate_date_y || 70,
        certificate_date_size: course?.certificate_date_size || 14,
        issued_at: new Date(data.created_at || data.issued_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        verification_id: data.certificate_url || id,
        student_name: enroll?.user_name || "طالب جو سكول"
      } as LmsCertificate;
    }
  } catch (e) {}

  // Fallback
  const certs = localDb.getCertificates();
  const found = certs.find(c => c.verification_id === id || c.id === id || c.certificate_url === id) || null;
  if (found) {
    const course = localDb.getCourses().find(co => co.id === found.course_id);
    const enroll = localDb.getEnrollments().find(e => e.user_id === found.user_id && e.course_id === found.course_id);
    return {
      ...found,
      course_name: course?.title || found.course_name || "دورة تعليمية احترافية",
      certificate_bg_url: course?.certificate_bg_url || "",
      certificate_text_color: course?.certificate_text_color || "#000000",
      certificate_name_x: course?.certificate_name_x || 50,
      certificate_name_y: course?.certificate_name_y || 40,
      certificate_name_size: course?.certificate_name_size || 24,
      certificate_course_x: course?.certificate_course_x || 50,
      certificate_course_y: course?.certificate_course_y || 55,
      certificate_date_x: course?.certificate_date_x || 50,
      certificate_date_y: course?.certificate_date_y || 70,
      certificate_date_size: course?.certificate_date_size || 14,
      verification_id: found.verification_id || found.certificate_url || id,
      student_name: enroll?.user_name || found.student_name || "طالب جو سكول"
    } as LmsCertificate;
  }
  return null;
}

export async function updateCertificateStudentName(userId: string, courseId: string, newName: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from("enrollments")
      .update({ user_name: newName })
      .eq("user_id", userId)
      .eq("course_id", courseId);
    
    if (!error) {
      // Synchronize in local fallback
      const enrolls = localDb.getEnrollments();
      const exists = enrolls.find(e => e.user_id === userId && e.course_id === courseId);
      if (exists) {
        exists.user_name = newName;
        localDb.saveEnrollments(enrolls);
      }
      
      const certs = localDb.getCertificates();
      const cert = certs.find(c => c.user_id === userId && c.course_id === courseId);
      if (cert) {
        cert.student_name = newName;
        localDb.saveCertificates(certs);
      }
      
      return true;
    }
  } catch (e) {
    console.error("Error updating certificate student name:", e);
  }
  return false;
}


// 10. Student Management API Utilities
export async function updateStudentProfile(userId: string, name: string, email: string): Promise<boolean> {
  try {
    const { error: enrollError } = await supabaseClient
      .from("enrollments")
      .update({ user_name: name, user_email: email })
      .eq("user_id", userId);
    
    await supabaseClient
      .from("certificates")
      .update({ student_name: name })
      .eq("user_id", userId);

    if (!enrollError) {
      const enrolls = localDb.getEnrollments();
      let updated = false;
      enrolls.forEach(e => {
        if (e.user_id === userId) {
          e.user_name = name;
          e.user_email = email;
          updated = true;
        }
      });
      if (updated) {
        localDb.saveEnrollments(enrolls);
      }
      
      const certs = localDb.getCertificates();
      certs.forEach(c => {
        if (c.user_id === userId) {
          c.student_name = name;
        }
      });
      localDb.saveCertificates(certs);
      
      return true;
    }
  } catch (e) {
    console.error("Error updating student profile:", e);
  }
  return false;
}

export async function removeStudentFromCourse(userId: string, courseId: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from("enrollments")
      .delete()
      .eq("user_id", userId)
      .eq("course_id", courseId);
    
    if (!error) {
      const enrolls = localDb.getEnrollments();
      const filtered = enrolls.filter(e => !(e.user_id === userId && e.course_id === courseId));
      localDb.saveEnrollments(filtered);
      return true;
    }
  } catch (e) {
    console.error("Error removing student:", e);
  }
  return false;
}

export async function updateEnrollmentStatus(userId: string, courseId: string, status: "active" | "suspended"): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from("enrollments")
      .update({ status })
      .eq("user_id", userId)
      .eq("course_id", courseId);
    
    if (!error) {
      const enrolls = localDb.getEnrollments();
      enrolls.forEach(e => {
        if (e.user_id === userId && e.course_id === courseId) {
          e.status = status;
        }
      });
      localDb.saveEnrollments(enrolls);
      return true;
    }
  } catch (e) {
    console.error("Error updating enrollment status:", e);
  }
  return false;
}

// 11. Secure Video and Course Progress Tracking Layer
export async function saveVideoProgress(p: LmsVideoProgress): Promise<{ success: boolean; error: string | null }> {
  const record = {
    user_id: p.user_id,
    course_id: p.course_id,
    lesson_id: p.lesson_id,
    watched_seconds: Number(p.watched_seconds) || 0,
    completed: p.completed,
    last_position: Number(p.last_position) || 0,
    updated_at: new Date().toISOString()
  };

  // Sync to database
  try {
    const { error } = await supabaseClient
      .from("course_progress")
      .upsert(record, { onConflict: "user_id,lesson_id" });

    if (!error) {
      // Keep legacy progress synchronized
      if (p.completed) {
        await supabaseClient
          .from("user_course_progress")
          .upsert({ user_id: p.user_id, lesson_id: p.lesson_id }, { onConflict: "user_id,lesson_id" });
      } else {
        await supabaseClient
          .from("user_course_progress")
          .delete()
          .eq("user_id", p.user_id)
          .eq("lesson_id", p.lesson_id);
      }
    }
  } catch (e) {
    console.error("Database progress sync error:", e);
  }

  // Fallback / LocalStorage sync
  if (typeof window !== "undefined") {
    try {
      const key = "youssef_lms_video_progress";
      const list = JSON.parse(localStorage.getItem(key) || "[]") as LmsVideoProgress[];
      const idx = list.findIndex(x => x.user_id === p.user_id && x.lesson_id === p.lesson_id);
      if (idx > -1) {
        list[idx] = { ...list[idx], ...record };
      } else {
        list.push({ id: `vp-${Date.now()}`, ...record });
      }
      localStorage.setItem(key, JSON.stringify(list));

      // Also sync standard mock complete list
      const legacyKey = "youssef_lms_progress";
      const legacyList = JSON.parse(localStorage.getItem(legacyKey) || "[]") as LmsProgress[];
      const legacyIdx = legacyList.findIndex(x => x.user_id === p.user_id && x.lesson_id === p.lesson_id);

      if (p.completed && legacyIdx === -1) {
        legacyList.push({
          id: `prog-${Date.now()}`,
          user_id: p.user_id,
          lesson_id: p.lesson_id,
          completed_at: new Date().toISOString()
        });
        localStorage.setItem(legacyKey, JSON.stringify(legacyList));
      } else if (!p.completed && legacyIdx > -1) {
        legacyList.splice(legacyIdx, 1);
        localStorage.setItem(legacyKey, JSON.stringify(legacyList));
      }
    } catch (e) {}
  }

  return { success: true, error: null };
}

export async function getVideoProgress(userId: string, lessonId: string): Promise<LmsVideoProgress | null> {
  try {
    const { data, error } = await supabaseClient
      .from("course_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (!error && data) return data as LmsVideoProgress;
  } catch (e) {}

  // Fallback
  if (typeof window !== "undefined") {
    try {
      const key = "youssef_lms_video_progress";
      const list = JSON.parse(localStorage.getItem(key) || "[]") as LmsVideoProgress[];
      const found = list.find(x => x.user_id === userId && x.lesson_id === lessonId);
      if (found) return found;
    } catch (e) {}
  }

  return null;
}

export async function getCourseProgressList(userId: string, courseId: string): Promise<LmsVideoProgress[]> {
  try {
    const { data, error } = await supabaseClient
      .from("course_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId);

    if (!error && data) return data as LmsVideoProgress[];
  } catch (e) {}


  // Fallback
  if (typeof window !== "undefined") {
    try {
      const key = "youssef_lms_video_progress";
      const list = JSON.parse(localStorage.getItem(key) || "[]") as LmsVideoProgress[];
      return list.filter(x => x.user_id === userId && x.course_id === courseId);
    } catch (e) {}
  }

  return [];
}

// ============================================================================
// 🔒 ENTERPRISE LMS SECURITY & TRACKING SYSTEM HELPERS
// ============================================================================

export interface ActiveSession {
  id: string;
  user_id: string;
  device_id: string;
  ip_address: string;
  browser: string;
  country: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
}

export interface LessonNote {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  timestamp_seconds: number;
  note_content: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  ip_address: string;
  user_agent: string;
  device_id: string;
  created_at: string;
}

export interface UserStatus {
  user_id: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  updated_at: string;
}

/**
 * Tracks a user's active login session and terminates oldest sessions if they exceed the limit
 */
export async function trackActiveSession(
  userId: string,
  deviceId: string,
  ipAddress: string,
  browser: string,
  country: string,
  maxSessions: number = 3
): Promise<{ success: boolean; terminatedOldest: boolean }> {
  try {
    // 1. Log or update the current device session
    const { data: existing } = await supabaseClient
      .from("active_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existing) {
      await supabaseClient
        .from("active_sessions")
        .update({
          ip_address: ipAddress,
          browser: browser,
          country: country,
          is_active: true,
          last_activity: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabaseClient
        .from("active_sessions")
        .insert({
          user_id: userId,
          device_id: deviceId,
          ip_address: ipAddress,
          browser: browser,
          country: country,
          is_active: true
        });
    }

    // 2. Fetch all active sessions sorted by last activity
    const { data: activeList } = await supabaseClient
      .from("active_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("last_activity", { ascending: false });

    let terminatedOldest = false;
    // Disabled session deactivation to allow unlimited devices per account
    /*
    if (activeList && activeList.length > maxSessions) {
      // Deactivate oldest sessions exceeding the limit
      const sessionsToDeactivate = activeList.slice(maxSessions);
      for (const sess of sessionsToDeactivate) {
        await supabaseClient
          .from("active_sessions")
          .update({ is_active: false })
          .eq("id", sess.id);
      }
      terminatedOldest = true;

      // Log this termination activity
      await logUserActivity(userId, "SESSION_AUTO_TERMINATED", ipAddress, browser, deviceId);
    }
    */

    return { success: true, terminatedOldest };
  } catch (e) {
    console.error("Failed to track active session:", e);
  }

  // LocalStorage Fallback
  if (typeof window !== "undefined") {
    try {
      const key = "youssef_lms_sessions";
      const list = JSON.parse(localStorage.getItem(key) || "[]") as ActiveSession[];
      let existingIdx = list.findIndex(x => x.user_id === userId && x.device_id === deviceId);
      
      if (existingIdx > -1) {
        list[existingIdx].ip_address = ipAddress;
        list[existingIdx].browser = browser;
        list[existingIdx].country = country;
        list[existingIdx].is_active = true;
        list[existingIdx].last_activity = new Date().toISOString();
      } else {
        list.push({
          id: `sess-${Date.now()}`,
          user_id: userId,
          device_id: deviceId,
          ip_address: ipAddress,
          browser: browser,
          country: country,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          is_active: true
        });
      }

      // Filter active and enforce max limit (Disabled to allow unlimited devices)
      let activeSessions = list.filter(x => x.user_id === userId && x.is_active);
      let terminatedOldest = false;
      /*
      if (activeSessions.length > maxSessions) {
        activeSessions.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
        const older = activeSessions.slice(maxSessions);
        older.forEach(o => {
          const idx = list.findIndex(x => x.id === o.id);
          if (idx > -1) list[idx].is_active = false;
        });
        terminatedOldest = true;
      }
      */

      localStorage.setItem(key, JSON.stringify(list));
      return { success: true, terminatedOldest };
    } catch (e) {}
  }

  return { success: false, terminatedOldest: false };
}

/**
 * Checks if a user's active session is valid and not suspended or deactivated
 */
export async function checkSessionIsValid(userId: string, deviceId: string): Promise<boolean> {
  try {
    // 1. Check deactivation / suspension
    const { data: status } = await supabaseClient
      .from("user_status")
      .select("is_suspended")
      .eq("user_id", userId)
      .maybeSingle();

    if (status && status.is_suspended) return false;

    // 2. Device session is always active (Unlimited devices feature)
    return true;
  } catch (e) {
    // Fail-safe to true in case network fails
    return true;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getActiveSessions(userId: string): Promise<ActiveSession[]> {
  try {
    const { data } = await supabaseClient
      .from("active_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("last_activity", { ascending: false });
    if (data) return data as ActiveSession[];
  } catch (e) {}

  if (typeof window !== "undefined") {
    try {
      const list = JSON.parse(localStorage.getItem("youssef_lms_sessions") || "[]") as ActiveSession[];
      return list.filter(x => x.user_id === userId);
    } catch (e) {}
  }
  return [];
}

/**
 * Log user activity for audit logs
 */
export async function logUserActivity(
  userId: string | null,
  actionType: string,
  ipAddress: string,
  userAgent: string,
  deviceId: string
): Promise<void> {
  try {
    await supabaseClient
      .from("activity_logs")
      .insert({
        user_id: userId,
        action_type: actionType,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_id: deviceId
      });
  } catch (e) {}

  if (typeof window !== "undefined") {
    try {
      const key = "youssef_lms_activity_logs";
      const list = JSON.parse(localStorage.getItem(key) || "[]") as ActivityLog[];
      list.unshift({
        id: `log-${Date.now()}`,
        user_id: userId || "",
        action_type: actionType,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_id: deviceId,
        created_at: new Date().toISOString()
      });
      // Cap at 100 entries locally
      localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
    } catch (e) {}
  }
}

/**
 * Get user status (suspension details)
 */
export async function getUserStatus(userId: string): Promise<UserStatus | null> {
  try {
    const { data } = await supabaseClient
      .from("user_status")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return data as UserStatus;
  } catch (e) {}
  return null;
}

/**
 * Toggle suspension for a user (Admin command)
 */
export async function toggleUserSuspension(
  userId: string,
  isSuspended: boolean,
  reason: string | null = null
): Promise<boolean> {
  try {
    const { data: existing } = await supabaseClient
      .from("user_status")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabaseClient
        .from("user_status")
        .update({
          is_suspended: isSuspended,
          suspension_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);
    } else {
      await supabaseClient
        .from("user_status")
        .insert({
          user_id: userId,
          is_suspended: isSuspended,
          suspension_reason: reason
        });
    }
    return true;
  } catch (e) {
    console.error("Failed to toggle suspension:", e);
    return false;
  }
}


/**
 * Notes System operations
 */
export async function getLessonNotes(userId: string, lessonId: string): Promise<LessonNote[]> {
  try {
    const { data } = await supabaseClient
      .from("lesson_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .order("timestamp_seconds", { ascending: true });
    if (data) return data as LessonNote[];
  } catch (e) {}

  if (typeof window !== "undefined") {
    try {
      const list = JSON.parse(localStorage.getItem("youssef_lms_notes") || "[]") as LessonNote[];
      return list
        .filter(x => x.user_id === userId && x.lesson_id === lessonId)
        .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    } catch (e) {}
  }
  return [];
}

export async function saveLessonNote(
  userId: string,
  courseId: string,
  lessonId: string,
  timestampSeconds: number,
  noteContent: string
): Promise<LessonNote> {
  try {
    const { data, error } = await supabaseClient
      .from("lesson_notes")
      .insert({
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        timestamp_seconds: timestampSeconds,
        note_content: noteContent
      })
      .select()
      .single();

    if (!error && data) return data as LessonNote;
  } catch (e) {}

  // Fallback
  const newNote: LessonNote = {
    id: `note-${Date.now()}`,
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
    timestamp_seconds: timestampSeconds,
    note_content: noteContent,
    created_at: new Date().toISOString()
  };

  if (typeof window !== "undefined") {
    try {
      const list = JSON.parse(localStorage.getItem("youssef_lms_notes") || "[]") as LessonNote[];
      list.push(newNote);
      localStorage.setItem("youssef_lms_notes", JSON.stringify(list));
    } catch (e) {}
  }
  return newNote;
}

export async function deleteLessonNote(noteId: string): Promise<void> {
  try {
    await supabaseClient
      .from("lesson_notes")
      .delete()
      .eq("id", noteId);
  } catch (e) {}

  if (typeof window !== "undefined") {
    try {
      const list = JSON.parse(localStorage.getItem("youssef_lms_notes") || "[]") as LessonNote[];
      const filtered = list.filter(x => x.id !== noteId);
      localStorage.setItem("youssef_lms_notes", JSON.stringify(filtered));
    } catch (e) {}
  }
}

export async function getStudentStudyHours(userId: string): Promise<{ totalSeconds: number; completedCount: number; streak: number }> {
  let totalSeconds = 0;
  let completedCount = 0;
  let streak = 0;

  try {
    const { data } = await supabaseClient
      .from("course_progress")
      .select("watched_seconds, completed")
      .eq("user_id", userId);

    if (data) {
      data.forEach(x => {
        totalSeconds += x.watched_seconds || 0;
        if (x.completed) completedCount++;
      });
    }

    // Streak calculation (mock active streaks for student achievements gamification)
    const { data: logs } = await supabaseClient
      .from("activity_logs")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (logs && logs.length > 0) {
      const uniqueDays = new Set(logs.map(l => new Date(l.created_at).toDateString()));
      streak = uniqueDays.size;
    }
  } catch (e) {}

  if (totalSeconds === 0 && typeof window !== "undefined") {
    try {
      const list = JSON.parse(localStorage.getItem("youssef_lms_video_progress") || "[]") as LmsVideoProgress[];
      const users = list.filter(x => x.user_id === userId);
      users.forEach(u => {
        totalSeconds += u.watched_seconds || 0;
        if (u.completed) completedCount++;
      });
      streak = 5; // default active developer streak
    } catch (e) {}
  }

  return { totalSeconds, completedCount, streak: streak || 1 };
}


