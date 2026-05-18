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
  category: "الأتمتة" | "الذكاء الاصطناعي" | "صناعة المحتوى" | "التسويق" | "الدورات المجانية";
  level: "مبتدئ" | "متوسط" | "متقدم";
}

export const COURSE_CATEGORIES = [
  "الكل",
  "صناعة المحتوى",
  "الأتمتة",
  "الذكاء الاصطناعي",
  "التسويق",
  "الدورات المجانية"
] as const;

export const COURSES_DATA: Course[] = [
  {
    title: "دورة الأتمتة المتقدمة n8n Masterclass",
    slug: "n8n-masterclass",
    description: "احترف بناء أنظمة الأتمتة المتكاملة وربط الخدمات والذكاء الاصطناعي دون الحاجة لكتابة كود. وفر آلاف الساعات لعملك وعملائك.",
    duration: "14 ساعة تدريبية",
    lessonsCount: "35 درساً مفصلاً",
    rating: 5.0,
    price: 149,
    originalPrice: 299,
    isFeatured: true,
    tag: "الأكثر طلباً",
    category: "الأتمتة",
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
    category: "الذكاء الاصطناعي",
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
    category: "التسويق",
    level: "متوسط"
  },
  {
    title: "المدخل الأساسي للأتمتة بدون كود",
    slug: "nocode-basics",
    description: "دورة تمهيدية مجانية تفتح لك آفاق بناء الأنظمة وربط التطبيقات الأساسية باستخدام Make وZapier وn8n للمبتدئين.",
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
