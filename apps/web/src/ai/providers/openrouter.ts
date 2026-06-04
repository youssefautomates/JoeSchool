/**
 * 🤖 JoeSchool - French Mistral AI Provider
 * Handles API calls, retry policies, rate limit backoffs, and completions.
 */

export async function getOpenRouterResponse(messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = process.env.Mistral_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Mistral_API_KEY in server environment");
  }

  // 🤖 Flagship French Mistral AI Models list
  const models = [
    "mistral-large-latest",
    "mistral-medium-latest",
    "mistral-small-latest"
  ];

  let delay = 500;

  for (let i = 0; i < models.length; i++) {
    const activeModel = models[i];
    console.log(`[Mistral AI] Launching attempt ${i + 1} with model: ${activeModel}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout protection

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: activeModel,
          messages,
          temperature: 0.6,
          max_tokens: 2500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.warn(`[Mistral AI] Model ${activeModel} rate-limited (429). Cycling to next fallback model...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Mistral AI] Model ${activeModel} failed with status ${response.status}. Cycling...`, errText);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (content) {
        console.log(`[Mistral AI] Successfully got response from model: ${activeModel}`);
        return content;
      }
    } catch (e: any) {
      console.error(`[Mistral AI] Connection error on model ${activeModel}:`, e.message || e);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("All fallback models on Mistral AI are currently rate-limited or unavailable. Please retry shortly.");
}

/**
 * Fallback static method for simple completions
 */
export async function askAI(message: string) {
  try {
    const text = await getOpenRouterResponse([{ role: "user", content: message }]);
    return text || "عذراً، فشل الحصول على رد.";
  } catch (error) {
    console.error("AI Error:", error);
    return "حدث خطأ أثناء الاتصال بالخادم الذكي.";
  }
}

/**
 * Dummy placeholder to avoid compile errors if ever imported
 */
export async function getOpenRouterStream(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.Mistral_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Mistral_API_KEY in server environment");
  }

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages,
      stream: true,
      temperature: 0.6,
      max_tokens: 2500,
    }),
  });

  return response.body;
}