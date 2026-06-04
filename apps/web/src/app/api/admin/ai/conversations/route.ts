import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Check admin authentication
async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  return token === "authenticated";
}

// =========================
// GET ALL CONVERSATIONS
// =========================
export async function GET() {
  try {
    // Check admin access
    if (!(await checkAuth())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch conversations
    const { data, error } = await supabaseAdmin
      .from("ai_conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("GET conversations error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("GET conversations crash:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to fetch conversations",
      },
      { status: 500 }
    );
  }
}

// =========================
// CREATE CONVERSATION
// =========================
export async function POST(req: Request) {
  try {
    // Check admin access
    if (!(await checkAuth())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse body
    const body = await req.json().catch(() => ({}));

    const title =
      body?.title?.trim() || "محادثة استشارية جديدة";

    // Create conversation
    const { data, error } = await supabaseAdmin
      .from("ai_conversations")
      .insert([
        {
          title,
          messages: [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("POST conversation error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("POST conversation crash:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to create conversation",
      },
      { status: 500 }
    );
  }
}

// =========================
// DELETE CONVERSATION
// =========================
export async function DELETE(req: Request) {
  try {
    // Check admin access
    if (!(await checkAuth())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Delete conversation
    const { error } = await supabaseAdmin
      .from("ai_conversations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE conversation error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("DELETE conversation crash:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to delete conversation",
      },
      { status: 500 }
    );
  }
}