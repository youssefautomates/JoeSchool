const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local manually
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const telegramToken = env.TELEGRAM_BOT_TOKEN;
const telegramChatId = env.TELEGRAM_CHAT_ID;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramChatId,
      text: message,
      parse_mode: 'HTML'
    })
  });
  const data = await res.json();
  return data;
}

async function run() {
  const ORDER_ID = 'ddde4ebe-d803-4378-aa24-384f1c41e277';
  const UNIQUE_PAYMENT_ID = `FREE-${ORDER_ID}`;
  
  console.log(`Fixing order ${ORDER_ID}...`);
  console.log(`Setting payment_id to: ${UNIQUE_PAYMENT_ID}`);

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'completed', payment_id: UNIQUE_PAYMENT_ID })
    .eq('id', ORDER_ID)
    .select();

  if (error) {
    console.error('Error updating order:', error);
    return;
  }
  
  console.log('Order updated successfully:', JSON.stringify(data, null, 2));

  // Send Telegram notification
  console.log('\nSending Telegram notification...');
  const order = data[0];
  const message = `🛒 طلب جديد مكتمل (إصلاح يدوي)

━━━━━━━━━━━━━━━━━
👤 العميل: ${order.customer_name}
📧 البريد: ${order.customer_email}
📦 المنتج: ${order.product_title}
💰 المبلغ: 0 EGP (كوبون 100%)
🎫 كوبون: ${order.coupon_code}
━━━━━━━━━━━━━━━━━
✅ تم التفعيل بنجاح`;

  const tgResult = await sendTelegram(message);
  console.log('Telegram result:', JSON.stringify(tgResult, null, 2));
}

run();
