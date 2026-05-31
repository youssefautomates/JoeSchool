import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// ── 1. Read Environment Variables from .env.local ───────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local file not found at " + envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const parts = trimmed.split("=");
  const key = parts[0].trim();
  const value = parts.slice(1).join("=").trim();
  env[key] = value;
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const hmacSecret = env.PAYMOB_HMAC_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !hmacSecret) {
  console.error("❌ Missing required keys in .env.local", { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey, hmacSecret: !!hmacSecret });
  process.exit(1);
}

console.log("🚀 Environment loaded successfully!");
console.log("Supabase URL:", supabaseUrl);
console.log("PAYMOB_HMAC_SECRET:", hmacSecret);

// ── 2. Initialize Supabase Client ─────────────────────────────────
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
  try {
    // A. Fetch a course or product to create a test order
    console.log("\n🔍 Fetching a course/product from Database...");
    const { data: products, error: pErr } = await supabase.from("products").select("*").limit(1);
    if (pErr || !products || products.length === 0) {
      console.error("❌ No products/courses found in DB to link with order");
      return;
    }
    const product = products[0];
    console.log(`✅ Using Product: "${product.title}" (ID: ${product.id})`);

    // B. Create a new test pending order
    console.log("\n➕ Creating a new test order in DB...");
    const orderId = crypto.randomUUID(); // MUST BE A VALID UUID
    const paymobOrderId = Math.floor(100000 + Math.random() * 900000); // Mock Paymob order ID
    
    const { data: order, error: oErr } = await supabase.from("orders").insert({
      id: orderId,
      product_id: product.id,
      product_title: product.title,
      amount: product.price || 49,
      currency: "USD",
      status: "pending",
      payment_id: String(paymobOrderId),
      customer_name: "أحمد المطور التجريبي",
      customer_email: "test-student@joeschool.com",
      created_at: new Date().toISOString()
    }).select().single();

    if (oErr || !order) {
      console.error("❌ Failed to create pending test order:", oErr);
      return;
    }
    console.log(`✅ Test order created successfully! Order ID: ${order.id} | Paymob Link ID: ${order.payment_id}`);

    // C. Construct Mock Paymob webhook POST payload
    console.log("\n📦 Constructing mock Paymob Transaction payload...");
    const transactionId = Math.floor(10000000 + Math.random() * 90000000);
    const createdAt = new Date().toISOString();
    
    const transactionObj = {
      id: transactionId,
      pending: false,
      success: true,
      amount_cents: Math.round(order.amount * 100),
      currency: "EGP",
      created_at: createdAt,
      error_occured: false,
      has_parent_transaction: false,
      integration_id: 12345,
      is_3d_secure: true,
      is_auth: false,
      is_capture: false,
      is_refunded: false,
      is_standalone_payment: true,
      is_voided: false,
      owner: 9999,
      source_data: {
        pan: "0000",
        sub_type: "Visa",
        type: "card"
      },
      payment_key_claims: {
        billing_data: {
          first_name: "أحمد",
          last_name: "المطور",
          email: "test-student@joeschool.com"
        }
      },
      order: {
        id: paymobOrderId,
        merchant_order_id: `store-${order.id}`,
        extras: {
          supabase_order_id: order.id,
          source: "store"
        }
      }
    };

    // D. Compute HMAC-SHA512
    console.log("\n🔑 Computing HMAC signature...");
    const fields = [
      String(transactionObj.amount_cents),
      String(transactionObj.created_at),
      String(transactionObj.currency),
      String(transactionObj.error_occured),
      String(transactionObj.has_parent_transaction),
      String(transactionObj.id),
      String(transactionObj.integration_id),
      String(transactionObj.is_3d_secure),
      String(transactionObj.is_auth),
      String(transactionObj.is_capture),
      String(transactionObj.is_refunded),
      String(transactionObj.is_standalone_payment),
      String(transactionObj.is_voided),
      String(transactionObj.order.id),
      String(transactionObj.owner),
      String(transactionObj.pending),
      String(transactionObj.source_data.pan),
      String(transactionObj.source_data.sub_type),
      String(transactionObj.source_data.type),
      String(transactionObj.success)
    ];

    const concatenatedString = fields.join("");
    const computedHmac = crypto
      .createHmac("sha512", hmacSecret)
      .update(concatenatedString)
      .digest("hex");

    console.log("Calculated HMAC:", computedHmac);

    // E. Send POST request to Local Webhook Route
    const webhookUrl = `http://localhost:3000/api/paymob/webhook?hmac=${computedHmac}`;
    console.log(`\n📡 Sending mock transaction to webhook: ${webhookUrl}`);
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obj: transactionObj })
    });

    console.log("Response Status:", response.status);
    const respBody = await response.json();
    console.log("Response Body:", respBody);

    // F. Verify DB Updates
    console.log("\n📊 Verifying DB changes...");
    const { data: updatedOrder } = await supabase.from("orders").select("*").eq("id", order.id).single();
    console.log("Full Updated Order Row from DB:", updatedOrder);

    if (updatedOrder.status === "completed") {
      console.log("\n🎉 SUCCESS! Webhook correctly processed order, verified HMAC, updated the database status, and processed dynamic delivery!");
    } else {
      console.error("\n❌ FAILED! Order is still pending. Check local NextJS console logs.");
    }

  } catch (error) {
    console.error("❌ Exception during test execution:", error);
  }
}

runTest();
