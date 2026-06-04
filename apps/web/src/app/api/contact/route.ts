import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: "JoeSchool <onboarding@resend.dev>",
      to: process.env.ADMIN_EMAIL || "admin@joeschool.com",
      subject: `رسالة جديدة من: ${name}`,
      replyTo: email,
      html: `
        <div style="font-family: sans-serif; direction: rtl; text-align: right; padding: 20px; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #D6004B;">رسالة تواصل جديدة</h2>
          <p><strong>الاسم:</strong> ${name}</p>
          <p><strong>البريد الإلكتروني:</strong> ${email}</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p><strong>الرسالة:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
            ${message.replace(/\n/g, '<br/>')}
          </div>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
