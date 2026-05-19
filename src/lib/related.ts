import { supabaseClient } from "./supabaseClient";
import { Product, fetchActiveProducts } from "./products";
import { LmsCourse, getCoursesList } from "./coursesDb";
import { fetchActiveBundles, HydratedBundle } from "./bundles";

export type RelatedItemType = "course" | "digital_product" | "bundle";

export interface RelatedItem {
  id: string;
  type: RelatedItemType;
  title: string;
  slug: string;
  description: string;
  price: number;
  original_price?: number | null;
  image_url?: string | null;
  category?: string | null;
  tags?: string[] | null;
  is_featured?: boolean;
  rating?: number;
  discount_pct?: number | null;
}

export async function fetchRelatedContent(
  sourceType: RelatedItemType,
  sourceId: string,
  limit: number = 4
): Promise<RelatedItem[]> {
  try {
    const { data: manualData, error: manualError } = await supabaseClient
      .from("related_content_mapping")
      .select("*")
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .order("relevance_score", { ascending: false });

    const [coursesRes, productsRes, bundlesRes] = await Promise.all([
      getCoursesList().then((data) => data.filter(c => c.status === "published")),
      fetchActiveProducts({ limit: 100 }).then(({ products }) => products),
      fetchActiveBundles().then(({ bundles }) => bundles),
    ]);

    const allCourses = coursesRes;
    const allProducts = productsRes;
    const allBundles = bundlesRes;

    const courseMap = new Map(allCourses.map(c => [c.id, c]));
    const productMap = new Map(allProducts.map(p => [p.id, p]));
    const bundleMap = new Map(allBundles.map(b => [b.id, b]));

    let sourceCategory = "";
    let sourceTags: string[] = [];

    if (sourceType === "course") {
      const src = courseMap.get(sourceId);
      if (src) {
        sourceCategory = src.category || "";
        sourceTags = src.tags || [];
      }
    } else if (sourceType === "digital_product") {
      const src = productMap.get(sourceId);
      if (src) {
        sourceCategory = src.category || "";
        sourceTags = src.tags || [];
      }
    } else if (sourceType === "bundle") {
      const src = bundleMap.get(sourceId);
      if (src) {
        sourceCategory = "أخرى";
        sourceTags = [];
      }
    }

    const recommendations: Map<string, { item: RelatedItem; score: number }> = new Map();

    if (!manualError && manualData && manualData.length > 0) {
      for (const map of manualData) {
        if (map.target_type === "course" && courseMap.has(map.target_id)) {
          const c = courseMap.get(map.target_id)!;
          recommendations.set(`course:${c.id}`, {
            item: {
              id: c.id,
              type: "course",
              title: c.title,
              slug: c.slug,
              description: c.short_description || c.description,
              price: c.price,
              original_price: c.original_price,
              image_url: c.image_url,
              category: c.category,
              tags: c.tags,
              is_featured: c.is_featured,
            },
            score: 10.0 + (map.relevance_score || 1.0),
          });
        } else if (map.target_type === "digital_product" && productMap.has(map.target_id)) {
          const p = productMap.get(map.target_id)!;
          recommendations.set(`product:${p.id}`, {
            item: {
              id: p.id,
              type: "digital_product",
              title: p.title,
              slug: p.slug,
              description: p.short_description || p.description,
              price: p.price,
              original_price: p.original_price,
              image_url: p.image_url,
              category: p.category,
              tags: p.tags,
              is_featured: p.is_featured,
            },
            score: 10.0 + (map.relevance_score || 1.0),
          });
        } else if (map.target_type === "bundle" && bundleMap.has(map.target_id)) {
          const b = bundleMap.get(map.target_id)!;
          recommendations.set(`bundle:${b.id}`, {
            item: {
              id: b.id,
              type: "bundle",
              title: b.title,
              slug: b.slug,
              description: b.short_description || b.description,
              price: b.price,
              original_price: b.original_price,
              image_url: b.image_url,
              category: "حزمة عروض",
              is_featured: b.is_featured,
            },
            score: 10.0 + (map.relevance_score || 1.0),
          });
        }
      }
    }

    for (const c of allCourses) {
      if (sourceType === "course" && c.id === sourceId) continue;
      if (recommendations.has(`course:${c.id}`)) continue;

      let score = 0;
      if (c.category && sourceCategory && c.category.toLowerCase() === sourceCategory.toLowerCase()) {
        score += 3.0;
      }
      if (c.tags && sourceTags.length > 0) {
        const overlap = c.tags.filter(t => sourceTags.map(st => st.toLowerCase()).includes(t.toLowerCase())).length;
        score += overlap * 1.5;
      }
      if (c.is_featured) score += 1.0;

      if (score > 0) {
        recommendations.set(`course:${c.id}`, {
          item: {
            id: c.id,
            type: "course",
            title: c.title,
            slug: c.slug,
            description: c.short_description || c.description,
            price: c.price,
            original_price: c.original_price,
            image_url: c.image_url,
            category: c.category,
            tags: c.tags,
            is_featured: c.is_featured,
          },
          score,
        });
      }
    }

    for (const p of allProducts) {
      if (sourceType === "digital_product" && p.id === sourceId) continue;
      if (recommendations.has(`product:${p.id}`)) continue;

      let score = 0;
      if (p.category && sourceCategory && p.category.toLowerCase() === sourceCategory.toLowerCase()) {
        score += 3.0;
      }
      if (p.tags && sourceTags.length > 0) {
        const overlap = p.tags.filter(t => sourceTags.map(st => st.toLowerCase()).includes(t.toLowerCase())).length;
        score += overlap * 1.5;
      }
      if (p.is_featured) score += 1.0;

      if (score > 0) {
        recommendations.set(`product:${p.id}`, {
          item: {
            id: p.id,
            type: "digital_product",
            title: p.title,
            slug: p.slug,
            description: p.short_description || p.description,
            price: p.price,
            original_price: p.original_price,
            image_url: p.image_url,
            category: p.category,
            tags: p.tags,
            is_featured: p.is_featured,
          },
          score,
        });
      }
    }

    for (const b of allBundles) {
      if (sourceType === "bundle" && b.id === sourceId) continue;
      if (recommendations.has(`bundle:${b.id}`)) continue;

      let score = 0;
      const containsRelatedCategory = b.items.some(it => {
        const itemCat = it.item_type === "course" ? it.course?.category : it.product?.category;
        return itemCat && sourceCategory && itemCat.toLowerCase() === sourceCategory.toLowerCase();
      });

      if (containsRelatedCategory) score += 2.0;
      if (b.is_featured) score += 1.0;

      if (score > 0) {
        recommendations.set(`bundle:${b.id}`, {
          item: {
            id: b.id,
            type: "bundle",
            title: b.title,
            slug: b.slug,
            description: b.short_description || b.description,
            price: b.price,
            original_price: b.original_price,
            image_url: b.image_url,
            category: "حزمة عروض",
            is_featured: b.is_featured,
          },
          score,
        });
      }
    }

    let sortedList = Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

    if (sortedList.length < limit) {
      const addedIds = new Set(sortedList.map(it => `${it.type}:${it.id}`));

      for (const c of allCourses) {
        if (c.id === sourceId && sourceType === "course") continue;
        if (sortedList.length >= limit) break;
        if (!addedIds.has(`course:${c.id}`)) {
          sortedList.push({
            id: c.id,
            type: "course",
            title: c.title,
            slug: c.slug,
            description: c.short_description || c.description,
            price: c.price,
            original_price: c.original_price,
            image_url: c.image_url,
            category: c.category,
            tags: c.tags,
            is_featured: c.is_featured,
          });
          addedIds.add(`course:${c.id}`);
        }
      }

      for (const p of allProducts) {
        if (p.id === sourceId && sourceType === "digital_product") continue;
        if (sortedList.length >= limit) break;
        if (!addedIds.has(`product:${p.id}`)) {
          sortedList.push({
            id: p.id,
            type: "digital_product",
            title: p.title,
            slug: p.slug,
            description: p.short_description || p.description,
            price: p.price,
            original_price: p.original_price,
            image_url: p.image_url,
            category: p.category,
            tags: p.tags,
            is_featured: p.is_featured,
          });
          addedIds.add(`product:${p.id}`);
        }
      }
    }

    return sortedList.slice(0, limit);
  } catch (err: any) {
    console.error("fetchRelatedContent error:", err);
    return [];
  }
}
