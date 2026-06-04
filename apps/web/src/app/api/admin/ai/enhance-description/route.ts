import { NextRequest, NextResponse } from "next/server";
import { askAI } from "@/ai/providers/openrouter";

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();

    if (!description || description.trim() === "") {
      return NextResponse.json({ error: "الوصف فارغ" }, { status: 400 });
    }

    const prompt = `أنت خبير تسويق إلكتروني ومصمم نصوص محترف (Copywriter).
مهمتك هي تحسين وصف الكورس التالي ليصبح جذاباً تسويقياً، احترافياً، ومنسقاً بصيغة HTML (بدون استخدام markdown tags مثل \`\`\`html).
استخدم وسوم مثل <strong>، <p>، <ul>، <li>، و <br> لتقسيم النص بطريقة مريحة للعين.
ركز على إبراز فوائد الكورس، حل مشاكل العميل، وزيادة معدل التحويل (Conversion Rate).
لا تضف أي مقدمات أو خاتمات، فقط قم بإرجاع الكود المنسق ليكون جاهزاً للعرض المباشر في المحرر.

الوصف الحالي:
${description}
`;

    const enhancedDescription = await askAI(prompt);

    return NextResponse.json({
      success: true,
      enhancedDescription: enhancedDescription.trim(),
    });
  } catch (error: any) {
    console.error("AI Enhance Error:", error);
    return NextResponse.json(
      { success: false, error: "فشل تحسين الوصف بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
