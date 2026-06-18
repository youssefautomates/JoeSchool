export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Sends a chat completion request to the configured LLM provider in a fully agnostic way.
 * Supports native Gemini API and standard OpenAI-compatible endpoints (Groq, OpenRouter, custom).
 */
export async function callLLM(
  systemPrompt: string,
  history: ChatMessage[]
): Promise<string> {
  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  
  if (provider === "mock") {
    console.log(`[LLM Service] Executing Mock LLM Provider...`);
    const lastMsg = history[history.length - 1];
    const isToolOutput = lastMsg && lastMsg.role === "user" && lastMsg.content.startsWith("TOOL_OUTPUT");

    if (isToolOutput) {
      // Return final answer incorporating the tool output metadata
      const toolOutput = lastMsg.content;
      console.log(`[LLM Service] Mocking final answer for tool output:`, toolOutput);

      let answer = "";
      const isArabic = history.some(m => m.role === "user" && /[\u0600-\u06FF]/.test(m.content));

      if (isArabic) {
        if (toolOutput.includes("getPlatformOverview")) {
          answer = `
يا فندم، ده ملخص شامل لأداء منصة JoeSchool بالكامل:

📊 النتائج الأساسية (Key Findings):
• إجمالي الكورسات المفعلة على المنصة: 12 كورس.
• إجمالي الطلاب المسجلين: 1,250 طالب.
• إجمالي المبيعات المكتملة: 320 طلب.
• إجمالي الإيرادات التاريخية: 450,000 جنيه مصري.

⚠️ المخاطر (Risks):
• وتيرة نمو الاشتراكات الجديدة قلت شوية في الأسبوعين الأخيرين مقارنة ببداية الشهر.

💡 الفرص (Opportunities):
• إمكانية زيادة المبيعات عن طريق إرسال عروض تسويقية للطلاب الحاليين غير المشتركين في كورسات جديدة.

🚀 الإجراءات المقترحة (Recommended Actions):
1. نطلق حملة بريد إلكتروني تنشيطية للطلاب غير النشطين.
2. ننشر درس مجاني كمعاينة (Free Preview) للكورسات الأكثر مبيعاً لجذب زوار جدد.
          `.trim();
        } else if (toolOutput.includes("getTodayMetrics") || toolOutput.includes("getRevenueAnalytics") || toolOutput.includes("getTrafficAnalytics")) {
          answer = `
يا فندم، ملخص أداء المدرسة النهارده:

📊 النتائج الأساسية (Key Findings):
• عملنا النهارده مبيعة واحدة بقيمة 0 جنيه (مستخدم فيها كوبون خصم 100%).
• عدد الطلاب الجدد اللي سجلوا معانا النهارده: 2 طلاب.
• متوسط قيمة الطلب (AOV): 0 جنيه (عشان الطلب مجاني بكوبون خصم).
• نسبة التحويل النهارده وصلت لـ 12.5% وده مؤشر ممتاز جداً نسبةً لعدد الزوار.

⚠️ المخاطر (Risks):
• المبيعات كلها جاية من كورس واحد بس ("كورس صناعة فيديوهات الأنيميشن بالذكاء الإصطناعي")، وباقي الكورسات مفيش عليها مبيعات النهارده.
• نسبة التخلي عن السلة (Cart Abandonment) وصلت لـ 25% النهارده.

💡 الفرص (Opportunities):
• بما إن كورس الأنيميشن عليه إقبال كويس، ممكن نعمل باقة (Bundle) تجمع الكورس ده مع كورس تاني بسعر مميز عشان نشجع الطلاب يشتروا أكتر.

🚀 الإجراءات المقترحة (Recommended Actions):
1. نبعت رسائل بريد إلكتروني تلقائية للناس اللي سابت السلة ومكملتش الدفع النهارده (Cart Recovery).
2. نعمل عرض ترويجي سريع على السوشيال ميديا نروج فيه لباقي الكورسات عشان ننشطها.
          `.trim();
        } else if (toolOutput.includes("getWeeklyMetrics")) {
          answer = `
يا فندم، ده ملخص أداء الأسبوع ده مقارنة بالأسبوع اللي قبله:

📊 النتائج الأساسية (Key Findings):
• إجمالي الإيرادات الأسبوع ده عملت 58,000 جنيه مصري (زيادة بنسبة 15% مقارنة بالأسبوع اللي فات).
• عدد الطلبات المكتملة: 22 مبيعة.
• الطلاب الجدد: 15 طالب جديد سجل معانا.
• نسبة التحويل العامة: 1.8%.

⚠️ المخاطر (Risks):
• الدفع عن طريق المحافظ الإلكترونية بيمثل 80% من المبيعات، والدفع بالكروت البنكية قليل شوية، ممكن يكون بسبب مشكلة في بوابة الدفع أو في سلاسة الخطوات.

💡 الفرص (Opportunities):
• ممكن نعمل باقة كورسات (Bundle Offer) تجمع الكورسات الأكثر مبيعاً بسعر مخفض لتشجيع الطلاب على الشراء.

🚀 الإجراءات المقترحة (Recommended Actions):
1. نفحص خطوات الدفع بالكروت البنكية للتأكد من إن مفيش مشاكل بتواجه الطلاب.
2. نطلق باقة الكورسات الجديدة ونروج ليها للطلاب الحاليين.
          `.trim();
        } else if (toolOutput.includes("getMonthlyMetrics")) {
          answer = `
يا فندم، ده ملخص أداء الشهر ده مقارنة بالشهر اللي فات:

📊 النتائج الأساسية (Key Findings):
• إجمالي الإيرادات الشهر ده عملت 210,000 جنيه مصري.
• عدد الطلبات المكتملة: 89 مبيعة.
• الطلاب الجدد: 65 طالب جديد سجل معانا.
• نسبة التحويل العامة: 2.4%.

⚠️ المخاطر (Risks):
• استخدام الكوبونات بنسبة خصم 100% مثل 15% من إجمالي الطلبات.

💡 الفرص (Opportunities):
• تحويل الطلاب المستفيدين من الكوبونات المجانية إلى طلاب يدفعون لشراء الكورسات المتقدمة.

🚀 الإجراءات المقترحة (Recommended Actions):
1. نبعت رسائل بريد تلقائية بعروض ترقية للطلاب المسجلين بالكوبونات المجانية.
          `.trim();
        } else if (toolOutput.includes("getTopCourses")) {
          answer = `
يا فندم، ده ترتيب الكورسات الأكثر مبيعاً النهارده:

📊 النتائج الأساسية (Key Findings):
• كورس "صناعة فيديوهات الأنيميشن بالذكاء الإصطناعي" هو الأكثر مبيعاً النهارده (مبيعة واحدة بقيمة 0 جنيه عن طريق كوبون خصم).
• الكورس التاني في الترتيب من حيث الاهتمام هو كورس "صناعة المحتوى بالذكاء الاصطناعي" (زوار كتير دخلوا صفحته بس مفيش مبيعات النهارده).

⚠️ المخاطر (Risks):
• الاعتماد الكامل على كورس واحد لتحقيق المبيعات، وغياب التفاعل مع باقي الكورسات النهارده.

💡 الفرص (Opportunities):
• ممكن نعمل عروض مشتركة أو خصومات على الكورسات التانية للطلاب اللي اشتركوا في كورس الأنيميشن.

🚀 الإجراءات المقترحة (Recommended Actions):
1. نبعت إيميل ترويجي بكوبون خصم 15% على الكورسات التانية للطلاب اللي أخذوا كورس الأنيميشن مجاناً النهارده.
          `.trim();
        } else if (toolOutput.includes("generateExcelReport")) {
          answer = `
📊 النتائج الأساسية (Key Findings):
• تم استخراج تقرير الإكسيل وحفظه بنجاح على الخادم.

⚠️ المخاطر (Risks):
• مفيش مخاطر مسجلة.

💡 الفرص (Opportunities):
• شارك التقرير مع الإدارة المالية للمنصة.

🚀 الإجراءات المقترحة (Recommended Actions):
1. قم بتحميل وعرض ملف الـ .xlsx المرفق في هذه المحادثة.
          `.trim();
        } else {
          answer = `
📊 النتائج الأساسية (Key Findings):
• تم تجميع البيانات بنجاح من قاعدة البيانات.

⚠️ المخاطر (Risks):
• مفيش مخاطر ملحوظة.

💡 الفرص (Opportunities):
• استمر في مراقبة الأداء.

🚀 الإجراءات المقترحة (Recommended Actions):
1. لا يوجد إجراءات مطلوبة حالياً.
          `.trim();
        }
      } else {
        // English responses fallback
        if (toolOutput.includes("getPlatformOverview")) {
          answer = `
📊 Key Findings:
• Total Courses: 12 courses active.
• Total Students: 1,250 registered students.
• Total Revenue: 450,000 EGP.
• Total Completed Orders: 320 orders.

⚠️ Risks:
• Student registration growth has slowed down in the last two weeks.
• High concentration of sales in the top 2 courses.

💡 Opportunities:
• Create email re-engagement campaigns for inactive students.
• Introduce bundle pricing to increase average order value.

🚀 Recommended Actions:
1. Launch a discount coupon for course bundles.
2. Publish free preview lessons to boost traffic conversions.
          `.trim();
        } else if (toolOutput.includes("getTodayMetrics") || toolOutput.includes("getRevenueAnalytics") || toolOutput.includes("getTrafficAnalytics")) {
          answer = `
📊 Key Findings:
• Today's Revenue: 8,500 EGP.
• Completed Orders: 4 orders.
• New Registrations: 3 students.
• Average Order Value: 2,125 EGP.
• Conversion Rate: 2.1%.

⚠️ Risks:
• Cart abandonment rate remains at 25% today.

💡 Opportunities:
• Offer instant support on checkout via Telegram bot or WhatsApp chat widgets.

🚀 Recommended Actions:
1. Deploy cart abandonment auto-emails.
2. Verify payment gateway checkout flow stability on mobile.
          `.trim();
        } else if (toolOutput.includes("getWeeklyMetrics")) {
          answer = `
📊 Key Findings:
• This Week's Revenue: 58,000 EGP.
• Completed Orders: 22 orders.
• New Registrations: 15 students.
• Conversion Rate: 1.8%.

⚠️ Risks:
• Conversion rate dropped slightly (-0.3% points) compared to last week.

💡 Opportunities:
• Target lookalike audiences on Facebook utilizing checkout visits events.

🚀 Recommended Actions:
1. Run a retargeting ad campaign for checkout visitors.
          `.trim();
        } else if (toolOutput.includes("getMonthlyMetrics")) {
          answer = `
📊 Key Findings:
• This Month's Revenue: 210,000 EGP.
• Completed Orders: 89 orders.
• New Registrations: 65 students.
• Conversion Rate: 2.4%.

⚠️ Risks:
• 100% discount coupons represented 15% of total orders.

💡 Opportunities:
• Transition free coupon users to paid advanced courses.

🚀 Recommended Actions:
1. Send automated follow-up emails with upsell offers to coupon users.
          `.trim();
        } else if (toolOutput.includes("generateExcelReport") || toolOutput.includes("generateCustomExcelReportTool")) {
          answer = `
📊 Key Findings:
• Excel Spreadsheet report compiled and saved to local server paths.

⚠️ Risks:
• None.

💡 Opportunities:
• Share the generated spreadsheet file with your financial advisor.

🚀 Recommended Actions:
1. Retrieve and view the attached .xlsx file.
          `.trim();
        } else {
          answer = `
📊 Key Findings:
• System metrics compiled successfully.

⚠️ Risks:
• None identified.

💡 Opportunities:
• Continue tracking platform growth.

🚀 Recommended Actions:
1. No immediate action required.
          `.trim();
        }
      }

      return JSON.stringify({
        action: "final_answer",
        answer: answer
      });
    } else {
      // First turn: prompt the correct tool call based on user query keyword
      const userQuery = lastMsg ? lastMsg.content.toLowerCase() : "";
      console.log(`[LLM Service] Mocking first turn tool call for query: "${userQuery}"`);

      const isToday = userQuery.includes("today") || userQuery.includes("اليوم") || userQuery.includes("النهارده") || userQuery.includes("النهارضه") || userQuery.includes("نهاردة") || userQuery.includes("النهاردة");
      const isWeek = userQuery.includes("week") || userQuery.includes("اسبوع") || userQuery.includes("أسبوع") || userQuery.includes("الأسبوع") || userQuery.includes("الاسبوع");
      const isMonth = userQuery.includes("month") || userQuery.includes("شهر") || userQuery.includes("الشهر");
      const isExcel = userQuery.includes("excel") || userQuery.includes("sheet") || userQuery.includes("تقرير") || userQuery.includes("q1") || userQuery.includes("30 days") || userQuery.includes("إكسيل") || userQuery.includes("اكسل");
      const isCourse = userQuery.includes("course") || userQuery.includes("كورس") || userQuery.includes("كورسات") || userQuery.includes("أكتر كورس") || userQuery.includes("اكتر كورس");
      const isRevenue = userQuery.includes("revenue") || userQuery.includes("إيرادات") || userQuery.includes("الايرادات") || userQuery.includes("الإيرادات") || userQuery.includes("مبيعة") || userQuery.includes("مبيعات") || userQuery.includes("مبيعه");

      if (isToday || isRevenue) {
        return JSON.stringify({
          action: "call_tool",
          tool: "getTodayMetrics",
          arguments: {}
        });
      } else if (isWeek) {
        return JSON.stringify({
          action: "call_tool",
          tool: "getWeeklyMetrics",
          arguments: {}
        });
      } else if (isMonth) {
        return JSON.stringify({
          action: "call_tool",
          tool: "getMonthlyMetrics",
          arguments: {}
        });
      } else if (isExcel) {
        return JSON.stringify({
          action: "call_tool",
          tool: "generateExcelReport",
          arguments: {
            startDate: "2026-05-01",
            endDate: "2026-05-31",
            title: "May_2026_Audit"
          }
        });
      } else if (isCourse) {
        return JSON.stringify({
          action: "call_tool",
          tool: "getTopCourses",
          arguments: {
            startDate: "2026-06-01",
            endDate: "2026-06-16",
            limit: 5
          }
        });
      } else {
        return JSON.stringify({
          action: "call_tool",
          tool: "getPlatformOverview",
          arguments: {}
        });
      }
    }
  }

  // Resolve API Key based on provider if LLM_API_KEY is not set
  let apiKey = process.env.LLM_API_KEY || "";
  if (!apiKey) {
    if (provider === "gemini") apiKey = process.env.GEMINI_API_KEY || "";
    else if (provider === "groq") apiKey = process.env.GROQ_API_KEY || "";
    else if (provider === "openrouter") apiKey = process.env.OPENROUTER_API_KEY || "";
    else if (provider === "openai") apiKey = process.env.OPENAI_API_KEY || "";
    else if (provider === "mistral") apiKey = process.env.Mistral_API_KEY || "";
  }

  if (!apiKey) {
    throw new Error(`[LLM Service] Missing API key for provider: ${provider}`);
  }

  // Define defaults
  let model = process.env.LLM_MODEL || "";
  let apiUrl = process.env.LLM_API_URL || "";

  // Defensively correct OpenRouter/Nemotron model ID if configured as nvidia/nemotron-3-ultra
  if (model === "nvidia/nemotron-3-ultra") {
    model = "nvidia/nemotron-3-ultra-550b-a55b";
  }

  // Defensively correct base URLs to completions endpoint for OpenAI compatible providers
  if (provider !== "gemini" && provider !== "mock" && apiUrl) {
    const trimmedUrl = apiUrl.trim().replace(/\/$/, "");
    if (!trimmedUrl.endsWith("/chat/completions") && !trimmedUrl.endsWith("/completions")) {
      if (trimmedUrl.endsWith("/v1")) {
        apiUrl = trimmedUrl + "/chat/completions";
      } else {
        apiUrl = trimmedUrl + "/v1/chat/completions";
      }
    }
  }

  if (provider === "gemini") {
    model = model || "gemini-2.5-flash";
    apiUrl = apiUrl || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Construct Gemini structure
    const contents = history.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    console.log(`[LLM Service] Calling Gemini API (${model})...`);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.1, // low temperature for precise tool calling & logical recommendations
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[LLM Service] Gemini API returned error:", errText);
      throw new Error(`Gemini API failed with status ${response.status}: ${errText}`);
    }

    const resData = await response.json();
    const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[LLM Service] Gemini API empty response:", JSON.stringify(resData));
      throw new Error("Empty response from Gemini API");
    }

    return text.trim();
  } 
  
  // OpenAI compatible providers (Groq, OpenRouter, OpenAI, Custom)
  if (provider === "groq") {
    model = model || "llama-3.3-70b-versatile";
    apiUrl = apiUrl || "https://api.groq.com/openai/v1/chat/completions";
  } else if (provider === "openrouter") {
    model = model || "google/gemini-2.5-flash";
    apiUrl = apiUrl || "https://openrouter.ai/api/v1/chat/completions";
  } else if (provider === "mistral") {
    model = model || "mistral-large-latest";
    apiUrl = apiUrl || "https://api.mistral.ai/v1/chat/completions";
  } else {
    model = model || "gpt-4o-mini";
    apiUrl = apiUrl || "https://api.openai.com/v1/chat/completions";
  }

  console.log(`[LLM Service] Calling OpenAI-compatible API (${provider} - ${model})...`);

  // Construct standard OpenAI message structure
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map(msg => ({ role: msg.role, content: msg.content }))
  ];

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      // OpenRouter specific headers
      ...(provider === "openrouter" ? {
        "HTTP-Referer": "https://www.joeschool.com",
        "X-Title": "JoeSchool BI Manager"
      } : {})
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[LLM Service] ${provider} API returned error:`, errText);
    throw new Error(`${provider} API failed with status ${response.status}: ${errText}`);
  }

  const resData = await response.json();
  const text = resData.choices?.[0]?.message?.content;
  if (!text) {
    console.error(`[LLM Service] ${provider} API empty response:`, JSON.stringify(resData));
    throw new Error(`Empty response from ${provider} API`);
  }

  return text.trim();
}
