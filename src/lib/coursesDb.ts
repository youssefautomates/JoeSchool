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
  is_free: boolean;
  is_featured: boolean;
  status: "draft" | "published" | "hidden";
  duration_hours: number;
  lessons_count: number;
  level: "مبتدئ" | "متوسط" | "متقدم";
  category: string;
  tags: string[];
  requirements: string[];
  what_will_learn: string[];
  who_is_for: string[];
  certificate_bg_url?: string;
  certificate_text_color?: string;
  certificate_name_x?: number;
  certificate_name_y?: number;
  certificate_course_x?: number;
  certificate_course_y?: number;
  certificate_date_x?: number;
  certificate_date_y?: number;
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
  certificate_course_x?: number;
  certificate_course_y?: number;
  certificate_date_x?: number;
  certificate_date_y?: number;
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
    title: "دورة الأتمتة المتقدمة n8n Masterclass",
    slug: "n8n-masterclass",
    description: "احترف بناء أنظمة الأتمتة المتكاملة وربط الخدمات والذكاء الاصطناعي دون الحاجة لكتابة كود. وفر آلاف الساعات لعملك وعملائك.",
    short_description: "احترف الأتمتة المتقدمة وربط مختلف الخدمات ونماذج الذكاء الاصطناعي كلياً بدون شفرات برمجية.",
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
    category: "الأتمتة",
    tags: ["n8n", "الأتمتة", "بدون كود"],
    requirements: ["فهم أساسيات الويب", "حساب مجاني على n8n cloud أو تشغيل محلي"],
    what_will_learn: [
      "فهم وتثبيت خادم n8n والتعامل مع العقد المختلفة.",
      "ربط Google Sheets وبناء قواعد بيانات ذكية مدمجة.",
      "دمج نماذج الذكاء الاصطناعي OpenAI و Anthropic كلياً.",
      "إدارة الويب هوكس واستقبال البيانات الفورية."
    ],
    who_is_for: ["أصحاب الأعمال لزيادة الكفاءة", "المطورون الراغبون بتوفير وقت البرمجة", "المستقلون لبيع خدمات الأتمتة"],
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
    requirements: ["معرفة أولية بـ ChatGPT", "الرغبة في أتمتة المهام المعقدة"],
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
  { id: "sec-1", course_id: "course-n8n-masterclass", title: "الوحدة الأولى: أساسيات المنصة والتهيئة الأولية", sort_order: 1 },
  { id: "sec-2", course_id: "course-n8n-masterclass", title: "الوحدة الثانية: التعامل مع البيانات وهياكلها", sort_order: 2 },
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
    content: "مرحباً بكم في الدورة! في هذا الدرس سنتعرف على خارطة الطريق الكاملة لنصبح محترفي أتمتة، والفرص التي يوفرها n8n في السوق العالمي والمحلي.",
    duration_seconds: 420,
    sort_order: 1,
    is_preview: true,
    lecture_type: "video"
  },
  {
    id: "les-n8n-2",
    section_id: "sec-1",
    title: "شرح واجهة مستخدم n8n وكيفية عمل العقد (Nodes)",
    slug: "n8n-ui-nodes",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    content: "جولة سريعة داخل واجهة مستخدم n8n السحابية والمحلية، وطريقة تثبيت وإعداد العقد لتأدية المهام المختلفة وربط المدخلات بالمخرجات.",
    duration_seconds: 780,
    sort_order: 2,
    is_preview: false,
    lecture_type: "video"
  },
  {
    id: "les-n8n-3",
    section_id: "sec-1",
    title: "تحميل الملف المرفق لكتاب خارطة طريق الأتمتة",
    slug: "n8n-roadmap-pdf",
    video_url: "",
    content: "دليل دراسي شامل بصيغة PDF يلخص لك جميع مفاهيم الدورة ويساعدك في متابعة تطبيق الدروس العملي بنجاح.",
    duration_seconds: 0,
    sort_order: 3,
    is_preview: true,
    lecture_type: "pdf",
    attachment_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    attachment_name: "خارطة_طريق_الأتمتة.pdf"
  },
  {
    id: "les-n8n-4",
    section_id: "sec-2",
    title: "شرح مفهوم الـ JSON وكيفية معالجة البيانات بنجاح",
    slug: "n8n-json-basics",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    content: "تعلّم كيفية قراءة هيكلية الـ JSON والتعامل مع المفاتيح والقيم واستخراج المصفوفات لمعالجتها داخل العقد بمرونة.",
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
    if (!error && data) return data as LmsCourse[];
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
      const { data: sections } = await supabaseClient.from("course_modules").select("*").eq("course_id", course.id).order("sort_order", { ascending: true });
      const populated: any[] = [];
      if (sections) {
        for (const sec of sections) {
          const { data: lessons } = await supabaseClient.from("course_lessons").select("*").eq("module_id", sec.id).order("sort_order", { ascending: true });
          populated.push({ ...sec, lessons: lessons || [] });
        }
      }
      return { course: course as LmsCourse, sections: populated };
    }
  } catch (e) {}

  // Fallback
  const courses = localDb.getCourses();
  const found = courses.find(c => c.slug === slug) || null;
  if (!found) return { course: null, sections: [] };

  const allSections = localDb.getSections().filter(s => s.course_id === found.id).sort((a, b) => a.sort_order - b.sort_order);
  const allLessons = localDb.getLessons();

  const populated = allSections.map(sec => {
    const lessons = allLessons.filter(l => l.section_id === sec.id).sort((a, b) => a.sort_order - b.sort_order);
    return { ...sec, lessons };
  });

  return { course: found, sections: populated };
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
    price: Number(course.price) || 0,
    original_price: Number(course.original_price) || 0,
    is_free: course.is_free ?? false,
    is_featured: course.is_featured ?? false,
    status: course.status || "draft",
    duration_hours: Number(course.duration_hours) || 0,
    lessons_count: Number(course.lessons_count) || 0,
    level: course.level || "مبتدئ",
    category: course.category || "الأتمتة",
    tags: course.tags || [],
    requirements: course.requirements || [],
    what_will_learn: course.what_will_learn || [],
    who_is_for: course.who_is_for || [],
    certificate_bg_url: course.certificate_bg_url,
    certificate_text_color: course.certificate_text_color || "#000000",
    certificate_name_x: course.certificate_name_x || 50,
    certificate_name_y: course.certificate_name_y || 40,
    certificate_course_x: course.certificate_course_x || 50,
    certificate_course_y: course.certificate_course_y || 55,
    certificate_date_x: course.certificate_date_x || 50,
    certificate_date_y: course.certificate_date_y || 70,
    created_at: course.created_at || new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseClient.from("courses").upsert(record).select().single();
    if (!error && data) return data as LmsCourse;
  } catch (e) {}

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

  try {
    const { data, error } = await supabaseClient.from("course_modules").upsert({
      id: record.id,
      course_id: record.course_id,
      title: record.title,
      sort_order: record.sort_order,
      description: record.description
    }).select().single();
    if (!error && data) return data as LmsSection;
  } catch (e) {}

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
  try {
    const { error } = await supabaseClient.from("course_modules").delete().eq("id", id);
    if (!error) return true;
  } catch (e) {}

  // Fallback
  const list = localDb.getSections().filter(s => s.id !== id);
  localDb.saveSections(list);

  // Clean lessons
  const lessons = localDb.getLessons().filter(l => l.section_id !== id);
  localDb.saveLessons(lessons);
  return true;
}

