import { NextResponse } from "next/server";
import { askAI } from "@/ai/providers/openrouter";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const reply = await askAI(body.message);

        return NextResponse.json({
            success: true,
            reply,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: "AI request failed",
            },
            { status: 500 }
        );
    }
}