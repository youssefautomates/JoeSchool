import { NextResponse } from "next/server";
import { upsertSection, deleteSection } from "@/lib/coursesDb";

/**
 * POST /api/admin/curriculum/sections
 * Body: { id?, course_id, title, description?, sort_order? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, course_id, title, description, sort_order } = body;

    if (!course_id || !title) {
      return NextResponse.json({ success: false, error: "Course ID and Title are required" }, { status: 400 });
    }

    console.log(`[API_SECTIONS_POST] Upserting section: ${title} for course: ${course_id}`);
    const result = await upsertSection({
      id: id || undefined,
      course_id,
      title,
      description: description || "",
      sort_order: Number(sort_order) || 1
    });

    return NextResponse.json({ success: true, section: result });
  } catch (err: any) {
    console.error("[API_SECTIONS_POST] Exception:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/curriculum/sections
 * Query: ?id=...
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Section ID is required" }, { status: 400 });
    }

    console.log(`[API_SECTIONS_DELETE] Deleting section: ${id}`);
    const result = await deleteSection(id);

    return NextResponse.json({ success: result });
  } catch (err: any) {
    console.error("[API_SECTIONS_DELETE] Exception:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
