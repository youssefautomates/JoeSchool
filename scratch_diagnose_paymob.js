const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const paymobOrderId = "531453221";

async function run() {
  console.log("=== 1. DIAGNOSING SUPABASE DB ORDERS ===");
  
  // A. Search by payment_id
  console.log(`Searching orders by payment_id = '${paymobOrderId}'...`);
  const { data: byPaymentId, error: err1 } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_id", paymobOrderId);
  
  console.log("byPaymentId results:", byPaymentId);
  if (err1) console.error("Error err1:", err1);

  // B. Get 5 most recent orders in Supabase to see what payment_ids they have
  console.log("\nFetching 5 most recent orders...");
  const { data: recentOrders, error: err2 } = await supabase
    .from("orders")
    .select("id, status, payment_id, customer_email, product_title, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  
  console.log("Recent orders:", recentOrders);
  if (err2) console.error("Error err2:", err2);

  console.log("\n=== 2. DIAGNOSING PAYMOB API ===");
  try {
    const apiKey = process.env.PAYMOB_API_KEY;
    if (!apiKey) throw new Error("PAYMOB_API_KEY is missing from env");

    console.log("Authenticating with Paymob...");
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!authRes.ok) {
      throw new Error(`Paymob auth failed: ${authRes.status} ${await authRes.text()}`);
    }
    const authData = await authRes.json();
    const authToken = authData.token;
    console.log("Paymob authenticated successfully.");

    console.log(`\nFetching order ${paymobOrderId} from Paymob Classic API...`);
    const orderRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobOrderId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    });
    console.log(`Order status: ${orderRes.status}`);
    if (orderRes.ok) {
      const paymobOrder = await orderRes.json();
      console.log("Paymob Order data:", JSON.stringify(paymobOrder, null, 2));
    } else {
      console.error("Order details fetch failed:", await orderRes.text());
    }

    console.log(`\nFetching transactions list for order ${paymobOrderId}...`);
    const txnListRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobOrderId}/transactions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    });
    console.log(`Transactions HTTP status: ${txnListRes.status}`);
    if (txnListRes.ok) {
      const transactions = await txnListRes.json();
      console.log("Transactions data:", JSON.stringify(transactions, null, 2));
    } else {
      console.error("Transactions list fetch failed:", await txnListRes.text());
    }

    console.log(`\nFetching Intention pi_live_b333d0bc0b764b9e94592aa7263a7152...`);
    const secretKey = process.env.PAYMOB_SECRET_KEY;
    const intentionRes = await fetch(`https://accept.paymob.com/v1/intention/pi_live_b333d0bc0b764b9e94592aa7263a7152/`, {
      method: "GET",
      headers: {
        "Authorization": `Token ${secretKey}`
      }
    });
    console.log(`Intention status code: ${intentionRes.status}`);
    if (intentionRes.ok) {
      const intentionData = await intentionRes.json();
      console.log("Intention response data:", JSON.stringify(intentionData, null, 2));
    } else {
      console.error("Intention fetch failed:", await intentionRes.text());
    }

    console.log("\n=== 3. SELF-HEALING: RESYNCING PENDING ORDERS ===");
    const { data: pendingOrders, error: pendingErr } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending");

    if (pendingErr) {
      console.error("Error fetching pending orders:", pendingErr);
    } else {
      console.log(`Found ${pendingOrders.length} pending orders to check.`);
      for (const order of pendingOrders) {
        console.log(`Checking pending order ${order.id} | Email: ${order.customer_email} | PaymentId: ${order.payment_id}...`);
        
        let isPaid = false;
        
        // Try Intention check
        if (order.payment_id && order.payment_id.startsWith("pi_")) {
          try {
            const intRes = await fetch(`https://accept.paymob.com/v1/intention/${order.payment_id}/`, {
              method: "GET",
              headers: { "Authorization": `Token ${secretKey}` }
            });
            if (intRes.ok) {
              const intData = await intRes.json();
              if (intData.status === "PAID" || intData.confirmed === true) {
                isPaid = true;
                console.log(`  -> Intention confirms PAID!`);
              } else if (intData.payment_methods) {
                for (const pm of intData.payment_methods) {
                  if (pm.status === "PAID" || pm.confirmed === true) {
                    isPaid = true;
                    console.log(`  -> Intention PM confirms PAID!`);
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.warn(`  -> Intention check error:`, e.message);
          }
        }
        
        // If not matched, try to look up classic order using matching criteria
        if (!isPaid && order.customer_email) {
          try {
            if (order.payment_id && /^\d+$/.test(order.payment_id)) {
              const ordRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${order.payment_id}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${authToken}` }
              });
              if (ordRes.ok) {
                const ordData = await ordRes.json();
                if (ordData.payment_status === "PAID" || ordData.paid_amount_cents > 0) {
                  isPaid = true;
                  console.log(`  -> Classic Order confirms PAID!`);
                }
              }
            }
            
            // Special manual resolution for known student Boody X (abdo.ibraheem.plaer@gmail.com)
            if (order.customer_email.toLowerCase().trim() === "abdo.ibraheem.plaer@gmail.com") {
              isPaid = true;
              console.log(`  -> Special match for Boody X!`);
            }
          } catch (e) {
            console.warn(`  -> Classic check error:`, e.message);
          }
        }

        if (isPaid) {
          console.log(`  -> UPDATE: Marking order ${order.id} as completed in Supabase...`);
          const { error: updErr } = await supabase
            .from("orders")
            .update({ status: "completed" })
            .eq("id", order.id);
          
          if (updErr) {
            console.error(`  -> Failed to update order ${order.id}:`, updErr);
          } else {
            console.log(`  -> Successfully updated order ${order.id} to completed!`);
          }
        }
      }
    }

  } catch (err) {
    console.error("Paymob API error:", err);
  }
}

run();
