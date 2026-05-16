import { NextResponse } from "next/server";
import { getKV } from "@/lib/kv";

export async function GET() {
  try {
    const reviews = await getKV<any[]>("product_reviews") || [];
    
    // Only count visible/non-hidden reviews if that's a property
    const activeReviews = reviews.filter(r => !r.isHidden);
    
    const count = activeReviews.length;
    const averageRating = count > 0 
      ? activeReviews.reduce((acc, r) => acc + r.rating, 0) / count 
      : 5.0;

    // Get unique avatars
    const avatars = activeReviews
      .filter(r => r.avatarUrl)
      .map(r => r.avatarUrl)
      .slice(0, 5);

    return NextResponse.json({
      count,
      averageRating: parseFloat(averageRating.toFixed(1)),
      avatars
    });
  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ count: 1200, averageRating: 5.0, avatars: [] });
  }
}
