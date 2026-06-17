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
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  // Get Telegram settings from KV store (products table with slug kv-marketing_settings)
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('description')
    .eq('slug', 'kv-marketing_settings')
    .single();

  if (error) {
    console.error("Error fetching KV marketing_settings:", error);
    return;
  }
  
  const settings = JSON.parse(data.description);
  console.log("Telegram settings:", JSON.stringify(settings, null, 2));
  
  const botToken = settings.telegramBotToken;
  const chatId = settings.telegramChatId;
  
  if (!botToken || !chatId) {
    console.log("Missing Telegram settings!");
    return;
  }
  
  // Send test Telegram notification
  console.log(`\nSending Telegram notification to chatId: ${chatId}...`);
  const message = `🛒 طلب مكتمل (إصلاح يدوي)

━━━━━━━━━━━━━━━━━
👤 العميل: Youssef Mostafa
📧 البريد: testestest11@gmail.com
📦 المنتج: كورس صناعة فيديوهات الأنيميشن بالذكاء الإصطناعي
💰 المبلغ: 0 EGP (كوبون 100%)
🎫 كوبون: TEST1
✅ تم التفعيل بنجاح`;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    })
  });
  const result = await res.json();
  console.log("Telegram result:", JSON.stringify(result, null, 2));
}

run();
