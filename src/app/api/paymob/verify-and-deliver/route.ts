import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { persistSession: false },
  }
);

/**
 * POST /api/paymob/verify-and-deliver
 * 
 * Verifies payment directly with Paymob API and delivers the product.
 * Used as a fallback or immediate fulfillment on the success page.
 */
export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[VERIFY][${requestId}] Verifying transaction...`);

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    console.log(`[VERIFY][${requestId}] Internal Order ID: ${orderId}`);

    // 1. Fetch order from Supabase
    const { data: orders, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId);

    if (orderError || !orders || orders.length === 0) {
      console.error(`[VERIFY][${requestId}] ❌ Order not found in DB`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orders[0];

    // Check if already completed
    if (order.status === "completed") {
      console.log(`[VERIFY][${requestId}] ✅ Order already marked as completed. Skipping verification.`);
      return NextResponse.json({ 
        success: true, 
        alreadyDelivered: true,
        productTitle: order.product_title,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        orderValue: order.amount,
        currency: order.currency,
        downloadToken: order.id
      });
    }

    const paymobPaymentId = order.payment_id;
    if (!paymobPaymentId || paymobPaymentId === "PENDING") {
      console.warn(`[VERIFY][${requestId}] ⚠️ Payment not initiated or pending in DB`);
      return NextResponse.json({ error: "Payment not initiated yet", status: "pending" }, { status: 200 });
    }

    // 2. Authenticate with Paymob
    const apiKey = process.env.PAYMOB_API_KEY;
    if (!apiKey) throw new Error("PAYMOB_API_KEY is missing");

    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const authData = await authRes.json();
    const authToken = authData.token;

    // 3. Fetch order status from Paymob
    console.log(`[VERIFY][${requestId}] 🔍 Checking Paymob Order: ${paymobPaymentId}...`);
    const txnRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobPaymentId}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
    });
    
    const paymobOrder = await txnRes.json();
    
    let isPaymentSuccessful = false;
    let transactionId = "";
    let amountCents = 0;

    // Try to find a successful transaction in the order's transactions list
    const txnListRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobPaymentId}/transactions`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
    });

    if (txnListRes.ok) {
      const transactions = await txnListRes.json();
      if (Array.isArray(transactions)) {
        const successfulTxn = transactions.find((t: any) => t.success === true);
        if (successfulTxn) {
          isPaymentSuccessful = true;
          transactionId = successfulTxn.id;
          amountCents = successfulTxn.amount_cents;
          console.log(`[VERIFY][${requestId}] ✅ Successful transaction found: ${transactionId}`);
        }
      }
    }

    if (!isPaymentSuccessful && paymobOrder.paid_amount_cents > 0) {
      isPaymentSuccessful = true;
      amountCents = paymobOrder.paid_amount_cents;
      transactionId = paymobOrder.id;
      console.log(`[VERIFY][${requestId}] ✅ Order marked as paid in Paymob: ${amountCents} cents`);
    }

    if (!isPaymentSuccessful) {
      console.warn(`[VERIFY][${requestId}] ⏳ Payment not yet confirmed by Paymob`);
      return NextResponse.json({ success: false, status: "pending", message: "Payment not confirmed" });
    }

    // 4. Update order in Supabase
    console.log(`[VERIFY][${requestId}] 🔄 Updating DB status to completed...`);
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ 
        status: "completed"
      })
      .eq("id", orderId);

    if (updateError) {
      console.error(`[VERIFY][${requestId}] ❌ Update Error:`, updateError);
    } else {
      console.log(`[VERIFY][${requestId}] ✅ DB Updated`);
    }

    // 5. Update Product Sales
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("title, sales, category, tags, file_url")
      .eq("id", order.product_id)
      .single();

    if (product) {
      await supabaseAdmin
        .from("products")
        .update({ sales: (product.sales || 0) + 1 })
        .eq("id", order.product_id);
      console.log(`[VERIFY][${requestId}] 📈 Product sales incremented`);
      
      // Auto-enroll customer in LMS Course if purchased
      const isCourse = 
        product.category === "courses" || 
        product.category === "الدورات التعليمية" || 
        product.category === "الدورات التدريبية" ||
        order.product_title?.includes("دورة") || 
        order.product_title?.includes("كورس");

      if (isCourse) {
        console.log(`[VERIFY][${requestId}] 🎓 Detected Course Purchase! Proceeding to auto-enroll...`);
        try {
          const { getCoursesList, enrollUser } = await import("@/lib/coursesDb");
          const coursesList = await getCoursesList();
          
          // Match course by title or category
          const matchedCourse = coursesList.find(c => 
            c.title.toLowerCase().includes(order.product_title?.toLowerCase()) || 
            order.product_title?.toLowerCase().includes(c.title.toLowerCase())
          ) || coursesList[0];

          if (matchedCourse) {
            // Retrieve customer's Supabase User ID from profiles
            let userId = order.customer_id;
            if (!userId || userId === "anonymous") {
              const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("email", order.customer_email)
                .maybeSingle();
              
              userId = profile?.id || "usr-student-" + Math.random().toString(36).substring(2, 11);
            }

            console.log(`[VERIFY][${requestId}] 🎓 Auto-enrolling user ${userId} in course: ${matchedCourse.title}`);
            await enrollUser(userId, matchedCourse.id, {
              email: order.customer_email,
              name: order.customer_name
            });
          }
        } catch (enrollErr) {
          console.error(`[VERIFY][${requestId}] ❌ Auto-enrollment error:`, enrollErr);
        }
      }
    }

    // 6. Build and send email (Fallback if webhook failed or is slow)
    const downloadToken = order.id;
    const downloadLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/download?token=${downloadToken}`;
    const amountPaid = (amountCents / 100).toFixed(2);

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#050505;color:#ffffff;direction:rtl;">
  <div style="max-width:600px;margin:20px auto;background-color:#0a0a0a;border-radius:20px;padding:40px;border:1px solid #1a1a1a;">
    <h1 style="text-align:center;">مبروك! 🎉</h1>
    <p style="text-align:center;color:#a1a1aa;">تم تأكيد طلبك للمنتج: <b>${order.product_title}</b></p>
    <div style="margin:30px 0;text-align:center;">
      <a href="${downloadLink}" style="background-color:#ef0055;color:#fff;padding:15px 30px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">تحميل المنتج الآن ⬇</a>
    </div>
    <div style="border-top:1px solid #1a1a1a;padding-top:20px;color:#555;font-size:12px;">
      <p>رقم الطلب: ${orderId}</p>
      <p>المبلغ: ${amountPaid} EGP</p>
    </div>
  </div>
</body>
</html>`.trim();

    try {
      console.log(`[VERIFY][${requestId}] 📧 Sending email to ${order.customer_email}...`);
      await resend.emails.send({
        from: "Youssef Automates <delivery@youssefautomates.com>",
        to: order.customer_email,
        subject: `🎉 طلبك جاهز! ${order.product_title} - Youssef Automates`,
        html: emailHtml,
      });
      console.log(`[VERIFY][${requestId}] 📧 Email sent`);
    } catch (e) {
      console.error(`[VERIFY][${requestId}] 📧 Resend Error:`, e);
    }

    return NextResponse.json({ 
      success: true, 
      productTitle: order.product_title,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      orderValue: amountPaid,
      currency: "EGP",
      downloadToken: downloadToken,
      downloadUrl: product?.file_url ? downloadLink : null,
      category: product?.category || null,
      tags: product?.tags || null
    });

  } catch (error: any) {
    console.error(`[VERIFY][${requestId}] 💥 ERROR:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
