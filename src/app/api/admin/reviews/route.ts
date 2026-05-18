import { NextResponse } from "next/server";
import { getKV, setKV } from "@/lib/kv";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const REVIEWS_KEY = "product_reviews";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Review {
  id: string;
  productId: string;
  firstName: string;
  lastName: string;
  rating: number;
  text: string;
  avatarUrl: string;
  gender?: string;
  isVerified: boolean;
  isHidden: boolean;
  createdAt: string;
}

const realisticReviewsTemplates = [
  {
    firstName: "أحمد",
    lastName: "رأفت",
    rating: 5,
    gender: "male",
    text: "الربط شغال تمام وسهل جداً، وريّحني من نقل البيانات يدوي."
  },
  {
    firstName: "سارة",
    lastName: "العنزي",
    rating: 5,
    gender: "female",
    text: "بصراحة كنت شاكك في الأول بس البوتات طلعت جاهزة ومظبوطة على الآخر، شكراً."
  },
  {
    firstName: "عبد الله",
    lastName: "العتيبي",
    rating: 5,
    gender: "male",
    text: "سهل التخصيص والـ n8n شغال بدون مشاكل، يستاهل كل ريال."
  },
  {
    firstName: "ميادة",
    lastName: "الشريف",
    rating: 5,
    gender: "female",
    text: "خدمة ممتازة وسريعة، الملف وصلني في دقيقة والشارح واضح جداً."
  },
  {
    firstName: "محمد",
    lastName: "الدوسري",
    rating: 5,
    gender: "male",
    text: "شغل محترم أوي وفر عليا وقت ومجهود كبير في الشغل اليومي."
  },
  {
    firstName: "ريم",
    lastName: "القحطاني",
    rating: 5,
    gender: "female",
    text: "ممتاز جداً ووفر عليّ تكلفة كبيرة كنت بدفعها شهرياً."
  },
  {
    firstName: "محمود",
    lastName: "الجندي",
    rating: 5,
    gender: "male",
    text: "البوت ممتاز وسهل التثبيت، والدعم متعاونين جداً في أي استفسار."
  },
  {
    firstName: "خالد",
    lastName: "سليمان",
    rating: 5,
    gender: "male",
    text: "أنصح فيه وبشدة، ريحني من صداع المتابعة اليدوية والربط سلس."
  }
];

async function seedReviewsIfEmpty(reviews: Review[]): Promise<Review[]> {
  try {
    const needOverwriting = reviews.length === 0 || reviews.some(r => 
      r.firstName === "شروق" || 
      r.firstName === "خالد" && r.lastName === "الدوسري" || 
      r.firstName === "المهندس" || 
      r.firstName === "أبو تميم"
    );
    
    if (!needOverwriting) return reviews;

    console.log("[Reviews API] Seeding realistic Gulf & Egyptian reviews into KV...");
    const { data: dbProducts } = await supabaseAdmin
      .from('products')
      .select('id')
      .neq('status', 'مخفي');

    if (!dbProducts || dbProducts.length === 0) return reviews;

    const seeded: Review[] = [];
    dbProducts.forEach((product, pIdx) => {
      // Seed 4 realistic reviews for each active product
      for (let i = 0; i < 4; i++) {
        const templateIdx = (pIdx * 4 + i) % realisticReviewsTemplates.length;
        const template = realisticReviewsTemplates[templateIdx];
        
        seeded.push({
          id: `seed-${product.id}-${i}`,
          productId: product.id,
          firstName: template.firstName,
          lastName: template.lastName,
          rating: template.rating,
          text: template.text,
          avatarUrl: "",
          gender: template.gender,
          isVerified: true,
          isHidden: false,
          createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString()
        });
      }
    });

    await setKV(REVIEWS_KEY, seeded);
    return seeded;
  } catch (err) {
    console.error("[Reviews API] Seeding failed:", err);
    return reviews;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  
  let reviews: Review[] = await getKV(REVIEWS_KEY) || [];
  reviews = await seedReviewsIfEmpty(reviews);
  
  if (productId) {
    // Public fetch: filter by productId and only show non-hidden
    const productReviews = reviews.filter(r => r.productId === productId && !r.isHidden);
    // Sort newest first
    productReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(productReviews);
  }
  
  // Admin fetch: sort newest first
  reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(reviews);
}

export async function POST(req: Request) {
  console.log("[Reviews API] POST Request Received");
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      console.log("[Reviews API] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newReview = await req.json();
    console.log("[Reviews API] Payload:", JSON.stringify(newReview));
    
    newReview.id = Date.now().toString();
    newReview.createdAt = new Date().toISOString();
    
    const reviews: Review[] = await getKV(REVIEWS_KEY) || [];
    reviews.push(newReview);
    
    console.log(`[Reviews API] Attempting to save ${reviews.length} reviews to KV Store...`);
    const success = await setKV(REVIEWS_KEY, reviews);
    
    if (success) {
      console.log("[Reviews API] Successfully saved review.");
      return NextResponse.json({ success: true, review: newReview });
    }
    
    console.log("[Reviews API] setKV returned false. Failed to save.");
    return NextResponse.json({ error: "فشل حفظ التقييم" }, { status: 500 });
  } catch (err: any) {
    console.error("[Reviews API] POST Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedReview = await req.json();
    const reviews: Review[] = await getKV(REVIEWS_KEY) || [];
    const index = reviews.findIndex(r => r.id === updatedReview.id);
    
    if (index === -1) return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
    
    reviews[index] = { ...reviews[index], ...updatedReview };
    const success = await setKV(REVIEWS_KEY, reviews);
    
    if (success) return NextResponse.json({ success: true, review: reviews[index] });
    return NextResponse.json({ error: "فشل تحديث التقييم" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID مطلوب" }, { status: 400 });

    let reviews: Review[] = await getKV(REVIEWS_KEY) || [];
    reviews = reviews.filter(r => r.id !== id);
    
    const success = await setKV(REVIEWS_KEY, reviews);
    if (success) return NextResponse.json({ success: true });
    return NextResponse.json({ error: "فشل حذف التقييم" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