// 6. Lessons CRUD
export async function upsertLesson(lesson: Partial<LmsLesson> & { section_id: string; title: string }): Promise<LmsLesson> {
  const id = lesson.id || `les-${Date.now()}`;
  const slug = lesson.slug || lesson.title.toLowerCase().replace(/\s+/g, "-");
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
    external_link: lesson.external_link
  };

  try {
    const { data, error } = await supabaseClient.from("course_lessons").upsert({
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
    if (!error && data) {
      return {
        ...data,
        section_id: data.module_id
      } as LmsLesson;
    }
  } catch (e) {}

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

  try {
    const { error } = await supabaseClient.from("course_lessons").delete().eq("id", id);
    if (!error) return true;
  } catch (e) {}

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
    user_email: details?.email || "student@youssefautomates.com",
    user_name: details?.name || "طالب يوسف أوتوميتس",
    course_id: courseId,
    enrolled_at: new Date().toISOString(),
    status: "active"
  };

  try {
    const { data, error } = await supabaseClient.from("enrollments").insert({
      user_id: userId,
      course_id: courseId,
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

export async function getUserEnrollments(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseClient.from("enrollments").select("course_id").eq("user_id", userId);
    if (!error && data) return data.map(d => d.course_id);
  } catch (e) {}

  // Fallback
  return localDb.getEnrollments().filter(e => e.user_id === userId).map(e => e.course_id);
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
    const name = studentName || "طالب يوسف أوتوميتس";
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
  const courses = localDb.getCourses();
  const c = courses.find(course => course.id === courseId);
  const courseName = c?.title || "دورة تعليمية احترافية";

  const certs = localDb.getCertificates();
  const exists = certs.find(cert => cert.user_id === userId && cert.course_id === courseId);
  if (exists) return exists;

  const verificationId = `YA-CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const record: LmsCertificate = {
    id: `cert-${Date.now()}`,
    user_id: userId,
    course_id: courseId,
    issued_at: new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
    verification_id: verificationId,
    student_name: studentName,
    course_name: courseName
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
        const c = courses.find(course => course.id === d.course_id);
        populated.push({
          ...d,
          course_name: c?.title || "دورة تعليمية احترافية",
          certificate_bg_url: c?.certificate_bg_url || "",
          certificate_text_color: c?.certificate_text_color || "#000000",
          certificate_name_x: c?.certificate_name_x || 50,
          certificate_name_y: c?.certificate_name_y || 40,
          certificate_course_x: c?.certificate_course_x || 50,
          certificate_course_y: c?.certificate_course_y || 55,
          certificate_date_x: c?.certificate_date_x || 50,
          certificate_date_y: c?.certificate_date_y || 70,
          issued_at: new Date(d.created_at || d.issued_at || Date.now()).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
          verification_id: d.certificate_url || d.id
        });
      }
      return populated as LmsCertificate[];
    }
  } catch (e) {}

  const certs = localDb.getCertificates().filter(c => c.user_id === userId);
  const courses = localDb.getCourses();
  return certs.map(c => {
    const course = courses.find(co => co.id === c.course_id);
    return {
      ...c,
      course_name: course?.title || c.course_name || "دورة تعليمية احترافية",
      certificate_bg_url: course?.certificate_bg_url || "",
      certificate_text_color: course?.certificate_text_color || "#000000",
      certificate_name_x: course?.certificate_name_x || 50,
      certificate_name_y: course?.certificate_name_y || 40,
      certificate_course_x: course?.certificate_course_x || 50,
      certificate_course_y: course?.certificate_course_y || 55,
      certificate_date_x: course?.certificate_date_x || 50,
      certificate_date_y: course?.certificate_date_y || 70,
      verification_id: c.verification_id || c.certificate_url || c.id
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
      return {
        ...data,
        course_name: course?.title || "دورة تعليمية احترافية",
        certificate_bg_url: course?.certificate_bg_url || "",
        certificate_text_color: course?.certificate_text_color || "#000000",
        certificate_name_x: course?.certificate_name_x || 50,
        certificate_name_y: course?.certificate_name_y || 40,
        certificate_course_x: course?.certificate_course_x || 50,
        certificate_course_y: course?.certificate_course_y || 55,
        certificate_date_x: course?.certificate_date_x || 50,
        certificate_date_y: course?.certificate_date_y || 70,
        issued_at: new Date(data.created_at || data.issued_at || Date.now()).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
        verification_id: data.certificate_url || id
      } as LmsCertificate;
    }
  } catch (e) {}

  // Fallback
  const certs = localDb.getCertificates();
  const found = certs.find(c => c.verification_id === id || c.id === id || c.certificate_url === id) || null;
  if (found) {
    const course = localDb.getCourses().find(co => co.id === found.course_id);
    return {
      ...found,
      course_name: course?.title || found.course_name || "دورة تعليمية احترافية",
      certificate_bg_url: course?.certificate_bg_url || "",
      certificate_text_color: course?.certificate_text_color || "#000000",
      certificate_name_x: course?.certificate_name_x || 50,
      certificate_name_y: course?.certificate_name_y || 40,
      certificate_course_x: course?.certificate_course_x || 50,
      certificate_course_y: course?.certificate_course_y || 55,
      certificate_date_x: course?.certificate_date_x || 50,
      certificate_date_y: course?.certificate_date_y || 70,
      verification_id: found.verification_id || found.certificate_url || id
    } as LmsCertificate;
  }
  return null;
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

