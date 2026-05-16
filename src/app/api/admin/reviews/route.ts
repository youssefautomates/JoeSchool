import { NextResponse } from "next/server";
import { getKV, setKV } from "@/lib/kv";
import { cookies } from "next/headers";

const REVIEWS_KEY = "product_reviews";

export interface Review {
  id: string;
  productId: string;
  firstName: string;
  lastName: string;
  rating: number;
  text: string;
  avatarUrl: string;
  isVerified: boolean;
  isHidden: boolean;
  createdAt: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  
  const reviews: Review[] = await getKV(REVIEWS_KEY) || [];
  
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
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newReview = await req.json();
    newReview.id = Date.now().toString();
    newReview.createdAt = new Date().toISOString();
    
    const reviews: Review[] = await getKV(REVIEWS_KEY) || [];
    reviews.push(newReview);
    
    const success = await setKV(REVIEWS_KEY, reviews);
    if (success) return NextResponse.json({ success: true, review: newReview });
    return NextResponse.json({ error: "فشل حفظ التقييم" }, { status: 500 });
  } catch (err: any) {
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
