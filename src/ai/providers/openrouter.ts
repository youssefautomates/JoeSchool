/**
 * 🤖 Youssef Automates - OpenRouter AI Provider
 * Handles API calls, retry policies, rate limit backoffs, and streams.
 */

export async function getOpenRouterStream(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in server environment");
  }

  // 🤖 Robust free models list spanning multiple upstream hosting providers (Venice, MiniMax, Google)
  const models = [
    "meta-llama/llama-3.3-70b-instruct:free", // Venice (Meta - Llama 3.3 70B)
    "minimax/minimax-m2.5:free",              // MiniMax (Fast & extremely reliable!)
    "google/gemma-4-31b-it:free",             // Google (Gemma 4 31B - highly stable!)
    "nousresearch/hermes-3-llama-3.1-405b:free" // Venice (Nous - Hermes 3 405B)
  ];

  let attempt = 0;
  const maxAttempts = models.length; // Attempt once per fallback model
  let delay = 500; // start with small delay

  for (let i = 0; i < models.length; i++) {
    const activeModel = models[i];
    console.log(`[OpenRouter] Launching attempt ${i + 1} with model: ${activeModel}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 seconds timeout protection

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://youssef-automates-store.vercel.app",
          "X-Title": "Youssef Automates Admin Assistant",
        },
        body: JSON.stringify({
          model: activeModel,
          messages,
          stream: true,
          temperature: 0.6,
          max_tokens: 2500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle Rate Limits (429 Too Many Requests)
      if (response.status === 429) {
        console.warn(`[OpenRouter] Model ${activeModel} hit rate-limit (429). Cycling to next fallback model...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
        continue; // Try next model in loop
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[OpenRouter] Model ${activeModel} failed with status ${response.status}. Cycling...`, errText);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.log(`[OpenRouter] Successfully established stream with model: ${activeModel}`);
      return response.body; // Returns ReadableStream<Uint8Array>
    } catch (e: any) {
      console.error(`[OpenRouter] Connection error on model ${activeModel}:`, e.message || e);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("All fallback models on OpenRouter are currently rate-limited or unavailable. Please retry shortly.");
}

/**
 * 🤖 Fetches non-streaming AI completions with model cycling fallback
 */
export async function getOpenRouterResponse(messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in server environment");
  }

  const models = [
    "meta-llama/llama-3.3-70b-instruct:free", // Venice (Meta - Llama 3.3 70B)
    "minimax/minimax-m2.5:free",              // MiniMax (Fast & extremely reliable!)
    "google/gemma-4-31b-it:free",             // Google (Gemma 4 31B - highly stable!)
    "nousresearch/hermes-3-llama-3.1-405b:free" // Venice (Nous - Hermes 3 405B)
  ];

  let delay = 500;

  for (let i = 0; i < models.length; i++) {
    const activeModel = models[i];
    console.log(`[OpenRouter Non-Stream] Launching attempt ${i + 1} with model: ${activeModel}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://youssef-automates-store.vercel.app",
          "X-Title": "Youssef Automates Admin Assistant",
        },
        body: JSON.stringify({
          model: activeModel,
          messages,
          stream: false,
          temperature: 0.6,
          max_tokens: 2500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.warn(`[OpenRouter Non-Stream] Model ${activeModel} rate-limited (429). Cycling...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[OpenRouter Non-Stream] Model ${activeModel} failed:`, errText);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (content) {
        console.log(`[OpenRouter Non-Stream] Successfully got response from: ${activeModel}`);
        return content;
      }
    } catch (e: any) {
      console.error(`[OpenRouter Non-Stream] Error on model ${activeModel}:`, e.message || e);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("All fallback models on OpenRouter are currently rate-limited or unavailable. Please retry shortly.");
}

/**
 * Fallback static method for non-stream completions
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