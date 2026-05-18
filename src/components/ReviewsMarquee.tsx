"use client";

import { Star, CheckCircle2 } from "lucide-react";

interface Review {
  name: string;
  title: string;
  text: string;
  stars: number;
  seed: string;
  gender: "male" | "female";
}

// Dicebear adventurer seeds that are confirmed to produce correct gendered avatars
const MALE_SEEDS = ["Felix", "Oliver", "Charlie", "Jack", "Liam", "Noah", "James", "Ethan"];
const FEMALE_SEEDS = ["Mia", "Lily", "Emma", "Sara", "Luna", "Aria", "Zoe", "Chloe"];

function getAvatarUrl(seed: string, gender: "male" | "female"): string {
  const seeds = gender === "female" ? FEMALE_SEEDS : MALE_SEEDS;
  // Use seed string to consistently pick the same avatar for same name
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const chosen = seeds[Math.abs(hash) % seeds.length];
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${chosen}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;
}

const reviews: Review[] = [
  {
    name: "عادل الحربي",
    title: "مشتري موثق · حزمة n8n للشركات",
    text: "قمت بشراء حزمة أتمتة n8n لربط متجري تلقائيًا وإرسال الفواتير للعملاء عبر الواتساب. استثمار جبار ووفر عليّ راتب موظف كامل!",
    stars: 5,
    seed: "adil",
    gender: "male"
  },
  {
    name: "شروق عبد العزيز",
    title: "مشتري موثق · بوت أتمتة التلغرام",
    text: "خدمة استثنائية! حصلت على حزم جاهزة لـ n8n والربط كان فوري، وتفاجأت أن الملفات المرسلة عبر البريد الإلكتروني مشفرة ومحمية بـ Tokens مخصصة.",
    stars: 5,
    seed: "shrouk",
    gender: "female"
  },
  {
    name: "أبو تميم",
    title: "مشتري موثق · بوابة دفع Paymob",
    text: "الدعم ما بعد البيع فوق الخيال. واجهت مشكلة بسيطة في الربط مع بوابة Paymob وساعدني فريق العمل بشكل فوري ومجاني حتى أتممت أول عملية دفع.",
    stars: 5,
    seed: "abutamim",
    gender: "male"
  },
  {
    name: "خالد الدوسري",
    title: "مشتري موثق · حزم أتمتة السحابة",
    text: "تطبيق فكرة Premium SaaS حقيقي. الواجهات وتدفقات الأتمتة خالية من الأخطاء، وكل التقييمات والأحداث تتزامن بشكل فوري. عمل متقن للغاية.",
    stars: 5,
    seed: "khaled",
    gender: "male"
  },
  {
    name: "سارة العتيبي",
    title: "مشتري موثق · أتمتة الذكاء الاصطناعي",
    text: "من أفضل المتاجر الرقمية التي تعاملت معها. سهولة التحميل ووضوح الشرح لحزمة الذكاء الاصطناعي والأتمتة لا يعلى عليها.",
    stars: 5,
    seed: "sara",
    gender: "female"
  },
  {
    name: "د. فيصل القحطاني",
    title: "مشتري موثق · أتمتة تدفق الأعمال",
    text: "حزم الأتمتة والمنتجات الرقمية هنا ليست مجرد ملفات، بل هي حلول برمجية متكاملة تزيد من كفاءة العمل وتقلل المصاريف بشكل فوري.",
    stars: 5,
    seed: "faisal",
    gender: "male"
  },
  {
    name: "عبد الرحمن السديري",
    title: "مشتري موثق · حزمة بيكسل متكاملة",
    text: "كود نظيف، ترتيب رائع، وتكامل فريد مع بيكسل فيسبوك وتيك توك لتتبع المبيعات الحقيقية. أنصح كل صاحب متجر رقمي بالشراء دون تردد.",
    stars: 5,
    seed: "abdulrahman",
    gender: "male"
  }
];

export function ReviewsMarquee() {
  // Triple the list to enable seamless endless scrolling
  const duplicatedReviews = [...reviews, ...reviews, ...reviews];

  return (
    <section id="reviews" className="py-24 md:py-32 bg-[#050505] border-y border-white/5 overflow-hidden relative select-none">
      
      {/* Visual background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 mb-16 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-4 tracking-tighter">
          ثقة عملائنا
        </h2>
        <p className="text-zinc-500 font-cairo text-sm md:text-base">
          آراء واقعية من أشخاص حقيقيين قاموا بأتمتة وتطوير أعمالهم معنا بنجاح
        </p>
      </div>

      {/* Endless Marquee Slider */}
      <div className="relative w-full overflow-hidden flex flex-col gap-6" dir="ltr">
        
        {/* CSS Keyframes for perfectly seamless looping slide */}
        <style jsx global>{`
          @keyframes marquee-scroll {
            0% {
              transform: translate3d(0, 0, 0);
            }
            100% {
              transform: translate3d(-33.333%, 0, 0);
            }
          }
          .animate-marquee-endless {
            display: flex;
            gap: 1.5rem;
            width: max-content;
            animation: marquee-scroll 45s linear infinite;
          }
          .animate-marquee-endless:hover {
            animation-play-state: paused;
          }
        `}</style>

        <div className="animate-marquee-endless">
          {duplicatedReviews.map((review, idx) => (
            <div
              key={idx}
              className="w-[320px] md:w-[420px] flex-shrink-0 bg-[#08080c]/60 border border-white/5 p-6 rounded-[2.5rem] relative group hover:border-rose-500/30 transition-all duration-500 shadow-2xl flex flex-col justify-between"
              dir="rtl"
            >
              <div className="space-y-4">
                
                {/* User Info Header */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 overflow-hidden shadow-lg border border-white/10 shrink-0 relative">
                    <img 
                      src={getAvatarUrl(review.seed, review.gender)} 
                      alt={review.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-alexandria font-bold text-white text-sm truncate">
                      {review.name}
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-bold truncate mt-0.5">{review.title}</p>
                  </div>
                  <div className="shrink-0">
                    <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-[9px] font-black font-cairo">موثق</span>
                    </div>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex text-yellow-500 gap-0.5">
                  {[...Array(review.stars)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-zinc-400 font-cairo text-sm leading-relaxed whitespace-normal pl-2">
                  "{review.text}"
                </p>

              </div>
              
              {/* Subtle Ambient Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-[2.5rem] pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
