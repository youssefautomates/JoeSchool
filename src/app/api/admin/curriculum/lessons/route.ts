import { NextResponse } from "next/server";
import { upsertLesson, deleteLesson } from "@/lib/coursesDb";

/**
 * POST /api/admin/curriculum/lessons
 * Body: Partial<LmsLesson> & { section_id: string; title: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, section_id, title, slug, video_url, content, duration_seconds, sort_order, is_preview, lecture_type, attachment_url, attachment_name, external_link } = body;

    if (!section_id || !title) {
      return NextResponse.json({ success: false, error: "Section ID and Title are required" }, { status: 400 });
    }

    console.log(`[API_LESSONS_POST] Upserting lesson: ${title} for section: ${section_id}`);
    const result = await upsertLesson({
      id: id || undefined,
      section_id,
      title,
      slug: slug || undefined,
      video_url: video_url || "",
      content: content || "",
      duration_seconds: Number(duration_seconds) || 0,
      sort_order: Number(sort_order) || 1,
      is_preview: Boolean(is_preview),
      lecture_type: lecture_type || "video",
      attachment_url: attachment_url || undefined,
      attachment_name: attachment_name || undefined,
      external_link: external_link || undefined
    });

    return NextResponse.json({ success: true, lesson: result });
  } catch (err: any) {
    console.error("[API_LESSONS_POST] Exception:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/curriculum/lessons
 * Query: ?id=...
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Lesson ID is required" }, { status: 400 });
    }

    console.log(`[API_LESSONS_DELETE] Deleting lesson: ${id}`);
    const result = await deleteLesson(id);

    return NextResponse.json({ success: result });
  } catch (err: any) {
    console.error("[API_LESSONS_DELETE] Exception:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
