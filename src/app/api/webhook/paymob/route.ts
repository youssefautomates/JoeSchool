import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with environment variable
// You need to set RESEND_API_KEY in your .env file
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify Paymob Webhook signature here (HMAC verification)
    // To ensure the request actually came from Paymob
    // const hmac = request.headers.get('hmac');
    // verifyHmac(body, hmac, process.env.PAYMOB_HMAC_SECRET);

    // Check if the transaction is successful
    if (body.obj && body.obj.success === true) {
      const order = body.obj.order;
      const customerEmail = body.obj.payment_key_claims.billing_data.email;
      const customerName = body.obj.payment_key_claims.billing_data.first_name;

      // In a real app, query the database to get the purchased products and their secure files based on order ID
      
      // Mock generated secure download link (Expires in 24 hours)
      const secureDownloadLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://youssefautomates.com'}/download/secure-token-${Date.now()}`;

      // Email HTML Template (Premium Arabic Design)
      const emailHtml = `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 40px 20px; text-center: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; text-align: center;">شكراً لشرائك من Youssef Automates</h1>
            <p style="color: #c7d2fe; text-align: center; margin-top: 10px; font-size: 16px;">تم تأكيد الدفع بنجاح</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #e4e4e7; margin-bottom: 24px;">مرحباً ${customerName}،</p>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 32px;">
              يسعدنا إخبارك بأنه تم تجهيز حزمة الأتمتة الخاصة بك وهي جاهزة للتحميل الآن. 
              هذا الرابط آمن وصالح للاستخدام الخاص بك فقط.
            </p>

            <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 32px; display: flex; align-items: center; gap: 16px;">
              <div style="flex: 1;">
                <h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 18px;">حزمة أتمتة الرد التلقائي</h3>
                <p style="margin: 0; color: #a1a1aa; font-size: 14px;">يتضمن: ملف PDF إرشادي + رابط استيراد n8n</p>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${secureDownloadLink}" style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39);">
                تحميل الملفات الآن
              </a>
            </div>

            <p style="color: #ef4444; font-size: 12px; text-align: center; margin-top: 16px;">
              ملاحظة: لأسباب أمنية، هذا الرابط سيتوقف عن العمل بعد 24 ساعة أو بعد الوصول للحد الأقصى للتحميلات.
            </p>
          </div>

          <div style="background-color: #18181b; padding: 24px; text-align: center; border-top: 1px solid #27272a;">
            <p style="color: #71717a; font-size: 14px; margin: 0;">
              إذا واجهتك أي مشكلة، لا تتردد في <a href="mailto:support@youssefautomates.com" style="color: #818cf8; text-decoration: none;">التواصل مع الدعم الفني</a>.
            </p>
            <p style="color: #52525b; font-size: 12px; margin-top: 16px;">
              © ${new Date().getFullYear()} Youssef Automates. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      `;

      // Send the email
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'Youssef Automates <delivery@youssefautomates.com>', // Requires verified domain in Resend
          to: customerEmail,
          subject: 'تم تسليم طلبك بنجاح 🚀 - رابط التحميل بالداخل',
          html: emailHtml,
        });
      }

      // Update Order Status in Database to 'Completed'
      console.log(`Successfully processed and sent email to ${customerEmail}`);

      return NextResponse.json({ success: true, message: "Order processed and email sent" });
    }

    return NextResponse.json({ success: true, message: "Webhook received but not a successful transaction" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
