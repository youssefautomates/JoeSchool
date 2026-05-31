export interface Course {
  title: string;
  slug: string;
  description: string;
  duration: string;
  lessonsCount: string;
  rating: number;
  price: number;
  originalPrice: number;
  isFeatured: boolean;
  tag: string;
  category: "صناعة المحتوى" | "الرسوم المتحركة" | "الذكاء الاصطناعي التوليدي" | "الدورات المجانية";
  level: "مبتدئ" | "متوسط" | "متقدم" | "Beginner" | "Intermediate" | "Advanced";
}

export const COURSE_CATEGORIES = [
  "الكل",
  "صناعة المحتوى",
  "الرسوم المتحركة",
  "الذكاء الاصطناعي التوليدي",
  "الدورات المجانية"
] as const;

export const COURSES_DATA: Course[] = [
  {
    title: "دورة صناعة المحتوى بالذكاء الاصطناعي",
    slug: "n8n-masterclass",
    description: "احترف توليد الفيديوهات والتصميمات الرقمية وبناء القصص البصرية الجذابة باستخدام أقوى أدوات الذكاء الاصطناعي التوليدي في دقائق.",
    duration: "14 ساعة تدريبية",
    lessonsCount: "35 درساً مفصلاً",
    rating: 5.0,
    price: 149,
    originalPrice: 299,
    isFeatured: true,
    tag: "الأكثر طلباً",
    category: "صناعة المحتوى",
    level: "متقدم"
  },
  {
    title: "بناء وكلاء الذكاء الاصطناعي AI Agents",
    slug: "ai-agents",
    description: "دليلك الشامل لتصميم وتطوير وكلاء ذكاء اصطناعي واعين ومستقلين قادرين على اتخاذ القرارات وإنجاز المهام بالكامل بشكل تلقائي.",
    duration: "8 ساعات تدريبية",
    lessonsCount: "22 درساً مفصلاً",
    rating: 4.9,
    price: 99,
    originalPrice: 199,
    isFeatured: false,
    tag: "جديد بالكامل",
    category: "الذكاء الاصطناعي التوليدي",
    level: "متوسط"
  },
  {
    title: "أسرار صناعة المحتوى الفيروسي بالذكاء الاصطناعي",
    slug: "ai-content-creation",
    description: "تعلم كيف تصنع سيناريوهات، فيديوهات، وتصميمات تجذب ملايين المشاهدات باستخدام أدوات التوليد الفوري في دقائق معدودة.",
    duration: "6 ساعات تدريبية",
    lessonsCount: "18 درساً مفصلاً",
    rating: 4.8,
    price: 79,
    originalPrice: 149,
    isFeatured: false,
    tag: "شائع",
    category: "صناعة المحتوى",
    level: "مبتدئ"
  },
  {
    title: "التسويق الرقمي الحديث وجذب العملاء المحتملين",
    slug: "growth-marketing",
    description: "استراتيجيات التسويق الحديثة، تتبع التحويلات، الحملات المدفوعة وكتابة الإعلانات المؤثرة لزيادة مبيعات متجرك الرقمي.",
    duration: "10 ساعات تدريبية",
    lessonsCount: "28 درساً مفصلاً",
    rating: 4.9,
    price: 119,
    originalPrice: 239,
    isFeatured: false,
    tag: "موصى به",
    category: "صناعة المحتوى",
    level: "متوسط"
  },
  {
    title: "المدخل الأساسي لإنتاج الفيديو الرقمي",
    slug: "nocode-basics",
    description: "دورة تمهيدية مجانية تفتح لك آفاق صناعة المحتوى البصري وقواعد المونتاج وتوليد الأصول الرقمية للمبتدئين.",
    duration: "3 ساعات تدريبية",
    lessonsCount: "10 دروس مفصلة",
    rating: 4.7,
    price: 0,
    originalPrice: 49,
    isFeatured: false,
    tag: "هدية مجانية",
    category: "الدورات المجانية",
    level: "مبتدئ"
  }
];
