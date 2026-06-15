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
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; direction: rtl; }
          </style>
        </head>
        <body style="margin:0;padding:0;background-color:#f5f7fa;direction:rtl;font-family:'Segoe UI', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:30px 0;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:20px;overflow:hidden;border: 1px solid #e2e8f0;box-shadow: 0 10px 30px rgba(0,0,0,0.025);">
                  <!-- Header -->
                  <tr>
                    <td style="padding:30px 24px;text-align:center;background-color:#050505;border-bottom:4px solid #D6004B;">
                      <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.joeschool.com'}/logo-email.png" alt="JoeSchool Logo" style="height: 40px; display: block; margin: 0 auto 12px auto;" />
                      <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; font-family: 'Segoe UI', Arial, sans-serif;">رسالة تواصل جديدة ✉️</h2>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:32px 24px; text-align: right; direction: rtl;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcfcfd; border-radius: 16px; border: 1px solid #eef2f6; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; font-family: 'Segoe UI', Arial, sans-serif;"><strong>الاسم المرسل:</strong></td>
                          <td style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold;">${name}</td>
                        </tr>
                        <tr>
                          <td style="padding: 16px 20px; font-size: 13px; color: #475569; font-family: 'Segoe UI', Arial, sans-serif;"><strong>البريد الإلكتروني:</strong></td>
                          <td style="padding: 16px 20px; font-size: 13px; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; text-align: left;" dir="ltr">${email}</td>
                        </tr>
                      </table>
                      
                      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif;">📝 نص الرسالة:</h3>
                      <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6; color: #334155; font-family: 'Segoe UI', Arial, sans-serif; min-height: 100px;">
                        ${message.replace(/\n/g, '<br/>')}
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding:24px;text-align:center;background-color:#f8fafc;border-top: 1px solid #e2e8f0;">
                      <p style="color:#64748b;font-size:11px;margin:0;font-family: 'Segoe UI', Arial, sans-serif;">هذا البريد مرسل تلقائياً من نظام إدارة اتصالات JoeSchool.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
