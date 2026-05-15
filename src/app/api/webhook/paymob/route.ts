import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyPaymobHmac } from "@/lib/paymob";
import { supabase } from "@/lib/supabase";
import { updateOrderStatus } from "@/lib/orders";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const hmac = searchParams.get("hmac");

    // 1. Verify HMAC for security
    if (body.obj) {
      const isValid = verifyPaymobHmac(
        body.obj,
        hmac || "",
        process.env.PAYMOB_HMAC_SECRET || "",
        true // POST request
      );

      if (!isValid) {
        console.error("Invalid HMAC signature from Paymob");
        return NextResponse.json({ error: "Verification failed" }, { status: 401 });
      }
    }

    const transaction = body.obj;
    const paymobOrderId = String(transaction.order.id);
    const isSuccess = transaction.success === true;

    // 2. Update Order Status in Supabase
    if (isSuccess) {
      await updateOrderStatus(paymobOrderId, "completed", transaction);
      
      // 3. Deliver Product
      const customerEmail = transaction.payment_key_claims.billing_data.email;
      const customerName = transaction.payment_key_claims.billing_data.first_name;
      
      // Fetch all products associated with this payment ID (for cart support)
      const { data: ordersData } = await supabase
        .from("orders")
        .select("product_id, product_title")
        .eq("payment_id", paymobOrderId);

      if (ordersData && ordersData.length > 0) {
        let emailHtml = `
            <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
              <h2 style="color: #ef0055;">شكراً لك ${customerName}!</h2>
              <p>تم تأكيد عملية الدفع بنجاح.</p>
              <p>يمكنك تحميل ملفاتك الآن عبر الروابط التالية:</p>
              <div style="margin: 30px 0; display: flex; flex-direction: column; gap: 15px;">
        `;

        const productTitles = [];

        for (const order of ordersData) {
          const { data: product } = await supabase
            .from("products")
            .select("file_url")
            .eq("id", order.product_id)
            .single();

          const downloadLink = product?.file_url || "https://youssefautomates.com/downloads";
          productTitles.push(order.product_title);
          
          emailHtml += `
            <div style="background: #fdf2f6; padding: 15px; border-radius: 8px; border: 1px solid #fce5ef;">
              <h3 style="margin-top: 0; color: #0f172a;">${order.product_title}</h3>
              <a href="${downloadLink}" style="display: inline-block; background-color: #ef0055; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">تحميل الملف</a>
            </div>
          `;
        }

        emailHtml += `
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">إذا واجهت أي مشكلة، يرجى الرد على هذا البريد الإلكتروني.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="text-align: center; color: #999; font-size: 12px;">&copy; ${new Date().getFullYear()} Youssef Automates. جميع الحقوق محفوظة.</p>
            </div>
        `;

        const joinedTitles = productTitles.length > 1 ? "طلبك المتعدد" : productTitles[0];

        // Send Email via Resend
        await resend.emails.send({
          from: "Youssef Automates <delivery@youssefautomates.com>",
          to: customerEmail,
          subject: `تم تأكيد طلبك بنجاح! - ${joinedTitles}`,
          html: emailHtml
        });
        
        console.log(`[Webhook] Success: Order ${paymobOrderId} completed and email sent to ${customerEmail} for ${ordersData.length} items.`);
      }
    } else {
      await updateOrderStatus(paymobOrderId, "failed", transaction);
      console.log(`[Webhook] Failed: Order ${paymobOrderId} marked as failed`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
